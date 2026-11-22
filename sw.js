// Back Reset service worker: offline copy of the app, plus the notifications the
// desk timer posts while the phone is asleep (Android Chrome only allows those from
// a service worker). It schedules nothing - a service worker cannot wake itself at a
// set time; the page does the timing.
//
// Bump CACHE on every release (keep it in step with version.js). Assets are matched
// ignoring their ?v= stamp, so this list stays unstamped; a new CACHE name refetches all.
const CACHE = "back-reset-v0.01";
const ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "version.js",
  "core.js",
  "routines.js",
  "stretch.js",
  "desk.js",
  "app.js",
  "manifest.webmanifest",
  "icon-32.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "poses/sphinx.webp",
  "poses/cat-cow.webp",
  "poses/hip-rotation.webp",
  "poses/legs-up-9090.webp",
  "poses/curl-up.webp",
  "poses/side-plank.webp",
  "poses/bird-dog.webp",
  "poses/hip-switch-9090.webp",
  "poses/open-book.webp",
  "poses/hip-hinge.webp",
  "poses/pallof-press.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// The page is network-first (house standard 7) so a new release shows on the first
// open; everything else is cache-first from this release's cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-cache" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(event.request, { ignoreSearch: true }))
      .then((hit) => hit || fetch(event.request))
  );
});

// Tapping a desk-timer notification brings the app back rather than opening a copy.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      if ("focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  })());
});
