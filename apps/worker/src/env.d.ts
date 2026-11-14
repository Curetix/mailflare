declare namespace Cloudflare {
    interface Env {
        DB: D1Database;
        /** Bearer token for the management API. Set with `wrangler secret put ADMIN_TOKEN`. */
        ADMIN_TOKEN?: string;
    }

    /** Types `exports` from "cloudflare:workers" (used by tests). */
    interface GlobalProps {
        mainModule: typeof import("./index");
    }
}

interface Env extends Cloudflare.Env {}
