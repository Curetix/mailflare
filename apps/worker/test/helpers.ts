import { exports } from "cloudflare:workers";

export const TOKEN = "test-admin-token";

/** Calls the Worker's API as the admin. */
export async function api<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    token: string | null = TOKEN,
): Promise<{ status: number; body: T }> {
    const headers = new Headers();
    if (token !== null) headers.set("Authorization", `Bearer ${token}`);
    if (body !== undefined) headers.set("Content-Type", "application/json");
    const response = await exports.default.fetch(
        new Request(`https://worker.test${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        }),
    );
    const text = await response.text();
    return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
}

/** Creates a domain, a destination and an alias on it; returns the alias. */
export async function seedAlias(address: string, destination = "me@inbox.test") {
    const domain = address.split("@")[1]!;
    await api("POST", "/api/v1/domains", { name: domain });
    await api("POST", "/api/v1/destinations", { email: destination });
    const { status, body } = await api<{ id: string; address: string }>("POST", "/api/v1/aliases", {
        address,
        destination,
    });
    if (status !== 201) throw new Error(`seedAlias failed: ${status} ${JSON.stringify(body)}`);
    return body;
}
