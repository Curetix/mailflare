import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
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

export function AliasBulkDeleteDialog({ open, onClose, selectedAliases }: Props) {
    const t = useTranslations("alias_bulk_delete");
    const td = useTranslations("alias_delete");
    const tc = useTranslations("common");
    const toast = useToast();
    const { apiBaseUrl } = useCloudflareConfig();
    const { selectedZoneId, deleteEmailRule } = useCloudflare(apiBaseUrl);
    const { isOnline } = useOnlineStatus();
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleDelete() {
        if (!isOnline) {
            toast({ body: tc("offline"), type: "error" });
            return;
        }

        setIsSubmitting(true);
        try {
            await Promise.all(
                selectedAliases.map((a) =>
                    deleteEmailRule.mutateAsync({ rule: a.toEmailRule(), zoneId: selectedZoneId }),
                ),
            );
            toast({ body: t("success") });
            onClose(true);
        } catch (error) {
            toast({ body: String(error), type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AlertDialog
            isOpen={open}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            title={t("title")}
            description={`${t("question", { count: selectedAliases.length })} ${td("question_2")}`}
            actionLabel={tc("delete")}
            cancelLabel={tc("no")}
            onAction={handleDelete}
            isActionLoading={isSubmitting}
        />
    );
}
