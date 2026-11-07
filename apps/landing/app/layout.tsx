import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "./theme-provider";

export const metadata: Metadata = {
    title: "MailFlare - Email Aliases with Cloudflare Email Routing",
    description:
        "Create email aliases with Cloudflare Email Routing. Browser extension and web app.",
    icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body style={{ margin: 0 }}>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
