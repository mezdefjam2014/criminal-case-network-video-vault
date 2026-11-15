import { allowed, json, denied } from "../../lib/auth.js";

const EMPTY = '{"featured":"","rows":[],"videos":[]}';

// Anyone can read the film list. Only the back office can change it.
export async function onRequestGet({ env }) {
  return new Response((await env.VAULT.get("videos")) || EMPTY, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

const MAIN = "ccntv.pages.dev", KEY = "881fd5132fe70db18d21e3edba8eef03";
async function announce(before, after) {
  const old = new Map(((before && before.videos) || []).map((v) => [v.id, JSON.stringify(v)]));
  const changed = after.videos.filter((v) => old.get(v.id) !== JSON.stringify(v)).map((v) => `https://${MAIN}/film/${encodeURIComponent(v.id)}`);
  if (!changed.length && old.size === after.videos.length) return;
  await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: MAIN, key: KEY, keyLocation: `https://${MAIN}/${KEY}.txt`, urlList: [`https://${MAIN}/`, ...changed].slice(0, 100) }) }).catch(() => {});
}

export async function onRequestPut({ request, env, waitUntil }) {
  if (!(await allowed(request, env))) return denied();
  const text = await request.text();
  if (text.length > 900000) return json({ error: "The film list is too large." }, 413);
  let d;
  try { d = JSON.parse(text); } catch { return json({ error: "The film list was not readable." }, 400); }
  if (!d || !Array.isArray(d.videos) || !Array.isArray(d.rows)) return json({ error: "The film list is missing parts." }, 400);
  let before = null; try { before = JSON.parse((await env.VAULT.get("videos")) || "null"); } catch {}
  await env.VAULT.put("videos", JSON.stringify(d));
  if (new URL(request.url).hostname !== "localhost") waitUntil(announce(before, d));
  return json({ ok: true, films: d.videos.length });
}
