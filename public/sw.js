/*
 * Service worker Longevity Baru — VÝHRADNĚ pro oznámení (Web Push).
 *
 * ZÁMĚRNĚ TU NENÍ ŽÁDNÉ CACHOVÁNÍ. Next.js si o svoje assety i navigace říká
 * sám a offline cache by v téhle appce nadělala víc škody než užitku: host by
 * u baru dostal starou verzi katalogu nebo zamrzlý zůstatek kreditu. Service
 * worker proto NEMÁ `fetch` handler — všechny requesty jdou rovnou na síť.
 *
 * Kdyby sem někdy cache přibyla, musí se řešit invalidace RSC payloadů;
 * do té doby to hlídá `scripts/check-push.ts`.
 */

// Nový worker nasazujeme okamžitě, ať se oznámení neopírají o starou verzi.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/** Bezpečné rozbalení payloadu — server posílá JSON, ale nesmí na tom stát. */
function prectiData(event) {
  if (!event.data) return {};
  try {
    return event.data.json() || {};
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

self.addEventListener("push", (event) => {
  const data = prectiData(event);
  const titulek = data.title || "Longevity Bar";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";

  event.waitUntil(
    self.registration.showNotification(titulek, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // `tag` slučuje oznámení stejného druhu, ať se hostovi nehromadí.
      tag: data.tag || "longevity-bar",
      renotify: Boolean(data.tag),
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cil = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const okna = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Už otevřenou appku jen přeostříme a navigujeme — druhé okno by hosta
      // u baru jen mátlo.
      for (const okno of okna) {
        if (new URL(okno.url).origin !== self.location.origin) continue;
        await okno.focus();
        if ("navigate" in okno) await okno.navigate(cil);
        return;
      }
      await self.clients.openWindow(cil);
    })(),
  );
});
