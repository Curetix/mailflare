import { defineConfig } from "wxt";

export default defineConfig({
    modules: ["@wxt-dev/module-react"],
    imports: false,
    manifest: {
        name: "MailFlare - Email Alias Extension",
        description:
            "Create and manage email aliases using Cloudflare Email Routing directly from your browser.",
        permissions: ["contextMenus", "storage", "clipboardWrite", "activeTab"],
        host_permissions: ["https://api.cloudflare.com/*"],
    },
});
