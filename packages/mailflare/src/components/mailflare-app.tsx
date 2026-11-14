import { useAuthStore } from "../stores/auth-store";
import { AliasList } from "./alias-list";
import { AppLayout } from "./app-layout";
import { Login } from "./login";

export function MailflareApp() {
    const apiToken = useAuthStore((s) => s.apiToken);

    if (!apiToken) {
        return (
            <AppLayout>
                <Login />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <AliasList />
        </AppLayout>
    );
}
