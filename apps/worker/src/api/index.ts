// Management API for the Mailflare app. Personal mode: one admin, authenticated
// with the ADMIN_TOKEN secret as a bearer token.

import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { validator } from "hono/validator";
import { z } from "zod";

import {
    ALIAS_LOCAL_PART_PATTERN,
    DOMAIN_PATTERN,
    normalizeAddress,
    splitAddress,
} from "../addresses";
import { createDb, type Db, schema } from "../db";
import type * as Api from "./types";
import { API_VERSION } from "./types";

type AppEnv = { Bindings: Env; Variables: { db: Db } };

class ApiException extends HTTPException {
    constructor(
        status: ContentfulStatusCode,
        readonly code: string,
        message: string,
    ) {
        super(status, { message });
    }
}

const notFound = (what: string) => new ApiException(404, "not_found", `${what} not found`);

/** Validates a JSON body with a zod schema, answering 400 with the first issue. */
function json<T extends z.ZodType>(bodySchema: T) {
    return validator("json", (value) => {
        const result = bodySchema.safeParse(value);
        if (!result.success) {
            const issue = result.error.issues[0];
            const field = issue?.path.join(".");
            throw new ApiException(
                400,
                "invalid_request",
                field ? `${field}: ${issue?.message}` : (issue?.message ?? "Invalid request"),
            );
        }
        return result.data as z.output<T>;
    });
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

const toDomain = (d: typeof schema.domains.$inferSelect): Api.Domain => ({
    id: d.id,
    name: d.name,
    createdAt: seconds(d.createdAt),
});

const toDestination = (d: typeof schema.destinations.$inferSelect): Api.Destination => ({
    id: d.id,
    email: d.email,
    createdAt: seconds(d.createdAt),
});

const toAlias = (
    a: typeof schema.aliases.$inferSelect & { destination: { email: string } },
): Api.Alias => ({
    id: a.id,
    address: a.address,
    domainId: a.domainId,
    destination: a.destination.email,
    description: a.description,
    enabled: a.enabled,
    createdAt: seconds(a.createdAt),
    forwardedCount: a.forwardedCount,
    blockedCount: a.blockedCount,
    lastEmailAt: a.lastEmailAt ? seconds(a.lastEmailAt) : null,
});

const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Must be an email address" }));

const domainSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(DOMAIN_PATTERN, "Must be a domain name like example.com");

const descriptionSchema = z.string().max(500);

async function findDestination(db: Db, email: string) {
    const destination = await db.query.destinations.findFirst({ where: { email } });
    if (!destination) {
        throw new ApiException(400, "unknown_destination", `Unknown destination ${email}`);
    }
    return destination;
}

async function getAlias(db: Db, id: string) {
    const alias = await db.query.aliases.findFirst({
        where: { id },
        with: { destination: true },
    });
    if (!alias) throw notFound("Alias");
    return alias;
}

/** Equal-time token check: compares SHA-256 digests, which always have equal length. */
async function tokensMatch(given: string, expected: string) {
    const encoder = new TextEncoder();
    const [a, b] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(given)),
        crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    ]);
    return crypto.subtle.timingSafeEqual(a, b);
}

const v1 = new Hono<AppEnv>();

v1.use(async (c, next) => {
    const expected = c.env.ADMIN_TOKEN;
    // Fail closed: without a configured token, nobody gets in.
    if (!expected) {
        throw new ApiException(503, "not_configured", "Set the ADMIN_TOKEN secret to use the API");
    }
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
    if (!token || !(await tokensMatch(token, expected))) {
        throw new ApiException(401, "unauthorized", "Invalid or missing API token");
    }
    c.set("db", createDb(c.env.DB));
    await next();
});

v1.get("/me", (c) => c.json<Api.Me>({ role: "admin" }));

// Domains

v1.get("/domains", async (c) => {
    const rows = await c.var.db.query.domains.findMany({ orderBy: { name: "asc" } });
    return c.json<Api.Domain[]>(rows.map(toDomain));
});

v1.post("/domains", json(z.object({ name: domainSchema })), async (c) => {
    const { db } = c.var;
    const { name } = c.req.valid("json");
    if (await db.query.domains.findFirst({ where: { name } })) {
        throw new ApiException(409, "already_exists", `Domain ${name} already exists`);
    }
    // Forwarding to an address on our own domain would loop.
    const destinations = await db.query.destinations.findMany();
    if (destinations.some((d) => splitAddress(d.email)?.domain === name)) {
        throw new ApiException(400, "mail_loop", `A destination already uses ${name}`);
    }
    const [domain] = await db.insert(schema.domains).values({ name }).returning();
    return c.json<Api.Domain>(toDomain(domain!), 201);
});

v1.delete("/domains/:id", async (c) => {
    const { db } = c.var;
    const id = c.req.param("id");
    if (!(await db.query.domains.findFirst({ where: { id } }))) throw notFound("Domain");
    if (await db.query.aliases.findFirst({ where: { domainId: id } })) {
        throw new ApiException(409, "in_use", "Delete the domain's aliases first");
    }
    await db.delete(schema.domains).where(eq(schema.domains.id, id));
    return c.body(null, 204);
});

// Destinations

v1.get("/destinations", async (c) => {
    const rows = await c.var.db.query.destinations.findMany({ orderBy: { email: "asc" } });
    return c.json<Api.Destination[]>(rows.map(toDestination));
});

v1.post("/destinations", json(z.object({ email: emailSchema })), async (c) => {
    const { db } = c.var;
    const { email } = c.req.valid("json");
    if (await db.query.destinations.findFirst({ where: { email } })) {
        throw new ApiException(409, "already_exists", `Destination ${email} already exists`);
    }
    const domain = splitAddress(email)?.domain ?? "";
    if (await db.query.domains.findFirst({ where: { name: domain } })) {
        throw new ApiException(400, "mail_loop", "Destinations cannot use this Worker's domains");
    }
    const [destination] = await db.insert(schema.destinations).values({ email }).returning();
    return c.json<Api.Destination>(toDestination(destination!), 201);
});

v1.delete("/destinations/:id", async (c) => {
    const { db } = c.var;
    const id = c.req.param("id");
    if (!(await db.query.destinations.findFirst({ where: { id } }))) throw notFound("Destination");
    if (await db.query.aliases.findFirst({ where: { destinationId: id } })) {
        throw new ApiException(409, "in_use", "Aliases still forward to this destination");
    }
    await db.delete(schema.destinations).where(eq(schema.destinations.id, id));
    return c.body(null, 204);
});

// Aliases

v1.get("/aliases", async (c) => {
    const domainId = c.req.query("domainId");
    const rows = await c.var.db.query.aliases.findMany({
        // Drizzle rejects `where: undefined`, so only add the filter when given.
        ...(domainId && { where: { domainId } }),
        with: { destination: true },
        orderBy: { createdAt: "desc" },
    });
    return c.json<Api.Alias[]>(rows.map(toAlias));
});

v1.post(
    "/aliases",
    json(
        z.object({
            address: z.string().trim().toLowerCase(),
            destination: emailSchema,
            description: descriptionSchema.optional(),
            enabled: z.boolean().optional(),
        }),
    ),
    async (c) => {
        const { db } = c.var;
        const body = c.req.valid("json");
        const address = normalizeAddress(body.address);
        const parts = splitAddress(address);
        if (!parts || !ALIAS_LOCAL_PART_PATTERN.test(parts.local)) {
            throw new ApiException(
                400,
                "invalid_address",
                "Alias names may use letters, digits, dots, underscores and hyphens",
            );
        }
        const domain = await db.query.domains.findFirst({ where: { name: parts.domain } });
        if (!domain) {
            throw new ApiException(
                400,
                "unknown_domain",
                `Domain ${parts.domain} is not configured`,
            );
        }
        if (await db.query.aliases.findFirst({ where: { address } })) {
            throw new ApiException(409, "already_exists", `Alias ${address} already exists`);
        }
        const destination = await findDestination(db, body.destination);
        const [alias] = await db
            .insert(schema.aliases)
            .values({
                address,
                domainId: domain.id,
                destinationId: destination.id,
                description: body.description ?? "",
                enabled: body.enabled ?? true,
            })
            .returning();
        return c.json<Api.Alias>(toAlias({ ...alias!, destination }), 201);
    },
);

v1.patch(
    "/aliases/:id",
    json(
        z.object({
            destination: emailSchema.optional(),
            description: descriptionSchema.optional(),
            enabled: z.boolean().optional(),
        }),
    ),
    async (c) => {
        const { db } = c.var;
        const id = c.req.param("id");
        const body = c.req.valid("json");
        await getAlias(db, id);
        const destination =
            body.destination !== undefined ? await findDestination(db, body.destination) : null;
        const changes = {
            ...(destination && { destinationId: destination.id }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.enabled !== undefined && { enabled: body.enabled }),
        };
        if (Object.keys(changes).length > 0) {
            await db.update(schema.aliases).set(changes).where(eq(schema.aliases.id, id));
        }
        return c.json<Api.Alias>(toAlias(await getAlias(db, id)));
    },
);

v1.delete("/aliases/:id", async (c) => {
    const { db } = c.var;
    const id = c.req.param("id");
    const result = await db.delete(schema.aliases).where(eq(schema.aliases.id, id)).returning();
    if (result.length === 0) throw notFound("Alias");
    return c.body(null, 204);
});

export const app = new Hono<AppEnv>();

// Bearer tokens, no cookies: any origin may call the API (the app runs in
// browsers and extensions), but only with the token.
app.use(
    "/api/*",
    cors({
        origin: "*",
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: ["GET", "POST", "PATCH", "DELETE"],
        maxAge: 86400,
    }),
);

app.get("/api/info", (c) => c.json<Api.ApiInfo>({ name: "mailflare", apiVersion: API_VERSION }));
app.route("/api/v1", v1);

app.notFound((c) =>
    c.json<Api.ApiError>({ error: { code: "not_found", message: "Not found" } }, 404),
);

app.onError((error, c) => {
    if (error instanceof ApiException) {
        return c.json<Api.ApiError>(
            { error: { code: error.code, message: error.message } },
            error.status,
        );
    }
    if (error instanceof HTTPException) {
        return c.json<Api.ApiError>(
            { error: { code: "http_error", message: error.message } },
            error.status,
        );
    }
    console.error(error);
    return c.json<Api.ApiError>(
        { error: { code: "internal_error", message: "Internal error" } },
        500,
    );
});
