import { useCloudflareConfig } from "../api/config-context";
import { useAuthStore } from "../stores/auth-store";
import { AliasList } from "./alias-list";
import { AppLayout } from "./app-layout";
import { Login } from "./login";

export function MailflareApp() {
    const apiToken = useAuthStore((s) => s.apiToken);
    const { apiBaseUrl } = useCloudflareConfig();

    if (!apiToken) {
        return (
            <AppLayout>
                <Login apiBaseUrl={apiBaseUrl} />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <AliasList apiBaseUrl={apiBaseUrl} />
        </AppLayout>
    );
}
