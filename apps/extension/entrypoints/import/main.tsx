import {
    MailflareProvider,
    ExtensionStorageAdapter,
    createExtensionPersister,
    ImportWizard,
} from "@mailflare/core";
import messages from "@mailflare/core/i18n/messages/en.json";
import React from "react";
import ReactDOM from "react-dom/client";

const storageAdapter = new ExtensionStorageAdapter();
const persister = createExtensionPersister(storageAdapter);
const locale = chrome.i18n?.getUILanguage?.()?.split("-")[0] || "en";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <MailflareProvider
            storageAdapter={storageAdapter}
            persister={persister}
            locale={locale}
            messages={messages}
            isExtension={true}
        >
            <ImportWizard />
        </MailflareProvider>
    </React.StrictMode>,
);
