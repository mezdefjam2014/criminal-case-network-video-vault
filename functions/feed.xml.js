import { ytId, base, filmUrl, films, coverOf, brief, stamp } from "../lib/seo.js";

// A feed of the films, newest first. Search engines and feed readers use it to notice new films.
const x = (s) => String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
export async function onRequestGet({ env, request }) {
  const root = base(new URL(request.url)), d = await films(env);
  const list = d.videos.filter((v) => ytId(v.youtube) || ytId(v.trailer)).sort((a, b) => (stamp(b) > stamp(a) ? 1 : -1)).slice(0, 50);
  const newest = list.length ? stamp(list[0]) : new Date().toISOString();
  const entries = list.map((v) => `  <entry>\n    <title>${x(v.title)}</title>\n    <link href="${x(filmUrl(root, v))}"/>\n    <id>${x(filmUrl(root, v))}</id>\n    <updated>${stamp(v)}</updated>\n    <summary>${x(brief(v.description || v.title, 500))}</summary>\n    <media:thumbnail xmlns:media="http://search.yahoo.com/mrss/" url="${x(coverOf(v, root, true))}"/>\n  </entry>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>Criminal Case Network — True Crime Documentaries</title>\n  <subtitle>Real criminal cases, told from confirmed facts.</subtitle>\n  <link href="${root}/"/>\n  <link rel="self" href="${root}/feed.xml"/>\n  <id>${root}/</id>\n  <updated>${newest}</updated>\n  <author><name>Criminal Case Network</name></author>\n${entries}\n</feed>\n`;
  return new Response(xml, { headers: { "content-type": "application/atom+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
