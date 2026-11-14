---
title: Worker Mode
description: Store your aliases in your own Cloudflare Worker instead of Email Routing rules.
---

By default, every MailFlare alias is a Cloudflare Email Routing rule. In Worker mode, you deploy
the MailFlare Worker to your own Cloudflare account instead. It receives all mail for your
domains, and the aliases live in the Worker's D1 database.

## Why use it

|                          | Email Routing rules            | Worker mode                                            |
| ------------------------ | ------------------------------ | ------------------------------------------------------ |
| Aliases per domain       | 200 (Cloudflare's rule limit)  | No practical limit                                     |
| Mail to unknown aliases  | Handled by your catch-all rule | Rejected                                               |
| Mail to disabled aliases | Not forwarded                  | Rejected, and counted                                  |
| Subaddressing            | Optional Cloudflare setting    | `alias+anything@` always reaches `alias@`              |
| Filtering by alias       | By the `To` address            | Every forwarded mail has an `X-Mailflare-Alias` header |
| Replies                  | From your real address         | From the alias                                         |
| Other people             | No                             | Optional accounts on domains you share                 |
| Setup                    | An API token                   | Deploy a Worker, then connect the app                  |
| Cost                     | Free                           | Free within the Workers Free plan's daily limits       |

## 1. Deploy the Worker

The quickest way is the deploy button. It copies the Worker into a new GitHub repository on your
account, creates its D1 database, and deploys it:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Curetix/mailflare-extension/tree/main/apps/worker)

During setup, Cloudflare asks for an `ADMIN_TOKEN`. Use a long random string, for example the
output of `openssl rand -base64 32`, and keep it: you'll enter it in the app to connect.

To deploy from your own machine instead:

```bash
git clone https://github.com/Curetix/mailflare-extension.git
cd mailflare-extension
pnpm install
cd apps/worker
pnpm run deploy                           # builds the app, deploys, creates the D1 database and its tables
pnpm exec wrangler secret put ADMIN_TOKEN # paste your random string
```

The deploy output shows the Worker's URL, for example `https://mailflare.your-name.workers.dev`.
Deployed from the repository like this, the Worker also serves the Mailflare web app at that URL,
connected to itself. The deploy button copies only the Worker, so its deployments serve the API
only, and you use the web app or the extension instead.

## 2. Send your domains' mail to the Worker

For each domain, in the Cloudflare dashboard:

1. Open the domain, then **Email** → **Email Routing** → **Routing rules**.
2. Under **Catch-all address**, choose the action **Send to a Worker**, select `mailflare`, and
   enable it.

Email Routing rules still take priority over the catch-all. Existing rule-based aliases keep
working, and the Worker receives everything else.

## 3. Verify your destination addresses

The Worker can only forward to addresses you've verified in Cloudflare. Under **Email Routing** →
**Destination addresses**, add each mailbox you want to forward to and confirm the verification
email. A Cloudflare account can have up to 200 destination addresses.

## 4. Connect the app

1. In the extension or web app, choose **Mailflare Worker** on the login screen, and enter the
   Worker URL and your `ADMIN_TOKEN`. In the app the Worker serves itself, open
   **Sign in with the admin token** instead.
2. Select **Connect**.
3. When asked, add your domains. You can also do this later under **Settings** →
   **Domains & destinations**, which is also where you add your destination addresses.

Creating, editing and deleting aliases then works the same as in the default mode, including the
quick-create button and the context menu.

## 5. Accounts (optional)

The Worker can also give other people (or yourself) accounts, with email and password, sign-in
links and passkeys. Accounts sign in to the app the Worker serves and create aliases on the
domains you share, forwarding to inboxes they confirm by email.

1. Set a second secret: `pnpm exec wrangler secret put AUTH_SECRET` (another random string).
2. Under the Worker's **Settings** → **Variables and Secrets**, set `ADMIN_EMAILS` to your own
   address, and `PUBLIC_SIGNUPS` to `true` if anyone may sign up. The
   [Worker's README](../../apps/worker/README.md#settings) lists all settings, including
   per-account limits.
3. Your domain needs Cloudflare Email Sending (Workers
   Paid plan) for the Worker to mail sign-in links and confirmations.
4. Share a domain with accounts through the API (`PATCH /api/v1/domains/:id` with
   `{ "shared": true }`).

Accounts can only reply to people who emailed their alias first, up to a daily limit, so your
domains can't be used to spam strangers.
