// Worker app, admins: the Worker's domains, and which accounts may use.

import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { useTranslations } from "use-intl";

import { useMailflare } from "../../backend/use-mailflare";
import { useLayout } from "../../hooks/use-layout";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { type Item, ManagedList } from "../managed-list";
import { PageBody, PageHeader } from "./page-header";

export function AdminDomainsPage() {
    const t = useTranslations("manage_domains");
    const tn = useTranslations("nav");
    const toast = useToast();
    const { isOnline } = useOnlineStatus();
    // Narrow screens have no room for the caption; "No catch-all" explains itself.
    const { isWide } = useLayout();
    const { zones, destinations, addDomain, removeDomain, setDomainShared, setDomainCatchAll } =
        useMailflare();
    const onError = (error: Error) => toast({ body: error.message, type: "error" });
    const OFF = "";
    const catchAllOptions = [
        { value: OFF, label: t("catch_all_off") },
        ...(destinations.data ?? [])
            .filter((d) => d.verified)
            .map((d) => ({ value: d.email, label: d.email })),
    ];

    const items: Item[] = (zones.data ?? []).map((zone) => ({
        id: zone.id,
        label: zone.name,
        extra: (
            <>
                {/* Shared domains can't have a catch-all (whose would its aliases be?). */}
                {!zone.shared && isWide && <Text type="supporting">{t("catch_all")}</Text>}
                {!zone.shared && (
                    <Selector
                        label={t("catch_all_label", { domain: zone.name })}
                        isLabelHidden
                        size="sm"
                        width={150}
                        options={catchAllOptions}
                        value={zone.catchAll ?? OFF}
                        isDisabled={
                            !isOnline || setDomainCatchAll.isPending || setDomainShared.isPending
                        }
                        onChange={(value) =>
                            setDomainCatchAll.mutate(
                                { zoneId: zone.id, destination: value || null },
                                { onError },
                            )
                        }
                    />
                )}
                <Text type="supporting">{t("shared")}</Text>
                <Switch
                    label={t("shared_label", { domain: zone.name })}
                    isLabelHidden
                    value={zone.shared ?? false}
                    // The two exclude each other: one change at a time.
                    isDisabled={
                        !isOnline ||
                        setDomainShared.isPending ||
                        setDomainCatchAll.isPending ||
                        !!zone.catchAll
                    }
                    onChange={(shared) =>
                        setDomainShared.mutate({ zoneId: zone.id, shared }, { onError })
                    }
                />
            </>
        ),
    }));

    return (
        <PageBody>
            <PageHeader
                title={tn("domains")}
                description={
                    <>
                        {t("domains_description")} {t("shared_hint")} {t("catch_all_hint")}
                    </>
                }
            />
            <ManagedList
                title={t("domains")}
                isTitleHidden
                description=""
                items={items}
                inputLabel={t("domain_input")}
                placeholder="example.com"
                inputType="text"
                add={addDomain}
                remove={removeDomain}
            />
        </PageBody>
    );
}
