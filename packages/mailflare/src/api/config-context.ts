import { createContext, useContext } from "react";

type CloudflareConfig = {
    apiBaseUrl?: string;
    isExtension: boolean;
    /**
     * Set when a Mailflare Worker serves the app itself: the app only connects
     * to that Worker, and offers its accounts.
     */
    lockedWorkerUrl?: string;
    /**
     * Signs in to a Worker with an account through the Worker's own app (its
     * `/authorize` page); resolves to a session token. The extension provides it.
     */
    connectWorkerAccount?: (workerUrl: string) => Promise<string>;
};

const CloudflareConfigContext = createContext<CloudflareConfig>({
    isExtension: false,
});

export const CloudflareConfigProvider = CloudflareConfigContext.Provider;

export function useCloudflareConfig() {
    return useContext(CloudflareConfigContext);
}
