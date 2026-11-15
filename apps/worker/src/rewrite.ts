// Header rewriting for mail passing through an alias. Only allowlisted
// headers survive: the ones mail clients need to display and thread a message.
// Routing traces (Received), signatures (DKIM, ARC), authentication results
// and vendor X- headers are dropped, both for privacy and because Cloudflare's
// Email Service controls or rejects them.

import {
    formatMailbox,
    getHeaders,
    type Header,
    type Mailbox,
    parseAddressList,
    type ParsedMessage,
} from "./mime";

export const ALIAS_HEADER = "X-Mailflare-Alias";

/** Headers kept from the original message, besides the rewritten address headers. */
const PASS_THROUGH = new Set([
    "subject",
    "date",
    "message-id",
    "in-reply-to",
    "references",
    "mime-version",
    "content-type",
    "content-transfer-encoding",
    "content-disposition",
    "content-language",
    "content-id",
    "content-description",
    "thread-index",
    "thread-topic",
    "importance",
    "priority",
]);

/** Kept on incoming mail only: mailing list and auto-reply hints help the recipient's filters. */
const PASS_THROUGH_INBOUND = new Set([
    "list-id",
    "list-unsubscribe",
    "list-unsubscribe-post",
    "list-help",
    "list-subscribe",
    "list-post",
    "list-owner",
    "list-archive",
    "auto-submitted",
    "precedence",
]);

function passThrough(headers: Header[], extra?: Set<string>): Header[] {
    return headers.filter((h) => {
        const name = h.name.toLowerCase();
        return PASS_THROUGH.has(name) || extra?.has(name);
    });
}

async function mapAddressHeader(
    headers: Header[],
    name: string,
    map: (mailbox: Mailbox) => Promise<Mailbox>,
): Promise<Header | null> {
    const mailboxes = getHeaders(headers, name).flatMap(parseAddressList);
    if (mailboxes.length === 0) return null;
    const mapped = await Promise.all(mailboxes.map(map));
    return { name, value: mapped.map(formatMailbox).join(", ") };
}

/** "Bob (bob at shop.com)": shows who wrote, without a clickable real address. */
export function contactLabel({ name, address }: Mailbox): string {
    const readable = address.replace("@", " at ");
    return name ? `${name} (${readable})` : readable;
}

const LABEL_SUFFIX = /\s*\([^()]*\bat\b[^()]*\)$/;

/**
 * Incoming mail for the owner: senders and other recipients become reverse
 * addresses, so replies (and reply-all) go out through the alias.
 */
export async function rewriteInbound(
    message: ParsedMessage,
    options: {
        alias: string;
        envelopeFrom: string;
        toReverse: (contact: string) => Promise<string>;
    },
): Promise<ParsedMessage> {
    const { headers } = message;
    const alias = options.alias.toLowerCase();
    const reverse = async (mailbox: Mailbox): Promise<Mailbox> =>
        mailbox.address.toLowerCase() === alias
            ? mailbox
            : { name: contactLabel(mailbox), address: await options.toReverse(mailbox.address) };

    const sender = getHeaders(headers, "From").flatMap(parseAddressList)[0] ?? {
        name: "",
        address: options.envelopeFrom || "unknown@invalid",
    };

    const rewritten: Header[] = [{ name: "From", value: formatMailbox(await reverse(sender)) }];
    for (const name of ["Reply-To", "To", "Cc"]) {
        const header = await mapAddressHeader(headers, name, reverse);
        if (header) rewritten.push(header);
    }
    rewritten.push(...passThrough(headers, PASS_THROUGH_INBOUND));
    // The aliases the message already passed through, then this one: how
    // Mailflare Workers notice mail going in circles (see aliasHops).
    for (const value of getHeaders(headers, ALIAS_HEADER)) {
        rewritten.push({ name: ALIAS_HEADER, value });
    }
    rewritten.push({ name: ALIAS_HEADER, value: options.alias });
    return { headers: rewritten, body: message.body };
}

/**
 * Mail the owner sends through a reverse address: it comes from the alias,
 * and reverse addresses in To/Cc are turned back into the contacts' addresses.
 */
export async function rewriteOutbound(
    message: ParsedMessage,
    options: {
        alias: string;
        /** The contact behind a reverse address of this alias, or null for other addresses. */
        fromReverse: (address: string) => Promise<string | null>;
    },
): Promise<ParsedMessage> {
    const { headers } = message;
    const resolve = async (mailbox: Mailbox): Promise<Mailbox> => {
        const contact = await options.fromReverse(mailbox.address);
        return contact
            ? { name: mailbox.name.replace(LABEL_SUFFIX, ""), address: contact }
            : mailbox;
    };

    const rewritten: Header[] = [{ name: "From", value: options.alias }];
    for (const name of ["To", "Cc"]) {
        const header = await mapAddressHeader(headers, name, resolve);
        if (header) rewritten.push(header);
    }
    // No Reply-To, Sender or X- headers: they could reveal the owner's mailbox.
    rewritten.push(...passThrough(headers));
    return { headers: rewritten, body: message.body };
}
