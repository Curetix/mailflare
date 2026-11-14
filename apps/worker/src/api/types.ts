// The HTTP API contract, shared with the app's Worker backend (type-only import).
// Timestamps are Unix seconds.

export const API_VERSION = 1;

export type ApiInfo = {
    name: "mailflare";
    apiVersion: number;
};

export type ApiError = {
    error: { code: string; message: string };
};

export type Me = {
    role: "admin";
};

export type Domain = {
    id: string;
    name: string;
    createdAt: number;
};

export type Destination = {
    id: string;
    email: string;
    createdAt: number;
};

export type Alias = {
    id: string;
    address: string;
    domainId: string;
    /** Destination email address. */
    destination: string;
    description: string;
    enabled: boolean;
    createdAt: number;
    forwardedCount: number;
    blockedCount: number;
    /** Messages sent from the alias through reverse addresses. */
    sentCount: number;
    lastEmailAt: number | null;
};

export type CreateDomain = { name: string };
export type CreateDestination = { email: string };
export type CreateAlias = {
    address: string;
    destination: string;
    description?: string;
    enabled?: boolean;
};
export type UpdateAlias = Partial<Pick<Alias, "destination" | "description" | "enabled">>;
