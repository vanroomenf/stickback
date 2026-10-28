// Stickback service worker.
// Its only job: receive stickers shared from other apps (Android "Share → Stickback")
// and hand them to the app. It does not cache the app, so updates arrive right away.

const SHARE_CACHE = "stickback-shared";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || !url.pathname.endsWith("/share-target")) return;

  event.respondWith((async () => {
    let count = 0;
    try {
      const form = await event.request.formData();
      const files = form.getAll("stickers").filter((f) => f && typeof f !== "string");
      const cache = await caches.open(SHARE_CACHE);
      for (const req of await cache.keys()) await cache.delete(req);
      for (const [i, file] of files.entries()) {
        await cache.put(new Request(`shared/${Date.now()}-${i}`), new Response(file, { headers: { "Content-Type": file.type || "image/png" } }));
        count++;
      }
    } catch {
      // nothing usable was shared; the app opens normally
    }
    return Response.redirect(new URL(`./?shared=${count}`, self.registration.scope).href, 303);
  })());
});
