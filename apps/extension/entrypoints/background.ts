import {
    CloudflareApiClient,
    Alias,
    StorageKeys,
    type AliasSettings,
} from "@mailflare/core/headless";
import { defineBackground } from "wxt/utils/define-background";

import type { ContentScriptAlert } from "../utils/alerts";

type TabMessage =
    | { command: "copyText"; text: string }
    | { command: "clearClipboard" }
    | { command: "showAlert"; alert: ContentScriptAlert }
    | { command: "dismissAlert"; id: number };

async function sendTabMessage(tabId: number | undefined, message: TabMessage) {
    if (!tabId) return;
    return chrome.tabs.sendMessage(tabId, message);
}

async function generateAliasInBackground(hostname: string): Promise<Alias> {
    const storage = await chrome.storage.local.get([
        StorageKeys.ApiToken,
        StorageKeys.ZoneId,
        StorageKeys.AliasSettings,
    ]);

    const apiToken = storage[StorageKeys.ApiToken] as string | undefined;
    const zoneId = storage[StorageKeys.ZoneId] as string | undefined;
    const aliasSettings = storage[StorageKeys.AliasSettings] as AliasSettings | undefined;

    if (!apiToken) throw new Error("You are not logged in to MailFlare");
    if (!zoneId) throw new Error("No domain selected in MailFlare");
    if (!aliasSettings?.destination) throw new Error("No destination configured in MailFlare");
    if (aliasSettings.format === "custom" || aliasSettings.prefixFormat === "custom") {
        throw new Error("Cannot generate alias with custom format from background");
    }

    const apiClient = new CloudflareApiClient(apiToken);
    const zones = await apiClient.getZones();
    const zone = zones.success ? zones.result.find((z) => z.id === zoneId) : undefined;

    if (!zone) throw new Error("Selected domain is not valid");

    const alias = Alias.fromOptions(
        { ...aliasSettings, hostname },
        zone.name,
        aliasSettings.destination,
        hostname,
    );

    const result = await apiClient.createEmailRule(zoneId, alias.toEmailRule());
    if (!result.success) throw new Error(result.errors[0]?.message ?? "Could not create alias");

    return alias;
}

export default defineBackground(() => {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId !== "mailflare-generate" || !info.pageUrl) return;

        const loadingAlertId = Date.now();
        await sendTabMessage(tab?.id, {
            command: "showAlert",
            alert: { id: loadingAlertId, message: "Creating new alias...", isLoading: true },
        });

        try {
            const alias = await generateAliasInBackground(new URL(info.pageUrl).hostname);
            await sendTabMessage(tab?.id, {
                command: "showAlert",
                alert: {
                    id: Date.now(),
                    type: "success",
                    message: `Alias created: ${alias.address}`,
                    timeout: 5000,
                },
            });
            await sendTabMessage(tab?.id, { command: "copyText", text: alias.toString() });
        } catch (error: any) {
            await sendTabMessage(tab?.id, {
                command: "showAlert",
                alert: { id: Date.now(), type: "error", message: error.message },
            });
        } finally {
            await sendTabMessage(tab?.id, { command: "dismissAlert", id: loadingAlertId });
        }
    });

    // Quick-create button in email inputs (content script).
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message?.command !== "generateAlias") return;
        // Use the sender's URL, not anything from the message, for the hostname.
        const hostname = sender.url ? new URL(sender.url).hostname : undefined;
        if (!sender.tab || !hostname) {
            sendResponse({ success: false, message: "Unknown page" });
            return;
        }
        generateAliasInBackground(hostname)
            .then((alias) => sendResponse({ success: true, alias: alias.toString() }))
            .catch((error: unknown) =>
                sendResponse({
                    success: false,
                    message: error instanceof Error ? error.message : String(error),
                }),
            );
        return true; // Keep the channel open for the async response.
    });

    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            title: "Generate and copy new MailFlare alias",
            contexts: ["page", "editable"],
            id: "mailflare-generate",
        });
    });
});
