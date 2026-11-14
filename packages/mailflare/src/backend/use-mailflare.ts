import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCloudflareConfig } from "../api/config-context";
import { useAuthStore } from "../stores/auth-store";
import { CloudflareBackend } from "./cloudflare-backend";
import type { Alias, AliasBackend, AliasChanges, NewAlias } from "./types";

// One instance per credential set, shared by every component (and kept across
// re-renders) so per-instance caches like the account ID are reused.
let cached: { key: string; backend: AliasBackend } | null = null;

function getBackend(apiToken: string, apiBaseUrl?: string): AliasBackend {
    const key = `cloudflare\n${apiBaseUrl ?? ""}\n${apiToken}`;
    if (cached?.key !== key) {
        cached = { key, backend: new CloudflareBackend(apiToken, apiBaseUrl) };
    }
    return cached.backend;
}

/** The active backend, or null while logged out. */
export function useBackend(): AliasBackend | null {
    const apiToken = useAuthStore((s) => s.apiToken);
    const { apiBaseUrl } = useCloudflareConfig();
    return apiToken ? getBackend(apiToken, apiBaseUrl) : null;
}

export const queryKeys = {
    all: ["mailflare"] as const,
    zones: () => [...queryKeys.all, "zones"] as const,
    domains: () => [...queryKeys.all, "domains"] as const,
    zoneStatus: (zoneId: string | null) => [...queryKeys.all, "zone-status", zoneId] as const,
    destinations: () => [...queryKeys.all, "destinations"] as const,
    aliases: (zoneId?: string | null) =>
        zoneId === undefined
            ? ([...queryKeys.all, "aliases"] as const)
            : ([...queryKeys.all, "aliases", zoneId] as const),
};

const listOptions = {
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: Number.POSITIVE_INFINITY,
} as const;

function requireBackend(backend: AliasBackend | null): AliasBackend {
    if (!backend) throw new Error("Not logged in");
    return backend;
}

function requireZone(zoneId: string | null): string {
    if (!zoneId) throw new Error("No zone selected");
    return zoneId;
}

/** Aliases, zones and destinations of the active backend, plus alias mutations. */
export function useMailflare() {
    const backend = useBackend();
    const queryClient = useQueryClient();
    const selectedZoneId = useAuthStore((s) => s.selectedZoneId);
    const setSelectedZoneId = useAuthStore((s) => s.setZone);
    const enabled = !!backend;

    const zones = useQuery({
        ...listOptions,
        queryKey: queryKeys.zones(),
        queryFn: () => requireBackend(backend).listZones(),
        enabled,
        placeholderData: [],
    });

    const domains = useQuery({
        ...listOptions,
        queryKey: queryKeys.domains(),
        queryFn: () => requireBackend(backend).listDomains(),
        enabled,
        placeholderData: [],
    });

    const zoneStatus = useQuery({
        ...listOptions,
        queryKey: queryKeys.zoneStatus(selectedZoneId),
        queryFn: () => requireBackend(backend).getZoneStatus(requireZone(selectedZoneId)),
        enabled: enabled && !!selectedZoneId,
    });

    const destinations = useQuery({
        ...listOptions,
        queryKey: queryKeys.destinations(),
        queryFn: () => requireBackend(backend).listDestinations(),
        enabled,
        placeholderData: [],
    });

    const aliases = useQuery({
        ...listOptions,
        queryKey: queryKeys.aliases(selectedZoneId),
        queryFn: () => requireBackend(backend).listAliases(requireZone(selectedZoneId)),
        enabled: enabled && !!selectedZoneId,
        placeholderData: [],
    });

    const invalidateAliases = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.aliases() });

    const createAlias = useMutation({
        mutationKey: ["create-alias"],
        mutationFn: (alias: NewAlias) => requireBackend(backend).createAlias(alias),
        onSuccess: invalidateAliases,
    });

    const updateAlias = useMutation({
        mutationKey: ["update-alias"],
        mutationFn: ({ alias, changes }: { alias: Alias; changes: AliasChanges }) =>
            requireBackend(backend).updateAlias(alias, changes),
        onSuccess: invalidateAliases,
    });

    const deleteAlias = useMutation({
        mutationKey: ["delete-alias"],
        mutationFn: (alias: Alias) => requireBackend(backend).deleteAlias(alias),
        onSuccess: invalidateAliases,
    });

    return {
        backend,
        selectedZoneId,
        setSelectedZoneId,
        zones,
        domains,
        zoneStatus,
        destinations,
        aliases,
        createAlias,
        updateAlias,
        deleteAlias,
    };
}
