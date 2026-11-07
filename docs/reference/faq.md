---
title: FAQ
description: Frequently asked questions about MailFlare.
---

## General

### What is MailFlare?

MailFlare is an open-source browser extension and web app that lets you create and manage email aliases using [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/). It's similar to SimpleLogin or AnonAddy, but uses your own Cloudflare account — no third-party services needed.

### Is MailFlare free?

Yes. MailFlare is free and open source. Cloudflare Email Routing is also free for up to 200 routing rules per zone.

### Where is my data stored?

Your API token and settings are stored locally in your browser (using `localStorage` for the web app or `chrome.storage.local` for the extension). Nothing is sent to any server other than the Cloudflare API.

## Email Routing

### Do I need a paid Cloudflare plan?

No. Cloudflare Email Routing is available on the free plan.

### How many aliases can I create?

Cloudflare Email Routing supports up to **200 email routing rules** per zone (domain) on the free plan.

### Can I reply from my alias address?

Not directly through MailFlare. Cloudflare Email Routing only handles incoming email forwarding. To reply as your alias, you'd need to configure your email client (e.g., Gmail "Send mail as") with an SMTP relay.

### What happens if I delete an alias?

The email routing rule is removed from Cloudflare. Emails sent to that address will no longer be forwarded and will bounce.

## Troubleshooting

### My token verification fails

Make sure your API token has all required permissions:

- Account → Email Routing Addresses → Read
- Zone → Email Routing Rules → Edit
- Zone → Zone → Read
- Zone → Zone Settings → Read

See [API Token Setup](../guides/api-token.md) for full instructions.

### I don't see any domains

Check that:

1. Your API token has Zone → Read permission
2. Your Cloudflare account has at least one domain
3. Email Routing is enabled on the domain

### The web app shows a loading error

The web app proxies API requests through Cloudflare Pages Functions. Ensure you have a valid internet connection and that your API token is correct.

### Context menu isn't working

Make sure:

1. You're logged in to the extension
2. A domain is selected
3. Your alias format is not set to "custom" (context menu only works with auto-generated formats)
4. You have a destination email configured
