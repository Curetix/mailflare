import { create } from "zustand";

import type { StorageAdapter } from "../storage/storage";
import { StorageKeys } from "../storage/storage";

export type AuthState = {
    apiToken: string | null;
    selectedZoneId: string | null;
    setToken: (token: string | null) => void;
    setZone: (zoneId: string | null) => void;
    logout: () => void;
};

let _authStorage: StorageAdapter | null = null;

export function initAuthStore(adapter: StorageAdapter) {
    _authStorage = adapter;
}

export const useAuthStore = create<AuthState>((set) => ({
    apiToken: null,
    selectedZoneId: null,
    setToken: (token) => {
        set({ apiToken: token });
        if (_authStorage) {
            if (token) _authStorage.set(StorageKeys.ApiToken, token);
            else _authStorage.remove(StorageKeys.ApiToken);
        }
    },
    setZone: (zoneId) => {
        set({ selectedZoneId: zoneId });
        if (_authStorage) {
            if (zoneId) _authStorage.set(StorageKeys.ZoneId, zoneId);
            else _authStorage.remove(StorageKeys.ZoneId);
        }
    },
    logout: () => {
        set({ apiToken: null, selectedZoneId: null });
        if (_authStorage) {
            _authStorage.remove(StorageKeys.ApiToken);
            _authStorage.remove(StorageKeys.ZoneId);
        }
    },
}));

export async function hydrateAuthStore(adapter: StorageAdapter) {
    const apiToken = await adapter.get<string>(StorageKeys.ApiToken);
    const selectedZoneId = await adapter.get<string>(StorageKeys.ZoneId);
    useAuthStore.setState({ apiToken, selectedZoneId });
}
