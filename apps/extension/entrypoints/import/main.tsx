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
// Only English messages exist; format dates and numbers to match them.
const locale = "en";

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
