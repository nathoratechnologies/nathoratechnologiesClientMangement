// Nathora service worker: only makes the site installable as an app.
// It does NOT cache or intercept pages (no fetch handler), so links, redirects
// and new deployments always load straight from the server.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  // Remove caches left by earlier versions of this worker.
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
