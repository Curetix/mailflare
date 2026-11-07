import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { TbRefresh } from "react-icons/tb";
import { useTranslations } from "use-intl";
import { z } from "zod";

import type { CloudflareEmailRule } from "../api/cloudflare-types";
import { useCloudflareConfig } from "../api/config-context";
import { useCloudflare } from "../api/use-cloudflare";
import { EMAIL_RULE_NAME_PREFIX } from "../const";
import { useOnlineStatus } from "../hooks/use-online-status";
import {
    useAliasSettingsStore,
    AliasFormats,
    AliasPrefixFormats,
} from "../stores/alias-settings-store";
import { useSettingsStore } from "../stores/settings-store";
import { useUIStore } from "../stores/ui-store";
import { generateAliasAddress } from "../utils/alias";

type Props = {
    open: boolean;
    onClose: () => void;
};

export function AliasCreateDialog({ open, onClose }: Props) {
    const t = useTranslations("alias_create");
    const tc = useTranslations("common");
    const toast = useToast();
    const { apiBaseUrl, isExtension } = useCloudflareConfig();
    const { selectedZoneId, zones, domains, emailDestinations, emailRules, createEmailRule } =
        useCloudflare(apiBaseUrl);

    const aliasSettings = useAliasSettingsStore();
    const updateAliasSettings = useAliasSettingsStore((s) => s.updateAliasSettings);
    const copyAlias = useSettingsStore((s) => s.copyAlias);
    const hostname = useUIStore((s) => s.hostname);
    const createFormDraft = useUIStore((s) => s.createFormDraft);
    const setCreateFormDraft = useUIStore((s) => s.setCreateFormDraft);
    const { isOnline } = useOnlineStatus();

    const [aliasPreview, setAliasPreview] = useState<string | null>(null);

    const schema = useMemo(
        () =>
            z.object({
                domain: z.string().min(1, t("invalid_domain")),
                format: z.enum(AliasFormats, { message: t("invalid_format") }),
                characterCount: z.number().min(3).max(25),
                wordCount: z.number().min(1).max(5),
                separator: z.string(),
                customAlias: z.string(),
                description: z.string(),
                prefixFormat: z.enum(AliasPrefixFormats),
                customPrefix: z.string(),
                destination: z.string().min(1, t("invalid_destination")),
            }),
        [t],
    );

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            domain: aliasSettings.domain ?? "",
            format: aliasSettings.format ?? "characters",
            characterCount: aliasSettings.characterCount ?? 5,
            wordCount: aliasSettings.wordCount ?? 2,
            separator: aliasSettings.separator ?? "_",
            customAlias: "",
            description: hostname || "",
            prefixFormat: aliasSettings.prefixFormat ?? "none",
            customPrefix: "",
            destination: aliasSettings.destination ?? "",
        },
    });

    const watchAll = watch();

    useEffect(() => {
        if (open) {
            if (createFormDraft) {
                // Restore saved draft
                reset(createFormDraft);
            } else {
                // Fresh form from settings
                reset({
                    domain:
                        aliasSettings.domain ??
                        domains.find((d) => d.zoneId === selectedZoneId)?.domain ??
                        "",
                    format: aliasSettings.format ?? "characters",
                    characterCount: aliasSettings.characterCount ?? 5,
                    wordCount: aliasSettings.wordCount ?? 2,
                    separator: aliasSettings.separator ?? "_",
                    customAlias: "",
                    description: hostname || "",
                    prefixFormat: hostname ? (aliasSettings.prefixFormat ?? "none") : "none",
                    customPrefix: "",
                    destination:
                        aliasSettings.destination ?? emailDestinations.data?.[0]?.email ?? "",
                });
            }
        }
    }, [open]);

    useEffect(() => {
        if (
            watchAll.destination === "" &&
            emailDestinations.data &&
            emailDestinations.data.length > 0
        ) {
            setValue("destination", emailDestinations.data[0]?.email ?? "");
        }
    }, [emailDestinations.data, watchAll.destination, setValue]);

    // Persist form draft to session storage on change
    useEffect(() => {
        if (open) {
            setCreateFormDraft({
                domain: watchAll.domain,
                format: watchAll.format,
                characterCount: watchAll.characterCount,
                wordCount: watchAll.wordCount,
                separator: watchAll.separator,
                customAlias: watchAll.customAlias,
                description: watchAll.description,
                prefixFormat: watchAll.prefixFormat,
                customPrefix: watchAll.customPrefix,
                destination: watchAll.destination,
            });
        }
    }, [
        open,
        watchAll.domain,
        watchAll.format,
        watchAll.characterCount,
        watchAll.wordCount,
        watchAll.separator,
        watchAll.customAlias,
        watchAll.description,
        watchAll.prefixFormat,
        watchAll.customPrefix,
        watchAll.destination,
        setCreateFormDraft,
    ]);

    function createPreview() {
        const domain = watchAll.domain;
        if (!domain) return null;

        if (watchAll.format === "custom") {
            return watchAll.customAlias.trim() ? `${watchAll.customAlias}@${domain}` : null;
        }

        let address = "";
        for (let i = 0; i < 3; i++) {
            address = `${generateAliasAddress({
                format: watchAll.format,
                characterCount: watchAll.characterCount,
                wordCount: watchAll.wordCount,
                separator: watchAll.separator,
                customPrefix: watchAll.customPrefix,
                prefixFormat: watchAll.prefixFormat,
                hostname,
            })}@${domain}`;

            if (!emailRules.data?.find((r) => r.matchers[0]?.value === address)) break;
        }

        return address;
    }

    useEffect(() => {
        setAliasPreview(createPreview());
    }, [
        hostname,
        zones.data,
        emailRules.data,
        watchAll.domain,
        watchAll.format,
        watchAll.customAlias,
        watchAll.characterCount,
        watchAll.wordCount,
        watchAll.separator,
        watchAll.prefixFormat,
        watchAll.customPrefix,
    ]);

    const previewExists = useMemo(
        () => emailRules.data?.some((r) => r.matchers[0]?.value === aliasPreview) ?? false,
        [aliasPreview, emailRules.data],
    );

    function saveSettings() {
        updateAliasSettings({
            domain: watchAll.domain,
            format: watchAll.format,
            characterCount: watchAll.characterCount,
            wordCount: watchAll.wordCount,
            separator: watchAll.separator,
            prefixFormat: watchAll.prefixFormat,
            destination: watchAll.destination,
        });
        toast({ body: tc("success"), uniqueID: "alias-settings-saved" });
    }

    function onSubmit(values: z.infer<typeof schema>) {
        const domainInfo = domains.find((d) => d.domain === values.domain);
        if (!domainInfo || !aliasPreview) {
            toast({ body: t("domain_not_found"), type: "error" });
            return;
        }

        if (emailRules.data?.find((r) => r.matchers[0]?.value === aliasPreview)) {
            toast({ body: t("alias_already_exists"), type: "error" });
            return;
        }

        const rule: Omit<CloudflareEmailRule, "tag"> = {
            actions: [{ type: "forward", value: [values.destination] }],
            matchers: [{ field: "to", type: "literal", value: aliasPreview }],
            enabled: true,
            name: `${EMAIL_RULE_NAME_PREFIX}${values.description}`,
            priority: Math.round(Date.now() / 1000),
        };

        createEmailRule.mutate(
            { zoneId: domainInfo.zoneId, rule },
            {
                onSuccess: (data) => {
                    saveSettings();
                    setCreateFormDraft(null);
                    if (copyAlias && data) {
                        navigator.clipboard.writeText(data.matchers[0]?.value ?? "");
                        toast({ body: t("created_and_copied") });
                    } else {
                        toast({ body: t("created_success") });
                    }
                    onClose();
                },
                onError: () => {
                    toast({ body: t("creation_error"), type: "error" });
                },
            },
        );
    }

    const domainOptions = domains.map((d) => ({ value: d.domain, label: d.domain }));
    const destinationOptions =
        emailDestinations.data?.map((d) => ({ value: d.email, label: d.email })) ?? [];

    const formatOptions = [
        { value: "characters", label: t("format_characters") },
        { value: "words", label: t("format_words") },
        ...(isExtension ? [{ value: "domain", label: t("format_domain") }] : []),
        { value: "custom", label: t("format_custom") },
    ];

    const prefixOptions =
        watchAll.format === "domain"
            ? [
                  { value: "domainWithoutExtension", label: t("prefix_domain_without_ext") },
                  { value: "domainWithExtension", label: t("prefix_domain_with_ext") },
                  { value: "fullDomain", label: t("prefix_full_domain") },
              ]
            : [
                  { value: "none", label: t("prefix_none") },
                  ...(isExtension
                      ? [
                            {
                                value: "domainWithoutExtension",
                                label: t("prefix_domain_without_ext"),
                            },
                            { value: "domainWithExtension", label: t("prefix_domain_with_ext") },
                            { value: "fullDomain", label: t("prefix_full_domain") },
                        ]
                      : []),
                  { value: "custom", label: t("prefix_custom") },
              ];

    const handleOpenChange = (isOpen: boolean) => !isOpen && onClose();
    const canRegenerate = watchAll.format === "characters" || watchAll.format === "words";

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose="form" width={440}>
            <DialogHeader title={t("title")} onOpenChange={handleOpenChange} />
            <form onSubmit={handleSubmit(onSubmit)}>
                <VStack gap={3} padding={4}>
                    <Selector
                        label={t("domain")}
                        options={domainOptions}
                        value={watchAll.domain || undefined}
                        onChange={(v) => setValue("domain", v)}
                        placeholder={t("domain")}
                        status={
                            errors.domain
                                ? { type: "error", message: errors.domain.message }
                                : undefined
                        }
                    />

                    <Selector
                        label={t("alias_format")}
                        options={formatOptions}
                        value={watchAll.format}
                        onChange={(v) => setValue("format", v as typeof watchAll.format)}
                    />

                    {watchAll.format === "characters" && (
                        <Controller
                            name="characterCount"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    label={t("number_of_chars")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    min={3}
                                    max={25}
                                />
                            )}
                        />
                    )}

                    {watchAll.format === "words" && (
                        <Controller
                            name="wordCount"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    label={t("number_of_words")}
                                    value={field.value}
                                    onChange={field.onChange}
                                    min={1}
                                    max={5}
                                />
                            )}
                        />
                    )}

                    {watchAll.format === "custom" && (
                        <Controller
                            name="customAlias"
                            control={control}
                            render={({ field }) => (
                                <TextInput
                                    label={t("custom_alias")}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                />
                            )}
                        />
                    )}

                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextInput
                                label={t("description")}
                                placeholder={t("description_placeholder")}
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                            />
                        )}
                    />

                    {watchAll.format !== "custom" && (
                        <Selector
                            label={t("prefix")}
                            options={prefixOptions}
                            value={watchAll.prefixFormat}
                            onChange={(v) =>
                                setValue("prefixFormat", v as typeof watchAll.prefixFormat)
                            }
                        />
                    )}

                    {watchAll.format !== "custom" && watchAll.prefixFormat === "custom" && (
                        <Controller
                            name="customPrefix"
                            control={control}
                            render={({ field }) => (
                                <TextInput
                                    label={t("prefix_custom_label")}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                />
                            )}
                        />
                    )}

                    <Selector
                        label={t("destination")}
                        options={destinationOptions}
                        value={watchAll.destination || undefined}
                        onChange={(v) => setValue("destination", v)}
                        placeholder={t("destination")}
                        status={
                            errors.destination
                                ? { type: "error", message: errors.destination.message }
                                : undefined
                        }
                    />

                    <HStack gap={2} align="end">
                        <TextInput
                            label={t("generated_alias")}
                            value={aliasPreview ?? t("generated_alias_unavailable")}
                            isReadOnly
                            width="100%"
                            status={
                                previewExists
                                    ? { type: "error", message: t("alias_already_exists") }
                                    : undefined
                            }
                        />
                        {canRegenerate && (
                            <IconButton
                                label={t("regenerate")}
                                tooltip={t("regenerate")}
                                icon={<TbRefresh />}
                                onClick={() => setAliasPreview(createPreview())}
                            />
                        )}
                    </HStack>

                    <HStack gap={2}>
                        <Button label={t("save_settings")} width="100%" onClick={saveSettings} />
                        <Button
                            type="submit"
                            variant="primary"
                            label={tc("create")}
                            width="100%"
                            isLoading={createEmailRule.isPending}
                            isDisabled={previewExists || !aliasPreview || !isOnline}
                            tooltip={!isOnline ? tc("offline") : undefined}
                        />
                    </HStack>
                </VStack>
            </form>
        </Dialog>
    );
}
