const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/XXXXXX/...";

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function withCors(res, origin = "*") {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function normalizeId(id) {
  return String(id || "").trim().slice(0, 80);
}

function clampRating(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const r = Math.round(x);
  if (r < 1 || r > 5) return null;
  return r;
}

async function readJson(request) {
  try {
    const ct = request.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("application/json")) return null;
    return await request.json();
  } catch {
    return null;
  }
}

async function sendDiscord(webhook, payload) {
  if (!webhook || webhook.includes("XXXXXX")) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {}
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (!env || !env.RATINGS_KV) {
      return withCors(json({ ok: false, error: "KV not bound" }, { status: 500 }));
    }

    if (url.pathname === "/rate" && request.method === "POST") {
      const body = await readJson(request);
      if (!body) return withCors(json({ ok: false, error: "Invalid JSON" }, { status: 400 }));

      const itemId = normalizeId(body.itemId);
      const itemName = String(body.itemName || "").trim().slice(0, 140);
      const rating = clampRating(body.rating);
      const comment = String(body.comment || "").trim().slice(0, 1200);

      if (!itemId || !rating || !itemName) {
        return withCors(json({ ok: false, error: "Missing fields" }, { status: 400 }));
      }

      const key = `item:${itemId}`;
      const raw = await env.RATINGS_KV.get(key);

      let sum = 0;
      let count = 0;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          sum = Number(parsed.sum) || 0;
          count = Number(parsed.count) || 0;
        } catch {}
      }

      sum += rating;
      count += 1;

      await env.RATINGS_KV.put(key, JSON.stringify({ sum, count, updatedAt: Date.now() }));

      const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 5;

      const webhook = env.DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
      const stars = "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);

      await sendDiscord(webhook, {
        embeds: [
          {
            title: "Nouvelle note ACEPVP",
            description: `**${itemName}**\n${stars} (${rating}/5)` + (comment ? `\n\n${comment}` : ""),
            color: 16716906,
            fields: [
              { name: "Article", value: itemName, inline: true },
              { name: "Note", value: `${rating}/5`, inline: true },
              { name: "Moyenne", value: `${avg}/5`, inline: true }
            ]
          }
        ]
      });

      return withCors(json({ ok: true, itemId, avg, count }));
    }

    if (url.pathname === "/ratings" && request.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const itemId = normalizeId(id);
        const raw = await env.RATINGS_KV.get(`item:${itemId}`);
        if (!raw) return withCors(json({ ok: true, itemId, avg: 5, count: 0 }));
        try {
          const parsed = JSON.parse(raw);
          const sum = Number(parsed.sum) || 0;
          const count = Number(parsed.count) || 0;
          const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 5;
          return withCors(json({ ok: true, itemId, avg, count }));
        } catch {
          return withCors(json({ ok: true, itemId, avg: 5, count: 0 }));
        }
      }

      const items = {};
      let cursor = undefined;

      while (true) {
        const page = await env.RATINGS_KV.list({ prefix: "item:", cursor, limit: 1000 });
        for (const k of page.keys) {
          const itemId = k.name.replace(/^item:/, "");
          const raw = await env.RATINGS_KV.get(k.name);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            const sum = Number(parsed.sum) || 0;
            const count = Number(parsed.count) || 0;
            const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 5;
            items[itemId] = { avg, count };
          } catch {}
        }
        if (page.list_complete) break;
        cursor = page.cursor;
        if (!cursor) break;
      }

      return withCors(json({ ok: true, items }));
    }

    if (url.pathname === "/" && request.method === "GET") {
      return withCors(json({ ok: true }));
    }

    return withCors(json({ ok: false, error: "Not found" }, { status: 404 }));
  }
};
