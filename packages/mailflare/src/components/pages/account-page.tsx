// Worker app: the signed-in account. Passkeys belong to the Worker's domain,
// so they're managed here.

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { TbKey, TbTrash } from "react-icons/tb";
import { useFormatter, useTranslations } from "use-intl";

import { createAccountClient, unwrap } from "../../account/account-client";
import { useAccountErrorMessage } from "../../account/use-account-error";
import { useCloudflareConfig } from "../../api/config-context";
import { useMailflare } from "../../backend/use-mailflare";
import { useAuthStore } from "../../stores/auth-store";
import { PageBody, PageHeader } from "./page-header";

export function AccountPage() {
    const t = useTranslations("account");
    const tn = useTranslations("nav");
    const format = useFormatter();
    const toast = useToast();
    const errorMessage = useAccountErrorMessage();
    const queryClient = useQueryClient();
    const { lockedWorkerUrl } = useCloudflareConfig();
    const apiToken = useAuthStore((s) => s.apiToken);
    const { account } = useMailflare();

    const client = useMemo(
        () => (lockedWorkerUrl && apiToken ? createAccountClient(lockedWorkerUrl, apiToken) : null),
        [lockedWorkerUrl, apiToken],
    );
    const passkeysKey = ["account-passkeys", apiToken];
    const passkeys = useQuery({
        queryKey: passkeysKey,
        enabled: client !== null,
        networkMode: "online",
        queryFn: async () => (await unwrap(client!.passkey.listUserPasskeys())).data ?? [],
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: passkeysKey });

    async function run(work: () => Promise<unknown>, success: string) {
        try {
            await work();
            toast({ body: success });
            await refresh();
        } catch (error) {
            toast({ body: errorMessage(error), type: "error" });
        }
    }

    const email = account.data?.user?.email ?? "";

    return (
        <PageBody>
            <PageHeader title={tn("account")} description={t("page.description", { email })} />

            <VStack gap={2}>
                <HStack justify="between" align="center">
                    <Text weight="medium">{t("passkeys.title")}</Text>
                    <Button
                        size="sm"
                        label={t("passkeys.action")}
                        icon={<TbKey />}
                        clickAction={() =>
                            run(() => unwrap(client!.passkey.addPasskey()), t("passkeys.success"))
                        }
                    />
                </HStack>
                {passkeys.isPending && <Spinner />}
                {passkeys.data?.length === 0 && (
                    <Text type="supporting">{t("page.passkeys_empty")}</Text>
                )}
                {passkeys.data?.map((passkey) => (
                    <HStack key={passkey.id} gap={2} align="center">
                        <Text maxLines={1} style={{ flex: 1, minWidth: 0 }}>
                            {passkey.name ||
                                t("page.passkey_unnamed", {
                                    date: format.dateTime(new Date(passkey.createdAt), {
                                        dateStyle: "medium",
                                    }),
                                })}
                        </Text>
                        <IconButton
                            variant="ghost"
                            size="sm"
                            label={t("page.delete_passkey")}
                            tooltip={t("page.delete_passkey")}
                            icon={<TbTrash />}
                            clickAction={() =>
                                run(
                                    () => unwrap(client!.passkey.deletePasskey({ id: passkey.id })),
                                    t("page.passkey_removed"),
                                )
                            }
                        />
                    </HStack>
                ))}
            </VStack>
        </PageBody>
    );
}
