---
title: Permissions
description: What permissions the MailFlare extension requires and why.
---

The MailFlare browser extension requests the following permissions:

## Required Permissions

### `storage`

Used to store your API token, settings, alias preferences, and cached data locally in the browser. Data never leaves your device except for API calls to Cloudflare.

### `contextMenus`

Used to add the "Generate and copy new MailFlare alias" option to the browser's right-click context menu.

### `clipboardWrite`

Used to copy newly created aliases to your clipboard — both from the popup and the context menu.

### `activeTab`

Used to detect the current website's hostname for domain-based alias prefixes and the quick-create button on email input fields.

## Host Permissions

### `https://api.cloudflare.com/*`

The extension communicates directly with the Cloudflare API to manage your email routing rules. This host permission allows those requests.

## What MailFlare Does NOT Do

- Does **not** collect or transmit analytics or telemetry
- Does **not** access your browsing history
- Does **not** modify web page content (except for the optional quick-create overlay button and alert notifications)
- Does **not** store your API token on any external server
