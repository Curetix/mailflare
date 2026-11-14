import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import { z } from "zod";

import type { Alias } from "../backend/types";
import { useMailflare } from "../backend/use-mailflare";
import { useOnlineStatus } from "../hooks/use-online-status";

type Props = {
    open: boolean;
    onClose: () => void;
    alias: Alias | null;
};

const editSchema = z.object({
    description: z.string(),
    destination: z.string().min(1),
    enabled: z.boolean(),
});

type EditForm = z.infer<typeof editSchema>;

export function AliasEditDialog({ open, onClose, alias }: Props) {
    const t = useTranslations("alias_edit");
    const tf = useTranslations("alias_create");
    const tc = useTranslations("common");
    const toast = useToast();
    const { destinations, updateAlias } = useMailflare();
    const { isOnline } = useOnlineStatus();

    const { handleSubmit, control, reset } = useForm<EditForm>({
        resolver: zodResolver(editSchema),
        defaultValues: { description: "", destination: "", enabled: true },
    });

    useEffect(() => {
        if (alias && open) {
            reset({
                description: alias.description.trim(),
                destination: alias.destination,
                enabled: alias.enabled,
            });
        }
    }, [alias, open, reset]);

    // Aliases can only forward to confirmed mailboxes (keeping the current one).
    const destinationOptions =
        destinations.data
            ?.filter((d) => d.verified || d.email === alias?.destination)
            .map((d) => ({ value: d.email, label: d.email })) ?? [];

    function onSubmit(values: EditForm) {
        if (!alias) {
            toast({ body: t("not_found"), type: "error" });
            return;
        }

        updateAlias.mutate(
            { alias, changes: values },
            {
                onSuccess: () => {
                    toast({ body: t("success") });
                    onClose();
                },
                onError: (error) => {
                    toast({ body: t("error", { error: String(error) }), type: "error" });
                },
            },
        );
    }

    const handleOpenChange = (isOpen: boolean) => !isOpen && onClose();

    return (
        <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose="form">
            {/* display: contents lets the Layout fill the dialog (scrolling content,
                pinned footer) while the footer's submit button stays inside the form. */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "contents" }}>
                <Layout
                    header={<DialogHeader title={t("title")} onOpenChange={handleOpenChange} />}
                    footer={
                        <LayoutFooter hasDivider>
                            <Button
                                type="submit"
                                variant="primary"
                                label={t("save")}
                                isLoading={updateAlias.isPending}
                                isDisabled={!isOnline}
                                tooltip={!isOnline ? tc("offline") : undefined}
                            />
                        </LayoutFooter>
                    }
                >
                    <LayoutContent>
                        <VStack gap={3}>
                            <TextInput label={t("alias")} value={alias?.address ?? ""} isReadOnly />

                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <TextInput
                                        label={tf("description")}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                    />
                                )}
                            />

                            <Controller
                                name="destination"
                                control={control}
                                render={({ field }) => (
                                    <Selector
                                        label={tf("destination")}
                                        options={destinationOptions}
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                    />
                                )}
                            />

                            <Controller
                                name="enabled"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        label={tc("enabled")}
                                        value={field.value}
                                        onChange={(checked) => field.onChange(checked)}
                                    />
                                )}
                            />
                        </VStack>
                    </LayoutContent>
                </Layout>
            </form>
        </Dialog>
    );
}
