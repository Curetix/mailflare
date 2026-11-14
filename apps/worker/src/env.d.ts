declare namespace Cloudflare {
    interface Env {
        DB: D1Database;
        /** Bearer token for the management API. Set with `wrangler secret put ADMIN_TOKEN`. */
        ADMIN_TOKEN?: string;
        /**
         * Email Service binding for re-sending incoming mail and sending from
         * aliases. Optional: without it, mail is forwarded unchanged.
         */
        EMAIL?: SendEmail;
    }

    /** Types `exports` from "cloudflare:workers" (used by tests). */
    interface GlobalProps {
        mainModule: typeof import("./index");
    }
}

interface Env extends Cloudflare.Env {}
