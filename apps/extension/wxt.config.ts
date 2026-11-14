import { defineConfig } from "wxt";

export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    imports: false,
    manifest: {
        name: "MailFlare - Email Alias Extension",
        description:
            "Create and manage email aliases using Cloudflare Email Routing directly from your browser.",
        // identity: signing in to a Mailflare Worker with an account.
        permissions: ["contextMenus", "storage", "clipboardWrite", "activeTab", "identity"],
        host_permissions: ["https://api.cloudflare.com/*"],
    },
});
