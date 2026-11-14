# mailflare

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Astro, Self, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Astro** - The web framework for content-driven websites
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Husky** - Git hooks for code quality
- **Starlight** - Documentation site with Astro

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser to see the fullstack application.

## Deployment (Cloudflare via Alchemy)

- Dev: cd apps/web && pnpm run alchemy dev
- Deploy: cd apps/web && pnpm run deploy
- Destroy: cd apps/web && pnpm run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Git Hooks and Formatting

- Initialize hooks: `pnpm run prepare`
- Format and lint fix: `pnpm run check`

## Project Structure

```
mailflare/
├── apps/
│   ├── extension/   # Browser extension (WXT)
│   ├── web/         # Web app / PWA (Vite)
│   ├── worker/      # Mailflare Worker: email routing + alias API (Hono, D1, Drizzle)
│   └── landing/     # Landing page (Vinext, static export)
├── packages/
│   ├── mailflare/   # @mailflare/core: shared UI, API client, stores
│   └── config/      # Shared TypeScript config
├── docs/            # User documentation (Markdown)
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run test`: Run the tests (currently the Worker's)
- `pnpm run check`: Run Oxlint and Oxfmt
