export interface StorageAdapter {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
}

export enum StorageKeys {
    Settings = "mailflare-settings",
    AliasSettings = "alias-settings",
    ZoneId = "zone-id",
    ApiToken = "api-token",
    WorkerUrl = "worker-url",
    QueryCache = "query-cache",
}
