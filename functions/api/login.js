import { allowed, json, denied } from "../../lib/auth.js";

// The back office calls this once to check the password. A short pause slows down guessing.
export async function onRequestPost({ request, env }) {
  if (await allowed(request, env)) return json({ ok: true });
  await new Promise((r) => setTimeout(r, 1200));
  return denied();
}
