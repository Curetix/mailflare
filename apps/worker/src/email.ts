// Incoming mail: the Worker is the catch-all target of every configured domain.
//
// - Mail for an alias is re-sent to its destination, with senders rewritten to
//   reverse addresses so replies go out through the alias. Without the
//   send_email binding (or if sending fails), it is forwarded unchanged.
// - Mail from the alias owner to a reverse address is sent to that contact,
//   from the alias. Accounts without the admin role may only send to the
//   alias's contacts (people who mailed it), within a daily limit.

import { EmailMessage } from "cloudflare:email";
import { and, eq, sql } from "drizzle-orm";

import { normalizeAddress, splitAddress } from "./addresses";
import { checkSender } from "./auth";
import { createDb, type Db, schema } from "./db";
import { parseMessage, serializeMessage } from "./mime";
import {
    keyedReverseAddress,
    parseReverseTag,
    randomKey,
    readableReverseAddress,
    type ReverseTarget,
} from "./reverse";
import { ALIAS_HEADER, rewriteInbound, rewriteOutbound } from "./rewrite";
import { getSettings } from "./settings";

export { ALIAS_HEADER };

/**
 * One reason for unknown and disabled aliases alike, so senders cannot tell
 * which addresses exist.
 */
export const REJECT_REASON = "Address does not exist";

type AliasWithDestination = typeof schema.aliases.$inferSelect & {
    destination: typeof schema.destinations.$inferSelect;
    user: typeof schema.user.$inferSelect | null;
};

/** Splits a recipient into the alias address and the subaddress tag (original case). */
export function parseRecipient(recipient: string): { address: string; tag: string | null } | null {
    const parts = splitAddress(recipient.trim());
    if (!parts) return null;
    const plus = parts.local.indexOf("+");
    const local = plus > 0 ? parts.local.slice(0, plus) : parts.local;
    return {
        address: normalizeAddress(`${local}@${parts.domain}`),
        tag: plus > 0 ? parts.local.slice(plus + 1) : null,
    };
}

function findAlias(db: Db, address: string) {
    return db.query.aliases.findFirst({
        where: { address },
        with: { destination: true, user: true },
    });
}

type Outcome = "forwarded" | "blocked" | "sent";

function record(db: Db, aliasId: string, outcome: Outcome) {
    const { aliases } = schema;
    const counter = {
        forwarded: { forwardedCount: sql`${aliases.forwardedCount} + 1` },
        blocked: { blockedCount: sql`${aliases.blockedCount} + 1` },
        sent: { sentCount: sql`${aliases.sentCount} + 1` },
    }[outcome];
    return db
        .update(aliases)
        .set({ ...counter, lastEmailAt: new Date() })
        .where(eq(aliases.id, aliasId));
}

/** Records a contact of the alias; returns its short key. */
async function contactKey(db: Db, aliasId: string, email: string): Promise<string> {
    const { reverseContacts } = schema;
    const where = and(eq(reverseContacts.aliasId, aliasId), eq(reverseContacts.email, email));
    const [existing] = await db.select().from(reverseContacts).where(where);
    if (existing) return existing.key;
    await db
        .insert(reverseContacts)
        .values({ key: randomKey(), aliasId, email })
        .onConflictDoNothing();
    // Re-read: a concurrent message may have inserted the contact first.
    const [row] = await db.select().from(reverseContacts).where(where);
    return row!.key;
}

/** Whether the owner may send from the alias to anyone, not just its contacts. */
const unrestricted = (alias: AliasWithDestination) =>
    alias.userId === null || alias.user?.role === "admin";

async function resolveReverse(
    db: Db,
    alias: AliasWithDestination,
    target: ReverseTarget,
): Promise<string | null> {
    if (target.kind === "address") {
        if (unrestricted(alias)) return target.contact;
        const known = await db.query.reverseContacts.findFirst({
            where: { aliasId: alias.id, email: target.contact.toLowerCase() },
        });
        return known ? target.contact : null;
    }
    const row = await db.query.reverseContacts.findFirst({
        where: { key: target.key, aliasId: alias.id },
    });
    return row?.email ?? null;
}

/** Counts a message toward the owner's daily limit; false once it is reached. */
async function withinDailyLimit(env: Env, db: Db, userId: string): Promise<boolean> {
    const { sendUsage } = schema;
    const day = new Date().toISOString().slice(0, 10);
    const [usage] = await db
        .insert(sendUsage)
        .values({ userId, day, count: 1 })
        .onConflictDoUpdate({
            target: [sendUsage.userId, sendUsage.day],
            set: { count: sql`${sendUsage.count} + 1` },
        })
        .returning({ count: sendUsage.count });
    return (usage?.count ?? 0) <= getSettings(env).limits.sendsPerDay;
}

/** EmailMessage takes a string or a stream; a stream keeps 8-bit bodies intact. */
function mime(bytes: Uint8Array): ReadableStream {
    return new Response(bytes).body!;
}

/** "E_CODE: message", e.g. "E_VALIDATION_ERROR: bare CR in email content". */
function errorCode(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (error && typeof error === "object" && "code" in error) {
        return `${String(error.code)}: ${message}`;
    }
    return message;
}

async function deliverToOwner(
    message: ForwardableEmailMessage,
    env: Env,
    db: Db,
    alias: AliasWithDestination,
    raw: Uint8Array,
) {
    const destination = alias.destination.email;
    if (env.EMAIL) {
        try {
            const rewritten = await rewriteInbound(parseMessage(raw), {
                alias: alias.address,
                envelopeFrom: message.from,
                toReverse: async (contact) => {
                    // Recorded either way: replying to it is what contacts allow.
                    const key = await contactKey(db, alias.id, contact.toLowerCase());
                    return (
                        readableReverseAddress(alias.address, contact) ??
                        keyedReverseAddress(alias.address, key)
                    );
                },
            });
            await env.EMAIL.send(
                new EmailMessage(alias.address, destination, mime(serializeMessage(rewritten))),
            );
            return;
        } catch (error) {
            // Still deliver, just without reply-through-alias.
            console.error(`Re-sending failed (${errorCode(error)}), forwarding instead`);
        }
    }
    await message.forward(destination, new Headers({ [ALIAS_HEADER]: alias.address }));
}

async function sendAsAlias(
    message: ForwardableEmailMessage,
    env: Env,
    db: Db,
    alias: AliasWithDestination,
    raw: Uint8Array,
    target: ReverseTarget,
): Promise<boolean> {
    if (!env.EMAIL) {
        message.setReject("Sending from aliases is not set up on this Mailflare Worker");
        return false;
    }
    const contact = await resolveReverse(db, alias, target);
    if (!contact) {
        message.setReject(
            unrestricted(alias)
                ? "Unknown reverse address"
                : "You can only reply to people who have emailed this alias",
        );
        return false;
    }
    if (!unrestricted(alias) && !(await withinDailyLimit(env, db, alias.userId!))) {
        message.setReject("You have reached today's sending limit");
        return false;
    }
    const rewritten = await rewriteOutbound(parseMessage(raw), {
        alias: alias.address,
        fromReverse: async (address) => {
            const recipient = parseRecipient(address);
            if (recipient?.address !== alias.address || !recipient.tag) return null;
            const reverse = parseReverseTag(recipient.tag);
            return reverse ? resolveReverse(db, alias, reverse) : null;
        },
    });
    try {
        await env.EMAIL.send(
            new EmailMessage(alias.address, contact, mime(serializeMessage(rewritten))),
        );
        return true;
    } catch (error) {
        console.error(`Sending as ${alias.address} failed: ${errorCode(error)}`);
        message.setReject(`Could not send from ${alias.address} (${errorCode(error)})`);
        return false;
    }
}

export async function handleEmail(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
): Promise<void> {
    const db = createDb(env.DB);
    const recipient = parseRecipient(message.to);
    const alias = recipient ? await findAlias(db, recipient.address) : null;
    if (!recipient || !alias) {
        message.setReject(REJECT_REASON);
        return;
    }

    const raw = new Uint8Array(await new Response(message.raw).arrayBuffer());
    const target = recipient.tag ? parseReverseTag(recipient.tag) : null;

    // Suspended accounts and unconfirmed inboxes get nothing, like disabled aliases.
    const active = alias.enabled && !alias.user?.banned && alias.destination.verifiedAt !== null;

    if (target) {
        const { headers } = parseMessage(raw);
        const sender = checkSender(headers, message.from, alias.destination.email);
        if (sender.owner && !sender.authenticated) {
            // Header names only (no values), to diagnose authentication setups.
            const names = headers.map((h) => h.name).join(", ");
            console.warn(
                `Refused to send as ${alias.address}: ${sender.reason}. Headers: ${names}`,
            );
            message.setReject("Could not verify that this message comes from the alias owner");
            return;
        }
        if (sender.owner) {
            if (!active) {
                message.setReject("This alias is disabled");
                return;
            }
            if (await sendAsAlias(message, env, db, alias, raw, target)) {
                ctx.waitUntil(record(db, alias.id, "sent"));
            }
            return;
        }
        // Anyone else writing to a reverse address is just mailing the alias.
    }

    if (!active) {
        ctx.waitUntil(record(db, alias.id, "blocked"));
        message.setReject(REJECT_REASON);
        return;
    }

    await deliverToOwner(message, env, db, alias, raw);
    ctx.waitUntil(record(db, alias.id, "forwarded"));
}
