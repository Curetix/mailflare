import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useStorage } from "../storage/context";
import { StorageKeys } from "../storage/storage";
import { useAuthStore } from "../stores/auth-store";

type Props = {
    open: boolean;
    onClose: () => void;
};

export function LogoutDialog({ open, onClose }: Props) {
    const t = useTranslations("settings.logout");
    const tc = useTranslations("common");
    const toast = useToast();
    const queryClient = useQueryClient();
    const logout = useAuthStore((s) => s.logout);
    const storageAdapter = useStorage();

    async function handleLogout() {
        logout();
        await queryClient.invalidateQueries();
        await storageAdapter.remove(StorageKeys.QueryCache);
        toast({ body: t("success") });
        onClose();
    }

    return (
        <AlertDialog
            isOpen={open}
            onOpenChange={(isOpen) => !isOpen && onClose()}
            title={t("dialog.title")}
            description={t("dialog.description")}
            actionLabel={tc("yes")}
            cancelLabel={tc("no")}
            onAction={handleLogout}
            width={320}
        />
    );
}
