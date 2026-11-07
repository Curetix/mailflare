import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
import { useTranslations } from "use-intl";

import { useCloudflareConfig } from "../api/config-context";
import { useCloudflare } from "../api/use-cloudflare";
import { useOnlineStatus } from "../hooks/use-online-status";
import type { Alias } from "../utils/alias";

type Props = {
    open: boolean;
    onClose: () => void;
    alias: Alias | null;
};

export function AliasDeleteDialog({ open, onClose, alias }: Props) {
    const t = useTranslations("alias_delete");
    const tc = useTranslations("common");
    const toast = useToast();
    const { apiBaseUrl } = useCloudflareConfig();
    const { selectedZoneId, deleteEmailRule } = useCloudflare(apiBaseUrl);
    const { isOnline } = useOnlineStatus();

    function handleDelete() {
        if (!alias) return;
        if (!isOnline) {
            toast({ body: tc("offline"), type: "error" });
            return;
        }

        deleteEmailRule.mutate(
            { rule: alias.toEmailRule(), zoneId: selectedZoneId },
            {
                onSuccess: () => {
                    toast({ body: t("success") });
                    onClose();
                },
                onError: (error) => {
                    toast({ body: t("error", { error: String(error) }), type: "error" });
                },
            },
        );
    }

    return (
        <AlertDialog
            isOpen={open}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            title={t("title")}
            description={`${t("question_1")} ${alias?.address ?? ""}? ${t("question_2")}`}
            actionLabel={tc("delete")}
            cancelLabel={tc("no")}
            onAction={handleDelete}
            isActionLoading={deleteEmailRule.isPending}
        />
    );
}
