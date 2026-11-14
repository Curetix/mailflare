import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
    // The same migrations Wrangler applies, in Drizzle's folder layout.
    const migrations = await readD1Migrations({
        migrationsDir: "migrations",
        migrationsPattern: "migrations/*/migration.sql",
    });

    return {
        plugins: [
            cloudflareTest({
                wrangler: { configPath: "./wrangler.jsonc" },
                remoteBindings: false,
                miniflare: {
                    bindings: { ADMIN_TOKEN: "test-admin-token", TEST_MIGRATIONS: migrations },
                },
            }),
        ],
        test: {
            setupFiles: ["./test/apply-migrations.ts"],
        },
    };
});
