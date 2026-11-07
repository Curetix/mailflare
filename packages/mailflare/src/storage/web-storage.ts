import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

import { type StorageAdapter, StorageKeys } from "./storage";

export class WebStorageAdapter implements StorageAdapter {
    async get<T>(key: string): Promise<T | null> {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async set<T>(key: string, value: T): Promise<void> {
        localStorage.setItem(key, JSON.stringify(value));
    }

    async remove(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
}

export function createWebPersister(adapter: StorageAdapter): Persister {
    return {
        persistClient: async (client: PersistedClient) => {
            await adapter.set(StorageKeys.QueryCache, client);
        },
        restoreClient: async () => {
            return (await adapter.get<PersistedClient>(StorageKeys.QueryCache)) ?? undefined;
        },
        removeClient: async () => {
            await adapter.remove(StorageKeys.QueryCache);
        },
    };
}
