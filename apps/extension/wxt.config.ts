import { defineConfig } from "wxt";

export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    imports: false,
    // WXT defaults to MV2 for Firefox; Mailflare has shipped MV3 there since 1.x.
    manifestVersion: 3,
    manifest: ({ browser }) => ({
        name: "MailFlare - Email Alias Extension",
        description:
            "Create and manage email aliases using Cloudflare Email Routing directly from your browser.",
        // identity: signing in to a Mailflare Worker with an account.
        permissions: ["contextMenus", "storage", "clipboardWrite", "activeTab", "identity"],
        host_permissions: ["https://api.cloudflare.com/*"],
        // The ID 1.x was published under, so Firefox users get the update.
        ...(browser === "firefox" && {
            browser_specific_settings: {
                gecko: { id: "{f0bdc9fa-a062-4424-baee-16530c53aa06}" },
            },
        }),
    }),
});
