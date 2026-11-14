import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const id = () =>
    text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
    integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date());

/** Domains this Worker receives mail for (its catch-all target). */
export const domains = sqliteTable("domains", {
    id: id(),
    name: text("name").notNull().unique(),
    createdAt: createdAt(),
});

/** Mailboxes aliases forward to. Must be verified destinations in Cloudflare. */
export const destinations = sqliteTable("destinations", {
    id: id(),
    email: text("email").notNull().unique(),
    createdAt: createdAt(),
});

export const aliases = sqliteTable(
    "aliases",
    {
        id: id(),
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
    (t) => [index("aliases_domain_created").on(t.domainId, t.createdAt)],
);

/**
 * Short keys for reverse addresses whose readable form (alias+local=domain)
 * would exceed the 64-character local-part limit.
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
