import { json } from "../../lib/auth.js";

// Counts one play of a film for today. The site calls this after 30 seconds of watching.
export async function onRequestPost({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return json({ error: "Unknown film." }, 400);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO plays (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1").bind(id, day).run();
  return json({ ok: true });
}
