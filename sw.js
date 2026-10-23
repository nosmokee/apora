"use strict";
const CACHE = "opora-2.0.0-nav3";
// Store the large self-contained HTML once, not both './' and './index.html'.
const ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          ASSETS.map((path) => new Request(path, { cache: "reload" })),
        ),
      )
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("opora-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (
    ![
      "",
      "index.html",
      "manifest.webmanifest",
      "icon-192.png",
      "icon-512.png",
    ].includes(path)
  )
    return;
  // Navigation queries use the same canonical offline document. No runtime cache growth.
  const key = new URL(
    path === "" || path === "index.html" ? "index.html" : path,
    scope,
  ).href;
  event.respondWith(
    caches
      .open(CACHE)
      .then(async (cache) => (await cache.match(key)) || fetch(event.request)),
  );
});
