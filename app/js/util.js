/* Study Vault — core helpers and icon set. Everything hangs off window.V. */
(function () {
  "use strict";
  const V = window.V = { views: {} };
  const M = window.VaultMarkup;

  V.esc = M.esc;
  V.escAttr = M.escAttr;
  V.$ = (s, el) => (el || document).querySelector(s);
  V.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  V.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  V.debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms); }; };
  V.plural = (n, w, pl) => n + " " + (n === 1 ? w : (pl || w + "s"));
  V.num = n => n.toLocaleString("en-IN");
  V.pct = (a, b) => b ? Math.round(100 * a / b) : 0;

  /* FNV-1a → short stable id for a line's raw text. */
  V.hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };

  /* Local calendar day number (spaced revision works in whole days). */
  const DAY = 86400000;
  V.dayOf = ts => { const d = new Date(ts); return Math.floor((ts - d.getTimezoneOffset() * 60000) / DAY); };
  V.today = () => V.dayOf(Date.now());
  V.dayDate = day => { const utc = new Date(day * DAY); return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()); };
  V.ago = ts => {
    if (!ts) return "never";
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + " min ago"; if (s < 86400) return Math.round(s / 3600) + " h ago";
    const d = V.today() - V.dayOf(ts); if (d === 1) return "yesterday"; if (d < 7) return d + " days ago"; if (d < 30) return Math.round(d / 7) + " wk ago";
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  V.ivl = days => days <= 0 ? "today" : days === 1 ? "1 day" : days < 14 ? days + " days" : days < 60 ? Math.round(days / 7) + " wk" : Math.round(days / 30) + " mo";
  V.ivlShort = days => days <= 0 ? "<1d" : days < 14 ? days + "d" : days < 60 ? Math.round(days / 7) + "w" : Math.round(days / 30) + "mo";
  V.dateLong = ts => new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  /* Search normalisation: lower-case, strip diacritics, unify dashes/quotes, punctuation → space. */
  V.norm = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, "-").replace(/⅓/g, "1/3").replace(/¼/g, "1/4").replace(/½/g, "1/2")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ").trim();

  /* Seeded shuffle for reproducible sessions. */
  V.rng = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; };

  const P = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5v-6h4v6"/>',
    book: '<path d="M2.5 4.5h6a3.5 3.5 0 0 1 3.5 3.5v12.5a2.8 2.8 0 0 0-2.8-2.8H2.5z"/><path d="M21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12.5a2.8 2.8 0 0 1 2.8-2.8h6.7z"/>',
    library: '<path d="M4 4v16M8.5 4v16"/><path d="m13 4.8 4.2-1 3.6 15.4-4.2 1z"/>',
    revise: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20.5V16h-4.5"/>',
    recall: '<rect x="3" y="7.5" width="13.5" height="13" rx="2.2"/><path d="M7.5 3.5h11a2 2 0 0 1 2 2v11"/><path d="M7 14h5.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    chart: '<path d="M3.5 3.5v17h17"/><path d="M8 16.5v-5M12.5 16.5v-9M17 16.5v-3"/>',
    bookmark: '<path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>',
    sliders: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>', up: '<path d="m6 15 6-6 6 6"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>', arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    out: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2z"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16.5V20"/>',
    zap: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3.5 3.5l17 17"/><path d="M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-3 3.9M6.7 6.8C4 8.5 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4.9-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
    download: '<path d="M12 3.5v12M7 10.5l5 5 5-5M5 20.5h14"/>', upload: '<path d="M12 20.5v-12M7 13.5l5-5 5 5M5 3.5h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    filter: '<path d="M3.5 5h17l-6.5 7.8V19l-4 2v-8.2z"/>',
    focus: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    dots: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
    flag: '<path d="M5 21V4h11.5l-1.8 4.2 1.8 4.3H5"/>',
    shuffle: '<path d="M3 7h3.2a4 4 0 0 1 3.3 1.8l4.9 7.4a4 4 0 0 0 3.3 1.8H21M18 15l3 3-3 3M3 17h3.2a4 4 0 0 0 3.3-1.8M14.5 8.8A4 4 0 0 1 17.7 7H21M18 4l3 3-3 3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    image: '<rect x="3" y="4.5" width="18" height="15" rx="2.2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m20.5 16-5-5-10 8.5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5"/><path d="M12 16.8h.01"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>'
  };
  V.icon = (n, cls) => '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || "") + "</svg>";

  /* Tiny progress ring (sheet coverage). */
  V.ring = (frac, color) => {
    const r = 5.5, c = 2 * Math.PI * r, off = c * (1 - V.clamp(frac || 0, 0, 1));
    return '<svg class="ring" viewBox="0 0 14 14" aria-hidden="true"' + (color ? ' style="--subj:' + color + '"' : "") + '><circle class="bg" cx="7" cy="7" r="' + r + '"/>' +
      (frac > 0 ? '<circle class="fg" cx="7" cy="7" r="' + r + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 7 7)"/>' : "") + "</svg>";
  };

  /* Toast with optional action. */
  let toastT;
  V.toast = (msg, action) => {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = "<span>" + V.esc(msg) + "</span>" + (action ? '<button type="button">' + V.esc(action.label) + "</button>" : "");
    if (action) el.querySelector("button").onclick = () => { el.classList.remove("on"); action.run(); };
    requestAnimationFrame(() => el.classList.add("on"));
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), action ? 5000 : 2600);
  };

  /* Anchored popover menu. items: [{label, sub, icon, on, run, head, sep, html}] */
  let openPop = null;
  V.closePop = () => { if (openPop) { openPop.remove(); openPop = null; document.removeEventListener("pointerdown", V._popOutside, true); } };
  V._popOutside = e => { if (openPop && !openPop.contains(e.target) && !(openPop._anchor && openPop._anchor.contains(e.target))) V.closePop(); };
  V.popover = (anchor, build, opts) => {
    if (openPop && openPop._anchor === anchor) { V.closePop(); return; }
    V.closePop();
    const el = document.createElement("div"); el.className = "pop"; el.setAttribute("role", "menu"); el._anchor = anchor;
    if (typeof build === "string") el.innerHTML = build;
    else el.innerHTML = build.map((it, i) => it.sep ? "<hr>" : it.head ? '<div class="ph">' + V.esc(it.head) + "</div>" : it.html ? it.html :
      '<button type="button" class="pi' + (it.on ? " on" : "") + '" data-i="' + i + '" role="menuitem">' + (it.icon ? V.icon(it.icon, "sm") : "") +
      '<span class="grow">' + (it.rich || V.esc(it.label)) + "</span>" + (it.sub ? '<span class="n">' + V.esc(it.sub) + "</span>" : "") + (it.on ? V.icon("check", "sm") : "") + "</button>").join("");
    document.body.appendChild(el); openPop = el;
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let left = (opts && opts.align === "left") ? r.left : r.right - w; left = V.clamp(left, 12, window.innerWidth - w - 12);
    let top = r.bottom + 6; if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 6);
    el.style.left = left + "px"; el.style.top = top + "px";
    if (Array.isArray(build)) el.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const it = build[+b.dataset.i]; if (!(opts && opts.keepOpen)) V.closePop(); it.run && it.run(); });
    setTimeout(() => document.addEventListener("pointerdown", V._popOutside, true));
    const act = el.querySelector(".pi.on") || el.querySelector(".pi"); if (act && opts && opts.focus) act.focus();
    return el;
  };

  V.dialog = (title, html, onMount) => {
    const w = document.createElement("div"); w.className = "dlg-wrap";
    w.innerHTML = '<div class="dlg" role="dialog" aria-modal="true" aria-label="' + V.escAttr(title) + '"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><h2 style="flex:1;margin:0">' + V.esc(title) + '</h2><button class="ibtn" data-close aria-label="Close">' + V.icon("x") + "</button></div>" + html + "</div>";
    const close = () => { w.remove(); document.removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    w.addEventListener("click", e => { if (e.target === w || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(w); if (onMount) onMount(w.querySelector(".dlg"), close);
    return close;
  };

  V.isTyping = e => { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
})();
