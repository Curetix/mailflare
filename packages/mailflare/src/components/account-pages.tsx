// Pages that links in the Worker's emails open, when the Worker serves the app.

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { type FormEvent, useState } from "react";
import { useTranslations } from "use-intl";

import { createAccountClient, unwrap, verifyDestination } from "../account/account-client";
import { useAccountErrorMessage } from "../account/use-account-error";

type PageProps = { url: string; token: string; onDone: () => void };

/** Opened from a password reset email (`/reset-password?token=`). */
export function ResetPasswordPage({ url, token, onDone }: PageProps) {
    const t = useTranslations("account");
    const toast = useToast();
    const errorMessage = useAccountErrorMessage();
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tooShort = password.length > 0 && password.length < 8;

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (password.length < 8) return;
        setBusy(true);
        setError(null);
        try {
            await unwrap(createAccountClient(url).resetPassword({ newPassword: password, token }));
            toast({ body: t("reset.success") });
            onDone();
        } catch (failure) {
            setError(errorMessage(failure));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate>
            <VStack gap={3}>
                <Heading level={2}>{t("reset.title")}</Heading>
                {error && <Banner status="error" title={error} />}
                <TextInput
                    type="password"
                    label={t("reset.password_label")}
                    autoComplete="new-password"
                    value={password}
                    onChange={setPassword}
                    isDisabled={busy}
                    status={
                        tooShort ? { type: "error", message: t("password_too_short") } : undefined
                    }
                />
                <Button
                    type="submit"
                    variant="primary"
                    width="100%"
                    label={t("reset.submit")}
                    isLoading={busy}
                    isDisabled={password.length < 8}
                />
            </VStack>
        </form>
    );
}

/**
 * Opened from a destination's confirmation email (`/verify-destination?token=`).
 * Confirming takes a click, so link scanners in mailboxes can't confirm.
 */
export function VerifyDestinationPage({ url, token, onDone }: PageProps) {
    const t = useTranslations("account");
    const errorMessage = useAccountErrorMessage();
    const [state, setState] = useState<"idle" | "busy" | "done">("idle");
    const [error, setError] = useState<string | null>(null);

    async function confirm() {
        setState("busy");
        setError(null);
        try {
            await verifyDestination(url, token);
            setState("done");
        } catch (failure) {
            const status = (failure as { response?: Response }).response?.status;
            setError(status === 400 ? t("errors.link_invalid") : errorMessage(failure));
            setState("idle");
        }
    }

    return (
        <VStack gap={3}>
            <Heading level={2}>{t("verify_destination.title")}</Heading>
            {state === "done" ? (
                <>
                    <Banner status="success" title={t("verify_destination.success")} />
                    <Button label={t("verify_destination.home")} onClick={onDone} />
                </>
            ) : (
                <>
                    <Text>{t("verify_destination.description")}</Text>
                    {error && <Banner status="error" title={error} />}
                    <Button
                        variant="primary"
                        width="100%"
                        label={t("verify_destination.submit")}
                        isLoading={state === "busy"}
                        clickAction={confirm}
                    />
                </>
            )}
        </VStack>
    );
}
