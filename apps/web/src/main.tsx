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

// Only English messages exist; format dates and numbers to match them.
const locale = "en";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MailflareProvider
            storageAdapter={storageAdapter}
            persister={persister}
            locale={locale}
            messages={messages}
            apiBaseUrl="/api"
            isExtension={false}
            lockedWorkerUrl={import.meta.env.VITE_LOCKED_WORKER ? location.origin : undefined}
        >
            <MailflareApp />
        </MailflareProvider>
    </StrictMode>,
);
