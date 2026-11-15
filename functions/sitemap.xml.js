import { ytId, base, filmUrl, films, topicMap, coverOf, brief, stamp } from "../lib/seo.js";

// The list of pages for search engines: the home page and one page per film, with each film described as a video.
// It rebuilds itself from the film list, so a film added in the back office is in here straight away.
const x = (s) => String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
export async function onRequestGet({ env, request }) {
  const root = base(new URL(request.url)), d = await films(env);
  const newest = d.videos.reduce((t, v) => (stamp(v) > t ? stamp(v) : t), "2026-01-01T00:00:00.000Z");
  const items = d.videos.map((v) => {
    const id = ytId(v.youtube), img = coverOf(v, root, true);
    const video = id ? `\n    <video:video><video:thumbnail_loc>${x(img)}</video:thumbnail_loc><video:title>${x(v.title)}</video:title><video:description>${x(brief(v.description || v.title, 2000))}</video:description><video:player_loc>https://www.youtube.com/embed/${id}</video:player_loc></video:video>` : "";
    return `  <url><loc>${x(filmUrl(root, v))}</loc><lastmod>${stamp(v).slice(0, 10)}</lastmod>${img ? `\n    <image:image><image:loc>${x(img)}</image:loc></image:image>` : ""}${video}\n  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  <url><loc>${root}/</loc><lastmod>${newest.slice(0, 10)}</lastmod></url>\n${topicMap(d.videos).map((t) => `  <url><loc>${root}/topic/${t.slug}</loc><lastmod>${newest.slice(0, 10)}</lastmod></url>`).join("\n")}\n${items.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
