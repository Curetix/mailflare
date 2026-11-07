---
title: Introduction
description: What is MailFlare and how does it work?
---

MailFlare is a browser extension and web app that turns [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) into your own private email alias service — similar to SimpleLogin, AnonAddy, and others, but without any third-party services or self-hosted email servers.

## How it works

Cloudflare Email Routing lets you create custom email addresses for your domain that forward to your real inbox. MailFlare makes it easy to create and manage these addresses (aliases) directly from your browser or the web app.

When you create an alias like `github_abc1@yourdomain.com`, any email sent to that address is forwarded by Cloudflare to your real email address. You can create unique aliases for every website, making it easy to identify which service shared your email and to disable aliases you no longer need.

## Key Features

- **Browser extension** for Chrome, Edge, Firefox, and other Chromium-based browsers
- **Web app** that works on any platform — installable as a PWA
- **Generate aliases** with random characters, words, or custom formats
- **Context menu** — right-click to generate and copy an alias for the current site
- **Bulk operations** — edit or delete multiple aliases at once
- **Domain-based prefixes** — automatically prefix aliases with the current website's domain
- **Multiple domains** — manage aliases across all your Cloudflare zones

## Prerequisites

- A [Cloudflare](https://cloudflare.com) account
- At least one domain with [Email Routing](https://developers.cloudflare.com/email-routing/) enabled
- A verified destination email address in Cloudflare Email Routing
