import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import { ALIAS_HEADER, handleEmail, REJECT_REASON } from "../src/email";
import { api, seedAlias } from "./helpers";

type Alias = {
    id: string;
    forwardedCount: number;
    blockedCount: number;
    lastEmailAt: number | null;
};

/** A stand-in for Cloudflare's incoming message, recording what the Worker does with it. */
function incoming(to: string) {
    return {
        from: "sender@elsewhere.test",
        to,
        headers: new Headers({ Subject: "Hello" }),
        raw: new ReadableStream(),
        rawSize: 0,
        canBeForwarded: true,
        setReject: vi.fn(),
        forward: vi.fn(async () => ({ messageId: "test" })),
        reply: vi.fn(),
    } satisfies ForwardableEmailMessage;
}

async function receive(to: string) {
    const message = incoming(to);
    const ctx = createExecutionContext();
    await handleEmail(message, env, ctx);
    await waitOnExecutionContext(ctx);
    return message;
}

async function getAlias(id: string) {
    const { body } = await api<Alias[]>("GET", "/api/v1/aliases");
    return body.find((a) => a.id === id)!;
}

describe("email handler", () => {
    it("forwards mail for an alias to its destination, tagged with the alias", async () => {
        const alias = await seedAlias("shop@forward.test", "owner@inbox.test");

        const message = await receive("shop@forward.test");

        expect(message.setReject).not.toHaveBeenCalled();
        expect(message.forward).toHaveBeenCalledOnce();
        const [recipient, headers] = message.forward.mock.calls[0] as unknown as [string, Headers];
        expect(recipient).toBe("owner@inbox.test");
        expect(headers.get(ALIAS_HEADER)).toBe("shop@forward.test");

        const stored = await getAlias(alias.id);
        expect(stored.forwardedCount).toBe(1);
        expect(stored.lastEmailAt).not.toBeNull();
    });

    it("matches recipients case-insensitively", async () => {
        await seedAlias("news@case.test");
        const message = await receive("News@CASE.test");
        expect(message.forward).toHaveBeenCalledOnce();
    });

    it("delivers subaddresses (alias+tag) to the alias", async () => {
        await seedAlias("list@plus.test");
        const message = await receive("list+promo@plus.test");
        expect(message.forward).toHaveBeenCalledOnce();
    });

    it("rejects unknown addresses", async () => {
        await seedAlias("known@unknown.test");
        const message = await receive("nobody@unknown.test");
        expect(message.forward).not.toHaveBeenCalled();
        expect(message.setReject).toHaveBeenCalledWith(REJECT_REASON);
    });

    it("rejects mail for disabled aliases the same way, and counts it as blocked", async () => {
        const alias = await seedAlias("paused@disabled.test");
        await api("PATCH", `/api/v1/aliases/${alias.id}`, { enabled: false });

        const message = await receive("paused@disabled.test");

        expect(message.forward).not.toHaveBeenCalled();
        expect(message.setReject).toHaveBeenCalledWith(REJECT_REASON);
        const stored = await getAlias(alias.id);
        expect(stored.blockedCount).toBe(1);
        expect(stored.forwardedCount).toBe(0);
    });
});
