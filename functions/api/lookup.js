import { allowed, json, denied } from "../../lib/auth.js";

// Back office helper: given a YouTube video id, bring back its title, description, length and year so the form can fill itself in.
export async function onRequestGet({ request, env }) {
  if (!(await allowed(request, env))) return denied();
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return json({ error: "That is not a YouTube link." }, 400);
  const out = { title: "", description: "", length: "", year: "" };
  try {
    const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (o.ok) out.title = (await o.json()).title || "";
  } catch {}
  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", cookie: "CONSENT=YES+1" } });
    const html = await page.text();
    const pick = (key) => {
      const m = html.match(new RegExp('"' + key + '":"((?:[^"\\\\]|\\\\.)*)"'));
      if (!m) return "";
      try { return JSON.parse('"' + m[1] + '"'); } catch { return ""; }
    };
    out.description = pick("shortDescription");
    const s = +pick("lengthSeconds");
    if (s) out.length = s >= 3600 ? `${Math.floor(s / 3600)} hr ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`;
    out.year = pick("publishDate").slice(0, 4);
    if (!out.title) out.title = pick("title");
  } catch {}
  if (!out.title && !out.description) return json({ error: "YouTube did not give the details for that link." }, 502);
  return json(out);
}
