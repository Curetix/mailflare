// UI-free entry point for contexts without a DOM/React tree, such as the
// extension background service worker. Importing the main entry instead
// would pull in every component, Astryx, and the global stylesheets.
export { CloudflareApiClient } from "./api/cloudflare-client";
export { CloudflareBackend } from "./backend/cloudflare-backend";
export type {
    Alias,
    AliasBackend,
    AliasChanges,
    AliasDomain,
    BackendKind,
    Destination,
    NewAlias,
    Zone,
    ZoneStatus,
} from "./backend/types";
export type {
    CloudflareBaseResponse,
    CloudflareEmailRule,
    CloudflareEmailDestination,
    CloudflareZone,
    CloudflareEmailRoutingStatus,
    CloudflareVerifyToken,
} from "./api/cloudflare-types";
export { StorageKeys } from "./storage/storage";
export type { AliasSettings, AliasFormat, AliasPrefixFormat } from "./stores/alias-settings-store";
export { generateAliasAddress, type GenerateAliasOptions } from "./utils/alias";
export { EMAIL_RULE_NAME_PREFIX, CLOUDFLARE_API_BASE_URL } from "./const";
