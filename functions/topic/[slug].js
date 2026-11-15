import { quick, CHANNEL, esc, base, filmUrl, films, topicMap, ld, inline, tile, listing, page, social } from "../../lib/seo.js";

// A topic's own page: /topic/<slug>, for example murder cases or court cases. It lists every film that deals with that subject.
// A topic only has a page while at least one film belongs to it, so there are never empty pages.
export const onRequestGet = (c) => quick(c, build);
async function build({ params, env, request }) {
  const url = new URL(request.url), root = base(url), d = await films(env), topics = topicMap(d.videos);
  const t = topics.find((x) => x.slug === params.slug);
  if (!t) return Response.redirect(url.origin + "/", 302);
  const list = t.ids.map((id) => d.videos.find((v) => v.id === id)).filter(Boolean), self = `${root}/topic/${t.slug}`;
  const title = `${t.name} | True Crime Documentaries | Criminal Case Network`;
  const about = `${t.intro} ${list.length} film${list.length === 1 ? "" : "s"} from Criminal Case Network, free to watch.`;
  const head = [
    ...social({ type: "website", title: `${t.name} | Criminal Case Network`, description: about, url: self, image: root + "/share.jpg" }),
    ld({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Criminal Case Network", item: root + "/" }, { "@type": "ListItem", position: 2, name: t.name, item: self }] }),
    ld({ "@context": "https://schema.org", "@type": "CollectionPage", name: t.name, description: about, url: self, isPartOf: { "@type": "WebSite", name: "Criminal Case Network", url: root + "/" },
      publisher: { "@type": "Organization", name: "Criminal Case Network", url: root + "/", sameAs: [CHANNEL] },
      mainEntity: { "@type": "ItemList", itemListElement: list.map((v, i) => ({ "@type": "ListItem", position: i + 1, url: filmUrl(root, v), name: v.title })) } }),
    inline("FILMS", { featured: d.featured, rows: d.rows, videos: d.videos }), inline("TOPICS", topics), inline("OPEN_TOPIC", t.slug),
  ];
  const body = `<article class="ssr-about"><h1>${esc(t.name)}</h1><p>${esc(about)}</p></article><section class="row ssr"><div class="track">${list.map((v) => tile(v, root)).join("")}</div></section>${listing(list)}`
    + `<section class="ssr-about"><h2>More topics</h2><p>${topics.filter((x) => x.slug !== t.slug).map((x) => `<a href="/topic/${x.slug}">${esc(x.name)}</a>`).join(" · ")}</p><p><a href="/">All films from Criminal Case Network</a></p></section>`;
  return page(env, url, { title, description: about, head, body });
}
