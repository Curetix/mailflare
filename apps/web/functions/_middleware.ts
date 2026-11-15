// CORS for the Cloudflare API proxy (functions/api).

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, PUT, OPTIONS",
};

export const onRequest: PagesFunction = async ({ request, next }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                ...CORS_HEADERS,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400",
            },
        });
    }

    // The proxied response's headers are immutable; copy it to add ours.
    const proxied = await next();
    const response = new Response(proxied.body, proxied);
    for (const [name, value] of Object.entries(CORS_HEADERS)) {
        response.headers.set(name, value);
    }
    return response;
};
