importScripts("terapia.js");

const CACHE = "terapia-v1";
const ASSETS = ["./", "index.html", "terapia.js", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima, cache come ripiego (funziona anche offline)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// Push senza contenuto: il testo si costruisce qui in base all'ora
self.addEventListener("push", (e) => {
  const now = new Date();
  const d = (now.getDay() + 6) % 7;
  const nm = now.getHours() * 60 + now.getMinutes();
  const due = dosiDelGiorno(d).filter((f) => {
    const m = aMinuti(f.ora);
    return m <= nm + 20 && m >= nm - 5;
  });
  const diff = due.length ? aMinuti(due[0].ora) - nm : 0;
  const titolo = due.length
    ? diff > 1 ? "Tra " + diff + " minuti: terapia delle " + due[0].ora : "Ora della terapia (" + due[0].ora + ")"
    : "Promemoria terapia";
  const prossima = dosiDelGiorno(d).find((f) => aMinuti(f.ora) > nm);
  const corpo = due.length
    ? due.map((f) => f.nome + (doseTesto(f, d) ? " " + doseTesto(f, d) : "")).join(", ")
    : prossima
      ? "Prossima medicina: " + prossima.nome + " alle " + prossima.ora
      : "Apri l'app per vedere le medicine di oggi.";
  e.waitUntil(
    self.registration.showNotification(titolo, {
      body: corpo,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "terapia",
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 300]
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});
