// Daily housekeeping (cron trigger): rows that only matter for a while.
// Reverse contacts stay: they are what lets the owner reply to old mail, and
// they go with their alias.

import { lt } from "drizzle-orm";

import { createDb, schema } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function cleanup(env: Env, now = new Date()) {
    const db = createDb(env.DB);
    const yesterday = new Date(now.getTime() - DAY_MS);
    await db.batch([
        // Expired sign-in links, email confirmations and password resets.
        db.delete(schema.verification).where(lt(schema.verification.expiresAt, now)),
        db.delete(schema.session).where(lt(schema.session.expiresAt, now)),
        // Rate-limit windows are minutes long.
        db.delete(schema.rateLimit).where(lt(schema.rateLimit.lastRequest, yesterday.getTime())),
        // Daily send limits only look at today (UTC).
        db
            .delete(schema.sendUsage)
            .where(lt(schema.sendUsage.day, yesterday.toISOString().slice(0, 10))),
    ]);
}
