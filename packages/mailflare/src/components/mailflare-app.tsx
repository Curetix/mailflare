import { Spinner } from "@astryxdesign/core/Spinner";
import { useToast } from "@astryxdesign/core/Toast";
import { useEffect, useState } from "react";

import { sessionFromCookie } from "../account/account-client";
import { useAccountErrorMessage } from "../account/use-account-error";
import { useCloudflareConfig } from "../api/config-context";
import { useAuthStore } from "../stores/auth-store";
import { AccountLogin } from "./account-login";
import { ResetPasswordPage, VerifyDestinationPage } from "./account-pages";
import { AliasList } from "./alias-list";
import { AppLayout } from "./app-layout";
import { Login, useConnect } from "./login";

/** Pages email links open; only when a Worker serves the app. */
const LINK_PAGES: Record<string, typeof ResetPasswordPage | undefined> = {
    "/reset-password": ResetPasswordPage,
    "/verify-destination": VerifyDestinationPage,
};

/** Where an email link landed: a page with its token, or the app itself. */
function readLocation() {
    const { pathname, searchParams } = new URL(window.location.href);
    const Page = LINK_PAGES[pathname];
    const token = searchParams.get("token");
    return {
        page: Page && token ? { Page, token } : null,
        error: searchParams.get("error"),
    };
}

/**
 * The app a Worker serves itself: handles the pages its emails link to, and
 * signs in with the session an email link (verification, magic link) left.
 */
function LockedApp({ url }: { url: string }) {
    const apiToken = useAuthStore((s) => s.apiToken);
    const toast = useToast();
    const errorMessage = useAccountErrorMessage();
    const connect = useConnect();
    const [location, setLocation] = useState(readLocation);
    const [checkingSession, setCheckingSession] = useState(!apiToken);

    const goHome = () => {
        window.history.replaceState(null, "", "/");
        setLocation(readLocation());
    };

    useEffect(() => {
        if (!location.error) return;
        toast({ body: errorMessage({ code: location.error }), type: "error" });
        goHome();
        // Only for the error the page was opened with.
    }, [location.error]);

    useEffect(() => {
        if (apiToken) return;
        let cancelled = false;
        sessionFromCookie(url)
            .then((token) => (token ? connect.mutateAsync({ kind: "worker", url, token }) : null))
            .catch(() => {})
            .finally(() => !cancelled && setCheckingSession(false));
        return () => {
            cancelled = true;
        };
        // Once, on start.
    }, []);

    if (location.page) {
        const { Page, token } = location.page;
        return <Page url={url} token={token} onDone={goHome} />;
    }
    if (apiToken) return <AliasList />;
    return checkingSession ? <Spinner /> : <AccountLogin url={url} />;
}

export function MailflareApp() {
    const apiToken = useAuthStore((s) => s.apiToken);
    const { lockedWorkerUrl } = useCloudflareConfig();

    return (
        <AppLayout>
            {lockedWorkerUrl ? (
                <LockedApp url={lockedWorkerUrl} />
            ) : apiToken ? (
                <AliasList />
            ) : (
                <Login />
            )}
        </AppLayout>
    );
}
