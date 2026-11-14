# Mailflare Worker

A Cloudflare Worker that turns your Email Routing domains into an alias service.
Point a domain's catch-all rule at the Worker. It forwards mail for your aliases
and rejects everything else. Aliases live in D1, so you aren't limited to
Email Routing's 200 rules per domain.

Status: in development. The Mailflare app can't connect to the Worker yet.

## How it handles mail

- **Known, enabled alias:** forwarded to its destination with an
  `X-Mailflare-Alias` header, so you can filter by alias in your mailbox.
- **Subaddresses:** `alias+anything@domain` is delivered to `alias@domain`.
- **Unknown or disabled alias:** rejected with the same "Address does not
  exist" reason, so senders can't tell which addresses exist. Mail to disabled
  aliases is counted as blocked.
- **Destinations:** must be verified destination addresses in Cloudflare Email
  Routing (`message.forward()` only delivers to those). At most 200 per account.

## Develop

```sh
cp .dev.vars.example .dev.vars   # set ADMIN_TOKEN
pnpm dev                         # applies local migrations, starts wrangler dev
pnpm test                        # Vitest inside workerd
```

To send a test email to the local Worker:

```sh
curl -X POST 'http://localhost:8787/cdn-cgi/local/email?from=a@example.com&to=alias%40your.domain' \
  --data-binary $'From: a@example.com\r\nTo: alias@your.domain\r\nSubject: Hi\r\nMessage-ID: <1@example.com>\r\n\r\nHello'
```

Schema changes: edit `src/db/schema.ts`, then run `pnpm db:generate`. Drizzle
writes a new folder under `migrations/`, and Wrangler applies it.

## Deploy

```sh
pnpm deploy                                 # creates the D1 database on first deploy
pnpm exec wrangler secret put ADMIN_TOKEN   # a long random string
```

Then, for each domain, set the Email Routing catch-all action to
"Send to a Worker", choose `mailflare`, and add the domain and your
destinations through the API.

## API

The API takes and returns JSON. Every endpoint except `/api/info` requires
`Authorization: Bearer <ADMIN_TOKEN>`. Timestamps are Unix seconds. Errors look
like `{ "error": { "code", "message" } }`. The types are in
[`src/api/types.ts`](src/api/types.ts).

| Method   | Path                       | Body                                               |
| -------- | -------------------------- | -------------------------------------------------- |
| `GET`    | `/api/info`                | Public: `{ name, apiVersion }`                     |
| `GET`    | `/api/v1/me`               | Checks the token                                   |
| `GET`    | `/api/v1/domains`          |                                                    |
| `POST`   | `/api/v1/domains`          | `{ name }`                                         |
| `DELETE` | `/api/v1/domains/:id`      | `409` while aliases use it                         |
| `GET`    | `/api/v1/destinations`     |                                                    |
| `POST`   | `/api/v1/destinations`     | `{ email }`                                        |
| `DELETE` | `/api/v1/destinations/:id` | `409` while aliases use it                         |
| `GET`    | `/api/v1/aliases`          | Optional `?domainId=`; newest first                |
| `POST`   | `/api/v1/aliases`          | `{ address, destination, description?, enabled? }` |
| `PATCH`  | `/api/v1/aliases/:id`      | `{ destination?, description?, enabled? }`         |
| `DELETE` | `/api/v1/aliases/:id`      |                                                    |

The API also refuses changes that would create a mail loop: a destination on
one of the Worker's own domains, or a domain that an existing destination
already uses.
