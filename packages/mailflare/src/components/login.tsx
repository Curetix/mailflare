import { Button } from "@astryxdesign/core/Button";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import { z } from "zod";

import { useCloudflare } from "../api/use-cloudflare";
import { useOnlineStatus } from "../hooks/use-online-status";

const tokenSchema = z.object({
    token: z.string().min(1),
});

type TokenForm = z.infer<typeof tokenSchema>;

const TOKEN_PERMISSIONS = [
    "Account | Email Routing Addresses | Read",
    "Zone | Email Routing Rules | Edit",
    "Zone | Zone | Read",
    "Zone | Zone Settings | Read",
];

export function Login({ apiBaseUrl }: { apiBaseUrl?: string }) {
    const t = useTranslations("login");
    const toast = useToast();
    const cloudflare = useCloudflare(apiBaseUrl);
    const { isOnline } = useOnlineStatus();

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<TokenForm>({
        resolver: zodResolver(tokenSchema),
        defaultValues: { token: "" },
    });

    const { isPending, mutate } = useMutation({
        mutationKey: ["verifyToken"],
        mutationFn: async (token: string) => {
            const result = await cloudflare.verifyToken(token, true);
            if (!result.success) throw result.error;
        },
        onError: () => {
            toast({ body: t("login_error"), type: "error" });
        },
    });

    return (
        <form onSubmit={handleSubmit((data) => mutate(data.token))}>
            <VStack gap={3}>
                <Controller
                    name="token"
                    control={control}
                    render={({ field }) => (
                        <TextInput
                            type="password"
                            label={t("token_label")}
                            placeholder={t("token_placeholder")}
                            autoComplete="off"
                            value={field.value}
                            onChange={(value) => field.onChange(value)}
                            isDisabled={isPending}
                            status={
                                errors.token
                                    ? { type: "error", message: errors.token.message }
                                    : undefined
                            }
                        />
                    )}
                />

                <Button
                    type="submit"
                    variant="primary"
                    width="100%"
                    label={isOnline ? t("save_token") : t("offline_login")}
                    isLoading={isPending}
                    isDisabled={!isOnline}
                />

                <Collapsible trigger={<Text weight="medium">{t("instructions.title")}</Text>}>
                    <List listStyle="decimal" density="compact">
                        <ListItem
                            label={
                                <Link
                                    href="https://dash.cloudflare.com/profile/api-tokens/"
                                    isExternalLink
                                >
                                    {t("instructions.step_1")}
                                </Link>
                            }
                        />
                        <ListItem label={<Text>{t("instructions.step_2")}</Text>} />
                        <ListItem label={<Text>{t("instructions.step_3")}</Text>} />
                        <ListItem
                            label={<Text>{t("instructions.step_4")}</Text>}
                            description={
                                <List listStyle="disc" density="compact">
                                    {TOKEN_PERMISSIONS.map((permission) => (
                                        <ListItem
                                            key={permission}
                                            label={<Text type="code">{permission}</Text>}
                                        />
                                    ))}
                                </List>
                            }
                        />
                        {(["step_5", "step_6", "step_7", "step_8", "step_9"] as const).map(
                            (step) => (
                                <ListItem
                                    key={step}
                                    label={<Text>{t(`instructions.${step}`)}</Text>}
                                />
                            ),
                        )}
                    </List>
                </Collapsible>
            </VStack>
        </form>
    );
}
