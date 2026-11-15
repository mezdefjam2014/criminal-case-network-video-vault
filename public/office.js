// Back office for the Video Vault. Everything is saved in Cloudflare; the password is checked there, not here.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function ytId(link) {
  const s = String(link || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : "";
}
// Films, covers and the back office live on Cloudflare. On the Cloudflare address (or this PC) they are next door; anywhere else, ask Cloudflare.
const API = /\.pages\.dev$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? "" : "https://ccntv.pages.dev/";
const at = (u) => (u && String(u).startsWith("api/") ? API + u : u || "");
const say = (id, text, kind = "") => { const e = $(id); e.textContent = text; e.className = "msg " + kind; };
const DEFAULT_ROWS = ["New Releases", "Documentaries", "Trailers & Previews"];

let PW = sessionStorage.getItem("ccn-office") || "";
let DATA = { featured: "", rows: [], videos: [] };
let PLAYS = {};
let editing = null, picked = null;                           // picked = { tile: Blob, wide: Blob|null, url }

async function api(method, url, body, type) {
  const r = await fetch(API + url, { method, body, headers: { authorization: "Bearer " + PW, ...(type ? { "content-type": type } : {}) } });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { leave(); throw new Error("Wrong password."); }
  if (!r.ok) throw new Error(d.error || "Cloudflare did not accept that (" + r.status + ").");
  return d;
}

// ---------- in and out ----------
async function enter() {
  await api("POST", "api/login");
  sessionStorage.setItem("ccn-office", PW);
  DATA = await fetch(API + "api/videos", { cache: "no-store" }).then((r) => r.json());
  if (!DATA.rows.length) DATA.rows = [...DEFAULT_ROWS];
  PLAYS = await fetch(API + "api/plays").then((r) => r.json()).catch(() => ({}));
  $("#gate").hidden = true; $("#desk").hidden = false; draw();
}
function leave() { PW = ""; sessionStorage.removeItem("ccn-office"); $("#desk").hidden = true; $("#gate").hidden = false; $("#pw").value = ""; }
$("#gate").onsubmit = async (e) => { e.preventDefault(); PW = $("#pw").value; say("#gate-msg", "Checking..."); try { await enter(); say("#gate-msg", ""); } catch (x) { say("#gate-msg", x.message === "Failed to fetch" ? "Could not reach the site." : x.message, "bad"); } };
$("#out").onclick = leave;
if (PW) enter().catch(() => {});

// ---------- film list ----------
const save = () => api("PUT", "api/videos", JSON.stringify(DATA), "application/json");
const coverOf = (v) => at(v.cover) || (ytId(v.youtube) || ytId(v.trailer) ? `https://i.ytimg.com/vi/${ytId(v.youtube) || ytId(v.trailer)}/hqdefault.jpg` : "");
const stored = (u) => (String(u || "").match(/^api\/cover\/([a-z0-9-]+\.jpg)$/) || [])[1];
const drop = (u) => stored(u) ? api("DELETE", "api/cover/" + stored(u)).catch(() => {}) : null;

function draw() {
  $("#rows").value = DATA.rows.join(", "); $("#google").value = DATA.google || "";
  const list = $("#list"); list.innerHTML = "";
  if (!DATA.videos.length) { list.innerHTML = '<div class="none">No films yet. Press "Add a film" to put up the first one.</div>'; return; }
  DATA.videos.forEach((v, i) => {
    const liveNow = !!ytId(v.youtube), d = document.createElement("div"); d.className = "item";
    const date = v.release && !isNaN(dayOf(v.release)) ? dayOf(v.release).toLocaleDateString([], { dateStyle: "medium" }) : "";
    d.innerHTML = `<img src="${esc(coverOf(v))}" alt=""><div class="what"><strong>${esc(v.title)}</strong>
      <span>${DATA.featured === v.id ? '<i class="pill feat">Pinned at top</i>' : ""}<i class="pill ${liveNow ? "" : "soon"}">${liveNow ? "Live" : "Coming soon"}</i>${esc([!liveNow && date, PLAYS[v.id] && PLAYS[v.id] + " plays in 14 days", v.top && "in top rotation", ytId(v.trailer) && "has trailer", (v.rows || []).join(", ")].filter(Boolean).join(" · "))}</span></div>
      <div class="tools"><button class="btn more icon" data-a="up" title="Move up">&uarr;</button><button class="btn more icon" data-a="down" title="Move down">&darr;</button>
      <button class="btn more" data-a="edit">Edit</button><button class="btn more danger" data-a="del">Remove</button></div>`;
    d.querySelector(".tools").onclick = (e) => { const a = e.target.dataset.a; if (a) act(a, i); };
    list.append(d);
  });
}

async function act(a, i) {
  const v = DATA.videos[i];
  if (a === "edit") return edit(v);
  try {
    if (a === "del") {
      if (!confirm(`Remove "${v.title}" from the site? Its cover is erased too.`)) return;
      DATA.videos.splice(i, 1); if (DATA.featured === v.id) DATA.featured = DATA.videos[0]?.id || "";
      await save(); await drop(v.cover); await drop(v.wide);
    } else {
      const j = a === "up" ? i - 1 : i + 1; if (j < 0 || j >= DATA.videos.length) return;
      [DATA.videos[i], DATA.videos[j]] = [DATA.videos[j], DATA.videos[i]]; await save();
    }
    say("#msg", "Saved.", "good");
  } catch (x) { say("#msg", x.message, "bad"); }
  draw();
}
$("#rows").onchange = async () => {
  DATA.rows = [...new Set($("#rows").value.split(",").map((s) => s.trim()).filter(Boolean))];
  try { await save(); say("#msg", "Rows saved.", "good"); } catch (x) { say("#msg", x.message, "bad"); }
  draw();
};

$("#google").onchange = async () => {
  DATA.google = $("#google").value.replace(/^.*content="?|google-site-verification=|["' />]/g, "").trim();     // accepts the bare code, the whole tag, or the "google-site-verification=" form
  $("#google").value = DATA.google;
  try { await save(); say("#msg", DATA.google ? "Google code saved. It is on the home page now; press Verify in Google Search Console." : "Google code removed.", "good"); } catch (x) { say("#msg", x.message, "bad"); }
};

// ---------- cover: any picture in, a small sharp 16:9 JPEG out ----------
async function shrink(file, W, H, q) {
  const src = await createImageBitmap(file);
  const s = Math.max(W / src.width, H / src.height), sw = W / s, sh = H / s;          // fill 16:9, centred, top-weighted for faces
  let c = document.createElement("canvas"), w = Math.round(sw), h = Math.round(sh);
  c.width = w; c.height = h; c.getContext("2d").drawImage(src, (src.width - sw) / 2, (src.height - sh) * 0.3, sw, sh, 0, 0, w, h);
  while (w / 2 >= W) {                                                               // halve in steps: keeps edges and lettering crisp
    const n = document.createElement("canvas"); n.width = w = Math.round(w / 2); n.height = h = Math.round(h / 2);
    const x = n.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, w, h); c = n;
  }
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const x = out.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, W, H);
  return new Promise((ok) => out.toBlob(ok, "image/jpeg", q));
}
async function pick(file) {
  if (!file || !file.type.startsWith("image/")) return say("#f-msg", "That is not a picture.", "bad");
  say("#f-size", "Making it smaller...");
  try {
    const dim = await createImageBitmap(file);
    const tile = await shrink(file, 960, 540, 0.86), wideOne = dim.width >= 1500 ? await shrink(file, 1920, 1080, 0.86) : null;
    picked = { tile, wide: wideOne, url: URL.createObjectURL(tile) };
    $("#f-prev").src = picked.url; $("#drop-text").hidden = true;
    say("#f-size", `Original ${(file.size / 1024).toFixed(0)} KB, ${dim.width}x${dim.height}. Saved as ${(tile.size / 1024).toFixed(0)} KB${wideOne ? ` plus a large ${(wideOne.size / 1024).toFixed(0)} KB version for the featured spot` : ""}.`);
  } catch { say("#f-size", "That picture could not be read. Try a JPG or PNG.", "bad"); }
}
const dz = $("#drop");
dz.onclick = () => $("#f-file").click();
$("#f-file").onchange = (e) => pick(e.target.files[0]);
dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("over"); };
dz.ondragleave = () => dz.classList.remove("over");
dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("over"); pick(e.dataTransfer.files[0]); };

// ---------- add / edit ----------
const dayOf = (r) => (/^\d{4}-\d\d-\d\d$/.test(r || "") ? new Date(r + "T00:00:00") : new Date(r));          // a release is a date only, no time
const localTime = (iso) => { const d = dayOf(iso); return iso && !isNaN(d) ? new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ""; };
function edit(v) {
  editing = v || null; picked = null; asked = "";
  $("#f-head").textContent = v ? "Edit film" : "Add a film";
  $("#f-title").value = v?.title || ""; $("#f-youtube").value = v?.youtube || ""; $("#f-trailer").value = v?.trailer || "";
  $("#f-release").value = localTime(v?.release); $("#f-desc").value = v?.description || ""; $("#f-kind").value = v?.kind || "Documentary";
  $("#f-length").value = v?.length || ""; $("#f-year").value = v?.year || String(new Date().getFullYear());
  $("#f-featured").checked = !!v && DATA.featured === v.id; $("#f-top").checked = !!v?.top;
  $("#f-rows").innerHTML = DATA.rows.map((r) => `<label class="check"><input type="checkbox" value="${esc(r)}" ${(v ? v.rows || [] : [DATA.rows[0]]).includes(r) ? "checked" : ""}> ${esc(r)}</label>`).join("");
  $("#f-prev").src = v ? coverOf(v) : ""; $("#drop-text").hidden = !!(v && coverOf(v)); $("#f-file").value = "";
  say("#f-msg", ""); say("#f-size", "Any size works. It is made smaller automatically and stays sharp. With no cover, the YouTube thumbnail is used.");
  $("#editor").hidden = false; $("#editor").scrollTop = 0; $("#f-title").focus();
}
const closeEditor = () => { $("#editor").hidden = true; };
$("#add").onclick = () => edit(null); $("#cancel").onclick = closeEditor; $("#cancel2").onclick = closeEditor;

// Paste a YouTube link and the empty boxes fill themselves in from YouTube. Anything you already typed is left alone.
let asked = "";
async function autofill(link) {
  const id = ytId(link); if (!id || id === asked) return;
  if (!picked && !editing?.cover) { $("#f-prev").src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; $("#drop-text").hidden = true; }
  const T = $("#f-title"), D = $("#f-desc"), L = $("#f-length");
  if (T.value.trim() && D.value.trim() && L.value.trim()) return;
  asked = id; say("#f-msg", "Getting the title and description from YouTube...");
  try {
    const d = await api("GET", "api/lookup?id=" + id);
    if (!T.value.trim() && d.title) T.value = d.title.slice(0, 120);
    if (!D.value.trim() && d.description) {
      const parts = d.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      let text = parts[0] || ""; if (text.length < 160 && parts[1]) text += "\n\n" + parts[1];
      D.value = text.length > 700 ? text.slice(0, 700).replace(/\s+\S*$/, "") + "..." : text;
    }
    if (!L.value.trim() && d.length && ytId($("#f-youtube").value) === id) L.value = d.length;
    if (d.year && ytId($("#f-youtube").value) === id) $("#f-year").value = d.year;
    if (d.description) say("#f-msg", "Filled in from YouTube. Change anything you like.", "good");
    else if (d.keyProblem) say("#f-msg", "Title filled in. The description was refused by YouTube: " + d.keyProblem, "bad");
    else if (d.needsKey) say("#f-msg", "Title filled in. The description could not be read: this video is not among the 15 newest public videos on the Criminal Case Network channel.", "bad");
    else say("#f-msg", "Title filled in. This video has no description on YouTube.", "good");
  } catch (x) { say("#f-msg", "Could not get the details from YouTube. Type them in.", "bad"); }
}
for (const ev of ["change", "paste"]) {
  $("#f-youtube").addEventListener(ev, (e) => setTimeout(() => autofill(e.target.value), 50));
  $("#f-trailer").addEventListener(ev, (e) => setTimeout(() => { if (!$("#f-youtube").value.trim()) autofill(e.target.value); }, 50));
}

$("#form").onsubmit = async (e) => {
  e.preventDefault();
  const yt = $("#f-youtube").value.trim(), tr = $("#f-trailer").value.trim();
  if (yt && !ytId(yt)) return say("#f-msg", "The film link is not a YouTube link.", "bad");
  if (tr && !ytId(tr)) return say("#f-msg", "The trailer link is not a YouTube link.", "bad");
  $("#save").disabled = true; say("#f-msg", "Saving...");
  try {
    const v = editing || { id: ($("#f-title").value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "film") + "-" + Date.now().toString(36), added: Date.now() };
    const old = [];
    if (picked) {                                             // new cover: upload, then erase the one it replaces
      const base = v.id.slice(0, 60) + "-" + Date.now().toString(36);
      old.push(v.cover, v.wide);
      v.cover = (await api("PUT", `api/cover/${base}.jpg`, picked.tile, "image/jpeg")).url;
      v.wide = picked.wide ? (await api("PUT", `api/cover/${base}-wide.jpg`, picked.wide, "image/jpeg")).url : "";
    }
    const rel = $("#f-release").value;
    if (yt && !ytId(v.youtube)) v.liveAt = Date.now();      // the moment it goes live: drives the NEW badge for two weeks
    v.updated = Date.now();
    Object.assign(v, { top: $("#f-top").checked, title: $("#f-title").value.trim(), youtube: yt, trailer: tr, release: rel || "", description: $("#f-desc").value.trim(),
      kind: $("#f-kind").value, length: $("#f-length").value.trim(), year: $("#f-year").value.trim(), rows: [...document.querySelectorAll("#f-rows input:checked")].map((c) => c.value) });
    if (!editing) DATA.videos.unshift(v);
    if ($("#f-featured").checked) DATA.featured = v.id; else if (DATA.featured === v.id) DATA.featured = "";
    await save(); for (const u of old) await drop(u);
    closeEditor(); draw(); say("#msg", `"${v.title}" saved. ${ytId(yt) ? "It is live." : "It shows as coming soon."}`, "good");
  } catch (x) { say("#f-msg", x.message, "bad"); }
  $("#save").disabled = false;
};
