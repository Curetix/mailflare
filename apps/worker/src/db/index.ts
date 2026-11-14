import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
    aliases: {
        domain: r.one.domains({ from: r.aliases.domainId, to: r.domains.id, optional: false }),
        destination: r.one.destinations({
            from: r.aliases.destinationId,
            to: r.destinations.id,
            optional: false,
        }),
    },
    domains: {
        aliases: r.many.aliases(),
    },
    reverseContacts: {
        alias: r.one.aliases({
            from: r.reverseContacts.aliasId,
            to: r.aliases.id,
            optional: false,
        }),
    },
    destinations: {
        aliases: r.many.aliases(),
    },
}));

export function createDb(d1: D1Database) {
    return drizzle(d1, { relations });
}

export type Db = ReturnType<typeof createDb>;

export { schema };
