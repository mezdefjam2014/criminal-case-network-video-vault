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

// ---------- saved in this browser: My List and where you stopped watching ----------
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem("ccn-" + k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem("ccn-" + k, JSON.stringify(v)); } catch {} } };
let LIST = store.get("list", []), SEEN = store.get("seen", {});            // SEEN[id] = { t: seconds watched, d: length, at: when }
const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
const part = (v) => { const s = SEEN[v.id]; return s && s.d > 0 && s.t > 10 && s.t < s.d - 20 ? s.t / s.d : 0; };
function listBtn(v) {
  const b = el("button", "btn round"), show = () => { const on = LIST.includes(v.id); b.innerHTML = on ? TICK : PLUS; b.title = on ? "Remove from My List" : "Add to My List"; b.setAttribute("aria-label", b.title); b.classList.toggle("on", on); };
  b.onclick = () => { LIST = LIST.includes(v.id) ? LIST.filter((i) => i !== v.id) : [v.id, ...LIST]; store.set("list", LIST); show(); draw($("#q").value); };
  show(); return b;
}
const mine = (vids) => [
  ["Continue Watching", vids.filter((v) => live(v) && part(v)).sort((a, b) => SEEN[b.id].at - SEEN[a.id].at)],
  ["My List", LIST.map((id) => vids.find((v) => v.id === id)).filter(Boolean)],
];

function buttons(v, box, big) {
  const a = el("div", "actions");
  if (live(v)) { const b = el("button", "btn play", PLAY + (part(v) ? "Resume" : "Play")); b.onclick = () => open(v, "film"); a.append(b); }
  if (ytId(v.trailer)) { const b = el("button", "btn " + (live(v) ? "more" : "play"), PLAY + "Watch trailer"); b.onclick = () => open(v, "trailer"); a.append(b); }
  if (!live(v) && !ytId(v.trailer)) { const b = el("button", "btn play", "Coming soon"); b.disabled = true; a.append(b); }
  if (big) { const b = el("button", "btn more", INFO + "More info"); b.onclick = () => open(v); a.append(b); }
  a.append(listBtn(v)); box.append(a);
}

function hero(v) {
  const h = $("#hero"); h.innerHTML = "";
  if (!v) { h.style.display = "none"; return; }
  const img = el("img", "hero-img"); img.src = wide(v); img.alt = "";
  const copy = el("div", "hero-copy", `<p class="tagline">${live(v) ? "Featured film" : "Coming soon"}</p><h1>${esc(v.title)}</h1><p class="meta">${meta(v)}</p>${soon(v)}<p class="desc">${esc(v.description)}</p>`);
  buttons(v, copy, true);
  if (SLIDES.length > 1) {
    const dots = el("div", "dots");
    SLIDES.forEach((s, i) => { const b = el("button", i === si ? "on" : ""); b.setAttribute("aria-label", "Show " + s.title); b.onclick = () => showSlide(i); dots.append(b); });
    copy.append(dots);
  }
  h.append(img, copy);
  if (ytId(v.trailer) || ytId(v.youtube)) h.append(el("div", "hero-video", '<div id="hv-yt"></div>'));
}

// ---------- the top of the page: one pinned film, or a rotation that quietly plays trailers and pieces of films ----------
let SLIDES = [], si = 0, HP = null, hTimer = 0, PLAYS = {};
function slides() {
  const pin = DATA.videos.find((v) => v.id === DATA.featured); if (pin) return [pin];
  const top = DATA.videos.filter((v) => v.top);
  return (top.length ? top : DATA.videos).slice(0, 8);
}
function killHero() { clearTimeout(hTimer); try { HP && HP.destroy(); } catch {} HP = null; }
function showSlide(i) {
  killHero(); if (!SLIDES.length) return hero(null);
  si = (i + SLIDES.length) % SLIDES.length; FEAT = SLIDES[si]; hero(FEAT); heroPlay(FEAT);
}
function heroPlay(v) {
  const tr = ytId(v.trailer), id = tr || ytId(v.youtube), next = () => showSlide(si + 1);
  const still = () => FEAT === v && $("#modal").hidden && document.getElementById("hv-yt");
  if (!id || matchMedia("(prefers-reduced-motion: reduce)").matches) { if (SLIDES.length > 1) hTimer = setTimeout(next, 9000); return; }
  hTimer = setTimeout(next, 30000);                           // each one gets about 30 seconds
  loadApi().then(() => {
    if (!still()) return;
    HP = new YT.Player("hv-yt", { host: "https://www.youtube-nocookie.com", videoId: id, playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, fs: 0, disablekb: 1 },
      events: { onReady: (e) => { e.target.mute(); const d = e.target.getDuration(); if (!tr && d > 90) e.target.seekTo(d * (0.15 + Math.random() * 0.6), true); e.target.playVideo(); },
        onStateChange: (e) => { if (e.data === 1) document.querySelector(".hero-video")?.classList.add("on"); if (e.data === 0) { clearTimeout(hTimer); next(); } } } });
  });
}
function countPlay(v) {
  const done = store.get("played", {}); if (Date.now() - (done[v.id] || 0) < 6 * 3600e3) return;
  done[v.id] = Date.now(); store.set("played", done);
  fetch(API + "api/play?id=" + encodeURIComponent(v.id), { method: "POST" }).catch(() => {});
}

function tile(v, rank) {
  const t = el("button", "tile", `<img loading="lazy" src="${esc(cover(v))}" alt="${esc(v.title)}">${rank ? `<span class="rank">${rank}</span>` : ""}${live(v) ? "" : '<span class="flag">Coming soon</span>'}${part(v) ? `<i class="prog"><i style="width:${Math.round(part(v) * 100)}%"></i></i>` : ""}
    <span class="cap"><strong>${esc(v.title)}</strong><span>${[v.kind, live(v) ? v.length : when(v.release)].filter(Boolean).map(esc).join(" &middot; ")}</span></span>`);
  t.onclick = () => open(v);
  return t;
}

function row(name, list, ranked) {
  const r = el("section", "row"); r.id = slug(name);
  const track = el("div", "track"); list.forEach((v, i) => track.append(tile(v, ranked && i + 1)));
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
  else {
    const rows = DATA.rows.map((name) => [name, vids.filter((v) => (v.rows || []).includes(name))]).filter((r) => r[1].length);
    const pop = vids.filter((v) => live(v) && PLAYS[v.id] > 0).sort((a, b) => PLAYS[b.id] - PLAYS[a.id]).slice(0, 10);
    const tr = rows.findIndex((r) => /trailer/i.test(r[0]));
    if (pop.length) rows.splice(tr >= 0 ? tr + 1 : Math.min(1, rows.length), 0, ["Popular Right Now", pop, true]);
    const later = vids.filter((v) => !live(v));
    if (later.length && !DATA.rows.some((n) => /coming soon/i.test(n))) rows.push(["Coming Soon", later]);
    [...mine(vids), ...rows].forEach(([name, list, ranked]) => { if (list.length) box.append(row(name, list, ranked)); });
  }
  $("#hero").hidden = !!q; box.style.marginTop = q ? "110px" : "";
  $("#empty").hidden = vids.length > 0;
}

// ---------- film window ----------
// mode: "film" plays the film, "trailer" plays the trailer with sound, nothing = info view (the trailer plays quietly as a preview if there is one).
function open(v, mode) {
  stop(); killHero();
  const stage = $("#stage"), film = ytId(v.youtube), tr = ytId(v.trailer);
  if (!mode && !film && tr) mode = "trailer";                // coming soon: clicking it plays the trailer; with no trailer it shows the picture
  $("#m-title").textContent = v.title; $("#m-meta").innerHTML = meta(v); $("#m-desc").textContent = v.description || "";
  const info = $("#m-extra"); info.innerHTML = soon(v); buttons(v, info, false);
  if (mode === "film" && film) watch(v, film, true);
  else if (mode === "trailer" && tr) watch(v, tr, false);
  else if (tr) stage.innerHTML = embed(tr, "&mute=1");
  else stage.innerHTML = `<img src="${esc(wide(v))}" alt=""><div class="shade"></div>`;
  $("#modal").hidden = false; $("#modal").scrollTop = 0; document.body.classList.add("locked"); $("#close").focus();
}
function shut() { stop(); $("#modal").hidden = true; $("#stage").innerHTML = ""; document.body.classList.remove("locked"); showSlide(si); draw($("#q").value); }
let FEAT = null;

// ---------- player: our own controls sit under the picture, never on top of it ----------
const I = { play: PLAY, pause: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l5 4V6l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>', off: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l5 4V6l-5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>' };
let P = null, timer = 0, ytApi, now = null;                 // now = { v, track }
const clock = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s % 60).padStart(2, "0"); };
const loadApi = () => ytApi || (ytApi = new Promise((ok) => { window.onYouTubeIframeAPIReady = ok; const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.append(s); }));
const ready = () => P && typeof P.getCurrentTime === "function";
function remember() {
  if (!now || !now.track || !ready()) return;
  const t = P.getCurrentTime(), d = P.getDuration(); if (!d) return;
  if (t > d - 20) delete SEEN[now.v.id]; else SEEN[now.v.id] = { t: Math.floor(t), d: Math.floor(d), at: Date.now() };
  store.set("seen", SEEN);
}
function paint() {
  if (!ready()) return;
  const t = P.getCurrentTime(), d = P.getDuration() || 0, st = P.getPlayerState();
  if (!$("#c-seek").matches(":active")) $("#c-seek").value = d ? Math.round((t / d) * 1000) : 0;
  $("#c-seek").style.setProperty("--p", (d ? (t / d) * 100 : 0) + "%");
  $("#c-time").textContent = clock(t) + " / " + clock(d);
  $("#c-play").innerHTML = st === 1 || st === 3 ? I.pause : I.play;
  $("#c-mute").innerHTML = P.isMuted() || P.getVolume() === 0 ? I.off : I.vol;
}
async function watch(v, id, track) {
  now = { v, track }; $("#stage").innerHTML = '<div id="yt"></div>'; $("#ctrl").hidden = false; $("#c-speed").value = "1";
  await loadApi(); if (!now || now.v !== v) return;
  const from = track && part(v) ? SEEN[v.id].t : 0;
  P = new YT.Player("yt", { host: "https://www.youtube-nocookie.com", videoId: id, playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, fs: 0, start: from },
    events: { onReady: () => { P.setVolume(store.get("vol", 100)); $("#c-vol").value = store.get("vol", 100); paint(); }, onStateChange: (e) => { paint(); if (e.data === 0 || e.data === 2) remember(); } } });
  clearInterval(timer); let n = 0; let on = 0; timer = setInterval(() => { paint(); if (++n % 10 === 0) remember(); if (track && ready() && P.getPlayerState() === 1 && ++on === 60) countPlay(v); }, 500);
}
function stop() {
  remember(); clearInterval(timer); if (document.fullscreenElement) document.exitFullscreen();
  try { P && P.destroy(); } catch {} P = null; now = null; $("#ctrl").hidden = true;
}
const toggle = () => ready() && (P.getPlayerState() === 1 ? P.pauseVideo() : P.playVideo());
const jump = (s) => ready() && P.seekTo(Math.max(0, P.getCurrentTime() + s), true);
const mute = () => ready() && (P.isMuted() ? P.unMute() : P.mute());
const full = () => document.fullscreenElement ? document.exitFullscreen() : $("#theater").requestFullscreen?.();
$("#c-play").onclick = toggle; $("#c-back").onclick = () => jump(-10); $("#c-fwd").onclick = () => jump(10); $("#c-mute").onclick = mute; $("#c-full").onclick = full;
$("#c-seek").oninput = (e) => ready() && P.seekTo((e.target.value / 1000) * P.getDuration(), true);
$("#c-vol").oninput = (e) => { if (!ready()) return; P.unMute(); P.setVolume(+e.target.value); store.set("vol", +e.target.value); };
$("#c-speed").onchange = (e) => ready() && P.setPlaybackRate(+e.target.value);
addEventListener("keydown", (e) => {
  if (!ready() || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range") return;
  const k = { " ": toggle, k: toggle, ArrowLeft: () => jump(-10), ArrowRight: () => jump(10), j: () => jump(-10), l: () => jump(10), m: mute, f: full }[e.key];
  if (k) { e.preventDefault(); k(); }
});
addEventListener("pagehide", remember);
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
  SLIDES = slides(); showSlide(0);
  $("#links").innerHTML = '<a href="#">Home</a>' + DATA.rows.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("");
  draw();
}).catch(() => { $("#empty").hidden = false; $("#empty").textContent = "The film list could not be loaded."; });
get(API + "api/plays").then((p) => { PLAYS = p || {}; if (DATA.videos.length) draw($("#q").value); }).catch(() => {});
