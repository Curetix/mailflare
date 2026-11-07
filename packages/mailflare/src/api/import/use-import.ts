import { useCallback, useRef, useState } from "react";

import { EMAIL_RULE_NAME_PREFIX } from "../../const";
import { CloudflareApiClient } from "../cloudflare-client";
import { AddyClient } from "./addy-client";
import { SimpleLoginClient } from "./simplelogin-client";
import type { ImportedAlias, ImportProgress, ImportResult, ImportService } from "./types";

const IMPORT_DELAY_MS = 250;

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useImport() {
    const [progress, setProgress] = useState<ImportProgress>({
        total: 0,
        completed: 0,
        failed: 0,
        errors: [],
        status: "idle",
    });

    const abortRef = useRef(false);

    const fetchAliases = useCallback(
        async (
            service: ImportService,
            apiToken: string,
            serviceBaseUrl?: string,
        ): Promise<ImportedAlias[]> => {
            setProgress((p) => ({ ...p, status: "fetching", errors: [] }));
            try {
                const client =
                    service === "addy"
                        ? new AddyClient(apiToken, serviceBaseUrl)
                        : new SimpleLoginClient(apiToken, serviceBaseUrl);
                const aliases = await client.getAllAliases();
                setProgress((p) => ({ ...p, status: "idle", total: aliases.length }));
                return aliases;
            } catch (error) {
                setProgress((p) => ({
                    ...p,
                    status: "error",
                    errors: [`Failed to fetch aliases: ${String(error)}`],
                }));
                return [];
            }
        },
        [],
    );

    const verifyServiceToken = useCallback(
        async (
            service: ImportService,
            apiToken: string,
            serviceBaseUrl?: string,
        ): Promise<boolean> => {
            const client =
                service === "addy"
                    ? new AddyClient(apiToken, serviceBaseUrl)
                    : new SimpleLoginClient(apiToken, serviceBaseUrl);
            return client.verifyToken();
        },
        [],
    );

    const importAliases = useCallback(
        async (
            aliases: ImportedAlias[],
            cfApiToken: string,
            domainToZoneId: Record<string, string>,
            destination: string,
            cfApiBaseUrl?: string,
        ): Promise<ImportResult> => {
            abortRef.current = false;
            const cfClient = new CloudflareApiClient(cfApiToken, cfApiBaseUrl);
            const result: ImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };

            setProgress({
                total: aliases.length,
                completed: 0,
                failed: 0,
                errors: [],
                status: "importing",
            });

            for (const alias of aliases) {
                if (abortRef.current) break;

                const zoneId = domainToZoneId[alias.domain.toLowerCase()];
                if (!zoneId) {
                    result.skipped++;
                    setProgress((p) => ({
                        ...p,
                        completed: p.completed + 1,
                    }));
                    continue;
                }

                try {
                    await cfClient.createEmailRule(zoneId, {
                        matchers: [{ field: "to", type: "literal", value: alias.email }],
                        actions: [{ type: "forward", value: [destination] }],
                        enabled: alias.enabled,
                        name: `${EMAIL_RULE_NAME_PREFIX}${alias.description || alias.localPart}`,
                        priority: 0,
                    });
                    result.imported++;
                } catch (error) {
                    result.failed++;
                    const msg = `Failed to import ${alias.email}: ${String(error)}`;
                    result.errors.push(msg);
                    setProgress((p) => ({
                        ...p,
                        failed: p.failed + 1,
                        errors: [...p.errors, msg],
                    }));
                }

                setProgress((p) => ({
                    ...p,
                    completed: p.completed + 1,
                }));

                // Rate limit delay
                await delay(IMPORT_DELAY_MS);
            }

            setProgress((p) => ({ ...p, status: "done" }));
            return result;
        },
        [],
    );

    const abort = useCallback(() => {
        abortRef.current = true;
    }, []);

    const reset = useCallback(() => {
        abortRef.current = false;
        setProgress({
            total: 0,
            completed: 0,
            failed: 0,
            errors: [],
            status: "idle",
        });
    }, []);

    return { progress, fetchAliases, verifyServiceToken, importAliases, abort, reset };
}
