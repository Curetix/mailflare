// Reverse addresses: how contacts reach you, and you them, through an alias.
//
//   alias+bob=shop.com@example.com   readable form, for bob@shop.com
//   alias+=k3x9q2m7p4@example.com    short form with a stored key, used when the
//                                    readable form exceeds 64 characters
//
// The readable form splits at the last "=" (domains never contain one), so
// contact local parts may contain "=" and "+" without escaping. You can also
// write it yourself to start a new conversation from an alias.

import { splitAddress } from "./addresses";

/** RFC 5321 limit for the part before the "@". */
export const MAX_LOCAL_PART = 64;

export type ReverseTarget = { kind: "address"; contact: string } | { kind: "key"; key: string };

/** Interprets the subaddress tag (after the alias's "+"); null for plain subaddresses. */
export function parseReverseTag(tag: string): ReverseTarget | null {
    if (tag.startsWith("=")) {
        const key = tag.slice(1).toLowerCase();
        return /^[a-z0-9]{6,32}$/.test(key) ? { kind: "key", key } : null;
    }
    const at = tag.lastIndexOf("=");
    if (at <= 0 || at === tag.length - 1) return null;
    const local = tag.slice(0, at);
    const domain = tag.slice(at + 1).toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
    return { kind: "address", contact: `${local}@${domain}` };
}

/** The readable reverse address, or null if it would be too long. */
export function readableReverseAddress(alias: string, contact: string): string | null {
    const aliasParts = splitAddress(alias);
    const contactParts = splitAddress(contact);
    if (!aliasParts || !contactParts) return null;
    const local = `${aliasParts.local}+${contactParts.local}=${contactParts.domain.toLowerCase()}`;
    return local.length <= MAX_LOCAL_PART ? `${local}@${aliasParts.domain}` : null;
}

export function keyedReverseAddress(alias: string, key: string): string {
    const parts = splitAddress(alias)!;
    return `${parts.local}+=${key}@${parts.domain}`;
}

const KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomKey(length = 10): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, (b) => KEY_ALPHABET[b % KEY_ALPHABET.length]).join("");
}
