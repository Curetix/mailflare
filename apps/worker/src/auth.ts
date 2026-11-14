// Is a message really from the alias owner? Sending through an alias must be
// limited to its owner, or the Worker becomes an open relay.

import { splitAddress } from "./addresses";
import { getHeaders, type Header, parseAddressList } from "./mime";

/** The authserv-id Cloudflare Email Routing uses in Authentication-Results. */
export const CLOUDFLARE_AUTHSERV_ID = "mx.cloudflare.net";

export type SenderCheck =
    /** Not the owner's address: treat as ordinary incoming mail. */
    | { owner: false }
    /** Claims to be the owner but isn't authenticated: likely spoofed. */
    | { owner: true; authenticated: false; reason: string }
    | { owner: true; authenticated: true };

/**
 * Cloudflare's DMARC verdict for the message. Only the topmost
 * Authentication-Results header counts: receiving servers prepend theirs,
 * so anything below it may come from the sender.
 */
export function cloudflareDmarc(headers: Header[]): { result: string; headerFrom: string } | null {
    const [topmost] = getHeaders(headers, "Authentication-Results");
    if (!topmost) return null;
    const value = topmost.replace(/\r?\n[ \t]+/g, " ");
    const authservId = value.split(";")[0]?.trim().toLowerCase();
    if (authservId !== CLOUDFLARE_AUTHSERV_ID) return null;
    const dmarc = /\bdmarc=([a-z]+)/i.exec(value);
    const headerFrom = /\bheader\.from=([^\s;]+)/i.exec(value);
    if (!dmarc) return null;
    return {
        result: dmarc[1]!.toLowerCase(),
        headerFrom: (headerFrom?.[1] ?? "").toLowerCase(),
    };
}

export function checkSender(
    headers: Header[],
    envelopeFrom: string,
    ownerEmail: string,
): SenderCheck {
    const [from] = getHeaders(headers, "From").flatMap(parseAddressList);
    if (!from || from.address.toLowerCase() !== ownerEmail.toLowerCase()) return { owner: false };

    const ownerDomain = splitAddress(ownerEmail.toLowerCase())?.domain ?? "";
    const dmarc = cloudflareDmarc(headers);
    if (!dmarc) {
        return { owner: true, authenticated: false, reason: "no Cloudflare DMARC result" };
    }
    if (dmarc.result !== "pass") {
        return { owner: true, authenticated: false, reason: `DMARC ${dmarc.result}` };
    }
    if (dmarc.headerFrom && dmarc.headerFrom !== ownerDomain) {
        return { owner: true, authenticated: false, reason: "DMARC result for another domain" };
    }
    // The envelope sender must be on the same domain (bounce addresses differ in
    // the local part, e.g. SRS or VERP, but not in the domain).
    const envelopeDomain = splitAddress(envelopeFrom.toLowerCase())?.domain ?? "";
    if (envelopeDomain !== ownerDomain && !envelopeDomain.endsWith(`.${ownerDomain}`)) {
        return { owner: true, authenticated: false, reason: "envelope sender on another domain" };
    }
    return { owner: true, authenticated: true };
}
