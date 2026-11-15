// Lets the GitHub-hosted copy of the site read films and covers, and use the back office, from Cloudflare.
const ALLOWED = ["https://mezdefjam2014.github.io"];

export async function onRequest({ request, next }) {
  const origin = request.headers.get("origin") || "";
  const cors = ALLOWED.includes(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS", "access-control-allow-headers": "authorization, content-type", "access-control-max-age": "86400", vary: "Origin" }
    : {};
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const res = await next(), out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}
