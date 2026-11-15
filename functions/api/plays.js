// Plays per film over the last 14 days. Feeds the "Popular Right Now" row.
export async function onRequestGet({ env }) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare("SELECT id, SUM(n) AS n FROM plays WHERE day >= ?1 GROUP BY id").bind(since).all();
  return new Response(JSON.stringify(Object.fromEntries(results.map((r) => [r.id, r.n]))), { headers: { "content-type": "application/json", "cache-control": "public, max-age=120" } });
}
