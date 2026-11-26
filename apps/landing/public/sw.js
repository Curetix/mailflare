// Mailflare 1 ran its web app on this domain, and its service worker (at this
// path) kept serving that old app from its cache. Browsers keep a service worker
// whose script 404s, so this replaces it: when a browser next checks for an
// update, it installs this one, which clears the old caches, unregisters itself
// and reloads the open pages from the network. Keep it at least until no old
// installs are left; the landing page itself never registers a service worker.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
            await self.registration.unregister();
            const windows = await self.clients.matchAll({ type: "window" });
            await Promise.all(windows.map((client) => client.navigate(client.url)));
        })(),
    );
});
