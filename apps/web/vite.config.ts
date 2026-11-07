import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
                name: "Mailflare",
                short_name: "Mailflare",
                description: "Create email aliases with Cloudflare Email Routing",
                theme_color: "#e8590c",
                background_color: "#ffffff",
                display: "standalone",
                icons: [
                    {
                        src: "/icon-192.svg",
                        sizes: "192x192",
                        type: "image/svg+xml",
                    },
                    {
                        src: "/icon-512.svg",
                        sizes: "512x512",
                        type: "image/svg+xml",
                    },
                ],
            },
        }),
    ],
    server: {
        proxy: {
            "/api": {
                target: "https://api.cloudflare.com/client/v4",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
        },
    },
});
