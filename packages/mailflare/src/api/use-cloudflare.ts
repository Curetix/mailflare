import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuthStore } from "../stores/auth-store";
import { CloudflareApiClient } from "./cloudflare-client";
import type { CloudflareBaseResponse, CloudflareEmailRule } from "./cloudflare-types";

type RuleMutation<T> = {
    zoneId: string | null;
    rule: T;
};

async function getAllPages<T>(fn: (page: number) => Promise<CloudflareBaseResponse<Array<T>>>) {
    const items: Array<T> = [];
    let page = 1;

    while (true) {
        const response = await fn(page);

        if (!response.success) {
            throw new Error(response.errors[0]?.message ?? "Unknown error");
        }

        items.push(...response.result);

        if (
            Math.ceil(response.result_info.total_count / response.result_info.per_page) >
            response.result_info.page
        ) {
            page += 1;
        } else {
            break;
        }
    }

    return items;
}

async function handleResponse<T>(fn: Promise<CloudflareBaseResponse<T>>) {
    const response = await fn;
    if (!response.success) {
        throw new Error(response.errors[0]?.message ?? "Unknown error");
    }
    return response.result;
}

export function useCloudflare(baseUrl?: string) {
    const queryClient = useQueryClient();
    const apiClient = useRef(new CloudflareApiClient("", baseUrl));

    const apiToken = useAuthStore((s) => s.apiToken);
    const selectedZoneId = useAuthStore((s) => s.selectedZoneId);
    const setToken = useAuthStore((s) => s.setToken);
    const setZone = useAuthStore((s) => s.setZone);

    const [accountId, setAccountId] = useState<string | null>(null);

    useEffect(() => {
        apiClient.current.apiToken = apiToken ?? "";
        if (baseUrl) apiClient.current.baseUrl = baseUrl;
    }, [apiToken, baseUrl]);

    const verifyToken = useCallback(
        async (token: string, store = true) => {
            try {
                const response = await apiClient.current.verifyToken(token);
                if (!response.success) {
                    console.error(response);
                    return {
                        success: false as const,
                        error: response.errors[0]?.message ?? "Unknown error",
                    };
                }

                if (store) {
                    setToken(token);
                }
                return { success: true as const };
            } catch (error: unknown) {
                console.error(error);
                return { success: false as const, error };
            }
        },
        [setToken],
    );

    const zones = useQuery({
        queryKey: ["zones"],
        queryFn: async () => {
            return getAllPages((page: number) => apiClient.current.getZones(page));
        },
        enabled: !!apiToken,
        placeholderData: [],
        retry: false,
        staleTime: 5 * 60 * 1000,
        gcTime: Number.POSITIVE_INFINITY,
    });

    useEffect(() => {
        if (zones.data && zones.data.length > 0) {
            const firstZone = zones.data[0];
            if (!accountId && firstZone) {
                setAccountId(firstZone.account.id);
            }
            if (selectedZoneId === null && firstZone) {
                setZone(firstZone.id);
            }
        }
    }, [zones.data, accountId, selectedZoneId, setZone]);

    const emailDestinations = useQuery({
        queryKey: ["destinations", accountId],
        queryFn: async ({ queryKey: [, accId] }) => {
            if (!accId) throw new Error("No account identifier provided.");
            return getAllPages((page: number) => apiClient.current.getDestinations(accId, page));
        },
        enabled: !!accountId,
        placeholderData: [],
        retry: false,
        staleTime: 5 * 60 * 1000,
        gcTime: Number.POSITIVE_INFINITY,
    });

    const emailRoutingStatus = useQuery({
        queryKey: ["emailRoutingStatus", selectedZoneId],
        queryFn: async ({ queryKey: [, zoneId] }) => {
            if (!zoneId) return null;
            return apiClient.current.getEmailRoutingStatus(zoneId).catch(() => null);
        },
        staleTime: 5 * 60 * 1000,
        gcTime: Number.POSITIVE_INFINITY,
    });

    const allEmailRoutingSettings = useQuery({
        queryKey: ["allEmailRoutingSettings", zones.data?.map((z) => z.id).join(",")],
        queryFn: async () => {
            if (!zones.data) return [];
            const results = await Promise.all(
                zones.data.map(async (zone) => {
                    try {
                        return await apiClient.current.getEmailRoutingStatus(zone.id);
                    } catch {
                        return null;
                    }
                }),
            );
            return results.filter((r): r is NonNullable<typeof r> => r !== null && r.success);
        },
        enabled: !!zones.data && zones.data.length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: Number.POSITIVE_INFINITY,
    });

    const domains = useMemo(() => {
        if (!allEmailRoutingSettings.data) return [];

        return allEmailRoutingSettings.data.flatMap((response) => {
            const items: {
                zoneId: string;
                zoneDomain: string;
                domain: string;
                isSubDomain: boolean;
            }[] = [];

            if (response.result) {
                items.push({
                    zoneId: response.result.id,
                    zoneDomain: response.result.name,
                    isSubDomain: false,
                    domain: response.result.name,
                });

                if (response.result.subdomains) {
                    for (const sub of response.result.subdomains) {
                        items.push({
                            zoneId: response.result.id,
                            zoneDomain: response.result.name,
                            isSubDomain: true,
                            domain: sub.name,
                        });
                    }
                }
            }

            return items;
        });
    }, [allEmailRoutingSettings.data]);

    const emailRules = useQuery({
        queryKey: ["emailRules", selectedZoneId],
        queryFn: async ({ queryKey: [, zoneId] }) => {
            if (!zoneId) throw new Error("No zone identifier provided.");
            return getAllPages((page: number) => apiClient.current.getEmailRules(zoneId, page));
        },
        enabled: !!selectedZoneId,
        placeholderData: [],
        retry: false,
        staleTime: 5 * 60 * 1000,
        gcTime: Number.POSITIVE_INFINITY,
    });

    const createEmailRule = useMutation({
        mutationFn: async ({ zoneId, rule }: RuleMutation<Omit<CloudflareEmailRule, "tag">>) => {
            if (!zoneId) return;
            return handleResponse(apiClient.current.createEmailRule(zoneId, rule));
        },
        onSuccess: () => {
            return queryClient.invalidateQueries({
                queryKey: ["emailRules", selectedZoneId],
            });
        },
    });

    const updateEmailRule = useMutation({
        mutationKey: ["update-email-rule"],
        mutationFn: async ({ zoneId, rule }: RuleMutation<CloudflareEmailRule>) => {
            if (!zoneId) return;
            return handleResponse(apiClient.current.updateEmailRule(zoneId, rule));
        },
        onSuccess: () => {
            return queryClient.invalidateQueries({
                queryKey: ["emailRules", selectedZoneId],
            });
        },
    });

    const deleteEmailRule = useMutation({
        mutationKey: ["delete-email-rule"],
        mutationFn: async ({ zoneId, rule }: RuleMutation<CloudflareEmailRule>) => {
            if (!zoneId) return;
            return handleResponse(apiClient.current.deleteEmailRule(zoneId, rule));
        },
        onSuccess: () => {
            return queryClient.invalidateQueries({
                queryKey: ["emailRules", selectedZoneId],
            });
        },
    });

    return {
        apiClient: apiClient.current,
        verifyToken,
        accountId,
        zones,
        domains,
        selectedZoneId,
        setSelectedZoneId: setZone,
        emailDestinations,
        emailRoutingStatus,
        emailRules,
        createEmailRule,
        updateEmailRule,
        deleteEmailRule,
    };
}
