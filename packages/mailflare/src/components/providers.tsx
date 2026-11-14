import { Theme } from "@astryxdesign/core/theme";
import { ToastViewport } from "@astryxdesign/core/Toast";
import { QueryClient } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { CloudflareConfigProvider } from "../api/config-context";
import { IntlProvider, type Messages } from "../i18n";
import { StorageProvider } from "../storage/context";
import type { StorageAdapter } from "../storage/storage";
import { initAliasSettingsStore, hydrateAliasSettingsStore } from "../stores/alias-settings-store";
import { initAuthStore, hydrateAuthStore } from "../stores/auth-store";
import {
    initSettingsStore,
    hydrateSettingsStore,
    useSettingsStore,
} from "../stores/settings-store";
import { initUISessionStorage, hydrateUIStore } from "../stores/ui-store";
import { themes, defaultThemeSlug } from "../styles";

export type MailflareProviderProps = {
    children: ReactNode;
    storageAdapter: StorageAdapter;
    persister: Persister;
    locale: string;
    messages: Messages;
    apiBaseUrl?: string;
    isExtension?: boolean;
    /** The Worker's origin, when the Worker serves the app (see CloudflareConfig). */
    lockedWorkerUrl?: string;
    /** Account sign-in for Workers (see CloudflareConfig). */
    connectWorkerAccount?: (workerUrl: string) => Promise<string>;
    sessionStorageAdapter?: StorageAdapter;
};

/** Applies the Mailflare theme, following the user's light/dark/system setting. */
function ThemeProvider({ children }: { children: ReactNode }) {
    const mode = useSettingsStore((s) => s.theme);
    return (
        <Theme theme={themes[defaultThemeSlug]} mode={mode}>
            <ToastViewport position="bottomEnd" maxVisible={3}>
                {children}
            </ToastViewport>
        </Theme>
    );
}

export function MailflareProvider({
    children,
    storageAdapter,
    persister,
    locale,
    messages,
    apiBaseUrl,
    isExtension = false,
    lockedWorkerUrl,
    connectWorkerAccount,
    sessionStorageAdapter,
}: MailflareProviderProps) {
    const [hydrated, setHydrated] = useState(false);
    const queryClientRef = useRef(
        new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                    gcTime: Number.POSITIVE_INFINITY,
                    networkMode: "offlineFirst",
                },
                mutations: {
                    networkMode: "offlineFirst",
                },
            },
        }),
    );

    useEffect(() => {
        initAuthStore(storageAdapter);
        initSettingsStore(storageAdapter);
        initAliasSettingsStore(storageAdapter);
        if (sessionStorageAdapter) {
            initUISessionStorage(sessionStorageAdapter);
        }

        const hydrations = [
            hydrateAuthStore(storageAdapter),
            hydrateSettingsStore(storageAdapter),
            hydrateAliasSettingsStore(storageAdapter),
        ];
        if (sessionStorageAdapter) {
            hydrations.push(hydrateUIStore(sessionStorageAdapter));
        }
        Promise.all(hydrations).then(() => setHydrated(true));
    }, [storageAdapter, sessionStorageAdapter]);

    if (!hydrated) return null;

    return (
        <StorageProvider value={storageAdapter}>
            <PersistQueryClientProvider
                client={queryClientRef.current}
                persistOptions={{ persister }}
            >
                <IntlProvider locale={locale} messages={messages}>
                    <CloudflareConfigProvider
                        value={{ apiBaseUrl, isExtension, lockedWorkerUrl, connectWorkerAccount }}
                    >
                        <ThemeProvider>{children}</ThemeProvider>
                    </CloudflareConfigProvider>
                </IntlProvider>
            </PersistQueryClientProvider>
        </StorageProvider>
    );
}
