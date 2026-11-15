// Shared by the pages that search engines read: the home page, each film's page and the sitemap.
export const MAIN = "https://ccntv.pages.dev";                // the one address search engines and share links should use
export const CHANNEL = "https://www.youtube.com/@CriminalCaseNetwork";
export const SITE_TITLE = "Criminal Case Network | True Crime Documentaries and Real Criminal Cases";
export const SITE_ABOUT = "Watch free true crime documentaries from Criminal Case Network: real criminal cases, unsolved mysteries, cold cases and missing persons, told from confirmed facts.";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function ytId(link) {
  const s = String(link || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : "";
}
export const base = (url) => (/\.pages\.dev$/.test(url.hostname) ? MAIN : url.origin);
export const filmUrl = (root, v) => `${root}/film/${encodeURIComponent(v.id)}`;
export async function films(env) {
  let d = {};
  try { d = JSON.parse((await env.VAULT.get("videos")) || "{}") || {}; } catch {}
  return { featured: d.featured || "", rows: d.rows || [], videos: d.videos || [], google: String(d.google || "").replace(/[^\w-]/g, "").slice(0, 120) };
}
export function coverOf(v, root, big) {
  const any = ytId(v.youtube) || ytId(v.trailer), u = (big && v.wide) || v.cover;
  return u ? (/^https?:/.test(u) ? u : root + "/" + u.replace(/^\//, "")) : any ? `https://i.ytimg.com/vi/${any}/hqdefault.jpg` : "";
}
export function brief(s, n = 160) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 3).replace(/\s+\S*$/, "") + "..." : t;
}
export function isoLength(len) {                              // "1 hr 12 min" -> PT1H12M
  const h = /(\d+)\s*hr/.exec(len || ""), m = /(\d+)\s*min/.exec(len || "");
  return h || m ? `PT${h ? h[1] + "H" : ""}${m ? m[1] + "M" : ""}` : "";
}
export const stamp = (v) => new Date(v.updated || v.liveAt || v.added || (/^\d{4}$/.test(v.year || "") ? `${v.year}-01-01` : Date.now())).toISOString();
export const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
export const inline = (name, o) => `<script>window.${name}=${JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " ")}</script>`;

// A film written out as plain page content, so it can be read without running the site's scripts.
export const tile = (v, root) => `<a class="tile" href="/film/${encodeURIComponent(v.id)}"><img loading="lazy" width="960" height="540" src="${esc(coverOf(v, root))}" alt="${esc(v.title)}"><span class="cap"><strong>${esc(v.title)}</strong><span>${esc([v.kind, ytId(v.youtube) ? v.length : "Coming soon"].filter(Boolean).join(" · "))}</span></span></a>`;
export const listing = (list) => `<ul class="ssr-list">${list.map((v) => `<li><a href="/film/${encodeURIComponent(v.id)}">${esc(v.title)}</a>${v.description ? " — " + esc(brief(v.description, 240)) : ""}</li>`).join("")}</ul>`;

// The site's page with a title, description, extra head tags and readable content put in before it is sent.
export async function page(env, url, { title, description, head = [], body = "" }) {
  let html = await (await env.ASSETS.fetch(new URL("/", url))).text();
  html = html.replace(/<meta charset="utf-8">/i, '<meta charset="utf-8"><base href="/">')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta property="og:[^>]*>\s*/g, "").replace(/<link rel="canonical"[^>]*>\s*/g, "")
    .replace("</head>", head.filter(Boolean).join("\n") + "\n</head>")
    .replace('<div class="rows" id="rows"></div>', `<div class="rows" id="rows">${body}</div>`);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
}
export const social = ({ type, title, description, url, image }) => [
  `<link rel="canonical" href="${esc(url)}">`,
  `<meta name="robots" content="index, follow, max-image-preview:large, max-video-preview:-1, max-snippet:-1">`,
  `<meta property="og:site_name" content="Criminal Case Network">`,
  `<meta property="og:type" content="${type}">`,
  `<meta property="og:title" content="${esc(title)}">`,
  `<meta property="og:description" content="${esc(description)}">`,
  `<meta property="og:url" content="${esc(url)}">`,
  image ? `<meta property="og:image" content="${esc(image)}">` : "",
  `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
  `<meta name="twitter:title" content="${esc(title)}">`,
  `<meta name="twitter:description" content="${esc(description)}">`,
  image ? `<meta name="twitter:image" content="${esc(image)}">` : "",
];
export const ABOUT_TEXT = [
  "Welcome to Criminal Case Network! Dive deep into the captivating world of true crime and compelling real stories.",
  "We bring you in-depth analysis of unsolved mysteries, forensic breakthroughs in cold cases, and the psychological insights behind criminal behavior. Explore victim-centric narratives, historical true crime events, and fascinating real-life accounts of human resilience and unusual occurrences.",
  "Our mission is to provide thought-provoking and meticulously researched content, shedding light on the complexities of justice, human nature, and the stories that shape our world.",
];
