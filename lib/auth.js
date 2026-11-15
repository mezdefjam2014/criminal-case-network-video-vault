// Shared by the back office endpoints. The password lives only in Cloudflare (ADMIN_PASSWORD secret), never in the site's files.
const enc = new TextEncoder();
async function same(a, b) {                                   // compare without leaking how many characters matched
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y); let d = 0;
  for (let i = 0; i < p.length; i++) d |= p[i] ^ q[i];
  return d === 0;
}
export async function allowed(request, env) {
  const given = (request.headers.get("authorization") || "").replace(/^Bearer /, "");
  return !!env.ADMIN_PASSWORD && !!given && same(given, env.ADMIN_PASSWORD);
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export const denied = () => json({ error: "Wrong password." }, 401);
