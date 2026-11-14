// Worker mode: the Worker stores its domains and destinations itself, so the
// app manages them (in Cloudflare mode they live in the Cloudflare dashboard).
// Admins add, remove and share domains; accounts see the shared ones and
// confirm the mailboxes they add.

import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import type { UseMutationResult } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";
import { TbTrash } from "react-icons/tb";
import { useTranslations } from "use-intl";

import { useMailflare } from "../backend/use-mailflare";
import { useOnlineStatus } from "../hooks/use-online-status";

type Item = { id: string; label: string; extra?: ReactNode };

function ManagedList({
    title,
    description,
    items,
    inputLabel,
    placeholder,
    inputType,
    add,
    remove,
}: {
    title: string;
    description: ReactNode;
    items: Item[];
    inputLabel: string;
    placeholder: string;
    inputType: "text" | "email";
    /** Without add and remove, the list is read-only. */
    add?: UseMutationResult<unknown, Error, string>;
    remove?: UseMutationResult<unknown, Error, string>;
}) {
    const t = useTranslations("manage_domains");
    const tc = useTranslations("common");
    const toast = useToast();
    const { isOnline } = useOnlineStatus();
    const [value, setValue] = useState("");

    const onError = (error: Error) => toast({ body: error.message, type: "error" });

    function submit(event: FormEvent) {
        event.preventDefault();
        if (!value.trim() || !add) return;
        add.mutate(value.trim(), { onSuccess: () => setValue(""), onError });
    }

    return (
        <VStack gap={2}>
            <VStack gap={0.5}>
                <Text weight="medium">{title}</Text>
                <Text type="supporting">{description}</Text>
            </VStack>

            {items.length === 0 ? (
                <Text type="supporting">{t("empty")}</Text>
            ) : (
                <VStack gap={1}>
                    {items.map((item) => (
                        <HStack key={item.id} gap={2} align="center">
                            <Text maxLines={1} style={{ flex: 1, minWidth: 0 }}>
                                {item.label}
                            </Text>
                            {item.extra}
                            {remove && (
                                <IconButton
                                    variant="ghost"
                                    size="sm"
                                    label={`${tc("delete")} ${item.label}`}
                                    tooltip={tc("delete")}
                                    icon={<TbTrash />}
                                    isDisabled={!isOnline}
                                    isLoading={remove.isPending && remove.variables === item.id}
                                    onClick={() => remove.mutate(item.id, { onError })}
                                />
                            )}
                        </HStack>
                    ))}
                </VStack>
            )}

            {add && (
                <form onSubmit={submit}>
                    <HStack gap={2} align="end">
                        <TextInput
                            type={inputType}
                            label={inputLabel}
                            isLabelHidden
                            placeholder={placeholder}
                            value={value}
                            onChange={setValue}
                            width="100%"
                        />
                        <Button
                            type="submit"
                            style={{ flexShrink: 0 }}
                            label={t("add")}
                            isLoading={add.isPending}
                            isDisabled={!isOnline || !value.trim()}
                        />
                    </HStack>
                </form>
            )}
        </VStack>
    );
}

export function ManageDomainsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("manage_domains");
    const toast = useToast();
    const { isOnline } = useOnlineStatus();
    const {
        account,
        canEditDomains,
        zones,
        destinations,
        addDomain,
        removeDomain,
        addDestination,
        removeDestination,
        resendConfirmation,
        setDomainShared,
    } = useMailflare();

    const handleOpenChange = (isOpen: boolean) => !isOpen && onClose();
    const onError = (error: Error) => toast({ body: error.message, type: "error" });
    // Accounts confirm new mailboxes by email; the admin token's are trusted.
    const isAccount = !!account.data?.user;
    const limits = account.data?.limits;

    const domainItems: Item[] = (zones.data ?? []).map((zone) => ({
        id: zone.id,
        label: zone.name,
        extra: canEditDomains && (
            <>
                <Text type="supporting">{t("shared")}</Text>
                <Switch
                    label={t("shared_label", { domain: zone.name })}
                    isLabelHidden
                    value={zone.shared ?? false}
                    isDisabled={!isOnline || setDomainShared.isPending}
                    onChange={(shared) =>
                        setDomainShared.mutate({ zoneId: zone.id, shared }, { onError })
                    }
                />
            </>
        ),
    }));

    const destinationItems: Item[] = (destinations.data ?? []).map((destination) => ({
        id: destination.id,
        label: destination.email,
        extra: !destination.verified && (
            <>
                <Badge variant="warning" label={t("unconfirmed")} />
                <Button
                    size="sm"
                    variant="ghost"
                    label={t("resend")}
                    isDisabled={!isOnline}
                    isLoading={
                        resendConfirmation.isPending &&
                        resendConfirmation.variables === destination.id
                    }
                    onClick={() =>
                        resendConfirmation.mutate(destination.id, {
                            onSuccess: () =>
                                toast({ body: t("resent", { email: destination.email }) }),
                            onError,
                        })
                    }
                />
            </>
        ),
    }));

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} width={480}>
            <Layout header={<DialogHeader title={t("title")} onOpenChange={handleOpenChange} />}>
                <LayoutContent>
                    <VStack gap={5}>
                        <ManagedList
                            title={t("domains")}
                            description={
                                canEditDomains ? (
                                    <>
                                        {t("domains_description")} {t("shared_hint")}
                                    </>
                                ) : (
                                    t("domains_description_account")
                                )
                            }
                            items={domainItems}
                            inputLabel={t("domain_input")}
                            placeholder="example.com"
                            inputType="text"
                            add={canEditDomains ? addDomain : undefined}
                            remove={canEditDomains ? removeDomain : undefined}
                        />
                        <ManagedList
                            title={t("destinations")}
                            description={
                                isAccount
                                    ? t("destinations_description_account")
                                    : t("destinations_description")
                            }
                            items={destinationItems}
                            inputLabel={t("destination_input")}
                            placeholder="you@example.org"
                            inputType="email"
                            add={addDestination}
                            remove={removeDestination}
                        />
                        {limits && (
                            <Text type="supporting">
                                {t("limits", {
                                    aliases: limits.aliases,
                                    destinations: limits.destinations,
                                    sends: limits.sendsPerDay,
                                })}
                            </Text>
                        )}
                    </VStack>
                </LayoutContent>
            </Layout>
        </Dialog>
    );
}
