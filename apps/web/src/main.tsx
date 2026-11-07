import {
    MailflareProvider,
    MailflareApp,
    WebStorageAdapter,
    createWebPersister,
} from "@mailflare/core";
import messages from "@mailflare/core/i18n/messages/en.json";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const storageAdapter = new WebStorageAdapter();
const persister = createWebPersister(storageAdapter);

const locale = navigator.language.split("-")[0] || "en";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MailflareProvider
            storageAdapter={storageAdapter}
            persister={persister}
            locale={locale}
            messages={messages}
            apiBaseUrl="/api"
            isExtension={false}
        >
            <MailflareApp />
        </MailflareProvider>
    </StrictMode>,
);
