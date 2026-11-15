import { allowed, json, denied } from "../../../lib/auth.js";

// Covers are kept in Cloudflare storage. Each upload gets a new name, so browsers can keep a copy for a long time.
const OK = /^[a-z0-9-]{1,90}\.jpg$/;

// Speed: a cover never changes once uploaded, so Cloudflare keeps a ready copy near each viewer and skips the storage lookup.
const keyFor = (request, name) => new Request(new URL(request.url).origin + "/api/cover/" + name);

export async function onRequestGet({ request, params, env, waitUntil }) {
  if (!OK.test(params.name)) return new Response("Not found", { status: 404 });
  const key = keyFor(request, params.name), hit = await caches.default.match(key);
  if (hit) return hit;
  const img = await env.VAULT.get("cover:" + params.name, { type: "arrayBuffer" });
  if (!img) return new Response("Not found", { status: 404 });
  const res = new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  waitUntil(caches.default.put(key, res.clone()));
  return res;
}

export async function onRequestPut({ request, params, env }) {
  if (!(await allowed(request, env))) return denied();
  if (!OK.test(params.name)) return json({ error: "That cover name is not allowed." }, 400);
  const img = await request.arrayBuffer();
  if (img.byteLength < 100 || img.byteLength > 2000000) return json({ error: "The cover must be under 2 MB." }, 413);
  const b = new Uint8Array(img, 0, 3);
  if (b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return json({ error: "The cover must be a JPEG picture." }, 400);
  await env.VAULT.put("cover:" + params.name, img);
  return json({ ok: true, url: "api/cover/" + params.name });
}

export async function onRequestDelete({ request, params, env }) {
  if (!(await allowed(request, env))) return denied();
  if (!OK.test(params.name)) return json({ error: "That cover name is not allowed." }, 400);
  await env.VAULT.delete("cover:" + params.name);
  await caches.default.delete(keyFor(request, params.name));
  return json({ ok: true });
}
