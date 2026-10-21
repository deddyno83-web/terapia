/* Cloudflare Worker: invia le notifiche push agli orari della terapia.
   Variabili da impostare su Cloudflare (vedi README.md):
     ALLOWED_ORIGIN     es. https://TUOUSER.github.io
     VAPID_PUBLIC_KEY   chiave pubblica (base64url)
     VAPID_PRIVATE_JWK  chiave privata in formato JWK (SEGRETO)
     VAPID_SUBJECT      es. mailto:tuaemail@example.com
   Binding KV: SUBS
   Cron trigger: ogni 5 minuti (vedi README.md)
*/

const TIMEZONE = "Europe/Rome";

// Orari (ora di Roma) e giorni: 0=Lun ... 6=Dom. Tieni allineato con terapia.js
const ALL = [0, 1, 2, 3, 4, 5, 6];
const SCHEDULE = [
  { ora: "07:00", giorni: ALL },
  { ora: "08:00", giorni: ALL },
  { ora: "09:00", giorni: ALL },
  { ora: "12:00", giorni: ALL },
  { ora: "14:00", giorni: ALL },
  { ora: "17:00", giorni: [1, 3, 5] },
  { ora: "20:00", giorni: ALL },
  { ora: "22:00", giorni: ALL },
];

const enc = new TextEncoder();
const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function romeNow(ms) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value])
  );
  return {
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday),
    hm: parts.hour + ":" + parts.minute,
  };
}

async function vapidJwt(aud, env) {
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT,
  })));
  const key = await crypto.subtle.importKey(
    "jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(header + "." + claims));
  return header + "." + claims + "." + b64u(sig);
}

// Push "vuoto": il testo della notifica lo compone il service worker sul telefono
async function sendPush(endpoint, env) {
  const jwt = await vapidJwt(new URL(endpoint).origin, env);
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: "vapid t=" + jwt + ", k=" + env.VAPID_PUBLIC_KEY,
      TTL: "3600",
      Urgency: "high",
    },
  });
}

async function sha(text) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function notifyAll(env) {
  let cursor;
  do {
    const page = await env.SUBS.list({ prefix: "sub:", cursor });
    for (const k of page.keys) {
      const sub = JSON.parse((await env.SUBS.get(k.name)) || "null");
      if (!sub) continue;
      try {
        const r = await sendPush(sub.endpoint, env);
        if (r.status === 404 || r.status === 410) await env.SUBS.delete(k.name);
      } catch (e) { /* ignora e riprova al prossimo orario */ }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Terapia push OK", { headers: cors });

    const url = new URL(req.url);
    let body;
    try { body = await req.json(); } catch { return new Response("bad json", { status: 400, headers: cors }); }
    if (!body.endpoint || !String(body.endpoint).startsWith("https://"))
      return new Response("bad endpoint", { status: 400, headers: cors });
    const key = "sub:" + (await sha(body.endpoint));

    if (url.pathname === "/subscribe") {
      await env.SUBS.put(key, JSON.stringify({ endpoint: body.endpoint }));
      return new Response("ok", { headers: cors });
    }
    if (url.pathname === "/unsubscribe") {
      await env.SUBS.delete(key);
      return new Response("ok", { headers: cors });
    }
    if (url.pathname === "/test") {
      const r = await sendPush(body.endpoint, env);
      return new Response(r.ok ? "ok" : "push error " + r.status, { status: r.ok ? 200 : 502, headers: cors });
    }
    return new Response("not found", { status: 404, headers: cors });
  },

  async scheduled(event, env, ctx) {
    const { day, hm } = romeNow(event.scheduledTime);
    if (!SCHEDULE.some((s) => s.ora === hm && s.giorni.includes(day))) return;
    ctx.waitUntil(notifyAll(env));
  },
};
