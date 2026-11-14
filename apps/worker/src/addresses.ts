// Address rules shared by the API (validation) and the email handler (lookup).

/** Lowercase hostname: labels of letters, digits and inner hyphens. */
export const DOMAIN_PATTERN =
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * Alias local parts: letters, digits, dots, underscores and hyphens, starting
 * and ending with a letter or digit. "+" is reserved for subaddressing.
 */
export const ALIAS_LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export function normalizeAddress(address: string) {
    return address.trim().toLowerCase();
}

export function splitAddress(address: string): { local: string; domain: string } | null {
    const at = address.lastIndexOf("@");
    if (at <= 0 || at === address.length - 1) return null;
    return { local: address.slice(0, at), domain: address.slice(at + 1) };
}

/**
 * Addresses that may hold mail for a recipient, most specific first:
 * `alias+tag@example.com` is delivered to `alias@example.com` (subaddressing).
 */
export function lookupCandidates(recipient: string): string[] {
    const address = normalizeAddress(recipient);
    const parts = splitAddress(address);
    if (!parts) return [];
    const plus = parts.local.indexOf("+");
    if (plus <= 0) return [address];
    return [address, `${parts.local.slice(0, plus)}@${parts.domain}`];
}
