// Criminal Case Network — Video Vault. The whole site is drawn from data/videos.json.
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
const cover = (v) => v.cover || (ytId(v.youtube) ? `https://i.ytimg.com/vi/${ytId(v.youtube)}/hqdefault.jpg` : "");
const wide = (v) => v.wide || v.cover || (ytId(v.youtube) ? `https://i.ytimg.com/vi/${ytId(v.youtube)}/maxresdefault.jpg` : "");
const meta = (v) => [v.kind && `<b>${esc(v.kind)}</b>`, esc(v.year), esc(v.length)].filter(Boolean).join("<span>&middot;</span>");
const slug = (s) => "row-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

let DATA = { videos: [], rows: [] };

function hero(v) {
  const h = $("#hero"); h.innerHTML = "";
  if (!v) { h.hidden = true; return; }
  h.hidden = false;
  const img = el("img", "hero-img"); img.src = wide(v); img.alt = "";
  const copy = el("div", "hero-copy", `
    <p class="tagline">Featured film</p>
    <h1>${esc(v.title)}</h1>
    <p class="meta">${meta(v)}</p>
    <p class="desc">${esc(v.description)}</p>
    <div class="actions">
      <button class="btn play">${PLAY}Play</button>
      <button class="btn more">${INFO}More info</button>
    </div>`);
  copy.querySelector(".play").onclick = () => open(v, true);
  copy.querySelector(".more").onclick = () => open(v, false);
  h.append(img, copy);
}

function tile(v) {
  const t = el("button", "tile", `<img loading="lazy" src="${esc(cover(v))}" alt="${esc(v.title)}">
    <span class="cap"><strong>${esc(v.title)}</strong><span>${[v.kind, v.length].filter(Boolean).map(esc).join(" &middot; ")}</span></span>`);
  t.onclick = () => open(v, false);
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
  $("#hero").style.display = q ? "none" : "";
  box.style.marginTop = q ? "110px" : "";
  $("#empty").hidden = vids.length > 0;
}

// ---------- film window ----------
function open(v, autoplay) {
  const id = ytId(v.youtube), stage = $("#stage");
  $("#m-title").textContent = v.title; $("#m-meta").innerHTML = meta(v); $("#m-desc").textContent = v.description || "";
  const play = () => { stage.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; };
  if (id && autoplay) play();
  else {
    stage.innerHTML = `<img src="${esc(wide(v))}" alt=""><div class="shade"></div>
      <div class="actions"><button class="btn play" ${id ? "" : "disabled"}>${PLAY}${id ? "Play" : "Coming soon"}</button></div>`;
    if (id) stage.querySelector(".play").onclick = play;
  }
  $("#modal").hidden = false; document.body.classList.add("locked"); $("#close").focus();
}
function shut() { $("#modal").hidden = true; $("#stage").innerHTML = ""; document.body.classList.remove("locked"); }
$("#close").onclick = shut;
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") shut(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) shut(); });

// ---------- start ----------
addEventListener("scroll", () => $("#nav").classList.toggle("solid", scrollY > 40), { passive: true });
$("#q").addEventListener("input", (e) => draw(e.target.value));
$("#yr").textContent = new Date().getFullYear();

fetch("data/videos.json", { cache: "no-cache" }).then((r) => r.json()).then((d) => {
  DATA = d; DATA.rows = d.rows && d.rows.length ? d.rows : [...new Set(d.videos.flatMap((v) => v.rows || []))];
  hero(d.videos.find((v) => v.id === d.featured) || d.videos[0]);
  $("#links").innerHTML = '<a href="#">Home</a>' + DATA.rows.map((n) => `<a href="#${slug(n)}">${esc(n)}</a>`).join("");
  draw();
}).catch(() => { $("#empty").hidden = false; $("#empty").textContent = "The film list could not be loaded."; });
