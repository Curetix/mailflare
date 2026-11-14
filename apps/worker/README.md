# Mailflare Worker

A Cloudflare Worker that turns your Email Routing domains into an alias service.
Point a domain's catch-all rule at the Worker. It delivers mail for your aliases
and rejects everything else. Aliases live in D1, so you aren't limited to
Email Routing's 200 rules per domain.

To set it up and connect the Mailflare app, see the
[Worker mode guide](../../docs/guides/worker-mode.md).

## How it handles mail

- **Known, enabled alias:** re-sent to its destination, from the alias. The
  sender and other recipients become _reverse addresses_ such as
  `alias+bob=shop.com@your.domain`, shown as `"Bob (bob at shop.com)"`, so
  replies and reply-all go out through the alias. An `X-Mailflare-Alias` header
  names the alias for mailbox filters.
- **Replies:** mail from the alias owner to a reverse address is sent to the
  contact behind it, from the alias, after checking Cloudflare's DMARC result
  for the owner's domain. Mail to a reverse address from anyone else is
  delivered to the owner like any other mail.
- **Subaddresses:** `alias+anything@domain` is delivered to `alias@domain`.
- **Unknown or disabled alias:** rejected with the same "Address does not
  exist" reason, so senders can't tell which addresses exist. Mail to disabled
  aliases is counted as blocked.
- **Without the `EMAIL` binding** (or if re-sending fails), mail is forwarded
  unchanged with `message.forward()`, which only reaches destinations verified
  in Cloudflare Email Routing. Replying through the alias then isn't possible.

Re-sending to destinations verified in Cloudflare is free. Sending to anyone
else (replies, and destinations of accounts) needs the Workers Paid plan and
your domain onboarded for Email Sending.

## Accounts

The `ADMIN_TOKEN` manages the deployment's own domains, destinations and
aliases. With `AUTH_SECRET` set, people can also have accounts (email and
password, magic links, passkeys) under `/api/auth/*`, powered by
[better-auth](https://better-auth.com):

- Accounts create aliases on **shared** domains, forwarding to destinations
  they confirmed through a link the Worker mails them. The account's own email
  counts as confirmed.
- Accounts only see and change their own aliases and destinations; the admin
  token doesn't see accounts' data either.
- Accounts can only reply to people who emailed the alias first, and only up
  to a daily limit, so your domains can't be used to spam strangers.
- Accounts with the `admin` role (see `ADMIN_EMAILS`) have no limits, may use
  every domain and manage domains and accounts.

### Settings

Set these as variables in the Worker's dashboard settings (they survive
deploys) or in `.dev.vars` for development:

| Variable                    | Default                              | Meaning                                                           |
| --------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| `PUBLIC_SIGNUPS`            | `false`                              | `true` lets anyone create an account                              |
| `ADMIN_EMAILS`              |                                      | Comma-separated; these accounts are admins and may always sign up |
| `MAIL_FROM`                 | `Mailflare <mailflare@first-domain>` | Sender of account emails                                          |
| `TRUSTED_ORIGINS`           |                                      | Comma-separated extra origins allowed to call `/api/auth`         |
| `MAX_ALIASES_PER_USER`      | `100`                                | Per account without the admin role                                |
| `MAX_DESTINATIONS_PER_USER` | `5`                                  |                                                                   |
| `MAX_SENDS_PER_DAY`         | `50`                                 | Messages sent from aliases per account and UTC day                |

Secrets: `ADMIN_TOKEN` and `AUTH_SECRET` (`wrangler secret put <name>`).

## Develop

```sh
cp .dev.vars.example .dev.vars   # set ADMIN_TOKEN and AUTH_SECRET
pnpm dev                         # applies local migrations, starts wrangler dev
pnpm test                        # Vitest inside workerd
```

To send a test email to the local Worker:

```sh
curl -X POST 'http://localhost:8787/cdn-cgi/local/email?from=a@example.com&to=alias%40your.domain' \
  --data-binary $'From: a@example.com\r\nTo: alias@your.domain\r\nSubject: Hi\r\nMessage-ID: <1@example.com>\r\n\r\nHello'
```

Schema changes: edit `src/db/schema.ts` (better-auth's tables are in
`src/db/auth-schema.ts`), then run `pnpm db:generate`. Drizzle writes a new
folder under `migrations/`, and Wrangler applies it.

## Deploy

```sh
pnpm run deploy                             # deploys (creating D1 the first time), then migrates
pnpm exec wrangler secret put ADMIN_TOKEN   # a long random string
pnpm exec wrangler secret put AUTH_SECRET   # another one, for accounts
```

Then, for each domain, set the Email Routing catch-all action to
"Send to a Worker", choose `mailflare`, and add the domain and your
destinations through the API.

## API

The API takes and returns JSON. Every endpoint except `/api/info` requires
`Authorization: Bearer <token>`, where the token is the `ADMIN_TOKEN` or an
account's session token (returned in the `set-auth-token` header when signing
in). Timestamps are Unix seconds. Errors look like
`{ "error": { "code", "message" } }`. The types are in
[`src/api/types.ts`](src/api/types.ts).

| Method   | Path                              | Body or notes                                      |
| -------- | --------------------------------- | -------------------------------------------------- |
| `GET`    | `/api/info`                       | Public: `{ name, apiVersion, accounts }`           |
| `GET`    | `/api/v1/me`                      | Role, account and limits                           |
| `GET`    | `/api/v1/domains`                 | Accounts see shared domains                        |
| `POST`   | `/api/v1/domains`                 | Admins: `{ name, shared? }`                        |
| `PATCH`  | `/api/v1/domains/:id`             | Admins: `{ shared? }`                              |
| `DELETE` | `/api/v1/domains/:id`             | Admins; `409` while aliases use it                 |
| `GET`    | `/api/v1/destinations`            |                                                    |
| `POST`   | `/api/v1/destinations`            | `{ email }`; accounts get a confirmation email     |
| `POST`   | `/api/v1/destinations/:id/verify` | Mails a new confirmation link                      |
| `DELETE` | `/api/v1/destinations/:id`        | `409` while aliases use it                         |
| `GET`    | `/api/v1/aliases`                 | Optional `?domainId=`; newest first                |
| `POST`   | `/api/v1/aliases`                 | `{ address, destination, description?, enabled? }` |
| `PATCH`  | `/api/v1/aliases/:id`             | `{ destination?, description?, enabled? }`         |
| `DELETE` | `/api/v1/aliases/:id`             |                                                    |
| `GET`    | `/api/v1/users`                   | Admins                                             |
| `PATCH`  | `/api/v1/users/:id`               | Admins: `{ role?, banned? }`; banning signs out    |

The API also refuses changes that would create a mail loop: a destination on
one of the Worker's own domains, or a domain that an existing destination
already uses.
