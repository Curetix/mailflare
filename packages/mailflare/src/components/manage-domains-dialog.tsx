// Worker mode: the Worker stores its domains and destinations itself, so the
// app manages them (in Cloudflare mode they live in the Cloudflare dashboard).

import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import type { UseMutationResult } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { TbTrash } from "react-icons/tb";
import { useTranslations } from "use-intl";

import { useMailflare } from "../backend/use-mailflare";
import { useOnlineStatus } from "../hooks/use-online-status";

type Item = { id: string; label: string };

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
    description: string;
    items: Item[];
    inputLabel: string;
    placeholder: string;
    inputType: "text" | "email";
    add: UseMutationResult<unknown, Error, string>;
    remove: UseMutationResult<unknown, Error, string>;
}) {
    const t = useTranslations("manage_domains");
    const tc = useTranslations("common");
    const toast = useToast();
    const { isOnline } = useOnlineStatus();
    const [value, setValue] = useState("");

    const onError = (error: Error) => toast({ body: error.message, type: "error" });

    function submit(event: FormEvent) {
        event.preventDefault();
        if (!value.trim()) return;
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
                        </HStack>
                    ))}
                </VStack>
            )}

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
                        label={t("add")}
                        isLoading={add.isPending}
                        isDisabled={!isOnline || !value.trim()}
                    />
                </HStack>
            </form>
        </VStack>
    );
}

export function ManageDomainsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("manage_domains");
    const { zones, destinations, addDomain, removeDomain, addDestination, removeDestination } =
        useMailflare();

    const handleOpenChange = (isOpen: boolean) => !isOpen && onClose();

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} width={440}>
            <Layout header={<DialogHeader title={t("title")} onOpenChange={handleOpenChange} />}>
                <LayoutContent>
                    <VStack gap={5}>
                        <ManagedList
                            title={t("domains")}
                            description={t("domains_description")}
                            items={(zones.data ?? []).map((z) => ({ id: z.id, label: z.name }))}
                            inputLabel={t("domain_input")}
                            placeholder="example.com"
                            inputType="text"
                            add={addDomain}
                            remove={removeDomain}
                        />
                        <ManagedList
                            title={t("destinations")}
                            description={t("destinations_description")}
                            items={(destinations.data ?? []).map((d) => ({
                                id: d.id,
                                label: d.email,
                            }))}
                            inputLabel={t("destination_input")}
                            placeholder="you@example.org"
                            inputType="email"
                            add={addDestination}
                            remove={removeDestination}
                        />
                    </VStack>
                </LayoutContent>
            </Layout>
        </Dialog>
    );
}
