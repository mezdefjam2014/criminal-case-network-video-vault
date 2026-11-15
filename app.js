// Criminal Case Network — Video Vault. The whole site is drawn from the film list (back office), or data/videos.json until one exists.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Films, covers and the back office live on Cloudflare. On the Cloudflare address (or this PC) they are next door; anywhere else, ask Cloudflare.
const API = /\.pages\.dev$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? "" : "https://criminal-case-network-video-vault.pages.dev/";
const at = (u) => (u && String(u).startsWith("api/") ? API + u : u || "");
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>';
const INFO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>';
const CHEV = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg>`;

// Accepts any YouTube link (watch, youtu.be, shorts, embed, live) or a bare 11-character id.
function ytId(link) {
  const s = String(link || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : "";
}
const live = (v) => !!ytId(v.youtube);                       // a film is live as soon as it has its YouTube link
const anyId = (v) => ytId(v.youtube) || ytId(v.trailer);
const cover = (v) => at(v.cover) || (anyId(v) ? `https://i.ytimg.com/vi/${anyId(v)}/hqdefault.jpg` : "");
const wide = (v) => at(v.wide) || at(v.cover) || (anyId(v) ? `https://i.ytimg.com/vi/${anyId(v)}/maxresdefault.jpg` : "");
const meta = (v) => [v.kind && `<b>${esc(v.kind)}</b>`, esc(v.year), esc(v.length)].filter(Boolean).join("<span>&middot;</span>");
const slug = (s) => "row-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const embed = (id, extra = "") => `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1${extra}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;

// ---------- countdown ----------
function left(release) {
  const ms = new Date(release).getTime() - Date.now();
  if (!release || isNaN(ms) || ms <= 0) return "";
  const s = Math.floor(ms / 1000), p = (n) => String(n).padStart(2, "0");
  return `${Math.floor(s / 86400)}d ${p(Math.floor(s / 3600) % 24)}h ${p(Math.floor(s / 60) % 60)}m ${p(s % 60)}s`;
}
const when = (release) => { const d = new Date(release); return release && !isNaN(d) ? d.toLocaleString([], { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""; };
const soon = (v) => live(v) ? "" : `<div class="soon"><span class="soon-tag">Coming soon</span>${left(v.release) ? `<span class="count" data-release="${esc(v.release)}">${left(v.release)}</span><span class="soon-date">Premieres ${esc(when(v.release))}</span>` : ""}</div>`;
setInterval(() => document.querySelectorAll("[data-release]").forEach((e) => { e.textContent = left(e.dataset.release) || "Any moment now"; }), 1000);

let DATA = { videos: [], rows: [] };

function buttons(v, box, big) {
  const a = el("div", "actions");
  if (live(v)) { const b = el("button", "btn play", PLAY + "Play"); b.onclick = () => open(v, "film"); a.append(b); }
  if (ytId(v.trailer)) { const b = el("button", "btn " + (live(v) ? "more" : "play"), PLAY + "Watch trailer"); b.onclick = () => open(v, "trailer"); a.append(b); }
  if (!live(v) && !ytId(v.trailer)) { const b = el("button", "btn play", "Coming soon"); b.disabled = true; a.append(b); }
  if (big) { const b = el("button", "btn more", INFO + "More info"); b.onclick = () => open(v); a.append(b); }
  box.append(a);
}

function hero(v) {
  const h = $("#hero"); h.innerHTML = "";
  if (!v) { h.style.display = "none"; return; }
  const img = el("img", "hero-img"); img.src = wide(v); img.alt = "";
  const copy = el("div", "hero-copy", `<p class="tagline">${live(v) ? "Featured film" : "Coming soon"}</p><h1>${esc(v.title)}</h1><p class="meta">${meta(v)}</p>${soon(v)}<p class="desc">${esc(v.description)}</p>`);
  buttons(v, copy, true); h.append(img, copy);
}

function tile(v) {
  const t = el("button", "tile", `<img loading="lazy" src="${esc(cover(v))}" alt="${esc(v.title)}">${live(v) ? "" : '<span class="flag">Coming soon</span>'}
    <span class="cap"><strong>${esc(v.title)}</strong><span>${[v.kind, live(v) ? v.length : when(v.release)].filter(Boolean).map(esc).join(" &middot; ")}</span></span>`);
  t.onclick = () => open(v);
  return t;
}

function row(name, list) {
  const r = el("section", "row"); r.id = slug(name);
  const track = el("div", "track"); list.forEach((v) => track.append(tile(v)));
  const L = el("button", "arrow l", CHEV("l")), R = el("button", "arrow r", CHEV("r"));
  L.setAttribute("aria-label", "Scroll back"); R.setAttribute("aria-label", "Scroll forward");
  const step = (d) => track.scrollBy({ left: d * track.clientWidth * 0.85, behavior: "smooth" });
  L.onclick = () => step(-1); R.onclick = () => step(1);
  const sync = () => { L.hidden = track.scrollLeft < 8; R.hidden = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; };
  track.addEventListener("scroll", sync, { passive: true }); new ResizeObserver(sync).observe(track);
  r.append(el("h2", "", esc(name)), track, L, R);
  return r;
}

function draw(query = "") {
  const q = query.trim().toLowerCase(), box = $("#rows"); box.innerHTML = "";
  const vids = DATA.videos.filter((v) => !q || [v.title, v.description, v.kind, ...(v.rows || [])].join(" ").toLowerCase().includes(q));
  if (q) { if (vids.length) box.append(row(`Results for "${query.trim()}"`, vids)); }
  else DATA.rows.forEach((name) => { const list = vids.filter((v) => (v.rows || []).includes(name)); if (list.length) box.append(row(name, list)); });
  $("#hero").hidden = !!q; box.style.marginTop = q ? "110px" : "";
  $("#empty").hidden = vids.length > 0;
}

// ---------- film window ----------
// mode: "film" plays the film, "trailer" plays the trailer with sound, nothing = info view (the trailer plays quietly as a preview if there is one).
function open(v, mode) {
  const stage = $("#stage"), film = ytId(v.youtube), tr = ytId(v.trailer);
  $("#m-title").textContent = v.title; $("#m-meta").innerHTML = meta(v); $("#m-desc").textContent = v.description || "";
  const info = $("#m-extra"); info.innerHTML = soon(v); buttons(v, info, false);
  if (mode === "film" && film) stage.innerHTML = embed(film);
  else if (mode === "trailer" && tr) stage.innerHTML = embed(tr);
  else if (tr) stage.innerHTML = embed(tr, "&mute=1");
  else stage.innerHTML = `<img src="${esc(wide(v))}" alt=""><div class="shade"></div>`;
  $("#modal").hidden = false; $("#modal").scrollTop = 0; document.body.classList.add("locked"); $("#close").focus();
}
function shut() { $("#modal").hidden = true; $("#stage").innerHTML = ""; document.body.classList.remove("locked"); }
$("#close").onclick = shut;
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") shut(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) shut(); });

// ---------- start ----------
addEventListener("scroll", () => $("#nav").classList.toggle("solid", scrollY > 40), { passive: true });
$("#q").addEventListener("input", (e) => draw(e.target.value));
$("#yr").textContent = new Date().getFullYear();

const get = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw 0; return r.json(); });
get(API + "api/videos").then((d) => { if (!d.videos || !d.videos.length) throw 0; return d; }).catch(() => get("data/videos.json")).then((d) => {
  DATA = d; DATA.rows = d.rows && d.rows.length ? d.rows : [...new Set(d.videos.flatMap((v) => v.rows || []))];
  hero(d.videos.find((v) => v.id === d.featured) || d.videos[0]);
  $("#links").innerHTML = '<a href="#">Home</a>' + DATA.rows.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("");
  draw();
}).catch(() => { $("#empty").hidden = false; $("#empty").textContent = "The film list could not be loaded."; });
