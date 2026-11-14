// The backend abstraction: everything the UI and the extension need to manage
// aliases, independent of where they live. Today that is Cloudflare Email
// Routing rules; the Mailflare Worker will be a second implementation.
//
// All data types are plain, JSON-serializable objects so they survive the
// persisted query cache and session storage unchanged.

export type BackendKind = "cloudflare";

/** A group of domains whose aliases are listed together (a Cloudflare zone). */
export type Zone = {
    id: string;
    name: string;
};

/** A domain aliases can be created on, and the zone it belongs to. */
export type AliasDomain = {
    domain: string;
    zoneId: string;
};

/** Whether a zone can currently receive mail. */
export type ZoneStatus = {
    ready: boolean;
    /** Where the user can fix the setup, if the backend has such a page. */
    setupUrl?: string;
};

/** A mailbox aliases can forward to. */
export type Destination = {
    email: string;
    verified: boolean;
};

export type Alias = {
    id: string;
    zoneId: string;
    address: string;
    destination: string;
    description: string;
    enabled: boolean;
    /** Created outside Mailflare; shown, but can be hidden by the rule filter. */
    isExternal: boolean;
    /** Sort key, higher is newer. Mailflare uses the creation time in seconds. */
    order: number;
};

export type NewAlias = {
    zoneId: string;
    address: string;
    destination: string;
    description: string;
    enabled?: boolean;
    /** Defaults to the current time in seconds. */
    order?: number;
};

export type AliasChanges = Partial<Pick<Alias, "destination" | "description" | "enabled">>;

export interface AliasBackend {
    readonly kind: BackendKind;

    listZones(): Promise<Zone[]>;
    listDomains(): Promise<AliasDomain[]>;
    getZoneStatus(zoneId: string): Promise<ZoneStatus | null>;
    listDestinations(): Promise<Destination[]>;

    listAliases(zoneId: string): Promise<Alias[]>;
    createAlias(alias: NewAlias): Promise<Alias>;
    updateAlias(alias: Alias, changes: AliasChanges): Promise<Alias>;
    deleteAlias(alias: Alias): Promise<void>;
}
