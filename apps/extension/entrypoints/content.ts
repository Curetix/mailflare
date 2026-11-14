import { defineContentScript } from "wxt/utils/define-content-script";

import { dismissAlert, showAlert } from "../utils/alerts";
import { type GenerateAliasResponse, initQuickCreate } from "../utils/quick-create";

export default defineContentScript({
    matches: ["<all_urls>"],
    main() {
        initQuickCreate({
            // The background worker creates the alias for this frame's hostname.
            generateAlias: () =>
                chrome.runtime.sendMessage<unknown, GenerateAliasResponse>({
                    command: "generateAlias",
                }),
            onError: (message) =>
                showAlert({ id: Date.now(), type: "error", message, timeout: 5000 }),
        });

        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            switch (message.command) {
                case "copyText":
                    navigator.clipboard.writeText(message.text).then(() => sendResponse(true));
                    return true;
                case "clearClipboard":
                    navigator.clipboard.writeText("").then(() => sendResponse(true));
                    return true;
                case "showAlert":
                    showAlert(message.alert);
                    sendResponse(true);
                    break;
                case "dismissAlert":
                    dismissAlert(message.id);
                    sendResponse(true);
                    break;
            }
        });
    },
});
