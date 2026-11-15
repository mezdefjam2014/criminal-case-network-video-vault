import { allowed, json, denied } from "../../lib/auth.js";

// Back office helper: given a YouTube video id, bring back its title, description, length and year so the form can fill itself in.
// Title comes from YouTube's public oEmbed. Description, length and year come from the official YouTube Data API,
// which needs a free key stored in Cloudflare as the secret YT_API_KEY.
export async function onRequestGet({ request, env }) {
  if (!(await allowed(request, env))) return denied();
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return json({ error: "That is not a YouTube link." }, 400);
  const out = { title: "", description: "", length: "", year: "", needsKey: !env.YT_API_KEY, keyProblem: "" };

  if (env.YT_API_KEY) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${encodeURIComponent(env.YT_API_KEY)}`);
      const j = await r.json();
      const it = j.items && j.items[0];
      if (it) {
        out.title = it.snippet.title || "";
        out.description = it.snippet.description || "";
        out.year = (it.snippet.publishedAt || "").slice(0, 4);
        const m = (it.contentDetails.duration || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (m) {
          const s = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
          if (s) out.length = s >= 3600 ? `${Math.floor(s / 3600)} hr ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`;
        }
      } else if (j.error) out.keyProblem = String(j.error.message || "YouTube refused the key.").slice(0, 200);
    } catch { out.keyProblem = "YouTube could not be reached."; }
  }

  if (!out.title) {
    try {
      const o = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (o.ok) out.title = (await o.json()).title || "";
    } catch {}
  }
  if (!out.title && !out.description) return json({ error: "YouTube did not give the details for that link.", needsKey: out.needsKey, keyProblem: out.keyProblem }, 502);
  return json(out);
}
