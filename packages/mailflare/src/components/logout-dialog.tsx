import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useToast } from "@astryxdesign/core/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { signOutAccount } from "../account/account-client";
import { useStorage } from "../storage/context";
import { StorageKeys } from "../storage/storage";
import { useAuthStore } from "../stores/auth-store";

type Props = {
    open: boolean;
    onClose: () => void;
    /** Called after logging out, for example to close the surrounding drawer. */
    onLoggedOut?: () => void;
};

export function LogoutDialog({ open, onClose, onLoggedOut }: Props) {
    const t = useTranslations("settings.logout");
    const tc = useTranslations("common");
    const toast = useToast();
    const queryClient = useQueryClient();
    const logout = useAuthStore((s) => s.logout);
    const storageAdapter = useStorage();

    async function handleLogout() {
        // End an account session on the Worker too, so its token stops working
        // (and a Worker-served app doesn't sign back in with the cookie).
        const { apiToken, workerUrl } = useAuthStore.getState();
        if (apiToken && workerUrl) await signOutAccount(workerUrl, apiToken);
        logout();
        await queryClient.invalidateQueries();
        await storageAdapter.remove(StorageKeys.QueryCache);
        toast({ body: t("success") });
        onClose();
        onLoggedOut?.();
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
