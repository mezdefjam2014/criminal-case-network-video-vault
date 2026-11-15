import { CHANNEL, esc, ytId, base, filmUrl, films, coverOf, brief, isoLength, stamp, ld, inline, listing, page, social } from "../../lib/seo.js";

// A film's own page: /film/<id>. It is the normal site with that film opened, plus the film's title, description and cover
// written into the page itself, so shared links show the right preview and search engines can read it as a video page.
export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url), root = base(url), d = await films(env);
  const v = d.videos.find((x) => x.id === params.id);
  if (!v) return Response.redirect(url.origin + "/", 302);

  const film = ytId(v.youtube), self = filmUrl(root, v), image = coverOf(v, root, true);
  const kind = v.kind || "Documentary", about = String(v.description || "A Criminal Case Network film.").replace(/\s+/g, " ").trim();
  const title = `${v.title} | True Crime ${kind} | Criminal Case Network`, short = brief(about, 160);

  const head = [
    ...social({ type: film ? "video.other" : "website", title: v.title, description: brief(about, 200), url: self, image }),
    ld({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Criminal Case Network", item: root + "/" }, { "@type": "ListItem", position: 2, name: v.title, item: self }] }),
    film ? ld({ "@context": "https://schema.org", "@type": "VideoObject", name: v.title, description: about, thumbnailUrl: [image], uploadDate: stamp({ ...v, updated: 0 }),
      ...(isoLength(v.length) ? { duration: isoLength(v.length) } : {}), embedUrl: `https://www.youtube.com/embed/${film}`, contentUrl: `https://www.youtube.com/watch?v=${film}`,
      genre: ["True crime", kind], inLanguage: "en", isFamilyFriendly: false, publisher: { "@type": "Organization", name: "Criminal Case Network", url: root + "/", sameAs: [CHANNEL] } }) : "",
    inline("FILMS", { featured: d.featured, rows: d.rows, videos: d.videos }),
    inline("OPEN_FILM", v.id),
  ];
  const others = d.videos.filter((o) => o.id !== v.id);
  const body = `<article class="ssr-about"><h1>${esc(v.title)}</h1><p>${esc([kind, v.year, film ? v.length : "Coming soon"].filter(Boolean).join(" · "))}</p>`
    + (image ? `<p><img src="${esc(image)}" alt="${esc(v.title)}" width="960" height="540" style="max-width:100%;height:auto"></p>` : "")
    + `<p>${esc(about)}</p>${film ? `<p><a href="https://www.youtube.com/watch?v=${film}">Watch “${esc(v.title)}” on YouTube</a></p>` : ""}`
    + (others.length ? `<h2>More true crime documentaries</h2>${listing(others)}` : "") + `<p><a href="/">All films from Criminal Case Network</a></p></article>`;
  return page(env, url, { title, description: short, head, body });
}
