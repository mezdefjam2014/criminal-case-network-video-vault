// A film's own page: /film/<id>. It is the normal site with that film opened, plus the title, description and cover
// written into the page itself, so links shared on social media show the right preview and search engines can read it.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function ytId(link) {
  const s = String(link || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : "";
}

export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url), home = url.origin + "/";
  let list = { videos: [] };
  try { list = JSON.parse((await env.VAULT.get("videos")) || '{"videos":[]}'); } catch {}
  const v = (list.videos || []).find((x) => x.id === params.id);
  if (!v) return Response.redirect(home, 302);

  const film = ytId(v.youtube), any = film || ytId(v.trailer), self = `${url.origin}/film/${encodeURIComponent(v.id)}`;
  const abs = (u) => (!u ? "" : /^https?:/.test(u) ? u : url.origin + "/" + u.replace(/^\//, ""));
  const image = abs(v.wide || v.cover) || (any ? `https://i.ytimg.com/vi/${any}/hqdefault.jpg` : "");
  const title = `${v.title} | Criminal Case Network`;
  const about = (v.description || "A Criminal Case Network film.").replace(/\s+/g, " ").trim();
  const short = about.length > 200 ? about.slice(0, 197).replace(/\s+\S*$/, "") + "..." : about;

  const tags = [
    `<link rel="canonical" href="${esc(self)}">`,
    `<meta property="og:site_name" content="Criminal Case Network">`,
    `<meta property="og:type" content="${film ? "video.other" : "website"}">`,
    `<meta property="og:title" content="${esc(v.title)}">`,
    `<meta property="og:description" content="${esc(short)}">`,
    `<meta property="og:url" content="${esc(self)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(v.title)}">`,
    `<meta name="twitter:description" content="${esc(short)}">`,
    image ? `<meta name="twitter:image" content="${esc(image)}">` : "",
  ];
  if (film) {                                                 // tells search engines this page is a video
    const when = v.liveAt ? new Date(v.liveAt).toISOString() : /^\d{4}$/.test(v.year || "") ? `${v.year}-01-01T00:00:00Z` : new Date().toISOString();
    const ld = { "@context": "https://schema.org", "@type": "VideoObject", name: v.title, description: about, thumbnailUrl: [image], uploadDate: when,
      embedUrl: `https://www.youtube-nocookie.com/embed/${film}`, contentUrl: `https://www.youtube.com/watch?v=${film}`, publisher: { "@type": "Organization", name: "Criminal Case Network" } };
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`);
  }
  tags.push(`<script>window.OPEN_FILM=${JSON.stringify(v.id).replace(/</g, "\\u003c")}</script>`);

  let html = await (await env.ASSETS.fetch(new URL("/", url))).text();
  html = html.replace(/<meta charset="utf-8">/i, '<meta charset="utf-8"><base href="/">')       // first thing in the page, so every file on it is found from the site's root
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(short)}">`)
    .replace(/<meta property="og:[^>]*>\s*/g, "")
    .replace("</head>", tags.filter(Boolean).join("\n") + "\n</head>");
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}
