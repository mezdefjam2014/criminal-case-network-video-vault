// The list of pages for search engines: the home page and one page per film. It updates itself as films are added or removed.
export async function onRequestGet({ env, request }) {
  const origin = new URL(request.url).origin;
  let list = { videos: [] };
  try { list = JSON.parse((await env.VAULT.get("videos")) || '{"videos":[]}'); } catch {}
  const urls = [origin + "/", ...(list.videos || []).map((v) => `${origin}/film/${encodeURIComponent(v.id)}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.replace(/&/g, "&amp;")}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
