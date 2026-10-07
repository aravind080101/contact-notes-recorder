const CACHE = "moolya-contact-shell-cloudflare-v11";

const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./qr.js",
  "./guest-qr.js",
  "./guest.html",
  "./auth.js",
  "./auth.js?v=individual-v4",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache =>
        cache.addAll(
          SHELL.map(url => new Request(url, {cache: "reload"}))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith("moolya-contact-shell-") &&
              key !== CACHE
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // API requests and requests to other websites are not cached.
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request, {cache: "no-cache"})
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE)
              .then(cache => cache.put(event.request, copy))
          );
        }

        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(event.request);

        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const page = await cache.match("./index.html");
          if (page) return page;
        }

        return Response.error();
      })
  );
});
