import { createContext, useContext } from "react";

type CloudflareConfig = {
    apiBaseUrl?: string;
    isExtension: boolean;
    /**
     * Set when a Mailflare Worker serves the app itself: the app only connects
     * to that Worker, and offers its accounts.
     */
    lockedWorkerUrl?: string;
};

const CloudflareConfigContext = createContext<CloudflareConfig>({
    isExtension: false,
});

export const CloudflareConfigProvider = CloudflareConfigContext.Provider;

export function useCloudflareConfig() {
    return useContext(CloudflareConfigContext);
}
