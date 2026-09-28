/* Study Vault — the reader. Notes are rendered exactly as authored; everything else here is
   navigation, filtering (hide/show whole lines) and recall (blur/reveal spans).            */
(function () {
  "use strict";
  const V = window.V, S = V.S, C = V.C, M = window.VaultMarkup, R = window.VaultRender;
  const LABEL = ["", "Again", "Hard", "Good", "Easy"];
  const STATE_T = { none: "Not read yet", read: "Read — first review is scheduled", due: "Due for revision", ok: "Reviewed — not due", weak: "Weak — often missed" };
  const HL_CAP = 15;   /* highlights per sheet: few enough that each one has to earn its place */
  let st = null;

  const view = V.views.reader = { mode: "reading" };
  view.title = p => { const sh = C.sheet(p.subj, p.sheet); return sh ? sh.tab + " · " + sh.subj.name : "Not found"; };

  const isNotes = sh => sh.type === "notes";
  const recallOn = () => S.settings.recall && st && isNotes(st.sh);
  /* pretest: an unread section opens blurred once per visit (read mode only; recall mode already hides everything) */
  const preOn = sec => S.settings.pretestNew && !sec.ref && !recallOn() && !st.preOff && !st.pre[sec.id] && !S.isRead(sec.key);
  const filterOf = sh => { const f = S.settings.filter; return isNotes(sh) && (f.hy || f.exam) ? { hy: f.hy, exam: f.exam } : null; };
  const barH = () => (st && st.bar ? st.bar.offsetHeight : 56);

  /* ---------- render ---------- */
  view.render = p => {
    const sh = C.sheet(p.subj, p.sheet);
    if (!sh) return '<div class="page"><div class="eyebrow">Not found</div><h1 class="h1">No such sheet</h1><p class="lede">It may have been renamed in a newer version of the notes. <a href="#/s/' + V.esc(p.subj) + '">Open the subject</a> or search with <kbd>Ctrl K</kbd>.</p></div>';
    if (p.q.hy || p.q.exam != null) { S.settings.filter = { hy: p.q.hy === "1", exam: p.q.exam || "" }; S.set("filter", S.settings.filter); }
    st = { sh, open: {}, dwell: {}, undo: {}, cur: null, pre: {}, preOff: false };
    if (p.q.at && p.q.l) st.pre[p.q.at] = true;   /* arriving at a specific line (search, "open in notes"): show it */
    const s = S.settings;
    return '<div class="reader' + (recallOn() ? " recall" : "") + (s.outline ? " show-outline" : "") + (s.focus ? " focus" : "") + '" style="--subj:' + sh.subj.accent + '">' +
      barHTML(sh) + '<div class="rwrap"><article class="sheet" id="sheet">' + sheetInner(sh) + '</article><aside class="outline" id="outline" aria-label="Sections on this sheet"></aside></div></div>';
  };

  function barHTML(sh) {
    const subj = sh.subj;
    return '<header class="rbar" id="rbar"><button class="ibtn" data-act="nav" aria-label="Open navigation" title="Navigation (m)">' + V.icon("menu") + "</button>" +
      '<nav class="crumbs" aria-label="Breadcrumb"><a class="c-subj" href="#/s/' + subj.id + '"><span class="dot"></span>' + V.esc(subj.name) + '</a><span class="sep s1">' + V.icon("right", "sm") + "</span>" +
      '<button class="c-sheet" data-act="sheets" title="Switch sheet">' + V.esc(sh.tab) + '</button><span class="sep">' + V.icon("right", "sm") + "</span>" +
      '<button class="c-sec" data-act="outline" title="Jump to section (o)"><span class="c-stack"><small class="c-mini">' + V.esc(sh.tab) + '</small><span id="cur-sec">' + (isNotes(sh) && sh.sections[0] ? V.esc(sh.sections[0].hPlain) : "Overview") + "</span></span>" + V.icon("down", "sm") + "</button></nav>" +
      '<div class="rbar-tools">' +
      '<div class="rbar-nav wide-only"><button class="ibtn" data-act="prev-sec" aria-label="Previous section" title="Previous section (k)">' + V.icon("up") + '</button><button class="ibtn" data-act="next-sec" aria-label="Next section" title="Next section (j)">' + V.icon("down") + "</button></div>" +
      (isNotes(sh) ? '<div class="seg" role="group" aria-label="Mode"><button data-act="mode-read" aria-pressed="' + !recallOn() + '" title="Read (r)">' + V.icon("book", "sm") + '<span class="wide-only">Read</span></button><button data-act="mode-recall" aria-pressed="' + recallOn() + '" title="Recall: hide answers (r)">' + V.icon("eyeOff", "sm") + '<span class="wide-only">Recall</span></button></div>' +
        '<button class="ibtn" data-act="filter" id="filter-btn" aria-label="Filter lines" title="High-yield & exam filter (h)">' + V.icon("filter") + (filterOf(sh) ? '<span class="pip"></span>' : "") + "</button>" : "") +
      '<button class="ibtn" data-act="search" aria-label="Search" title="Search (Ctrl K)">' + V.icon("search") + "</button>" +
      '<button class="ibtn" data-act="display" aria-label="Display settings" title="Text & display">' + '<span style="font-family:var(--f-title);font-weight:650;font-size:16px">Aa</span>' + "</button></div>" +
      '<div class="rprog" aria-hidden="true"><i id="rprog"></i></div></header>';
  }

  function sheetInner(sh) {
    const subj = sh.subj, s = S.settings, f = filterOf(sh);
    const pr = C.sheetProgress(sh);
    let h = '<header class="sheet-head"><div class="sheet-meta"><span class="dot"></span><span>' + V.esc(subj.name) + " · " + V.esc(sh.group || "") + " · Sheet " + String(sh.num).padStart(2, "0") + " of " + subj.sheets.length + '</span><span class="pri ' + sh.pri + '" title="Priority ' + sh.pri.slice(1) + ' (from the notes)">' + sh.pri.toUpperCase() + "</span></div>" +
      '<h1 class="sheet-title">' + V.esc(sh.title) + "</h1>" + (sh.note ? '<p class="sheet-note">' + (sh.noteHTML || sh.subj.M.fmt(sh.note)) + "</p>" : "") +
      (sh.stats && sh.stats.length ? '<ul class="sheet-statlist" aria-label="Exam statistics from the notes">' + sh.stats.map(x => "<li>" + sh.subj.M.fmt(x) + "</li>").join("") + "</ul>" : "");
    if (isNotes(sh)) {
      h += '<div class="sheet-stats"><span><b>' + pr.total + "</b> sections · <b>" + V.num(sh.lineCount) + "</b> lines" + (sh.figures ? " · <b>" + sh.figures + "</b> figure" + (sh.figures === 1 ? "" : "s") : "") + '</span><span style="display:inline-flex;align-items:center;gap:8px"><span class="meter" title="Sections read"><i style="width:' + V.pct(pr.read, pr.total) + '%"></i></span>' + pr.read + "/" + pr.total + " read</span>" +
        (pr.due ? '<a href="#/revise/session?sheet=' + encodeURIComponent(sh.key) + '"><b style="color:inherit">' + pr.due + "</b> due · revise</a>" : "") +
        '<a href="#/recall/session?preset=sheet&sheet=' + encodeURIComponent(sh.key) + '">Drill this sheet</a><button class="lnk hl-count" data-act="hl-list" hidden></button></div>';
    } else h += '<div class="sheet-stats"><span>Reference sheet from the notes — searchable, not scheduled for revision.</span></div>';
    if (subj.legendHTML && isNotes(sh)) h += '<details class="legend-wrap"><summary>' + V.icon("right", "sm") + "Key to marks & exam tags</summary>" + subj.legendHTML + "</details>";
    h += "</header>";

    if (!isNotes(sh)) return h + '<div class="legacy">' + sh.html + "</div>" + endNav(sh);

    let secs = "", shown = 0;
    sh.sections.forEach(sec => {
      if (f && f.hy && sec.kind === "support") return;
      const keep = f ? (k, i) => C.lineMatch(sec.byLid[k + i], f) : null;
      const body = R.blockBody(sec.block, { keep, pref: s.listPref, hide: tableHide(sec), M: subj.M });
      if (!body) return;
      const n = f ? sec.lines.filter(l => C.lineMatch(l, f)).length : sec.lines.length;
      shown += n; secs += sectionHTML(sec, body, n);
    });
    if (f) {
      const parts = []; if (f.hy) parts.push("high-yield (PYQ-tagged, traps & highlights)"); if (f.exam) parts.push("tested in " + M.EXAMS.find(x => x.id === f.exam).label);
      h += '<div class="notice">' + V.icon("filter", "sm") + '<span class="grow">Showing <b>' + shown + "</b> of " + sh.lineCount + " lines · " + parts.join(" · ") + '</span><button class="lnk" data-act="clear-filter">Show everything</button></div>';
    }
    if (recallOn()) h += '<div class="notice recall">' + V.icon("eyeOff", "sm") + '<span class="grow"><b>Recall mode.</b> Think first — then click a blurred answer or press <kbd>Space</kbd>. Rate each section when you finish it.</span><button class="lnk" data-act="mode-read">Back to reading</button></div>';
    h += secs || '<div class="empty">No lines on this sheet match the filter. <button class="lnk" data-act="clear-filter">Show everything</button></div>';
    return h + endNav(sh);
  }

  function tableHide(sec) { const m = st.open["h:" + sec.id] || S.settings.tableHide; const n = sec.block.cols ? sec.block.cols.length : 0; return m === "first" || m === "answers" || (m && +m.slice(1) < n) ? m : "answers"; }
  function isOpen(sec) { const o = st.open[sec.id]; return o == null ? sec.kind !== "support" : o; }

  function sectionHTML(sec, body, n) {
    const state = S.state(sec.key), open = isOpen(sec), bm = S.isBookmarked(sec.key), dq = S.isDoubted(sec.key);
    const tier = sec.block.tier;
    let meta = (tier ? '<span class="tier t' + tier + '" title="Priority ' + tier + ' (from the notes)">P' + tier + "</span>" : "") +
      (sec.kind === "trap" ? '<span class="kbadge trap">Traps</span>' : sec.kind === "support" ? '<span class="kbadge support">Support</span>' : "") +
      (sec.fig ? '<span class="kbadge fig" title="' + (sec.ref ? "A figure from the notes — always visible, not scheduled for revision" : "This section has a figure — it stays visible in Recall") + '">Figure</span>' : "");
    const nTags = sec.lines.reduce((a, l) => a + l.tags.length, 0);
    if (nTags) meta += '<span class="bc wide-only" title="PYQ tags in this section">' + nTags + " tag" + (nTags === 1 ? "" : "s") + "</span>";
    if (recallOn() && sec.block.rows && sec.block.cols.length > 1) {
      const cur = tableHide(sec);
      meta += '<select class="select hidesel" data-act="hide" aria-label="What to hide in this table" title="What to hide">' +
        '<option value="answers"' + (cur === "answers" ? " selected" : "") + ">Hide answers</option>" +
        sec.block.cols.map((c, k) => { const v = k === 0 ? "first" : "c" + k; return '<option value="' + v + '"' + (cur === v ? " selected" : "") + ">Hide " + V.esc(M.plain(c)) + (k === 0 ? " (reverse)" : " only") + "</option>"; }).join("") + "</select>";
    }
    /* a figure-only section has no lines to count, read or rate */
    meta += (sec.ref ? "" : '<span class="sec-n" title="' + n + ' lines">' + n + '</span><span class="st ' + state + '" title="' + STATE_T[state] + '"></span>') +
      '<button class="ibtn bm' + (bm ? " on" : "") + '" data-act="bm" aria-pressed="' + bm + '" aria-label="Bookmark section" title="Bookmark (b)">' + V.icon("bookmark", "sm") + "</button>" +
      '<button class="ibtn bm dq' + (dq ? " on" : "") + '" data-act="doubt" aria-pressed="' + dq + '" aria-label="Flag a doubt" title="Doubt (d)">' + V.icon("question", "sm") + "</button>";
    const nOpen = st.open["n:" + sec.id], pre = preOn(sec);
    return '<section class="sec k-' + sec.kind + (open ? "" : " collapsed") + (pre ? " pre recall" : "") + '" id="sec-' + sec.id + '" data-id="' + sec.id + '">' +
      '<header class="sec-head"><button class="sec-toggle" data-act="toggle" aria-expanded="' + open + '">' + V.icon("down", "sm chev") + '<h2 class="sec-h">' + sec.subj.M.fmt(sec.h) + "</h2></button>" +
      '<div class="sec-meta">' + meta + "</div></header>" +
      (pre ? '<div class="notice pre-bar">' + V.icon("eyeOff", "sm") + '<span class="grow"><b>Try it first, then read.</b> Recall what you can, then click a blurred answer to check it.</span><button class="btn sm" data-act="pre-reveal">' + V.icon("eye", "sm") + 'Reveal</button><button class="lnk" data-act="pre-skip" title="Show every section on this sheet without the pretest">Just show me the notes</button></div>' : "") +
      '<div class="sec-body">' + body + "</div>" + (recallOn() && !sec.ref ? '<footer class="sec-rate">' + rateButtons(sec.key) + "</footer>" : "") +
      V.noteBox(sec.key, nOpen == null ? !!S.noteOf(sec.key) : nOpen, cardBtn(sec.key)) + "</section>";
  }
  function cardBtn(key) {
    const n = Object.keys(S.cards).filter(id => S.cards[id].sectionKey === key).length;
    return '<button class="mynote-t" data-act="card" title="Write your own prompt and answer from a line (click the line first)">' + V.icon("plus", "sm") + "<span>Write a card</span><small>" + (n ? V.plural(n, "card") : "") + "</small></button>";
  }

  /* ---------- the student's own notes (shared with drill prompts) ---------- */
  V.noteBox = (key, open, extra) => {
    const n = S.notes[key];
    return '<div class="mynote' + (open ? " open" : "") + '"><div class="mynote-bar"><button class="mynote-t" data-act="note" aria-expanded="' + open + '">' + V.icon("pen", "sm") + "<span>My notes</span><small>" + (n ? V.ago(n.updatedAt) : "") + "</small></button>" + (extra || "") + "</div>" +
      '<textarea class="mynote-x" data-note="' + V.escAttr(key) + '" rows="3" aria-label="My notes on this section" placeholder="In your own words — a doubt, a link to another topic, a mnemonic. Only you see this."' + (open ? "" : " hidden") + ">" + V.esc(n ? n.text : "") + "</textarea></div>";
  };
  V.toggleNote = btn => {
    const box = btn.closest(".mynote"), ta = V.$("textarea", box), open = ta.hidden;
    ta.hidden = !open; box.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open));
    if (open) ta.focus();
    return open;
  };
  document.addEventListener("input", e => {
    const t = e.target; if (!t.matches || !t.matches("textarea[data-note]")) return;
    S.setNote(t.dataset.note, t.value);
    const sm = V.$('[data-act="note"] small', t.closest(".mynote")); if (sm) sm.textContent = t.value.trim() ? "saved" : "";
  });
  function rateButtons(key) {
    const pv = S.preview(key);
    return '<span class="lbl">How well did you recall this section?</span><div class="rates">' +
      [1, 2, 3, 4].map(r => '<button class="rate r' + r + '" data-act="rate" data-r="' + r + '" title="' + LABEL[r] + " — next review " + (pv[r - 1] ? "in " + V.ivl(pv[r - 1]) : "later today") + '"><kbd>' + r + "</kbd>" + LABEL[r] + "<small>" + (pv[r - 1] ? V.ivlShort(pv[r - 1]) : "today") + "</small></button>").join("") +
      '</div><button class="btn ghost sm" data-act="reveal-all">' + V.icon("eye", "sm") + "Reveal all</button>";
  }
  function endNav(sh) {
    const nb = C.neighbours(sh);
    return '<nav class="sheet-end" aria-label="Sheets">' +
      (nb.prev ? '<a class="prev" href="' + C.sheetHref(nb.prev) + '"><small>' + V.icon("arrowL", "sm") + "Previous · [</small><span class=\"t\">" + V.esc(nb.prev.title) + "</span></a>" : "<span></span>") +
      (nb.next ? '<a class="next" href="' + C.sheetHref(nb.next) + '"><small>Next · ]' + V.icon("arrowR", "sm") + '</small><span class="t">' + V.esc(nb.next.title) + "</span></a>" : "") + "</nav>";
  }

  /* ---------- after each render ---------- */
  function afterRender() {
    const sh = st.sh;
    st.sheetEl = V.$("#sheet", st.root);
    if (!isNotes(sh)) {
      const leg = V.$(".legacy", st.sheetEl);
      V.$$(C.LINE_SEL, leg).forEach((el, i) => { el.dataset.l = "h" + i; });
      V.$$(".block", leg).forEach((el, k) => { el.id = "sec-h" + k; el.dataset.id = "h" + k; el.classList.add("lsec"); });
      wireChecklist(leg);
    } else {
      V.$$(".sec", st.sheetEl).forEach(el => {
        const b = V.$(".src-html", el); if (b) V.$$(C.LINE_SEL, b).forEach((x, k) => { x.dataset.l = "x" + k; });
        const tw = V.$(".tw", el); const sec = C.secByKey[sh.key + "/" + el.dataset.id];
        if (tw && sec && sec.block.cols && sec.block.cols.length >= 4) tw.classList.add("wide");
      });
      if (recallOn()) { V.markHidden(st.sheetEl); V.$$(".sec", st.sheetEl).forEach(markNext); }
      else V.$$(".sec.pre", st.sheetEl).forEach(el => { V.markHidden(V.$(".sec-body", el)); if (V.$(".hid", el)) markNext(el); else endPre(el); });
      paintHL();
    }
    st.secEls = V.$$(".sec, .lsec", st.sheetEl);
    renderOutline();
  }

  function wireChecklist(root) {
    const boxes = V.$$(".check input[data-i]", root); if (!boxes.length) return;
    const saved = S.checks[st.sh.key] || {};
    const upd = () => { const n = boxes.filter(b => b.checked).length; const bar = V.$("#ckbar", root); if (bar) bar.style.width = (100 * n / boxes.length) + "%"; const c = V.$("#ckc", root); if (c) c.textContent = n + " of " + boxes.length + " done"; };
    boxes.forEach(b => { b.checked = !!saved[b.dataset.i]; b.addEventListener("change", () => { S.check(st.sh.key, b.dataset.i, b.checked); upd(); }); });
    upd();
  }

  function renderOutline() {
    const o = V.$("#outline", st.root); if (!o) return;
    const secs = st.secEls.map(el => ({ el, sec: C.secByKey[st.sh.key + "/" + el.dataset.id] })).filter(x => x.sec);
    o.innerHTML = "<h4>On this sheet</h4>" + secs.map(x => '<a href="#" data-go="' + x.sec.id + '"' + (st.cur === x.el ? ' class="on"' : "") + "><span>" + V.esc(x.sec.hPlain) + "</span>" +
      (x.sec.ref ? "" : '<span class="st ' + S.state(x.sec.key) + '"></span>') + "</a>").join("");
  }

  /* ---------- position ---------- */
  function currentSec() { return st.cur || st.secEls[0] || null; }
  function secKeyOf(el) { return st.sh.key + "/" + el.dataset.id; }
  function expand(el) {
    if (!el.classList.contains("collapsed")) return;
    el.classList.remove("collapsed"); st.open[el.dataset.id] = true;
    const t = V.$(".sec-toggle", el); if (t) t.setAttribute("aria-expanded", "true");
  }
  function flash(el) { if (!el) return; el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }

  function scrollToSection(id, lid, smooth, offset) {
    let el = V.$("#sec-" + CSS.escape(id), st.sheetEl);
    if (!el && filterOf(st.sh)) { clearFilter(true); el = V.$("#sec-" + CSS.escape(id), st.sheetEl); }
    if (!el) return false;
    if (el.tagName === "DETAILS") el.open = true;
    expand(el);
    let target = el, line = null;
    if (lid) {
      line = V.$('[data-l="' + CSS.escape(lid) + '"]', el);
      if (!line && filterOf(st.sh)) { clearFilter(true); return scrollToSection(id, lid, smooth, offset); }
      if (line) target = line;
      if (el.classList.contains("pre")) endPre(el);
    }
    const y = target.getBoundingClientRect().top + window.scrollY - barH() - (line ? Math.min(160, window.innerHeight * 0.22) : 10) + (offset || 0);
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
    if (line) flash(line); else if (!offset) flash(V.$(".sec-h, h3", el));
    st.cur = el; updateCurrent(true);
    return true;
  }
  function positionFrom(p, smooth) {
    if (p.q.at) { if (scrollToSection(p.q.at, p.q.l, smooth)) return; }
    const last = S.progress.last;
    if (p.q.resume && last && last.k === st.sh.key && last.b) { scrollToSection(last.b, null, false, last.o || 0); return; }
    window.scrollTo(0, 0);
  }
  function jump(dir) {
    const els = st.secEls; if (!els.length) return;
    const cur = currentSec(); let i = els.indexOf(cur);
    const top = cur ? cur.getBoundingClientRect().top - barH() : 0;
    if (dir > 0 && top > 24) i = i - 1;               /* current section's head is still below the bar */
    if (dir < 0 && top < -24) i = i + 1;              /* go to the top of the current section first */
    const t = els[V.clamp(i + dir, 0, els.length - 1)];
    if (t) scrollToSection(t.dataset.id, null, true);
  }

  let raf = 0, lastY = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0; if (!st || !st.root) return;
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      st.bar.classList.toggle("scrolled", y > 4);
      const pb = V.$("#rprog", st.bar); if (pb) pb.style.width = (max > 0 ? Math.min(100, 100 * y / max) : 0) + "%";
      if (st.root.classList.contains("focus")) { if (y > lastY + 6 && y > 180) st.bar.classList.add("hide"); else if (y < lastY - 6) st.bar.classList.remove("hide"); }
      lastY = y;
      updateCurrent(false);
      saveLast();
    });
  }
  function updateCurrent(force) {
    const lim = barH() + 48; let cur = st.secEls[0] || null;
    for (const el of st.secEls) { if (el.getBoundingClientRect().top <= lim) cur = el; else break; }
    if (force && st.cur) cur = st.cur;
    if (cur === st.prevCur && !force) return;
    st.cur = cur; st.prevCur = cur;
    const sec = cur && C.secByKey[secKeyOf(cur)];
    const cs = V.$("#cur-sec", st.bar); if (cs) cs.textContent = sec ? sec.hPlain : "Overview";
    V.$$("#outline a", st.root).forEach(a => a.classList.toggle("on", !!cur && a.dataset.go === cur.dataset.id));
    const on = V.$("#outline a.on", st.root); if (on && st.root.classList.contains("show-outline")) { const o = V.$("#outline", st.root); const r = on.getBoundingClientRect(), orr = o.getBoundingClientRect(); if (r.top < orr.top + 40 || r.bottom > orr.bottom - 40) on.scrollIntoView({ block: "center" }); }
    if (recallOn() && cur) { V.$$(".hid.next", st.sheetEl).forEach(x => x.classList.remove("next")); markNext(cur); }
  }
  const saveLast = V.debounce(() => {
    if (!st || !st.root || !document.body.contains(st.root)) return;
    const cur = currentSec(); if (!cur) return;
    S.setLast({ k: st.sh.key, b: cur.dataset.id, o: Math.round(barH() + 10 - cur.getBoundingClientRect().top) });
  }, 700);

  /* sections count as read after ~3 s of genuine on-screen time */
  function trackRead() {
    if (!st || !isNotes(st.sh) || document.visibilityState !== "visible") return;
    const vh = window.innerHeight, top = barH();
    st.secEls.forEach(el => {
      if (el.classList.contains("collapsed") || el.classList.contains("pre")) return;   /* a blurred pretest is not a read */
      const r = el.getBoundingClientRect(), vis = Math.min(r.bottom, vh) - Math.max(r.top, top);
      if (vis <= 0 || vis < Math.min(r.height * 0.6, (vh - top) * 0.4)) return;
      const k = secKeyOf(el), sec = C.secByKey[k]; if (!sec || sec.ref) return;   /* figure-only sections are not read progress */
      st.dwell[k] = (st.dwell[k] || 0) + 1;
      if (st.dwell[k] === 3) { const was = S.isRead(k); S.markRead(k); if (!was) { refreshDot(el); refreshStats(); } }
    });
  }
  function refreshDot(el) { const d = V.$(".sec-meta .st", el), k = secKeyOf(el); if (d) { const s = S.state(k); d.className = "st " + s; d.title = STATE_T[s]; } const oa = V.$('#outline a[data-go="' + el.dataset.id + '"] .st', st.root); if (oa) oa.className = "st " + S.state(k); }
  function refreshStats() {
    const pr = C.sheetProgress(st.sh), m = V.$(".sheet-stats .meter i", st.sheetEl);
    if (m) { m.style.width = V.pct(pr.read, pr.total) + "%"; m.parentNode.nextSibling.textContent = pr.read + "/" + pr.total + " read"; }
    V.renderNav();
  }

  /* ---------- recall ---------- */
  function markNext(secEl) { if (!secEl) return; V.$$(".hid.next", secEl).forEach(x => x.classList.remove("next")); const n = V.$(".hid:not(.shown)", secEl); if (n) n.classList.add("next"); }
  function revealNext() {
    const sec = currentSec(); if (!sec) return;
    const n = V.$(".hid:not(.shown)", sec);
    if (!n) { const f = V.$(".sec-rate", sec); if (f) { f.scrollIntoView({ block: "center", behavior: "smooth" }); flash(f); } V.toast(f ? "All revealed — rate this section with 1–4" : "Nothing to reveal here — figures stay visible"); return; }
    n.classList.add("shown"); markNext(sec);
    const r = n.getBoundingClientRect(); if (r.bottom > window.innerHeight - 90) window.scrollBy({ top: r.bottom - window.innerHeight + 140, behavior: "smooth" });
  }
  function revealAll(sec) { if (!sec) return; V.$$(".hid", sec).forEach(x => x.classList.add("shown")); markNext(sec); }
  /* end a section's pretest for the rest of this visit; `reveal` un-blurs with the recall animation first */
  function endPre(el, reveal) {
    st.pre[el.dataset.id] = true;
    const bar = V.$(".pre-bar", el); if (bar) bar.remove();
    const strip = () => { el.classList.remove("pre", "recall"); V.$$(".hid", el).forEach(x => x.classList.remove("hid", "shown", "next")); };
    el.classList.remove("pre");
    if (reveal) { V.$$(".hid", el).forEach(x => x.classList.add("shown")); setTimeout(strip, 400); } else strip();
  }
  function rate(secEl, r, viaKey) {
    const key = secKeyOf(secEl), foot = V.$(".sec-rate", secEl); if (!foot) return;
    st.undo[key] = S.rate(key, r, "reader");
    revealAll(secEl);
    const ivl = S.srs[key].ivl;
    foot.innerHTML = '<span class="rated">' + V.icon("check", "sm") + "Rated <b>" + LABEL[r] + "</b> · next review " + (ivl ? "in " + V.ivl(ivl) : "later today") + '</span><button class="lnk" data-act="undo-rate">Undo</button>';
    refreshDot(secEl); refreshStats();
    if (viaKey) { const i = st.secEls.indexOf(secEl); const nx = st.secEls[i + 1]; if (nx) setTimeout(() => scrollToSection(nx.dataset.id, null, true), 380); }
  }
  function setRecall(on) { if (!isNotes(st.sh)) return; S.set("recall", on); rerenderKeep(); }

  function rerenderKeep() {
    const cur = currentSec(), id = cur && cur.id, off = cur ? cur.getBoundingClientRect().top : 0;
    st.root.classList.toggle("recall", recallOn());
    st.sheetEl.innerHTML = sheetInner(st.sh);
    afterRender(); updateBar();
    const el = id && V.$("#" + CSS.escape(id), st.sheetEl);
    if (el) { window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off); st.cur = el; }
    st.prevCur = null; updateCurrent(false);
  }
  function updateBar() {
    V.$$('[data-act="mode-read"]', st.bar).forEach(b => b.setAttribute("aria-pressed", String(!recallOn())));
    V.$$('[data-act="mode-recall"]', st.bar).forEach(b => b.setAttribute("aria-pressed", String(recallOn())));
    const fb = V.$("#filter-btn", st.bar); if (fb) { const pip = V.$(".pip", fb); if (filterOf(st.sh) && !pip) fb.insertAdjacentHTML("beforeend", '<span class="pip"></span>'); if (!filterOf(st.sh) && pip) pip.remove(); }
  }
  function clearFilter(silent) { S.set("filter", { hy: false, exam: "" }); rerenderKeep(); if (silent) V.toast("Filter cleared to show that line"); }

  /* ---------- popovers ---------- */
  function sheetsPop(anchor) {
    const subj = st.sh.subj, items = [];
    subj.groups.forEach(g => { items.push({ head: g.label }); g.sheets.forEach(id => { const sh = subj.sheetById[id]; if (!sh) return; const pr = C.sheetProgress(sh);
      items.push({ rich: '<span class="n" style="margin-right:6px">' + String(sh.num).padStart(2, "0") + "</span>" + V.esc(sh.tab), sub: pr.total ? V.pct(pr.read, pr.total) + "%" : "ref", on: sh === st.sh, run: () => V.go(C.sheetHref(sh)) }); }); });
    V.popover(anchor, items, { align: "left" });
  }
  function outlinePop(anchor) {
    const items = st.secEls.map(el => { const sec = C.secByKey[secKeyOf(el)]; if (!sec) return null;
      return { rich: (sec.ref ? "" : '<span class="st ' + S.state(sec.key) + '" style="margin-right:8px"></span>') + V.esc(sec.hPlain), sub: sec.fig && !sec.lines.length ? "figure" : String(V.$$("[data-l]", el).length || sec.lines.length), on: el === st.cur, run: () => scrollToSection(sec.id, null, true) }; }).filter(Boolean);
    const pop = V.popover(anchor, items, { align: "left" });
    const on = pop && V.$(".pi.on", pop); if (on) on.scrollIntoView({ block: "center" });
  }
  function filterPop(anchor) {
    const f = S.settings.filter, lines = st.sh.sections.flatMap(s => s.lines);
    const cnt = id => lines.filter(l => l.fams.has(id)).length;
    const html = '<div class="prow"><span><b style="color:var(--ink)">High-yield only</b><br><small class="muted">PYQ-tagged lines, traps & highlights · ' + lines.filter(l => l.hy).length + " of " + lines.length + '</small></span><button class="toggle" data-f="hy" aria-pressed="' + !!f.hy + '" aria-label="High-yield only"></button></div><hr><div class="ph">Tested in</div>' +
      [["", "Any exam", lines.length]].concat(M.EXAMS.map(x => [x.id, x.label, cnt(x.id)])).map(([id, l, n]) =>
        '<button class="pi' + (f.exam === id ? " on" : "") + '" data-exam="' + id + '"' + (id && !n ? " disabled style=\"opacity:.45\"" : "") + '><span class="grow">' + l + '</span><span class="n">' + n + "</span>" + (f.exam === id ? V.icon("check", "sm") : "") + "</button>").join("");
    const pop = V.popover(anchor, html); if (!pop) return;
    pop.addEventListener("click", e => {
      const t = e.target.closest("[data-f],[data-exam]"); if (!t || t.disabled) return;
      const nf = Object.assign({}, S.settings.filter); if (t.dataset.f) nf.hy = !nf.hy; else nf.exam = t.dataset.exam;
      S.set("filter", nf); V.closePop(); rerenderKeep();
    });
  }
  /* ---------- the student's highlights: select text in a line, give a reason, at most HL_CAP per sheet ---------- */
  const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
  const hlKeys = () => Object.keys(S.highlights).filter(k => { const ln = C.lineByKey[k]; return ln && ln.sec.sheet === st.sh; });
  const lineOfEl = el => { const sec = C.secByKey[secKeyOf(el.closest(".sec"))]; return sec && sec.byLid && sec.byLid[el.dataset.l]; };
  function paintHL() {
    V.$$(".myhl", st.sheetEl).forEach(el => { el.classList.remove("myhl"); delete el.dataset.hlr; });
    const ks = hlKeys();
    ks.forEach(k => { const ln = C.lineByKey[k], el = V.$("#sec-" + CSS.escape(ln.sec.id) + ' [data-l="' + ln.lid + '"]', st.sheetEl); if (el) { el.classList.add("myhl"); el.dataset.hlr = S.highlights[k].reason; } });
    const b = V.$(".hl-count", st.sheetEl); if (b) { b.hidden = !ks.length; b.textContent = ks.length + " of " + HL_CAP + " highlights used"; }
  }
  function hlPop(anchor, lineEl) {
    const ln = lineEl && lineOfEl(lineEl), ks = hlKeys(), cur = ln && S.highlights[ln.key];
    const used = '<span class="muted">' + ks.length + " of " + HL_CAP + " used on this sheet</span>";
    let html;
    if (ln && (cur || ks.length < HL_CAP)) {
      html = '<form class="hlp"><div class="ph">' + (cur ? "Your highlight" : "Highlight this line") + '</div><input class="input" name="r" maxlength="140" autocomplete="off" aria-label="Why this line matters" placeholder="Why does this line matter? One line, required" value="' + V.escAttr(cur ? cur.reason : "") + '">' +
        '<div class="hlp-foot">' + used + (cur ? '<button type="button" class="btn sm ghost" data-rm="' + V.escAttr(ln.key) + '">Remove</button>' : "") + '<button class="btn sm primary" type="submit"' + (cur ? "" : " disabled") + ">" + (cur ? "Save" : "Highlight") + "</button></div></form>";
    } else {
      html = '<div class="hlp"><div class="ph">' + (ln ? "All " + HL_CAP + " highlights used on this sheet" : "Your highlights on this sheet") + "</div>" + (ln ? '<p class="hlp-msg">Remove one to highlight this line.</p>' : "") +
        ks.map(k => '<div class="hlp-i"><span class="grow"><span class="t">' + V.esc(trunc(C.lineByKey[k].plain, 80)) + '</span><span class="r">' + V.esc(S.highlights[k].reason) + '</span></span><button type="button" class="ibtn" data-rm="' + V.escAttr(k) + '" aria-label="Remove highlight" title="Remove">' + V.icon("x", "sm") + "</button></div>").join("") +
        (ks.length ? "" : '<p class="hlp-msg">None yet. Select some text in a line to highlight it.</p>') + '<div class="hlp-foot">' + used + "</div></div>";
    }
    V.closePop();
    const pop = V.popover(anchor, html, { align: "left" }); if (!pop) return;
    const form = V.$("form", pop), inp = form && V.$("input", form), btn = form && V.$('[type="submit"]', form);
    if (form) {
      inp.addEventListener("input", () => { btn.disabled = !inp.value.trim(); });
      form.addEventListener("submit", e => {
        e.preventDefault(); if (!S.setHighlight(ln.key, inp.value)) return;
        V.closePop(); const sel = window.getSelection(); if (sel) sel.removeAllRanges(); paintHL();
        V.toast(cur ? "Highlight updated" : "Highlighted · " + hlKeys().length + " of " + HL_CAP + " used");
      });
    }
    pop.addEventListener("click", e => {
      const rm = e.target.closest("[data-rm]"); if (!rm) return;
      S.removeHighlight(rm.dataset.rm); paintHL();
      if (ln && !cur) hlPop(anchor, lineEl); else if (!ln && hlKeys().length) hlPop(anchor, null); else V.closePop();
    });
  }
  /* a selection inside one line of a notes section (never while that line is blurred for recall or a pretest) */
  function onSelect() {
    if (!st || !isNotes(st.sh)) return;
    const sel = window.getSelection(); if (!sel || sel.isCollapsed || !String(sel).trim()) return;
    const lineOf = n => { const e = n && (n.nodeType === 1 ? n : n.parentElement); return e && e.closest(".sec [data-l]"); };
    const a = lineOf(sel.anchorNode);
    if (!a || a !== lineOf(sel.focusNode) || a.closest(".recall") || !st.sheetEl.contains(a) || !lineOfEl(a)) return;
    const open = V.$(".pop"); if (open && open._anchor && open._anchor.line === a) return;
    /* anchor the popover at the selected text, not the whole (possibly tall) line */
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    hlPop({ line: a, getBoundingClientRect: () => rect, contains: n => a.contains(n) }, a);
  }

  V.displayPop = (anchor, onChange) => {
    const s = S.settings;
    const seg = (key, opts) => '<div class="seg" style="width:100%">' + opts.map(([v, l]) => '<button data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (s[key] === v) + '" style="flex:1;justify-content:center">' + l + "</button>").join("") + "</div>";
    const tg = (key, l, sub) => '<div class="prow"><span><b style="color:var(--ink)">' + l + "</b>" + (sub ? '<br><small class="muted">' + sub + "</small>" : "") + '</span><button class="toggle" data-t="' + key + '" aria-pressed="' + !!s[key] + '" aria-label="' + l + '"></button></div>';
    const html = '<div style="padding:6px 8px;display:grid;gap:10px;width:300px"><div class="ph" style="padding:4px 2px 0">Text size</div>' + seg("size", [["s", "S"], ["m", "M"], ["l", "L"], ["xl", "XL"]]) +
      '<div class="ph" style="padding:4px 2px 0">Line spacing</div>' + seg("density", [["comfortable", "Comfortable"], ["compact", "Compact"]]) +
      '<div class="ph" style="padding:4px 2px 0">Line length</div>' + seg("width", [["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"]]) +
      '<div class="ph" style="padding:4px 2px 0">Typeface</div>' + seg("font", [["hyper", "Hyperlegible"], ["serif", "Serif"], ["system", "System"]]) +
      '<div class="ph" style="padding:4px 2px 0">Theme</div>' + seg("theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]]) + "</div><hr>" +
      tg("outline", "Section outline", "Quiet list of sections beside the notes · t") + tg("focus", "Focus mode", "Top bar hides while you scroll down · f") + tg("pinNav", "Keep navigation open", "Show the sidebar while reading (wide screens)");
    const pop = V.popover(anchor, html); if (!pop) return;
    pop.addEventListener("click", e => {
      const b = e.target.closest("[data-k],[data-t]"); if (!b) return;
      if (b.dataset.k) { S.set(b.dataset.k, b.dataset.v); V.$$('[data-k="' + b.dataset.k + '"]', pop).forEach(x => x.setAttribute("aria-pressed", String(x === b))); }
      else { const k = b.dataset.t; S.set(k, !S.settings[k]); b.setAttribute("aria-pressed", String(!!S.settings[k])); }
      V.applyDrawerMode(); if (onChange) onChange(b.dataset.k || b.dataset.t);
    });
  };

  /* ---------- events ---------- */
  function onClick(e) {
    const ln = e.target.closest(".sec [data-l]"); if (ln) st.pick = { sec: ln.closest(".sec").dataset.id, lid: ln.dataset.l };   /* the line a new card starts from */
    const a = e.target.closest("[data-act],[data-go]");
    if (a && a.dataset.go) { e.preventDefault(); scrollToSection(a.dataset.go, null, true); return; }
    if (a) {
      const act = a.dataset.act, secEl = a.closest(".sec");
      switch (act) {
        case "nav": V.toggleDrawer(); return;
        case "sheets": sheetsPop(a); return;
        case "outline": outlinePop(a); return;
        case "prev-sec": jump(-1); return;
        case "next-sec": jump(1); return;
        case "mode-read": setRecall(false); return;
        case "mode-recall": setRecall(true); return;
        case "filter": filterPop(a); return;
        case "search": V.palette(); return;
        case "display": V.displayPop(a, k => { if (k === "outline") { st.root.classList.toggle("show-outline", !!S.settings.outline); renderOutline(); } if (k === "focus") st.root.classList.toggle("focus", !!S.settings.focus); }); return;
        case "clear-filter": clearFilter(false); return;
        case "toggle": {
          const open = secEl.classList.toggle("collapsed") === false; st.open[secEl.dataset.id] = open; a.setAttribute("aria-expanded", String(open)); return;
        }
        case "bm": { const on = S.toggleBookmark(secKeyOf(secEl)); a.classList.toggle("on", on); a.setAttribute("aria-pressed", String(on)); V.toast(on ? "Section bookmarked" : "Bookmark removed"); V.renderNav(); return; }
        case "doubt": {
          const on = S.toggleDoubt(secKeyOf(secEl)); a.classList.toggle("on", on); a.setAttribute("aria-pressed", String(on)); V.renderNav();
          const nb = V.$('.mynote-t[aria-expanded="false"]', secEl);
          V.toast(on ? "Doubt flagged" : "Doubt cleared", on && nb ? { label: "Write it down", run: () => { if (st && document.body.contains(nb)) st.open["n:" + secEl.dataset.id] = V.toggleNote(nb); } } : null);
          return;
        }
        case "note": st.open["n:" + secEl.dataset.id] = V.toggleNote(a); return;
        case "hl-list": hlPop(a, null); return;
        case "pre-reveal": endPre(secEl, true); return;
        case "pre-skip": st.preOff = true; V.$$(".sec.pre", st.sheetEl).forEach(el => endPre(el)); V.toast("Pretest skipped on this sheet", { label: "Settings", run: () => V.go("#/settings") }); return;
        case "card": {
          const k = secKeyOf(secEl), sec = C.secByKey[k], pick = st.pick && st.pick.sec === secEl.dataset.id && sec.byLid[st.pick.lid];
          V.cardDialog(k, pick ? pick.key : null, null, () => { if (a.parentNode) a.outerHTML = cardBtn(k); });
          return;
        }
        case "rate": rate(secEl, +a.dataset.r, false); return;
        case "undo-rate": { const k = secKeyOf(secEl); if (st.undo[k]) { st.undo[k](); delete st.undo[k]; } V.$(".sec-rate", secEl).innerHTML = rateButtons(k); refreshDot(secEl); refreshStats(); return; }
        case "reveal-all": revealAll(secEl); return;
      }
      return;
    }
    const pre = e.target.closest(".sec.pre");
    if (pre) { const h = e.target.closest(".hid"); if (h) { h.classList.toggle("shown"); markNext(pre); if (!V.$(".hid:not(.shown)", pre)) endPre(pre, true); } return; }
    if (st.root.classList.contains("recall")) {
      const h = e.target.closest(".hid"); if (h) { h.classList.toggle("shown"); markNext(h.closest(".sec")); }
    }
  }
  function onChange(e) {
    const t = e.target;
    if (t.dataset.act === "hide") {
      const secEl = t.closest(".sec"); st.open["h:" + secEl.dataset.id] = t.value;
      const tb = V.$("table[data-hide]", secEl); if (tb) tb.dataset.hide = t.value;
      V.markHidden(V.$(".sec-body", secEl)); markNext(secEl);
    }
  }
  view.key = e => {
    if (!st) return;
    const k = e.key, rc = recallOn();
    if (k === "j") { e.preventDefault(); jump(1); }
    else if (k === "k") { e.preventDefault(); jump(-1); }
    else if (k === "[" || k === "]") { const nb = C.neighbours(st.sh)[k === "[" ? "prev" : "next"]; if (nb) V.go(C.sheetHref(nb)); }
    else if (k === "r") setRecall(!S.settings.recall);
    else if (k === "h" && isNotes(st.sh)) { const f = Object.assign({}, S.settings.filter, { hy: !S.settings.filter.hy }); S.set("filter", f); rerenderKeep(); V.toast(f.hy ? "High-yield lines only" : "Showing all lines"); }
    else if (k === "o") { e.preventDefault(); outlinePop(V.$(".c-sec", st.bar)); }
    else if (k === "b") { const c = currentSec(); if (c && c.classList.contains("sec")) V.$('[data-act="bm"]', c).click(); }
    else if (k === "d") { const c = currentSec(); if (c && c.classList.contains("sec")) V.$('[data-act="doubt"]', c).click(); }
    else if (k === "t") { S.set("outline", !S.settings.outline); st.root.classList.toggle("show-outline", !!S.settings.outline); renderOutline(); }
    else if (k === "f") { S.set("focus", !S.settings.focus); st.root.classList.toggle("focus", !!S.settings.focus); st.bar.classList.remove("hide"); V.toast(S.settings.focus ? "Focus mode on" : "Focus mode off"); }
    else if (rc && k === " ") { e.preventDefault(); revealNext(); }
    else if (rc && k === "a") { revealAll(currentSec()); }
    else if (rc && /^[1-4]$/.test(k)) { const c = currentSec(); if (c && V.$('.sec-rate [data-act="rate"]', c)) rate(c, +k, true); }
  };

  /* ---------- lifecycle ---------- */
  view.mount = (el, p) => {
    if (!st) return null;
    st.root = V.$(".reader", el); st.bar = V.$("#rbar", el);
    afterRender();
    S.visitSheet(st.sh.key);
    st.root.addEventListener("click", onClick);
    st.root.addEventListener("change", onChange);
    st.root.addEventListener("mouseup", () => setTimeout(onSelect, 0));
    st.root.addEventListener("touchend", () => setTimeout(onSelect, 350));
    st.root.addEventListener("keyup", e => { if (e.shiftKey) onSelect(); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const timer = setInterval(trackRead, 1000);
    requestAnimationFrame(() => { positionFrom(p, false); onScroll(); });
    return () => { clearInterval(timer); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); saveLast(); st = null; };
  };
  view.update = (p, old) => {
    if (!st || !old || p.subj !== old.subj || p.sheet !== old.sheet || p.q.hy || p.q.exam != null) return false;
    positionFrom(p, true);
    return true;
  };
})();
