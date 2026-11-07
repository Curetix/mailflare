import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { useCloudflareConfig } from "../api/config-context";
import { useCloudflare } from "../api/use-cloudflare";
import { useOnlineStatus } from "../hooks/use-online-status";
import type { Alias } from "../utils/alias";

type Props = {
    open: boolean;
    onClose: (clear?: boolean) => void;
    selectedAliases: Alias[];
};

export function AliasBulkEditDialog({ open, onClose, selectedAliases }: Props) {
    const t = useTranslations("alias_bulk_edit");
    const tf = useTranslations("alias_create");
    const tc = useTranslations("common");
    const toast = useToast();
    const { apiBaseUrl } = useCloudflareConfig();
    const { selectedZoneId, emailDestinations, updateEmailRule } = useCloudflare(apiBaseUrl);
    const { isOnline } = useOnlineStatus();

    const [destination, setDestination] = useState("");
    const [enabled, setEnabled] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const destinationOptions =
        emailDestinations.data?.map((d) => ({ value: d.email, label: d.email })) ?? [];

    async function handleSave() {
        setIsSubmitting(true);
        try {
            await Promise.all(
                selectedAliases.map((a) => {
                    const updated = Object.assign(
                        Object.create(Object.getPrototypeOf(a)),
                        a,
                    ) as Alias;
                    updated.enabled = enabled;
                    if (destination.trim() !== "") {
                        updated.destination = destination;
                    }
                    return updateEmailRule.mutateAsync({
                        rule: updated.toEmailRule(),
                        zoneId: selectedZoneId,
                    });
                }),
            );
            toast({ body: t("success") });
            onClose(true);
        } catch (error) {
            toast({ body: String(error), type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleOpenChange = (isOpen: boolean) => !isOpen && onClose();

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose="form">
            <Layout
                header={<DialogHeader title={t("title")} onOpenChange={handleOpenChange} />}
                footer={
                    <LayoutFooter hasDivider>
                        <Button
                            variant="primary"
                            label={tc("save")}
                            isLoading={isSubmitting}
                            isDisabled={!isOnline}
                            tooltip={!isOnline ? tc("offline") : undefined}
                            onClick={handleSave}
                        />
                    </LayoutFooter>
                }
            >
                <LayoutContent>
                    <VStack gap={3}>
                        <Selector
                            label={tf("destination")}
                            options={destinationOptions}
                            value={destination || null}
                            onChange={(value: string | null) => setDestination(value ?? "")}
                            placeholder={t("keep_destinations")}
                            hasClear
                        />

                        <Switch label={tc("enabled")} value={enabled} onChange={setEnabled} />
                    </VStack>
                </LayoutContent>
            </Layout>
        </Dialog>
    );
}
