// PokeBulk SA service worker (2026-10-02).
//
// Deliberately does ONE job: receive push notifications and open the right
// page when one is tapped. It does NOT cache pages or intercept any network
// request -- there is no "fetch" handler on purpose, so it can never serve
// a customer a stale price, stale stock level or an old build of the site.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "PokeBulk SA";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    data: { url: data.url || "/" },
  };
  // Same tag = the newer notification replaces the older one instead of
  // stacking (e.g. three status changes on one order, or a burst of chat
  // messages from one person).
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(path, self.location.origin);
  // Only ever open our own site, whatever the payload says.
  const href = target.origin === self.location.origin ? target.href : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      // Reuse an already-open tab / the installed app if there is one.
      for (const client of windows) {
        if ("focus" in client) {
          try {
            if ("navigate" in client) await client.navigate(href);
            return client.focus();
          } catch {
            // Fall through to opening a new window.
          }
        }
      }
      return self.clients.openWindow(href);
    })
  );
});
