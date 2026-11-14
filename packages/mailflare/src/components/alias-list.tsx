import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    TbEdit,
    TbListCheck,
    TbPlaylistX,
    TbPlus,
    TbRefresh,
    TbSearch,
    TbSearchOff,
    TbTrash,
} from "react-icons/tb";
import { useTranslations } from "use-intl";

import type { Alias } from "../backend/types";
import { useMailflare } from "../backend/use-mailflare";
import { useOnlineStatus } from "../hooks/use-online-status";
import { useSettingsStore } from "../stores/settings-store";
import { useUIStore } from "../stores/ui-store";
import { sort } from "../utils/sort";
import { AliasBulkDeleteDialog } from "./alias-bulk-delete-dialog";
import { AliasBulkEditDialog } from "./alias-bulk-edit-dialog";
import { AliasCard } from "./alias-card";
import { AliasCreateDialog } from "./alias-create-dialog";
import { AliasDeleteDialog } from "./alias-delete-dialog";
import { AliasEditDialog } from "./alias-edit-dialog";
import { ManageDomainsDialog } from "./manage-domains-dialog";

export function AliasList() {
    const t = useTranslations("alias_list");
    const tc = useTranslations("common");

    const {
        selectedZoneId,
        setSelectedZoneId,
        zones,
        zoneStatus,
        aliases,
        canManageDomains,
        canEditDomains,
        account,
    } = useMailflare();

    const ruleFilter = useSettingsStore((s) => s.ruleFilter);
    const { isOnline } = useOnlineStatus();
    const aliasSearch = useUIStore((s) => s.aliasSearch);
    const setAliasSearch = useUIStore((s) => s.setAliasSearch);
    const selectedAliases = useUIStore((s) => s.selectedAliases);
    const toggleAliasSelection = useUIStore((s) => s.toggleAliasSelection);
    const clearSelection = useUIStore((s) => s.clearSelection);
    const createOpen = useUIStore((s) => s.createOpen);
    const setCreateOpen = useUIStore((s) => s.setCreateOpen);
    const editOpen = useUIStore((s) => s.editOpen);
    const setEditOpen = useUIStore((s) => s.setEditOpen);
    const deleteOpen = useUIStore((s) => s.deleteOpen);
    const setDeleteOpen = useUIStore((s) => s.setDeleteOpen);
    const manageDomainsOpen = useUIStore((s) => s.manageDomainsOpen);
    const setManageDomainsOpen = useUIStore((s) => s.setManageDomainsOpen);
    const selectEnabled = useUIStore((s) => s.selectEnabled);
    const setSelectEnabled = useUIStore((s) => s.setSelectEnabled);
    const searchVisible = useUIStore((s) => s.searchVisible);
    const setSearchVisible = useUIStore((s) => s.setSearchVisible);
    const aliasToEditId = useUIStore((s) => s.aliasToEditId);
    const setAliasToEditId = useUIStore((s) => s.setAliasToEditId);
    const aliasToDeleteId = useUIStore((s) => s.aliasToDeleteId);
    const setAliasToDeleteId = useUIStore((s) => s.setAliasToDeleteId);
    const scrollPosition = useUIStore((s) => s.scrollPosition);
    const setScrollPosition = useUIStore((s) => s.setScrollPosition);

    const scrollRef = useRef<HTMLDivElement>(null);

    const [filteredAliases, setFilteredAliases] = useState<Alias[]>([]);

    // Select the first zone once zones are known and none is selected yet.
    useEffect(() => {
        const firstZone = zones.data?.[0];
        if (selectedZoneId === null && firstZone) setSelectedZoneId(firstZone.id);
    }, [zones.data, selectedZoneId, setSelectedZoneId]);

    useEffect(() => {
        if (!aliases.isSuccess || !aliases.data || aliases.data.length === 0) {
            setFilteredAliases([]);
            return;
        }
        const search = aliasSearch.toLowerCase();
        setFilteredAliases(
            sort(
                aliases.data
                    .filter((a) => (ruleFilter ? !a.isExternal : true))
                    .filter(
                        (a) =>
                            search === "" ||
                            a.description.toLowerCase().includes(search) ||
                            a.address.toLowerCase().includes(search),
                    ),
                { order: "desc", by: (item) => item.order },
            ),
        );
    }, [aliases.isSuccess, aliases.data, ruleFilter, aliasSearch]);

    const aliasToEdit = filteredAliases.find((a) => a.id === aliasToEditId) ?? null;
    const aliasToDelete = filteredAliases.find((a) => a.id === aliasToDeleteId) ?? null;

    // Restore scroll position after aliases load
    useEffect(() => {
        if (scrollRef.current && scrollPosition > 0 && filteredAliases.length > 0) {
            scrollRef.current.scrollTop = scrollPosition;
        }
    }, [filteredAliases.length > 0]); // only on initial load

    const handleScroll = useCallback(() => {
        if (scrollRef.current) {
            setScrollPosition(scrollRef.current.scrollTop);
        }
    }, [setScrollPosition]);

    const noZoneSelected = !zones.data || zones.data.length === 0 || selectedZoneId === null;
    const routingNotReady = !!selectedZoneId && zoneStatus.data?.ready === false;

    return (
        <VStack gap={2}>
            <AliasCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />

            {canManageDomains && (
                <ManageDomainsDialog
                    open={manageDomainsOpen}
                    onClose={() => setManageDomainsOpen(false)}
                />
            )}

            <AliasEditDialog
                open={editOpen && !!aliasToEdit && selectedAliases.length === 0}
                onClose={() => {
                    setEditOpen(false);
                    setAliasToEditId(null);
                }}
                alias={aliasToEdit}
            />

            <AliasBulkEditDialog
                open={editOpen && selectedAliases.length > 0}
                onClose={(clear) => {
                    setEditOpen(false);
                    if (clear) {
                        setSelectEnabled(false);
                        clearSelection();
                    }
                }}
                selectedAliases={selectedAliases}
            />

            <AliasDeleteDialog
                open={deleteOpen && !!aliasToDelete && selectedAliases.length === 0}
                onClose={() => {
                    setDeleteOpen(false);
                    setAliasToDeleteId(null);
                }}
                alias={aliasToDelete}
            />

            <AliasBulkDeleteDialog
                open={deleteOpen && selectedAliases.length > 0}
                onClose={(clear) => {
                    setDeleteOpen(false);
                    if (clear) {
                        setSelectEnabled(false);
                        clearSelection();
                    }
                }}
                selectedAliases={selectedAliases}
            />

            {/* DOMAIN SELECTOR */}
            <Selector
                label={t("domain_placeholder")}
                isLabelHidden
                width="100%"
                placeholder={t("domain_placeholder")}
                value={selectedZoneId ?? undefined}
                onChange={setSelectedZoneId}
                isLoading={zones.isFetching}
                isDisabled={!zones.data || zones.data.length === 0}
                options={zones.data?.map((z) => ({ value: z.id, label: z.name })) ?? []}
            />

            {/* ACTION BUTTONS */}
            <HStack gap={1}>
                <IconButton
                    size="sm"
                    label={selectEnabled ? t("stop_select") : t("select")}
                    tooltip={selectEnabled ? t("stop_select") : t("select")}
                    icon={selectEnabled ? <TbPlaylistX /> : <TbListCheck />}
                    isDisabled={
                        !zones.data ||
                        (!selectEnabled && filteredAliases.length === 0) ||
                        selectedZoneId === null
                    }
                    onClick={() => {
                        clearSelection();
                        setSelectEnabled(!selectEnabled);
                    }}
                />

                {selectEnabled ? (
                    <>
                        <IconButton
                            size="sm"
                            label={tc("edit")}
                            tooltip={tc("edit")}
                            icon={<TbEdit />}
                            isDisabled={selectedAliases.length === 0}
                            onClick={() => setEditOpen(true)}
                        />
                        <IconButton
                            size="sm"
                            variant="destructive"
                            label={tc("delete")}
                            tooltip={tc("delete")}
                            icon={<TbTrash />}
                            isDisabled={selectedAliases.length === 0}
                            onClick={() => setDeleteOpen(true)}
                        />
                    </>
                ) : (
                    <>
                        <IconButton
                            size="sm"
                            variant="primary"
                            label={t("create")}
                            tooltip={t("create")}
                            icon={<TbPlus />}
                            isDisabled={!isOnline || noZoneSelected}
                            onClick={() => setCreateOpen(true)}
                        />
                        <IconButton
                            size="sm"
                            label={searchVisible ? t("stop_search") : t("search")}
                            tooltip={searchVisible ? t("stop_search") : t("search")}
                            icon={searchVisible ? <TbSearchOff /> : <TbSearch />}
                            isDisabled={!aliases.data || aliases.data.length === 0}
                            onClick={() => {
                                setSearchVisible(!searchVisible);
                                setAliasSearch("");
                            }}
                        />
                        <IconButton
                            size="sm"
                            label={t("refresh")}
                            tooltip={t("refresh")}
                            icon={<TbRefresh />}
                            isLoading={aliases.isFetching}
                            isDisabled={!isOnline || noZoneSelected}
                            onClick={() => aliases.refetch()}
                        />
                    </>
                )}
            </HStack>

            {searchVisible && (
                <TextInput
                    type="search"
                    label={t("search_placeholder")}
                    isLabelHidden
                    hasAutoFocus
                    hasClear
                    placeholder={t("search_placeholder")}
                    value={aliasSearch}
                    onChange={setAliasSearch}
                />
            )}

            {routingNotReady && (
                <Banner
                    status="warning"
                    title={t("email_routing_not_enabled")}
                    endContent={
                        zoneStatus.data?.setupUrl && (
                            <Link href={zoneStatus.data.setupUrl} isExternalLink>
                                {t("email_routing_dashboard")}
                            </Link>
                        )
                    }
                />
            )}

            {!!selectedZoneId && filteredAliases.length === 0 && aliases.isFetching && (
                <HStack justify="center" paddingBlock={4}>
                    <Spinner />
                </HStack>
            )}

            {!zones.isFetching &&
                zones.isSuccess &&
                zones.data.length === 0 &&
                (canManageDomains && account.isSuccess && !canEditDomains ? (
                    <Banner status="info" title={t("no_shared_domains")} />
                ) : canManageDomains ? (
                    <Banner
                        status="info"
                        title={t("no_worker_domains")}
                        endContent={
                            <Button
                                size="sm"
                                label={t("add_domain")}
                                onClick={() => setManageDomainsOpen(true)}
                            />
                        }
                    />
                ) : (
                    <Banner status="warning" title={t("no_zones")} />
                ))}

            {zones.isError && (
                <Banner status="error" title={t("zones_error", { error: String(zones.error) })} />
            )}

            {!!selectedZoneId &&
                aliases.isSuccess &&
                !aliases.isFetching &&
                filteredAliases.length === 0 && <Banner status="info" title={t("no_rules")} />}

            {aliases.isError && !zones.isError && (
                <Banner status="error" title={t("rules_error", { error: String(aliases.error) })} />
            )}

            {/* ALIAS LIST */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                style={{ flex: filteredAliases.length > 0 ? 1 : undefined, overflowY: "auto" }}
            >
                <VStack gap={2}>
                    {aliases.isSuccess &&
                        filteredAliases.map((alias) => (
                            <AliasCard
                                key={alias.id}
                                alias={alias}
                                selectEnabled={selectEnabled}
                                isSelected={selectedAliases.some((a) => a.id === alias.id)}
                                onSelect={() => toggleAliasSelection(alias)}
                                onEdit={() => {
                                    setAliasToEditId(alias.id);
                                    setEditOpen(true);
                                }}
                                onDelete={() => {
                                    setAliasToDeleteId(alias.id);
                                    setDeleteOpen(true);
                                }}
                            />
                        ))}
                </VStack>
            </div>
        </VStack>
    );
}
