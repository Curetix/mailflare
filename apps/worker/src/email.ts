// Incoming mail: the Worker is the catch-all target of every configured domain.

import { eq, sql } from "drizzle-orm";

import { lookupCandidates } from "./addresses";
import { createDb, type Db, schema } from "./db";

/**
 * One reason for unknown and disabled aliases alike, so senders cannot tell
 * which addresses exist.
 */
export const REJECT_REASON = "Address does not exist";

/** Added to forwarded mail so users can filter by alias in their mailbox. */
export const ALIAS_HEADER = "X-Mailflare-Alias";

async function findAlias(db: Db, recipient: string) {
    const candidates = lookupCandidates(recipient);
    if (candidates.length === 0) return null;
    const matches = await db.query.aliases.findMany({
        where: { address: { in: candidates } },
        with: { destination: true },
    });
    // Prefer the exact address over the subaddressing fallback.
    for (const candidate of candidates) {
        const match = matches.find((alias) => alias.address === candidate);
        if (match) return match;
    }
    return null;
}

function recordEmail(db: Db, aliasId: string, outcome: "forwarded" | "blocked") {
    const { aliases } = schema;
    const counter =
        outcome === "forwarded"
            ? { forwardedCount: sql`${aliases.forwardedCount} + 1` }
            : { blockedCount: sql`${aliases.blockedCount} + 1` };
    return db
        .update(aliases)
        .set({ ...counter, lastEmailAt: new Date() })
        .where(eq(aliases.id, aliasId));
}

export async function handleEmail(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext,
): Promise<void> {
    const db = createDb(env.DB);
    const alias = await findAlias(db, message.to);

    if (!alias || !alias.enabled) {
        if (alias) ctx.waitUntil(recordEmail(db, alias.id, "blocked"));
        message.setReject(REJECT_REASON);
        return;
    }

    const headers = new Headers({ [ALIAS_HEADER]: alias.address });
    await message.forward(alias.destination.email, headers);
    ctx.waitUntil(recordEmail(db, alias.id, "forwarded"));
}
