import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { ReactNode } from "react";

import { OfflineBanner } from "./offline-banner";

/** A centered column: sign-in and the pages email links open. */
export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <VStack height="100%" maxWidth={600} style={{ marginInline: "auto" }}>
            <HStack justify="between" align="center" paddingInline={3} paddingBlock={2}>
                <Text type="large" weight="bold">
                    MailFlare
                </Text>
            </HStack>
            <Divider />
            <OfflineBanner />
            <VStack padding={2}>{children}</VStack>
        </VStack>
    );
}
