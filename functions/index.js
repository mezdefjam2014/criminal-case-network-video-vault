import { MAIN, CHANNEL, SITE_TITLE, SITE_ABOUT, ABOUT_TEXT, esc, ytId, base, filmUrl, films, coverOf, ld, inline, tile, listing, page, social } from "../lib/seo.js";

// The home page. The film list is written into the page before it is sent: search engines can read every film and follow
// its link without running scripts, and visitors get the films without a second request.
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url), root = base(url), d = await films(env), list = d.videos;
  const lead = list.find((v) => v.id === d.featured) || list[0];
  const head = [
    ...social({ type: "website", title: SITE_TITLE, description: SITE_ABOUT, url: root + "/", image: root + "/share.jpg" }),
    `<link rel="alternate" type="application/atom+xml" title="Criminal Case Network films" href="${root}/feed.xml">`,
    d.google ? `<meta name="google-site-verification" content="${esc(d.google)}">` : "",
    ld({ "@context": "https://schema.org", "@type": "WebSite", name: "Criminal Case Network", alternateName: ["CCN", "Criminal Case Network Video Vault"], url: root + "/", description: SITE_ABOUT, inLanguage: "en" }),
    ld({ "@context": "https://schema.org", "@type": "Organization", name: "Criminal Case Network", url: root + "/", description: SITE_ABOUT, logo: root + "/icon-512.png", image: root + "/share.jpg", sameAs: [CHANNEL] }),
    list.length ? ld({ "@context": "https://schema.org", "@type": "ItemList", name: "True crime documentaries from Criminal Case Network",
      itemListElement: list.map((v, i) => ({ "@type": "ListItem", position: i + 1, url: filmUrl(root, v), name: v.title })) }) : "",
    inline("FILMS", { featured: d.featured, rows: d.rows, videos: d.videos }),
  ];
  const out = list.filter((v) => ytId(v.youtube)), soon = list.filter((v) => !ytId(v.youtube));
  const body = (list.length ? `<section class="row ssr"><h2>True crime documentaries and real criminal cases</h2><div class="track">${out.concat(soon).map((v) => tile(v, root)).join("")}</div></section>${listing(list)}` : "")
    + `<section class="ssr-about"><h2>About Criminal Case Network</h2>${ABOUT_TEXT.map((p) => `<p>${esc(p)}</p>`).join("")}<p><a href="${CHANNEL}">Criminal Case Network on YouTube</a></p></section>`;
  return page(env, url, { title: SITE_TITLE, description: SITE_ABOUT, head, body });
}
