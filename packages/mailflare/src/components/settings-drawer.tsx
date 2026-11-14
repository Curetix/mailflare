import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Drawer, DrawerHeader } from "@astryxdesign/core/Drawer";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useQueryClient } from "@tanstack/react-query";
import { Fragment, type ReactNode, useState } from "react";
import { LuExternalLink, LuImport, LuSettings } from "react-icons/lu";
import { useTranslations } from "use-intl";

import { useCloudflareConfig } from "../api/config-context";
import { useMailflare } from "../backend/use-mailflare";
import { GITHUB_LINK } from "../const";
import { useAuthStore } from "../stores/auth-store";
import { type Settings, useSettingsStore } from "../stores/settings-store";
import { LogoutDialog } from "./logout-dialog";

type SettingsItem = {
    key: string;
    title: string;
    description?: string;
    action: ReactNode;
    hide?: boolean;
};

function SettingsList() {
    const queryClient = useQueryClient();
    const t = useTranslations("settings");
    const tc = useTranslations("common");
    const toast = useToast();
    const { isExtension } = useCloudflareConfig();
    const { zones, destinations } = useMailflare();

    const apiToken = useAuthStore((s) => s.apiToken);
    const settings = useSettingsStore();
    const updateSettings = useSettingsStore((s) => s.updateSettings);

    const [logoutOpen, setLogoutOpen] = useState(false);

    function toggle(key: "ruleFilter" | "copyAlias" | "showCreateButton", title: string) {
        return (
            <Switch
                label={title}
                isLabelHidden
                value={settings[key]}
                onChange={(checked) => updateSettings({ [key]: checked })}
            />
        );
    }

    const settingsItems: SettingsItem[] = [
        {
            key: "theme",
            title: t("theme.title"),
            description: t("theme.description"),
            action: (
                <Selector
                    label={t("theme.title")}
                    isLabelHidden
                    size="sm"
                    width={120}
                    value={settings.theme}
                    onChange={(value) => updateSettings({ theme: value as Settings["theme"] })}
                    options={[
                        { value: "light", label: t("theme.light") },
                        { value: "dark", label: t("theme.dark") },
                        { value: "system", label: t("theme.auto") },
                    ]}
                />
            ),
        },
        {
            key: "locale",
            title: t("language.title"),
            description: t("language.description"),
            action: (
                <Selector
                    label={t("language.title")}
                    isLabelHidden
                    size="sm"
                    width={120}
                    value="en"
                    onChange={() => {}}
                    options={[{ value: "en", label: t("language.english") }]}
                />
            ),
        },
        {
            key: "filter",
            title: t("filter.title"),
            description: t("filter.description"),
            hide: !apiToken,
            action: toggle("ruleFilter", t("filter.title")),
        },
        {
            key: "copy",
            title: t("copy.title"),
            description: t("copy.description"),
            hide: !apiToken,
            action: toggle("copyAlias", t("copy.title")),
        },
        {
            key: "create-button",
            title: t("quick_create.title"),
            description: t("quick_create.description"),
            hide: !apiToken || !isExtension,
            action: toggle("showCreateButton", t("quick_create.title")),
        },
        {
            key: "refresh",
            title: t("refresh.title"),
            description: t("refresh.description"),
            hide: !apiToken,
            action: (
                <Button
                    size="sm"
                    label={t("refresh.action")}
                    isLoading={zones.isFetching || destinations.isFetching}
                    clickAction={async () => {
                        await queryClient.invalidateQueries();
                        toast({ body: t("refresh.success") });
                    }}
                />
            ),
        },
        {
            key: "logout",
            title: t("logout.title"),
            description: t("logout.description"),
            hide: !apiToken,
            action: (
                <Button
                    size="sm"
                    variant="destructive"
                    label={t("logout.action")}
                    onClick={() => setLogoutOpen(true)}
                />
            ),
        },
        {
            key: "import",
            title: t("import.title"),
            description: t("import.description"),
            hide: !apiToken || !isExtension,
            action: (
                <Button
                    size="sm"
                    label={t("import.action")}
                    icon={<LuImport />}
                    onClick={() => {
                        window.open(
                            (globalThis as any).chrome.runtime.getURL("/import.html"),
                            "_blank",
                        );
                    }}
                />
            ),
        },
        {
            key: "docs-link",
            title: t("docs.title"),
            description: t("docs.description"),
            action: (
                <Button
                    size="sm"
                    variant="ghost"
                    label={tc("open")}
                    endContent={<LuExternalLink />}
                    href="https://developers.cloudflare.com/email-routing/"
                    target="_blank"
                />
            ),
        },
        {
            key: "info",
            title: t("info"),
            description: "MailFlare v2",
            action: (
                <Button
                    size="sm"
                    variant="ghost"
                    label="GitHub"
                    endContent={<LuExternalLink />}
                    href={GITHUB_LINK}
                    target="_blank"
                />
            ),
        },
    ];

    const visibleItems = settingsItems.filter((item) => !item.hide);

    return (
        <VStack gap={2}>
            {visibleItems.map((item, index) => (
                <Fragment key={item.key}>
                    <HStack justify="between" align="center" gap={3}>
                        <VStack gap={0.5} style={{ flex: 1, minWidth: 0 }}>
                            <Text weight="medium">{item.title}</Text>
                            {item.description && <Text type="supporting">{item.description}</Text>}
                        </VStack>
                        {item.action}
                    </HStack>
                    {index < visibleItems.length - 1 && <Divider />}
                </Fragment>
            ))}
            <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
        </VStack>
    );
}

export function SettingsDrawer() {
    const [open, setOpen] = useState(false);
    const t = useTranslations("settings");

    return (
        <>
            <IconButton
                variant="ghost"
                size="sm"
                label={t("title")}
                tooltip={t("title")}
                icon={<LuSettings />}
                onClick={() => setOpen(true)}
            />
            <Drawer
                isOpen={open}
                onOpenChange={setOpen}
                label={t("title")}
                width={360}
                experimental={{ isFullWidthOnMobile: true }}
            >
                <DrawerHeader title={t("title")} onOpenChange={setOpen} />
                <VStack padding={4}>
                    <SettingsList />
                </VStack>
            </Drawer>
        </>
    );
}
