import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { CHROME_DOWNLOAD_LINK, FIREFOX_DOWNLOAD_LINK, GITHUB_LINK } from "@mailflare/core/const";
import type { ReactNode } from "react";
import {
    TbBrandChrome,
    TbBrandFirefox,
    TbBrandGithub,
    TbClick,
    TbCode,
    TbEdit,
    TbPuzzle,
    TbSearch,
    TbSparkles,
} from "react-icons/tb";

const WEB_APP_LINK = "https://app.mailflare.cc";

const FEATURES: { icon: ReactNode; title: string; description: string }[] = [
    {
        icon: <TbPuzzle />,
        title: "Browser Extension",
        description:
            "Available for Chrome, Edge, Firefox, and other Chromium-based browsers, or as an installable web app for any platform.",
    },
    {
        icon: <TbSearch />,
        title: "List and Search",
        description:
            "List and search your email aliases for each Cloudflare domain with instant filtering.",
    },
    {
        icon: <TbSparkles />,
        title: "Generate Aliases",
        description:
            "Generate new addresses with your preferred settings, from the popup or the page context menu.",
    },
    {
        icon: <TbEdit />,
        title: "Edit and Delete",
        description:
            "Edit descriptions and destinations, and toggle aliases on or off. Bulk operations supported.",
    },
    {
        icon: <TbClick />,
        title: "Context Menu",
        description:
            "Right-click on any page to instantly generate and copy a new alias for the current site.",
    },
    {
        icon: <TbCode />,
        title: "Open Source",
        description:
            "MailFlare is fully open source. Inspect the code, contribute, or self-host the web app.",
    },
];

const CONTENT_WIDTH = 960;

export default function HomePage() {
    return (
        <VStack as="main" minHeight="100vh">
            {/* Hero */}
            <VStack
                as="header"
                gap={8}
                align="center"
                paddingInline={4}
                paddingBlock={10}
                maxWidth={760}
                style={{
                    marginInline: "auto",
                    paddingBlockStart: "clamp(4rem, 12vw, 8rem)",
                    paddingBlockEnd: "clamp(2rem, 6vw, 4rem)",
                }}
            >
                <img src="/icon.png" alt="" width={72} height={72} />
                <VStack gap={5}>
                    <Heading level={1} type="display-1" justify="center" textWrap="balance">
                        Create email <span style={accent}>aliases</span> with{" "}
                        <span style={accent}>Cloudflare</span> Email Routing
                    </Heading>
                    <Text type="large" color="secondary" justify="center" textWrap="pretty">
                        MailFlare is a browser extension and web app that turns Cloudflare Email
                        Routing into your own private email alias service, similar to addy.io or
                        SimpleLogin. No third-party service and no self-hosted mail server needed.
                    </Text>
                </VStack>
                <HStack gap={3} justify="center" wrap="wrap">
                    <Button variant="primary" size="lg" label="Download" href="#downloads" />
                    <Button size="lg" label="Open Web App" href={WEB_APP_LINK} target="_blank" />
                    <Button
                        variant="ghost"
                        size="lg"
                        label="GitHub"
                        icon={<TbBrandGithub />}
                        href={GITHUB_LINK}
                        target="_blank"
                    />
                </HStack>
            </VStack>

            {/* Features */}
            <VStack
                as="section"
                gap={8}
                paddingInline={4}
                paddingBlock={10}
                maxWidth={CONTENT_WIDTH}
                width="100%"
                style={{ marginInline: "auto", boxSizing: "border-box" }}
            >
                <Heading level={2} type="display-3" justify="center">
                    Features
                </Heading>
                <Grid columns={{ minWidth: 260, max: 3 }} gap={4}>
                    {FEATURES.map((f) => (
                        <Card key={f.title} padding={5}>
                            <VStack gap={2}>
                                <span style={featureIcon}>{f.icon}</span>
                                <Heading level={3}>{f.title}</Heading>
                                <Text color="secondary">{f.description}</Text>
                            </VStack>
                        </Card>
                    ))}
                </Grid>
            </VStack>

            {/* Downloads */}
            <Section variant="muted" dividers={["top", "bottom"]} paddingBlock={10}>
                <div id="downloads" style={{ scrollMarginTop: 32 }}>
                    <HStack
                        gap={10}
                        align="center"
                        wrap="wrap"
                        justify="center"
                        maxWidth={CONTENT_WIDTH}
                        style={{ marginInline: "auto" }}
                    >
                        <VStack gap={3} style={{ flex: "1 1 360px" }}>
                            <Heading level={2} type="display-3">
                                Extension Downloads
                            </Heading>
                            <Text type="large" color="secondary">
                                For Chromium-based browsers (Chrome, Brave, Edge, Opera), install
                                the extension from the Chrome Web Store. For Firefox, download it
                                from the GitHub releases page.
                            </Text>
                        </VStack>
                        <VStack gap={3} style={{ flex: "0 1 240px" }}>
                            <Button
                                variant="primary"
                                size="lg"
                                width="100%"
                                label="Chrome Web Store"
                                icon={<TbBrandChrome />}
                                href={CHROME_DOWNLOAD_LINK}
                                target="_blank"
                            />
                            <Button
                                size="lg"
                                width="100%"
                                label="Firefox"
                                icon={<TbBrandFirefox />}
                                href={FIREFOX_DOWNLOAD_LINK}
                                target="_blank"
                            />
                        </VStack>
                    </HStack>
                </div>
            </Section>

            {/* Footer */}
            <HStack
                as="footer"
                justify="between"
                align="center"
                wrap="wrap"
                gap={4}
                paddingInline={4}
                paddingBlock={8}
                maxWidth={CONTENT_WIDTH}
                width="100%"
                style={{ marginInline: "auto", boxSizing: "border-box" }}
            >
                <Text color="secondary">© Curetix {new Date().getFullYear()}</Text>
                <HStack gap={6}>
                    <Link href={WEB_APP_LINK} color="secondary">
                        Web App
                    </Link>
                    <Link href={GITHUB_LINK} color="secondary">
                        GitHub
                    </Link>
                </HStack>
            </HStack>
        </VStack>
    );
}

const accent = { color: "var(--color-accent)" } as const;

const featureIcon = {
    display: "inline-flex",
    fontSize: 28,
    color: "var(--color-accent)",
} as const;
