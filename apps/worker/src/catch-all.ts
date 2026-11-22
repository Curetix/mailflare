// Catch-all domains: mail to an address that has no alias creates one, so
// any address made up while signing up somewhere works right away.
//
// Only on domains that aren't shared (admins choose the destination; the
// alias belongs to that destination's owner), only for mail Cloudflare
// authenticated (forged spam to guessed addresses stays out), and at most
// CATCH_ALL_PER_DAY aliases per domain and day. Deleted aliases stay deleted:
// their addresses are retired.

import { sql } from "drizzle-orm";

import { splitAddress } from "./addresses";
import { ApiException, type Caller, createAlias, isReserved } from "./api/common";
import { authenticatedFromDomain } from "./auth";
import type { Db } from "./db";
import type { ParsedMessage } from "./mime";
import { senderOf } from "./rewrite";
import { getSettings } from "./settings";

/** The domain of an address that has no alias, if it has a catch-all. */
export async function catchAllDomain(db: Db, address: string) {
    const domainName = splitAddress(address)?.domain;
    if (!domainName) return null;
    const domain = await db.query.domains.findFirst({
        where: { name: domainName },
        with: { catchAllDestination: { with: { user: true } } },
    });
    if (!domain?.catchAllDestination || domain.shared) return null;
    return { ...domain, catchAllDestination: domain.catchAllDestination };
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Counts an alias toward the domain's limit for today; false (and counts the
 * address as turned away) once the limit is reached. One statement each, so
 * mail arriving at the same time can't pass the limit together.
 */
async function withinDailyLimit(env: Env, db: Db, domainId: string): Promise<boolean> {
    const day = today();
    const limit = getSettings(env).catchAllPerDay;
    if (limit > 0) {
        const counted = await db.all<{ created: number }>(sql`
            INSERT INTO catch_all_days (domain_id, day, created) VALUES (${domainId}, ${day}, 1)
            ON CONFLICT (domain_id, day) DO UPDATE SET created = created + 1 WHERE created < ${limit}
            RETURNING created
        `);
        if (counted.length > 0) return true;
    }
    await db.run(sql`
        INSERT INTO catch_all_days (domain_id, day, created, rejected) VALUES (${domainId}, ${day}, 0, 1)
        ON CONFLICT (domain_id, day) DO UPDATE SET rejected = rejected + 1
    `);
    return false;
}

/**
 * Creates the alias for mail to an unknown address on a catch-all domain.
 * Returns its address, or null when the mail should be rejected as usual.
 */
export async function createFromCatchAll(
    env: Env,
    db: Db,
    domain: NonNullable<Awaited<ReturnType<typeof catchAllDomain>>>,
    recipient: { address: string; tag: string | null },
    parsed: ParsedMessage,
    envelopeFrom: string,
): Promise<string | null> {
    // Subaddresses and reverse addresses only work for aliases that exist.
    if (recipient.tag !== null) return null;
    const { address } = recipient;
    const local = splitAddress(address)?.local ?? "";
    const destination = domain.catchAllDestination;
    if (!destination.verifiedAt || isReserved(env, local)) return null;
    // Deleted on purpose: the catch-all doesn't bring an alias back.
    if (await db.query.retiredAddresses.findFirst({ where: { address } })) return null;
    // Forged senders could create aliases at will.
    if (!authenticatedFromDomain(parsed.headers)) return null;

    if (!(await withinDailyLimit(env, db, domain.id))) {
        console.warn(`Catch-all of ${domain.name}: daily limit reached, rejected ${address}`);
        return null;
    }
    const owner = destination.user;
    if (owner?.banned) return null;
    const caller: Caller = owner ? { kind: "user", user: owner } : { kind: "token" };
    const sender = senderOf(parsed.headers, envelopeFrom).address;
    try {
        await createAlias(env, db, caller, {
            address,
            destination,
            description: `Created by the catch-all for mail from ${sender}`,
        });
    } catch (error) {
        // Created by mail arriving at the same time: deliver to it.
        if (error instanceof ApiException && error.code === "already_exists") return address;
        // The owner may no longer create aliases here (no longer an admin, at
        // the limit) or the address isn't valid for an alias.
        if (error instanceof ApiException) return null;
        throw error;
    }
    return address;
}
