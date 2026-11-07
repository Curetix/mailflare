import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ReactNode } from "react";

import { OfflineBanner } from "./offline-banner";
import { SettingsDrawer } from "./settings-drawer";

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <VStack height="100%" maxWidth={600} style={{ marginInline: "auto" }}>
            <HStack justify="between" align="center" paddingInline={3} paddingBlock={2}>
                <Text type="large" weight="bold">
                    MailFlare
                </Text>
                <SettingsDrawer />
            </HStack>
            <Divider />
            <OfflineBanner />
            <VStack padding={2}>{children}</VStack>
        </VStack>
    );
}
