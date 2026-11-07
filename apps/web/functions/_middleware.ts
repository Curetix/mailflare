export const onRequest: PagesFunction = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, PUT, OPTIONS",
                "Access-Control-Max-Age": "86400",
            },
        });
    }

    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    newResponse.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, PATCH, PUT, OPTIONS",
    );
    return newResponse;
};
