import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
    matches: ["<all_urls>"],
    main() {
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

const ALERT_CONTAINER_ID = "mailflare-alerts";

function getOrCreateContainer(): HTMLElement {
    let container = document.getElementById(ALERT_CONTAINER_ID);
    if (!container) {
        container = document.createElement("div");
        container.id = ALERT_CONTAINER_ID;
        container.style.cssText =
            "position:fixed;top:16px;right:16px;z-index:999999;display:flex;flex-direction:column;gap:8px;max-width:350px;";
        document.body.appendChild(container);
    }
    return container;
}

function showAlert(alert: {
    id: number;
    type?: string;
    message: string;
    timeout?: number;
    isLoading?: boolean;
}) {
    const container = getOrCreateContainer();
    const el = document.createElement("div");
    el.id = `mailflare-alert-${alert.id}`;
    const bg =
        alert.type === "error" ? "#e53e3e" : alert.type === "success" ? "#38a169" : "#3182ce";
    el.style.cssText = `padding:12px 16px;background:${bg};color:#fff;border-radius:8px;font:14px/1.4 system-ui;box-shadow:0 4px 12px rgba(0,0,0,.15);`;
    el.textContent = alert.isLoading ? `⏳ ${alert.message}` : alert.message;
    container.appendChild(el);

    if (alert.timeout) {
        setTimeout(() => dismissAlert(alert.id), alert.timeout);
    }
}

function dismissAlert(id: number) {
    document.getElementById(`mailflare-alert-${id}`)?.remove();
}
