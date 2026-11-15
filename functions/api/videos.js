import { allowed, json, denied } from "../../lib/auth.js";

const EMPTY = '{"featured":"","rows":[],"videos":[]}';

// Anyone can read the film list. Only the back office can change it.
export async function onRequestGet({ env }) {
  return new Response((await env.VAULT.get("videos")) || EMPTY, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function onRequestPut({ request, env }) {
  if (!(await allowed(request, env))) return denied();
  const text = await request.text();
  if (text.length > 900000) return json({ error: "The film list is too large." }, 413);
  let d;
  try { d = JSON.parse(text); } catch { return json({ error: "The film list was not readable." }, 400); }
  if (!d || !Array.isArray(d.videos) || !Array.isArray(d.rows)) return json({ error: "The film list is missing parts." }, 400);
  await env.VAULT.put("videos", JSON.stringify(d));
  return json({ ok: true, films: d.videos.length });
}
