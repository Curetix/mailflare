import { Banner } from "@astryxdesign/core/Banner";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";

import { sessionFromCookie } from "../account/account-client";
import { useAccountErrorMessage } from "../account/use-account-error";
import { useCloudflareConfig } from "../api/config-context";
import { useAuthStore } from "../stores/auth-store";
import { AccountLogin } from "./account-login";
import {
    AuthorizePage,
    isExtensionRedirect,
    ResetPasswordPage,
    VerifyDestinationPage,
} from "./account-pages";
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
        /** `/authorize`: the extension asks to connect (see AuthorizePage). */
        authorize: pathname === "/authorize" ? (searchParams.get("redirect_uri") ?? "") : null,
        error: searchParams.get("error"),
    };
}

/**
 * The app a Worker serves itself: handles the pages its emails link to, and
 * signs in with the session an email link (verification, magic link) left.
 */
function LockedApp({ url }: { url: string }) {
    const apiToken = useAuthStore((s) => s.apiToken);
    const t = useTranslations("account");
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

    // Sign in with a cookie session an email link left: on start, and when the
    // window gets focus again (a magic link opened in another tab).
    useEffect(() => {
        if (apiToken) return;
        let cancelled = false;
        const check = () =>
            sessionFromCookie(url)
                .then((token) =>
                    token && !cancelled
                        ? connect.mutateAsync({ kind: "worker", url, token })
                        : null,
                )
                .catch(() => {})
                .finally(() => !cancelled && setCheckingSession(false));
        void check();
        window.addEventListener("focus", check);
        return () => {
            cancelled = true;
            window.removeEventListener("focus", check);
        };
    }, [apiToken]);

    if (location.page) {
        const { Page, token } = location.page;
        return <Page url={url} token={token} onDone={goHome} />;
    }
    if (location.authorize !== null) {
        const redirectUri = location.authorize;
        if (!isExtensionRedirect(redirectUri)) {
            return <Banner status="error" title={t("authorize.invalid")} />;
        }
        if (apiToken) {
            return <AuthorizePage url={url} apiToken={apiToken} redirectUri={redirectUri} />;
        }
        return checkingSession ? (
            <Spinner />
        ) : (
            <VStack gap={3}>
                <Banner status="info" title={t("authorize.sign_in_first")} />
                <AccountLogin url={url} />
            </VStack>
        );
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
