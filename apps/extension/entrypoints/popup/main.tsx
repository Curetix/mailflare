import {
    MailflareProvider,
    MailflareApp,
    ExtensionStorageAdapter,
    SessionStorageAdapter,
    createExtensionPersister,
} from "@mailflare/core";
import messages from "@mailflare/core/i18n/messages/en.json";
import React from "react";
import ReactDOM from "react-dom/client";

const storageAdapter = new ExtensionStorageAdapter();
const sessionStorageAdapter = new SessionStorageAdapter();
const persister = createExtensionPersister(storageAdapter);
// Only English messages exist; format dates and numbers to match them.
const locale = "en";

type ConnectResponse = { success: true; token: string } | { success: false; message: string };

/**
 * Account sign-in runs in the background script: the sign-in window closes
 * this popup, and the background stores the session for its next opening.
 */
async function connectWorkerAccount(url: string): Promise<string> {
    const response = (await chrome.runtime.sendMessage({
        command: "connectWorkerAccount",
        url,
    })) as ConnectResponse;
    if (!response.success) throw new Error(response.message);
    return response.token;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <MailflareProvider
            storageAdapter={storageAdapter}
            persister={persister}
            locale={locale}
            messages={messages}
            isExtension={true}
            connectWorkerAccount={connectWorkerAccount}
            sessionStorageAdapter={sessionStorageAdapter}
        >
            <MailflareApp />
        </MailflareProvider>
    </React.StrictMode>,
);
