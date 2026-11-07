import { createContext, useContext } from "react";

type CloudflareConfig = {
    apiBaseUrl?: string;
    isExtension: boolean;
};

const CloudflareConfigContext = createContext<CloudflareConfig>({
    isExtension: false,
});

export const CloudflareConfigProvider = CloudflareConfigContext.Provider;

export function useCloudflareConfig() {
    return useContext(CloudflareConfigContext);
}
