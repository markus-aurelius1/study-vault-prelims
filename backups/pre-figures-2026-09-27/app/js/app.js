/* Study Vault — shell: router, navigation, command palette, global keys, boot. */
(function () {
  "use strict";
  const V = window.V, S = V.S, C = V.C, M = window.VaultMarkup;
  const app = { view: null, name: null, params: null, cleanup: null, subj: null };
  V.app = app;

  /* ---------- routing ---------- */
  function parse() {
    const h = decodeURI(location.hash.slice(1) || "/");
    const qi = h.indexOf("?");
    const path = qi < 0 ? h : h.slice(0, qi);
    const q = {}; new URLSearchParams(qi < 0 ? "" : h.slice(qi + 1)).forEach((v, k) => { q[k] = v; });
    const seg = path.split("/").filter(Boolean);
    let name = "dashboard", p = { q };
    if (seg[0] === "subjects") name = "library";
    else if (seg[0] === "s" && seg[1]) { p.subj = seg[1]; if (seg[2]) { name = "reader"; p.sheet = seg[2]; } else name = "subject"; }
    else if (seg[0] === "search") name = "search";
    else if (seg[0] === "revise") name = seg[1] === "session" ? "reviseSession" : "revise";
    else if (seg[0] === "recall") name = seg[1] === "session" ? "drill" : "recall";
    else if (seg[0] === "pyq") name = "pyq";
    else if (seg[0] === "progress") name = "progress";
    else if (seg[0] === "bookmarks") name = "bookmarks";
    else if (seg[0] === "doubts") name = "doubts";
    else if (seg[0] === "cards") name = seg[1] === "session" ? "cardSession" : "cards";
    else if (seg[0] === "settings") name = "settings";
    return { name, p, path };
  }
  V.go = hash => { if (location.hash === hash) route(); else location.hash = hash; };

  function route() {
    const r = parse();
    const view = V.views[r.name] || V.views.dashboard;
    closeDrawer(); V.closePop();
    if (r.p.subj) app.subj = r.p.subj;
    /* same view → let it update in place (e.g. jumping between sections of one sheet) */
    if (app.name === r.name && view.update && view.update(r.p, app.params)) { app.params = r.p; renderNav(); return; }
    if (app.cleanup) { try { app.cleanup(); } catch (e) { console.error(e); } app.cleanup = null; }
    app.name = r.name; app.params = r.p; app.view = view;
    const main = V.$("#view");
    const mode = view.mode || "page";
    document.getElementById("app").classList.toggle("reading", mode !== "page");
    let html;
    try { html = view.render(r.p); } catch (e) { console.error(e); html = '<div class="page"><h1 class="h1">Something went wrong</h1><p class="lede">' + V.esc(e.message) + '</p><p><a href="#/">Back to dashboard</a></p></div>'; }
    main.innerHTML = '<div class="view-enter">' + html + "</div>";
    main.firstChild.addEventListener("animationend", e => { if (e.target === main.firstChild) main.firstChild.classList.remove("view-enter"); }, { once: true });
    document.title = (view.title ? view.title(r.p) + " · " : "") + "Study Vault";
    V.$("#topbar-title").textContent = view.title ? view.title(r.p) : "Study Vault";
    if (!r.p.q.at && !r.p.q.resume) window.scrollTo(0, 0);
    try { app.cleanup = view.mount ? view.mount(main.firstChild, r.p) : null; } catch (e) { console.error(e); }
    renderNav();
  }
  V.rerender = () => { app.name = null; route(); };

  /* ---------- navigation ---------- */
  const NAV = [
    ["#/", "home", "Dashboard", "dashboard"], ["#/revise", "revise", "Revision", "revise"], ["#/recall", "recall", "Recall", "recall"],
    ["#/pyq", "target", "PYQ explorer", "pyq"], ["#/search", "search", "Search", "search"], ["#/progress", "chart", "Progress", "progress"],
    ["#/bookmarks", "bookmark", "Bookmarks", "bookmarks"], ["#/doubts", "question", "Doubts", "doubts"]
  ];
  function renderNav() {
    const nav = V.$("#nav-scroll"); if (!nav) return;
    const cur = app.name, due = S.dueKeys().filter(k => C.secByKey[k]).length, cardsDue = S.dueCards().length;
    const activeFor = n => cur === n || (n === "revise" && cur === "reviseSession") || (n === "recall" && (cur === "drill" || cur === "cards" || cur === "cardSession"));
    let h = NAV.map(([href, ic, label, n]) => '<a class="nav-link' + (activeFor(n) ? " on" : "") + '" href="' + href + '">' + V.icon(ic) + "<span>" + label + "</span>" +
      (n === "revise" && due ? '<span class="badge hot">' + due + "</span>" : n === "recall" && cardsDue ? '<span class="badge" title="Your cards due">' + cardsDue + "</span>" : n === "bookmarks" && Object.keys(S.progress.bookmarks).length ? '<span class="badge">' + Object.keys(S.progress.bookmarks).length + "</span>" :
        n === "doubts" && Object.keys(S.doubts).length ? '<span class="badge">' + Object.keys(S.doubts).length + "</span>" : "") + "</a>").join("");
    h += '<div class="nav-sec">Subjects<a href="#/subjects" style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600">All</a></div>';
    const open = app.subj || (S.progress.last && S.progress.last.k && S.progress.last.k.split("/")[0]) || (C.subjects[0] && C.subjects[0].id);
    C.subjects.forEach(s => {
      const onSubj = (cur === "subject" || cur === "reader") && app.params.subj === s.id;
      const sd = C.subjectProgress(s).due;
      h += '<a class="nav-subj' + (onSubj && cur === "subject" ? " on" : "") + '" href="#/s/' + s.id + '" style="--subj:' + s.accent + '"><span class="dot"></span><span style="flex:1">' + V.esc(s.name) + "</span>" + (sd ? '<span class="badge">' + sd + "</span>" : "") + "</a>";
      if (s.id === open) {
        h += '<div class="nav-tree" style="--subj:' + s.accent + '">';
        s.groups.forEach(g => {
          h += '<div class="nav-grp">' + V.esc(g.label) + "</div>";
          g.sheets.forEach(id => {
            const sh = s.sheetById[id]; if (!sh) return;
            const pr = C.sheetProgress(sh), on = cur === "reader" && app.params.subj === s.id && app.params.sheet === sh.id;
            h += '<a class="nav-sheet' + (on ? " on" : "") + '" href="' + C.sheetHref(sh) + '" title="' + V.escAttr(sh.title) + '"><span class="n">' + String(sh.num).padStart(2, "0") + '</span><span class="t">' + V.esc(sh.tab) + "</span>" +
              (pr.total ? V.ring(pr.read / pr.total) : "") + "</a>";
          });
        });
        h += "</div>";
      }
    });
    if (!C.subjects.length) h += '<div class="empty" style="padding:8px 10px">No subjects yet — see Settings › Library.</div>';
    nav.innerHTML = h;
    const sl = V.$("#nav-settings"); if (sl) sl.classList.toggle("on", cur === "settings");
    const tb = V.$("#theme-btn"); if (tb) tb.innerHTML = V.icon(themeIcon());
  }
  V.renderNav = renderNav;
  const themeIcon = () => ({ auto: "monitor", light: "sun", dark: "moon" })[S.settings.theme] || "monitor";
  V.cycleTheme = () => { const order = ["auto", "light", "dark"]; const n = order[(order.indexOf(S.settings.theme) + 1) % 3]; S.set("theme", n); renderNav(); V.toast("Theme: " + ({ auto: "follow system", light: "light", dark: "dark" })[n]); };

  const drawerMQ = window.matchMedia("(max-width: 1023px)");
  function applyDrawerMode() {
    document.getElementById("app").classList.toggle("drawer-mode", drawerMQ.matches);
    document.getElementById("app").classList.toggle("nav-pinned", !!S.settings.pinNav && !drawerMQ.matches);
  }
  V.applyDrawerMode = applyDrawerMode;
  function openDrawer() { document.getElementById("app").classList.add("nav-open"); const f = V.$("#nav .nav-link.on, #nav .nav-sheet.on, #nav .nav-link"); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50); }
  function closeDrawer() { document.getElementById("app").classList.remove("nav-open"); }
  V.toggleDrawer = () => { const a = document.getElementById("app"); if (a.classList.contains("nav-open")) closeDrawer(); else openDrawer(); };
  V.closeDrawer = closeDrawer;

  /* ---------- command palette ---------- */
  const ACTIONS = [
    { t: "Go to Dashboard", k: "dashboard home", ic: "home", run: () => V.go("#/") },
    { t: "Start revision (due sections)", k: "revision review due spaced", ic: "revise", run: () => V.go("#/revise/session") },
    { t: "Mixed recall — interleaved prompts", k: "recall drill quiz interleaved mixed", ic: "shuffle", run: () => V.go("#/recall/session?preset=mix") },
    { t: "Trap drill", k: "trap drill wrong option", ic: "flag", run: () => V.go("#/recall/session?preset=trap") },
    { t: "Weak areas drill", k: "weak missed drill", ic: "target", run: () => V.go("#/recall/session?preset=weak") },
    { t: "PYQ explorer", k: "pyq exam year cse uppcs cds capf filter", ic: "target", run: () => V.go("#/pyq") },
    { t: "Progress & history", k: "progress history stats", ic: "chart", run: () => V.go("#/progress") },
    { t: "Bookmarks", k: "bookmarks saved", ic: "bookmark", run: () => V.go("#/bookmarks") },
    { t: "Doubts", k: "doubts flagged unsure questions", ic: "question", run: () => V.go("#/doubts") },
    { t: "My cards", k: "cards my own flashcards written review", ic: "pen", run: () => V.go("#/cards") },
    { t: "All subjects", k: "subjects library", ic: "library", run: () => V.go("#/subjects") },
    { t: "Settings", k: "settings preferences font size", ic: "sliders", run: () => V.go("#/settings") },
    { t: "Toggle theme (auto → light → dark)", k: "theme dark light mode", ic: "moon", run: () => V.cycleTheme() },
    { t: "Keyboard shortcuts", k: "keyboard shortcuts help keys", ic: "keyboard", run: () => V.shortcuts() }
  ];
  let cp = null;
  V.palette = (initial) => {
    if (cp) { closePalette(); return; }
    V.closePop();
    const w = document.createElement("div"); w.className = "cp-wrap";
    w.innerHTML = '<div class="cp" role="dialog" aria-label="Search and jump"><div class="cp-in">' + V.icon("search", "lg") +
      '<input type="text" placeholder="Search notes, jump to a sheet or section, run an action…" aria-label="Search" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div><div class="cp-res" role="listbox"></div>' +
      '<div class="cp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Ctrl</kbd><kbd>Enter</kbd> all results</span><span style="margin-left:auto">Tip: try an Article number, a name or a year</span></div></div>';
    document.body.appendChild(w); cp = { w, items: [], act: 0 };
    const input = w.querySelector("input"), res = w.querySelector(".cp-res");
    const draw = () => {
      const q = input.value.trim(); const items = []; let h = "";
      const group = (title, arr) => { if (!arr.length) return; h += '<div class="cp-g">' + title + "</div>"; arr.forEach(it => { h += '<div class="cp-i" role="option" data-i="' + items.length + '"><span class="ic">' + V.icon(it.ic || "arrowR", "sm") + '</span><span class="tx"><div class="' + (it.long ? "t3" : "t1") + '">' + it.html + "</div>" + (it.sub ? '<div class="t2">' + it.sub + "</div>" : "") + "</span></div>"; items.push(it); }); };
      if (!q) {
        const last = S.progress.last, lsh = last && C.sheetByKey[last.k];
        if (lsh) group("Continue", [{ ic: "book", html: V.esc(lsh.title), sub: V.esc(lsh.subj.name + (last.b && C.secByKey[lsh.key + "/" + last.b] ? " › " + C.secByKey[lsh.key + "/" + last.b].hPlain : "")), run: () => V.go(C.sheetHref(lsh, "resume=1")) }]);
        group("Recent sheets", S.progress.recent.map(k => C.sheetByKey[k]).filter(Boolean).filter(sh => !lsh || sh !== lsh).slice(0, 5).map(sh => ({ ic: "layers", html: V.esc(sh.title), sub: V.esc(sh.subj.name), run: () => V.go(C.sheetHref(sh)) })));
        group("Actions", ACTIONS.slice(1, 6).map(a => ({ ic: a.ic, html: V.esc(a.t), run: a.run })));
      } else {
        const r = C.search(q, null, 8);
        const nq = V.norm(q);
        const acts = ACTIONS.filter(a => nq.split(" ").every(t => V.norm(a.t + " " + a.k).indexOf(t) >= 0)).slice(0, 3);
        group("Go to", r.nav.slice(0, 7).map(n => n.type === "subject" ? { ic: "library", html: C.mark(V.esc(n.subj.name), r.toks), sub: "Subject", run: () => V.go("#/s/" + n.subj.id) }
          : n.type === "sheet" ? { ic: "layers", html: C.mark(V.esc(n.sheet.title), r.toks), sub: V.esc(n.sheet.subj.name + " · sheet " + String(n.sheet.num).padStart(2, "0")), run: () => V.go(C.sheetHref(n.sheet)) }
            : { ic: "list", html: C.mark(V.esc(n.sec.hPlain), r.toks), sub: V.esc(n.sec.subj.name + " › " + n.sec.sheet.tab), run: () => V.go(C.secHref(n.sec)) }));
        group("Notes" + (r.total ? " · " + r.total + " match" + (r.total === 1 ? "" : "es") : ""), r.lines.slice(0, 8).map(ln => ({ ic: ln.trap ? "flag" : "arrowR", long: true, html: C.mark(V.esc(ln.plain), r.toks), sub: V.esc(C.crumb(ln.sec)), run: () => V.go(C.lineHref(ln)) })));
        group("Actions", acts.map(a => ({ ic: a.ic, html: V.esc(a.t), run: a.run })));
        if (r.total > 8) group("", [{ ic: "search", html: "See all " + r.total + " results for “" + V.esc(q) + "”", run: () => V.go("#/search?q=" + encodeURIComponent(q)) }]);
        if (!items.length) h = '<div class="empty" style="padding:22px 16px">Nothing matches “' + V.esc(q) + '”. Try an Article number (e.g. <b>280</b>), a name, or a year.</div>';
      }
      res.innerHTML = h; cp.items = items; cp.act = 0; hl();
    };
    const hl = () => { V.$$(".cp-i", res).forEach((el, i) => { el.classList.toggle("act", i === cp.act); if (i === cp.act) el.scrollIntoView({ block: "nearest" }); }); };
    const choose = i => { const it = cp.items[i]; if (!it) return; closePalette(); it.run(); };
    input.addEventListener("input", V.debounce(draw, 40));
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); cp.act = Math.min(cp.items.length - 1, cp.act + 1); hl(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cp.act = Math.max(0, cp.act - 1); hl(); }
      else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); const q = input.value.trim(); closePalette(); V.go("#/search?q=" + encodeURIComponent(q)); }
      else if (e.key === "Enter") { e.preventDefault(); choose(cp.act); }
      else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    });
    res.addEventListener("click", e => { const el = e.target.closest(".cp-i"); if (el) choose(+el.dataset.i); });
    res.addEventListener("mousemove", e => { const el = e.target.closest(".cp-i"); if (el && +el.dataset.i !== cp.act) { cp.act = +el.dataset.i; hl(); } });
    w.addEventListener("pointerdown", e => { if (e.target === w) closePalette(); });
    if (initial) input.value = initial;
    draw(); input.focus();
  };
  function closePalette() { if (cp) { cp.w.remove(); cp = null; } }
  V.closePalette = closePalette;

  /* ---------- shortcuts ---------- */
  const KEYS = [
    ["Ctrl K  or  /", "Search & jump (command palette)"], ["?", "This list"], ["m", "Open / close navigation"],
    ["j / k", "Next / previous section"], ["[ / ]", "Previous / next sheet"], ["o", "Jump to section"],
    ["r", "Toggle Read / Recall"], ["h", "High-yield lines only"], ["b", "Bookmark current section"], ["d", "Flag a doubt on current section"],
    ["t", "Show / hide section outline"], ["f", "Focus mode (hide the bar while scrolling)"],
    ["Space", "Recall: reveal next hidden answer"], ["a", "Recall: reveal all in section"], ["1 – 4", "Rate: Again · Hard · Good · Easy"]
  ];
  V.KEYS = KEYS;
  V.shortcuts = () => V.dialog("Keyboard shortcuts", '<div class="kbd-grid">' + KEYS.map(k => "<div><span>" + V.esc(k[1]) + "</span><span>" + k[0].split(/\s{2}or\s{2}| \/ | – /).map(x => "<kbd>" + V.esc(x) + "</kbd>").join(" ") + "</span></div>").join("") + "</div>");

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); V.palette(); return; }
    if (e.key === "Escape") { V.closePop(); closeDrawer(); return; }
    if (cp || V.isTyping(e) || e.ctrlKey || e.metaKey || e.altKey || V.$(".dlg-wrap")) return;
    if (e.key === "/") { e.preventDefault(); V.palette(); return; }
    if (e.key === "?") { e.preventDefault(); V.shortcuts(); return; }
    if (e.key === "m") { e.preventDefault(); V.toggleDrawer(); return; }
    if (app.view && app.view.key) app.view.key(e);
  });

  /* ---------- boot ---------- */
  function shell() {
    document.body.innerHTML =
      '<div id="app" class="app">' +
      '<aside id="nav" class="nav" aria-label="Main navigation">' +
      '<div class="nav-head"><a class="brand" href="#/"><span class="brand-mark">S</span><span>Study Vault</span></a><button class="ibtn" data-act="close-nav" aria-label="Close navigation" title="Close (m)">' + V.icon("x") + "</button></div>" +
      '<button class="nav-search" data-act="palette">' + V.icon("search", "sm") + "<span>Search or jump to…</span><kbd>Ctrl K</kbd></button>" +
      '<div class="nav-scroll" id="nav-scroll"></div>' +
      '<div class="nav-foot"><a class="nav-link" id="nav-settings" href="#/settings" style="flex:1">' + V.icon("sliders") + "<span>Settings</span></a>" +
      '<button class="ibtn" id="theme-btn" data-act="theme" aria-label="Change theme" title="Theme: auto / light / dark"></button></div></aside>' +
      '<div class="scrim" data-act="close-nav"></div>' +
      '<div class="main"><header class="topbar"><button class="ibtn" data-act="open-nav" aria-label="Open navigation">' + V.icon("menu") + '</button><span class="ttl" id="topbar-title"></span><button class="ibtn" data-act="palette" aria-label="Search">' + V.icon("search") + "</button></header>" +
      '<main id="view"></main></div></div>';
    document.body.addEventListener("click", e => {
      const a = e.target.closest("[data-act]"); if (!a) return;
      const act = a.dataset.act;
      if (act === "palette") { e.preventDefault(); closeDrawer(); V.palette(); }
      else if (act === "open-nav") { e.preventDefault(); openDrawer(); }
      else if (act === "close-nav") { e.preventDefault(); closeDrawer(); }
      else if (act === "theme") { e.preventDefault(); V.cycleTheme(); }
    });
    V.$("#nav").addEventListener("click", e => { if (e.target.closest("a[href]")) closeDrawer(); });
  }

  function boot() {
    S.applySettings();
    C.init();
    shell(); applyDrawerMode();
    drawerMQ.addEventListener("change", applyDrawerMode);
    window.addEventListener("hashchange", route);
    S.on("srs", V.debounce(() => { if (V.app.name !== "reader") renderNav(); }, 200));
    route();
  }

  /* data files are listed in data/manifest.js and loaded as classic scripts (works from file://) */
  function load() {
    const list = (window.VAULT_MANIFEST && window.VAULT_MANIFEST.subjects) || [];
    let left = list.length; if (!left) return boot();
    const done = () => { if (--left === 0) boot(); };
    list.forEach(s => {
      const el = document.createElement("script"); el.src = s.file + "?v=" + (s.sha256 || "").slice(0, 8);
      el.onerror = () => console.error("Study Vault: could not load " + s.file + " — run the build (Build Vault.cmd).");
      el.addEventListener("load", done); el.addEventListener("error", done);
      document.head.appendChild(el);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
