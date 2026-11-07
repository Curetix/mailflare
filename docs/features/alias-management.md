---
title: Alias Management
description: How to create, edit, search, and delete email aliases.
---

## Viewing Aliases

After logging in, MailFlare loads your Cloudflare zones (domains). Select a domain from the dropdown to view its email aliases.

- Aliases created by MailFlare show their description (usually the website name)
- External aliases (not created by MailFlare) are marked with a blue "External" badge
- Disabled aliases are marked with a red "Disabled" badge
- Aliases with invalid or unverified destinations show a red "Invalid" badge

## Creating Aliases

Click the **+** button to open the create dialog. You can configure:

### Alias Format

- **Characters** — random alphanumeric string (e.g., `abc12@domain.com`)
- **Words** — random English words (e.g., `happy_cloud@domain.com`)
- **Domain** (extension only) — uses the current website's domain as the alias
- **Custom** — enter your own alias address

### Prefix

- **None** — no prefix
- **Domain without extension** — e.g., `github_abc12@domain.com`
- **Domain with extension** — e.g., `github.com_abc12@domain.com`
- **Full domain** — e.g., `www.github.com_abc12@domain.com`
- **Custom** — enter your own prefix

### Other Options

- **Description** — a note for the alias (defaults to the current hostname in the extension)
- **Destination** — which verified email address receives forwarded mail
- **Save settings** — remember your preferred format for next time

## Editing Aliases

Click the edit icon on any alias card to change its:

- Description
- Destination email address
- Enabled/disabled status

## Deleting Aliases

Click the trash icon on an alias to delete it. You'll be asked to confirm.

## Bulk Operations

1. Click the select button (checklist icon) to enter selection mode
2. Tap alias cards to select/deselect them
3. Use the edit or delete buttons to apply changes to all selected aliases
4. Bulk edit lets you change the destination or enabled status
5. Bulk delete removes all selected aliases after confirmation

## Searching

Click the search icon to show the search field. Type to filter aliases by address or description.
