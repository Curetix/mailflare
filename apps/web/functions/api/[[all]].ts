const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";

export const onRequest: PagesFunction = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const pathname = url.pathname.replace("/api/", "");

        const response = await fetch(`${CLOUDFLARE_API_BASE_URL}/${pathname}${url.search}`, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch (error: unknown) {
        return new Response(
            JSON.stringify({
                success: false,
                message: "Internal server error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
};
