// UI-free entry point for contexts without a DOM/React tree, such as the
// extension background service worker. Importing the main entry instead
// would pull in every component, Astryx, and the global stylesheets.
export { CloudflareApiClient } from "./api/cloudflare-client";
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
export { Alias, generateAliasAddress, type GenerateAliasOptions } from "./utils/alias";
export { EMAIL_RULE_NAME_PREFIX, CLOUDFLARE_API_BASE_URL } from "./const";
