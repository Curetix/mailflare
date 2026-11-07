---
title: Web App
description: Using MailFlare as a web application.
---

The MailFlare web app provides the same alias management features as the browser extension, accessible from any device with a web browser.

## Access

The web app is hosted at [app.mailflare.cc](https://app.mailflare.cc) and deployed on Cloudflare Pages.

## Features

The web app supports all core features:

- Login with Cloudflare API token
- View, search, and filter aliases by domain
- Create new aliases with all format options (except domain-based, which requires a browser extension)
- Edit alias descriptions, destinations, and status
- Delete individual or bulk aliases
- Settings for theme, language, and preferences

## API Proxy

The web app uses a server-side API proxy to communicate with the Cloudflare API. Your API requests go through Cloudflare Pages Functions, which forward them to `api.cloudflare.com`. This avoids browser CORS restrictions while keeping your API token private — it's sent directly to Cloudflare and never stored on the server.

## PWA Support

The web app is a Progressive Web App (PWA) and can be installed on your device:

- **Desktop (Chrome/Edge)**: Click the install icon in the address bar
- **iOS (Safari)**: Tap Share → "Add to Home Screen"
- **Android (Chrome)**: Tap the three-dot menu → "Add to Home screen"

Once installed, the app appears on your home screen or desktop and can work offline for cached data.

## Differences from the Extension

| Feature                       | Extension | Web App |
| ----------------------------- | --------- | ------- |
| Context menu alias generation | ✅        | ❌      |
| Input field overlay button    | ✅        | ❌      |
| Domain-based alias format     | ✅        | ❌      |
| PWA installable               | ❌        | ✅      |
| Works on any device           | ❌        | ✅      |
