import {
    index,
    integer,
    primaryKey,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth-schema";

export * from "./auth-schema";

const id = () =>
    text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
    integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date());

/** Owning account; null for data managed with the ADMIN_TOKEN. */
const ownerId = () => text("user_id").references(() => user.id, { onDelete: "cascade" });

/** Domains this Worker receives mail for (its catch-all target). */
export const domains = sqliteTable("domains", {
    id: id(),
    name: text("name").notNull().unique(),
    /** Whether every account may create aliases on it (otherwise admins only). */
    shared: integer("shared", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
});

/** Mailboxes aliases forward to. */
export const destinations = sqliteTable(
    "destinations",
    {
        id: id(),
        userId: ownerId(),
        email: text("email").notNull(),
        /** Set once the owner confirmed the mailbox; aliases only deliver to verified ones. */
        verifiedAt: integer("verified_at", { mode: "timestamp" }),
        /** SHA-256 of the pending verification token, hex. */
        verificationHash: text("verification_hash"),
        verificationSentAt: integer("verification_sent_at", { mode: "timestamp" }),
        createdAt: createdAt(),
    },
    (t) => [
        uniqueIndex("destinations_user_email").on(t.userId, t.email),
        index("destinations_email").on(t.email),
    ],
);

export const aliases = sqliteTable(
    "aliases",
    {
        id: id(),
        userId: ownerId(),
        /** Full address, always lowercase. */
        address: text("address").notNull().unique(),
        domainId: text("domain_id")
            .notNull()
            .references(() => domains.id),
        destinationId: text("destination_id")
            .notNull()
            .references(() => destinations.id),
        description: text("description").notNull().default(""),
        enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
        createdAt: createdAt(),
        forwardedCount: integer("forwarded_count").notNull().default(0),
        blockedCount: integer("blocked_count").notNull().default(0),
        /** Messages sent from the alias through reverse addresses. */
        sentCount: integer("sent_count").notNull().default(0),
        lastEmailAt: integer("last_email_at", { mode: "timestamp" }),
    },
    (t) => [
        index("aliases_domain_created").on(t.domainId, t.createdAt),
        index("aliases_user_created").on(t.userId, t.createdAt),
    ],
);

/**
 * Contacts of an alias: everyone who mailed it or was a recipient alongside
 * it. Accounts may only send from an alias to its contacts. The key is used in
 * reverse addresses whose readable form (alias+local=domain) would exceed the
 * 64-character local-part limit.
 */
export const reverseContacts = sqliteTable(
    "reverse_contacts",
    {
        /** The key in alias+=<key>@domain. */
        key: text("key").primaryKey(),
        aliasId: text("alias_id")
            .notNull()
            .references(() => aliases.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        createdAt: createdAt(),
    },
    (t) => [uniqueIndex("reverse_contacts_alias_email").on(t.aliasId, t.email)],
);

/** Messages each account sent from its aliases, per UTC day (for the daily limit). */
export const sendUsage = sqliteTable(
    "send_usage",
    {
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        /** YYYY-MM-DD, UTC. */
        day: text("day").notNull(),
        count: integer("count").notNull().default(0),
    },
    (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
