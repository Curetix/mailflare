// Accounts (better-auth): email + password, magic links and passkeys. Clients
// outside the Worker's origin (app, extension) use the session token as a
// bearer token (bearer plugin).

import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { passkey } from "@better-auth/passkey";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { admin, bearer, magicLink } from "better-auth/plugins";

import { createDb, type Db, schema } from "./db";
import { type AccountEmail, sendAccountEmail } from "./mailer";
import { getSettings } from "./settings";

export const AUTH_BASE_PATH = "/api/auth";

/** The account email is a destination from the moment it is verified. */
async function addAccountDestination(db: Db, user: { id: string; email: string }) {
    await db
        .insert(schema.destinations)
        .values({ userId: user.id, email: user.email.toLowerCase(), verifiedAt: new Date() })
        .onConflictDoUpdate({
            target: [schema.destinations.userId, schema.destinations.email],
            set: { verifiedAt: new Date(), verificationHash: null },
        });
}

/**
 * better-auth for one request: the base URL (and with it the passkey relying
 * party) is the origin the Worker is reached on.
 */
export function createAuth(
    env: Env,
    ctx: Pick<ExecutionContext, "waitUntil"> | undefined,
    origin: string,
) {
    if (!env.AUTH_SECRET) return null;
    const settings = getSettings(env);
    const db = createDb(env.DB);

    // Not awaited, so response times don't reveal whether an account exists.
    // `email` may decide in the background not to send anything (null).
    const send = (email: AccountEmail | (() => Promise<AccountEmail | null>)) => {
        const sending = (async () => {
            const mail = typeof email === "function" ? await email() : email;
            if (mail) await sendAccountEmail(env, db, mail);
        })().catch((error: unknown) => {
            console.error(
                `Account email failed: ${error instanceof Error ? error.message : error}`,
            );
        });
        if (ctx) ctx.waitUntil(sending);
    };

    return betterAuth({
        appName: "Mailflare",
        baseURL: origin,
        basePath: AUTH_BASE_PATH,
        secret: env.AUTH_SECRET,
        database: drizzleAdapter(db, { provider: "sqlite", schema }),
        trustedOrigins: settings.trustedOrigins,
        // Workers isolates don't share memory, so counters live in D1.
        rateLimit: { enabled: true, storage: "database" },
        // The client's IP on Cloudflare (used for rate limits and sessions).
        advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            sendResetPassword: async ({ user, url }) =>
                send({
                    to: user.email,
                    subject: "Reset your Mailflare password",
                    text: `Someone asked to reset the password of your Mailflare account.\n\nSet a new password: ${url}\n\nIf this wasn't you, ignore this email.`,
                }),
        },
        emailVerification: {
            sendOnSignUp: true,
            sendOnSignIn: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({ user, url }) =>
                send({
                    to: user.email,
                    subject: "Verify your email for Mailflare",
                    text: `Confirm your email address to finish creating your Mailflare account:\n\n${url}\n\nIf you didn't sign up, ignore this email.`,
                }),
        },
        databaseHooks: {
            user: {
                create: {
                    before: async (user) => {
                        const email = user.email.toLowerCase();
                        const isAdmin = settings.adminEmails.has(email);
                        if (!settings.publicSignups && !isAdmin) {
                            // better-auth answers sign-ups refused with 403 like
                            // successful ones, so this doesn't reveal admin emails.
                            throw new APIError("FORBIDDEN", {
                                message: "Sign-ups are closed on this Mailflare Worker",
                            });
                        }
                        return { data: { ...user, email, role: isAdmin ? "admin" : "user" } };
                    },
                    after: async (user) => {
                        if (user.emailVerified) await addAccountDestination(db, user);
                    },
                },
                update: {
                    after: async (user) => {
                        if (user.emailVerified) await addAccountDestination(db, user);
                    },
                },
            },
        },
        plugins: [
            admin(),
            bearer(),
            magicLink({
                // A database leak shouldn't hand out sign-ins.
                storeToken: "hashed",
                sendMagicLink: async ({ email, url }) =>
                    send(async () => {
                        // Magic links also sign up. When that would be refused,
                        // don't mail strangers; the answer looks the same.
                        const address = email.toLowerCase();
                        if (!settings.publicSignups && !settings.adminEmails.has(address)) {
                            const existing = await db.query.user.findFirst({
                                where: { email: address },
                                columns: { id: true },
                            });
                            if (!existing) return null;
                        }
                        return {
                            to: email,
                            subject: "Sign in to Mailflare",
                            text: `Sign in to your Mailflare account:\n\n${url}\n\nThe link works once and expires in 5 minutes. If you didn't ask for it, ignore this email.`,
                        };
                    }),
            }),
            passkey({ rpID: new URL(origin).hostname, rpName: "Mailflare", origin }),
        ],
    });
}

export type Auth = NonNullable<ReturnType<typeof createAuth>>;
export type SessionUser = Auth["$Infer"]["Session"]["user"];
