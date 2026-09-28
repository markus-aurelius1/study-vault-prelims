/* Study Vault — revision (spaced, section-level) and recall drills (line-level, interleaved). */
(function () {
  "use strict";
  const V = window.V, S = V.S, C = V.C, M = window.VaultMarkup, R = window.VaultRender;
  const LABEL = ["", "Again", "Hard", "Good", "Easy"];
  const overdue = sec => { const d = V.today() - S.srs[sec.key].due; return d <= 0 ? "due today" : d === 1 ? "1 day overdue" : d + " days overdue"; };
  const lastInfo = key => { const e = S.srs[key]; if (!e || !e.hist || !e.hist.length) return S.progress.sections[key] ? "read " + V.ago(S.progress.sections[key].l) + " · first review" : "first review"; const h = e.hist[e.hist.length - 1]; return 'last: <span class="rate-dot r' + h[1] + '"></span> ' + LABEL[h[1]] + " " + V.ago(h[0]); };

  /* ================= Revision queue ================= */
  V.views.revise = {
    title: () => "Revision",
    render() {
      const due = V.orderQueue(S.dueKeys().map(k => C.secByKey[k]).filter(Boolean));
      const up = S.upcoming(14, k => !!C.secByKey[k]), n = Math.min(due.length, S.settings.sessionSize);
      const today = S.log.days[V.today()] || { s: 0 };
      let o = '<div class="page"><div class="page-head"><div class="grow"><div class="eyebrow">Spaced revision</div><h1 class="h1">Revision</h1><p class="lede">Sections come back just before you would forget them. Rate honestly: <b>Again</b> brings a section back today, <b>Easy</b> pushes it weeks out.</p></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' + (n ? '<a class="btn primary lg" href="#/revise/session">' + V.icon("revise", "sm") + "Start · " + n + " section" + (n > 1 ? "s" : "") + "</a>" : '<button class="btn lg" disabled>Nothing due</button>') + "</div></div>";
      o += '<div class="stat-line" style="margin-bottom:6px"><div class="fig"><div class="v">' + due.length + '</div><div class="l">due now</div></div><div class="fig"><div class="v">' + up.slice(0, 7).reduce((a, b) => a + b, 0) + '</div><div class="l">due in the next 7 days</div></div><div class="fig"><div class="v">' + Object.keys(S.srs).filter(k => C.secByKey[k]).length + '</div><div class="l">sections scheduled</div></div><div class="fig"><div class="v">' + today.s + '</div><div class="l">reviewed today</div></div></div>';
      o += '<div class="grid-2"><div>';
      o += '<section class="block-sec"><h2 class="h2">Due now</h2>' + (due.length ? due.slice(0, 60).map(sec => V.secRow(sec, overdue(sec), " · " + sec.lines.length + " lines")).join("") + (due.length > 60 ? '<div class="empty">+ ' + (due.length - 60) + " more</div>" : "")
        : '<div class="empty">' + (Object.keys(S.srs).length ? "All caught up. " : "") + "Sections join the queue the day after you first read them, and whenever you rate them in Recall mode or miss a line in a drill.</div>") + "</section>";
      /* quick revision: high-yield pass per sheet */
      const sheets = C.sheets.filter(sh => sh.type === "notes").sort((a, b) => a.pri.localeCompare(b.pri) || a.subj.order - b.subj.order || a.index - b.index);
      o += '<section class="block-sec"><h2 class="h2">Quick revision · high-yield pass</h2><p class="muted" style="margin:-4px 0 12px;font-size:14px">Opens a sheet showing only PYQ-tagged lines, traps and highlighted distinctions — nothing is removed from the notes, the rest is just hidden.</p>' +
        sheets.map(sh => { const hy = sh.sections.reduce((a, s) => a + s.lines.filter(l => l.hy).length, 0);
          return '<a class="rowlink" href="' + C.sheetHref(sh, "hy=1") + '" style="--subj:' + sh.subj.accent + '"><span class="pri ' + sh.pri + '">' + sh.pri.toUpperCase() + '</span><span class="rl-main"><div class="rl-t">' + V.esc(sh.title) + '</div><div class="rl-s">' + V.esc(sh.subj.name) + " · " + hy + " of " + sh.lineCount + ' lines</div></span><span class="rl-end">' + V.pct(hy, sh.lineCount) + "%</span>" + V.icon("zap", "sm go") + "</a>"; }).join("") + "</section>";
      o += "</div><div>";
      o += '<section class="block-sec"><h2 class="h2">Next 14 days</h2>' + V.columns(up.map((v, i) => { const d = V.dayDate(V.today() + i + 1); return { v, l: i % 2 ? "" : String(d.getDate()), tip: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " · " + v + " section" + (v === 1 ? "" : "s") }; }), { h: 110, w: 340, aria: "Sections due per day, next 14 days" }) + "</section>";
      const unread = C.sections.filter(s => !s.ref && s.sheet.pri === "p1" && !S.isRead(s.key)).slice(0, 6);
      if (unread.length) o += '<section class="block-sec"><h2 class="h2">Not read yet · priority 1</h2>' + unread.map(sec => V.secRow(sec, sec.lines.length + " lines")).join("") + "</section>";
      o += '<section class="block-sec"><h2 class="h2">How scheduling works</h2><div style="font-size:14px;color:var(--ink-2);line-height:1.65">Reading a section schedules its first review for the next day. Each rating sets the next gap: <b>Again</b> → today, <b>Hard</b> → a little longer, <b>Good</b> → grows by the section\'s ease (≈2.5×), <b>Easy</b> → grows faster. Missing a line in a drill pulls its section back to tomorrow. Revisions alternate between sheets (interleaving) — change it in Settings.</div></section>';
      return o + "</div></div></div>";
    }
  };

  /* ================= Revision session ================= */
  let rs = null;
  V.views.reviseSession = {
    mode: "session", title: () => "Revision session",
    render(p) {
      let keys = S.dueKeys();
      if (p.q.sheet) keys = keys.filter(k => k.indexOf(p.q.sheet + "/") === 0);
      if (p.q.subj) keys = keys.filter(k => k.indexOf(p.q.subj + "/") === 0);
      const secs = V.orderQueue(keys.map(k => C.secByKey[k]).filter(Boolean)).slice(0, S.settings.sessionSize);
      rs = { secs, i: 0, res: [], hide: {} };
      if (!secs.length) return sessShell("Revision", "") .replace('<div id="card"></div>', '<div class="prompt"><h1 class="h1" style="margin-top:30px">Nothing due right now</h1><p class="lede">You are clear. Try a <a href="#/recall/session?preset=mix">mixed recall</a>, or read a new sheet.</p><p><a class="btn" href="#/revise">Back to Revision</a></p></div>');
      return sessShell("Revision", secs[0].subj.accent);
    },
    mount(el) { if (!rs || !rs.secs.length) return null; rs.el = el; drawRev(); el.addEventListener("click", onRevClick); return () => { rs = null; }; },
    key(e) {
      if (!rs || !rs.secs.length || rs.i >= rs.secs.length) return;
      const card = V.$("#card", rs.el);
      if (e.key === " ") { e.preventDefault(); revealNext(card); }
      else if (e.key === "a") revealAllIn(card);
      else if (/^[1-4]$/.test(e.key)) rateRev(+e.key);
      else if (e.key === "s") { rs.i++; drawRev(); }
    }
  };
  function sessShell(title, accent) {
    return '<div class="sess" style="--subj:' + (accent || "var(--accent)") + '"><header class="sess-bar"><a class="ibtn" href="' + (title === "Revision" ? "#/revise" : "#/recall") + '" aria-label="End session" title="End session">' + V.icon("x") + '</a><span class="ttl">' + V.esc(title) + '</span><span class="count" id="count"></span><div class="sess-prog"><i id="prog" style="width:0"></i></div></header>' +
      '<div class="sess-body"><div id="card"></div></div><footer class="sess-foot" id="foot-wrap"><div class="sess-foot-in" id="foot"></div></footer></div>';
  }
  function progress(i, n) { const c = V.$("#count"), p = V.$("#prog"); if (c) c.textContent = Math.min(i + 1, n) + " / " + n; if (p) p.style.width = (100 * i / n) + "%"; }
  function revealNext(card) { const n = V.$(".hid:not(.shown)", card); if (n) { n.classList.add("shown"); V.$$(".hid.next", card).forEach(x => x.classList.remove("next")); const nx = V.$(".hid:not(.shown)", card); if (nx) nx.classList.add("next"); const r = n.getBoundingClientRect(); if (r.bottom > window.innerHeight - 140) window.scrollBy({ top: r.bottom - window.innerHeight + 200, behavior: "smooth" }); return true; } return false; }
  function revealAllIn(card) { V.$$(".hid", card).forEach(x => x.classList.add("shown")); V.$$(".hid.next", card).forEach(x => x.classList.remove("next")); }
  const rateBtns = (pv) => '<div class="rates">' + [1, 2, 3, 4].map(r => '<button class="rate r' + r + '" data-rate="' + r + '"><kbd>' + r + "</kbd>" + LABEL[r] + (pv ? "<small>" + (pv[r - 1] ? V.ivlShort(pv[r - 1]) : "today") + "</small>" : "") + "</button>").join("") + "</div>";

  function drawRev() {
    const card = V.$("#card", rs.el), foot = V.$("#foot", rs.el);
    progress(rs.i, rs.secs.length);
    if (rs.i >= rs.secs.length) return revSummary(card, foot);
    const sec = rs.secs[rs.i], b = sec.block, hide = rs.hide[sec.key] || S.settings.tableHide;
    rs.el.firstChild.style.setProperty("--subj", sec.subj.accent);
    card.innerHTML = '<article class="sheet recall card-anim" style="padding-bottom:0">' +
      '<div class="sess-crumb"><span class="dot"></span>' + V.esc(sec.subj.name + " › " + sec.sheet.tab) + " · " + lastInfo(sec.key) + '<a href="' + C.secHref(sec) + '" style="margin-left:auto">Open in notes ' + V.icon("out", "sm") + "</a></div>" +
      '<section class="sec k-' + sec.kind + '"><header class="sec-head"><h2 class="sec-h">' + sec.subj.M.fmt(sec.h) + '</h2><div class="sec-meta">' + (sec.kind === "trap" ? '<span class="kbadge trap">Traps</span>' : "") +
      (b.rows && b.cols.length > 1 ? '<select class="select hidesel" data-hide aria-label="What to hide"><option value="answers">Hide answers</option>' + b.cols.map((c, k) => '<option value="' + (k ? "c" + k : "first") + '"' + (hide === (k ? "c" + k : "first") ? " selected" : "") + ">Hide " + V.esc(M.plain(c)) + (k ? " only" : " (reverse)") + "</option>").join("") + "</select>" : "") +
      '<span class="sec-n">' + sec.lines.length + '</span></div></header><div class="sec-body">' + R.blockBody(b, { pref: S.settings.listPref, hide, M: sec.subj.M }) + "</div></section></article>";
    const tw = V.$(".tw", card); if (tw && b.cols && b.cols.length >= 4) tw.classList.add("wide");
    V.markHidden(card); const nx = V.$(".hid", card); if (nx) nx.classList.add("next");
    foot.innerHTML = '<span class="hint"><span><kbd>Space</kbd> reveal next</span><span><kbd>A</kbd> reveal all</span><span><kbd>S</kbd> skip</span></span>' + rateBtns(S.preview(sec.key));
    window.scrollTo(0, 0);
  }
  function rateRev(r) {
    const sec = rs.secs[rs.i]; S.rate(sec.key, r, "revise"); rs.res.push([sec, r]); rs.i++;
    V.$("#card", rs.el).style.opacity = "0"; setTimeout(() => { if (rs) { V.$("#card", rs.el).style.opacity = ""; drawRev(); } }, 140);
  }
  function onRevClick(e) {
    const r = e.target.closest("[data-rate]"); if (r) { rateRev(+r.dataset.rate); return; }
    const h = e.target.closest(".hid"); if (h) { h.classList.toggle("shown"); return; }
  }
  document.addEventListener("change", e => {
    if (!rs || !e.target.matches("[data-hide]")) return;
    const sec = rs.secs[rs.i]; rs.hide[sec.key] = e.target.value;
    const t = V.$("table[data-hide]", rs.el); if (t) { t.dataset.hide = e.target.value; V.markHidden(V.$("#card", rs.el)); }
  });
  function revSummary(card, foot) {
    const c = [0, 0, 0, 0, 0]; rs.res.forEach(([, r]) => c[r]++);
    const left = S.dueKeys().filter(k => C.secByKey[k]).length;
    const missed = rs.res.filter(([, r]) => r <= 2);
    card.innerHTML = '<div class="prompt card-anim"><div class="eyebrow" style="margin-top:24px">Session complete</div><h1 class="h1">' + V.plural(rs.res.length, "section") + " revised</h1>" +
      V.ratingBar({ a: c[1], h: c[2], g: c[3], e: c[4] }) +
      (missed.length ? '<section class="block-sec" style="margin-top:22px"><h2 class="h2">Needs another look</h2>' + missed.map(([sec, r]) => V.secRow(sec, LABEL[r])).join("") + "</section>" : "") +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">' + (left ? '<a class="btn primary" href="#/revise/session" data-again>' + V.icon("revise", "sm") + "Continue · " + left + " still due</a>" : "") +
      '<a class="btn" href="#/recall/session?preset=mix">' + V.icon("shuffle", "sm") + 'Mixed recall</a><a class="btn ghost" href="#/">Dashboard</a></div></div>';
    foot.parentNode.hidden = true;
    const again = V.$("[data-again]", card); if (again) again.addEventListener("click", e => { e.preventDefault(); V.rerender(); });
  }

  /* ================= Drill builder ================= */
  const WHY_SHARE = 0.15;   /* ≈ 2–3 "why" prompts in a 20-prompt drill */
  V.buildDrill = o => {
    const rnd = V.rng(Date.now() & 0xffffffff), t = V.today(), pref = S.settings.listPref;
    const f = { subj: o.subj, sheet: o.sheet, exam: o.exam, from: o.from, to: o.to, trap: o.trap, hy: o.hy, pyq: o.preset === "pyq" };
    let pool = C.lines.filter(ln => !ln.sec.ref && C.lineMatch(ln, f));
    if (o.preset === "weak") { const weak = new Set(S.weakKeys()); pool = pool.filter(ln => weak.has(ln.sec.key) || S.itemWeak(ln.key) > 0.25); }
    if (o.keys) { const ks = new Set(o.keys); pool = pool.filter(ln => ks.has(ln.key)); }
    const scored = [];
    pool.forEach(ln => {
      const vs = C.variants(ln, pref); if (!vs.length) return;
      let s = rnd() * 1.2;
      const e = S.srs[ln.sec.key];
      if (e && e.due <= t) s += 1.6;
      s += Math.min(2, S.weakness(ln.sec.key)) * 0.8 + S.itemWeak(ln.key) * 2;
      if (S.isRead(ln.sec.key)) s += 0.9;
      const it = S.items[ln.key]; if (it && Date.now() - it.last < 20 * 3600e3 && it.lr >= 3) s -= 1.6;
      if (ln.sec.sheet.pri === "p1") s += 0.3; if (ln.hy) s += 0.2;
      /* "why" is occasional: a fixed share of the lines that offer it, the rest keep their fact prompts */
      const why = vs.find(x => x.t === "why"), facts = why ? vs.filter(x => x !== why) : vs;
      scored.push({ ln, v: why && rnd() < WHY_SHARE ? why : facts[Math.floor(rnd() * facts.length)], s });
    });
    scored.sort((a, b) => b.s - a.s);
    const n = o.n || S.settings.drillLength, out = [], recent = [], used = {};
    const groupKey = x => o.sheet ? x.ln.sec.key : x.ln.sec.sheet.key;  /* interleave sheets (or sections within one sheet) */
    /* breadth: no sheet (or section, in a one-sheet drill) takes more than ~a third of the session */
    const groups = new Set(scored.map(groupKey)).size, cap = groups > 2 ? Math.max(2, Math.ceil(n * 0.34)) : n;
    const pool2 = [];
    for (const x of scored) { const g = groupKey(x); if ((used[g] || 0) < cap) { pool2.push(x); used[g] = (used[g] || 0) + 1; } if (pool2.length >= n * 3) break; }
    while (out.length < n && pool2.length) {
      let i = pool2.findIndex(x => recent.indexOf(groupKey(x)) < 0); if (i < 0) i = 0;
      const x = pool2.splice(i, 1)[0]; out.push(x); recent.push(groupKey(x)); if (recent.length > 2) recent.shift();
    }
    return out;
  };
  V.drillCount = o => { const f = { subj: o.subj, sheet: o.sheet, exam: o.exam, from: o.from, to: o.to, trap: o.trap, hy: o.hy, pyq: o.preset === "pyq" }; return C.lines.filter(ln => !ln.sec.ref && C.lineMatch(ln, f) && C.variants(ln, S.settings.listPref).length).length; };

  /* ================= Recall hub ================= */
  V.views.recall = {
    title: () => "Recall",
    render(p) {
      const weakN = S.weakKeys().filter(k => C.secByKey[k]).length, cardsDue = S.dueCards().length, nCards = Object.keys(S.cards).length;
      const preset = (id, ic, t, d, href, dis) => '<a class="preset" href="' + href + '"' + (dis ? ' style="opacity:.5;pointer-events:none"' : "") + '><span class="pic">' + V.icon(ic) + "</span><span><b>" + t + "</b><span>" + d + "</span></span></a>";
      let o = '<div class="page"><div class="page-head"><div class="grow"><div class="eyebrow">Active recall</div><h1 class="h1">Recall</h1><p class="lede">Think first, reveal second. Prompts are built from the structure your notes already have — table rows, “cue — answer” lines, key terms — and every one links back to its source line.</p></div></div>';
      o += '<div class="presets">' +
        preset("mix", "shuffle", "Mixed recall", "Interleaved across sheets and subjects. Due and weak material comes first.", "#/recall/session?preset=mix") +
        preset("pyq", "target", "PYQ recall", "Only lines a previous paper tested. Pick the exam and years below or in the PYQ explorer.", "#/recall/session?preset=pyq") +
        preset("trap", "flag", "Trap drill", "Lines marked as traps — the wrong options examiners actually used.", "#/recall/session?preset=trap") +
        preset("weak", "target", "Weak areas", weakN ? V.plural(weakN, "section") + " you keep missing." : "Appears once you have missed a few answers.", "#/recall/session?preset=weak", !weakN) +
        preset("cards", "pen", "My cards",cardsDue ? V.plural(cardsDue, "card") + " due for review · " + V.plural(nCards, "card") + " written." : nCards ? "Nothing due. " + V.plural(nCards, "card") + " written." : "Prompts you write yourself from any line in the reader.", cardsDue ? "#/cards/session" : "#/cards") + "</div>";
      /* custom */
      const opt = (v, l, sel) => '<option value="' + V.escAttr(v) + '"' + (sel ? " selected" : "") + ">" + V.esc(l) + "</option>";
      o += '<section class="block-sec" style="margin-top:18px"><h2 class="h2">Build a drill</h2><form id="drill-form" autocomplete="off">' +
        '<div class="form-row"><label for="d-subj">Subject</label><select class="select" id="d-subj" name="subj">' + opt("", "All subjects") + C.subjects.map(s => opt(s.id, s.name, p.q.subj === s.id)).join("") + "</select>" +
        '<select class="select" id="d-sheet" name="sheet" aria-label="Sheet"></select></div>' +
        '<div class="form-row"><label for="d-exam">Tested in</label><select class="select" id="d-exam" name="exam">' + opt("", "Any exam or none") + M.EXAMS.map(x => opt(x.id, x.label, p.q.exam === x.id)).join("") + "</select>" +
        '<select class="select" name="from" aria-label="From year">' + opt("", "From year") + C.years.map(y => opt(y, y)).join("") + '</select><select class="select" name="to" aria-label="To year">' + opt("", "To year") + C.years.slice().reverse().map(y => opt(y, y)).join("") + "</select></div>" +
        '<div class="form-row"><label>Only</label><button type="button" class="chipbtn" data-flag="trap" aria-pressed="false">' + V.icon("flag", "sm") + 'Traps</button><button type="button" class="chipbtn" data-flag="hy" aria-pressed="false">' + V.icon("zap", "sm") + 'High-yield</button><button type="button" class="chipbtn" data-flag="pyq" aria-pressed="false">' + V.icon("target", "sm") + "PYQ-tagged</button></div>" +
        '<div class="form-row"><label>Length</label><div class="seg">' + [10, 20, 40].map(n => '<button type="button" data-n="' + n + '" aria-pressed="' + (S.settings.drillLength === n) + '">' + n + "</button>").join("") + "</div></div>" +
        '<div class="form-row"><label></label><button class="btn primary" type="submit">' + V.icon("recall", "sm") + 'Start drill</button><span class="muted" id="d-avail" style="font-size:13.5px"></span></div></form></section>';
      /* recent performance */
      const tot = S.ratingTotals(30), n = tot.a + tot.h + tot.g + tot.e;
      o += '<section class="block-sec"><h2 class="h2">Last 30 days</h2>' + (n ? '<div class="stat-line"><div class="fig"><div class="v">' + n + '</div><div class="l">answers rated</div></div><div class="fig"><div class="v">' + V.pct(tot.g + tot.e, n) + '%</div><div class="l">recalled</div></div></div>' + V.ratingBar(tot) : '<div class="empty">No recall yet.</div>') + "</section>";
      return o + "</div>";
    },
    mount(el, p) {
      const form = V.$("#drill-form", el), st = { n: S.settings.drillLength, trap: false, hy: false, pyq: false };
      const fillSheets = () => { const s = C.bySubj[form.subj.value]; form.sheet.innerHTML = '<option value="">All sheets</option>' + (s ? s.sheets.filter(sh => sh.type === "notes").map(sh => '<option value="' + sh.key + '"' + (p.q.sheet === sh.key ? " selected" : "") + ">" + V.esc(sh.tab) + "</option>").join("") : ""); form.sheet.disabled = !s; };
      const opts = () => ({ preset: st.pyq ? "pyq" : "custom", subj: form.subj.value, sheet: form.sheet.value, exam: form.exam.value, from: +form.from.value || 0, to: +form.to.value || 0, trap: st.trap, hy: st.hy, n: st.n });
      const count = () => { const c = V.drillCount(opts()); V.$("#d-avail", el).textContent = V.num(c) + " lines available"; };
      fillSheets(); count();
      form.addEventListener("change", e => { if (e.target === form.subj) fillSheets(); count(); });
      form.addEventListener("click", e => {
        const f = e.target.closest("[data-flag]"); if (f) { st[f.dataset.flag] = !st[f.dataset.flag]; f.setAttribute("aria-pressed", String(st[f.dataset.flag])); count(); }
        const nb = e.target.closest("[data-n]"); if (nb) { st.n = +nb.dataset.n; V.$$("[data-n]", form).forEach(b => b.setAttribute("aria-pressed", String(b === nb))); }
      });
      form.addEventListener("submit", e => {
        e.preventDefault(); const o = opts(), q = new URLSearchParams();
        q.set("preset", o.preset); ["subj", "sheet", "exam"].forEach(k => { if (o[k]) q.set(k, o[k]); }); if (o.from) q.set("from", o.from); if (o.to) q.set("to", o.to);
        if (o.trap) q.set("trap", "1"); if (o.hy) q.set("hy", "1"); q.set("n", o.n);
        V.go("#/recall/session?" + q.toString());
      });
    }
  };

  /* ================= Drill session ================= */
  let ds = null;
  V.views.drill = {
    mode: "session", title: () => "Recall drill",
    render(p) {
      const q = p.q, preset = q.preset || "mix";
      const o = { preset, subj: q.subj, sheet: q.sheet, exam: q.exam, from: +q.from || 0, to: +q.to || 0, trap: q.trap === "1" || preset === "trap", hy: q.hy === "1", n: +q.n || S.settings.drillLength };
      if (preset === "missed") o.keys = V.lastMissed || [];
      const names = { mix: "Mixed recall", pyq: "PYQ recall", trap: "Trap drill", weak: "Weak areas", sheet: "Sheet drill", missed: "Missed lines", custom: "Custom drill" };
      let title = names[preset] || "Recall";
      if (o.exam) title += " · " + M.EXAMS.find(x => x.id === o.exam).label;
      if (o.sheet && C.sheetByKey[o.sheet]) title += " · " + C.sheetByKey[o.sheet].tab;
      ds = { list: V.buildDrill(o), i: 0, res: [], revealed: false, title };
      const accent = ds.list[0] ? ds.list[0].ln.sec.subj.accent : "";
      if (!ds.list.length) return sessShell(title, accent).replace('<div id="card"></div>', '<div class="prompt"><h1 class="h1" style="margin-top:30px">No prompts match</h1><p class="lede">Nothing in the notes fits that combination. Widen the filters.</p><p><a class="btn" href="#/recall">Back to Recall</a></p></div>');
      return sessShell(title, accent);
    },
    mount(el) { if (!ds || !ds.list.length) return null; ds.el = el; drawPrompt(); el.addEventListener("click", onDrillClick); return () => { ds = null; }; },
    key(e) {
      if (!ds || !ds.list.length || ds.i >= ds.list.length) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!ds.revealed) reveal(); }
      else if (/^[1-4]$/.test(e.key) && ds.revealed) rateItem(+e.key);
      else if (e.key === "s") { ds.i++; drawPrompt(); }
    }
  };
  function drawPrompt() {
    const card = V.$("#card", ds.el), foot = V.$("#foot", ds.el);
    progress(ds.i, ds.list.length);
    if (ds.i >= ds.list.length) return drillSummary(card, foot);
    const { ln, v } = ds.list[ds.i], sec = ln.sec;
    ds.revealed = false;
    ds.el.firstChild.style.setProperty("--subj", sec.subj.accent);
    const it = S.items[ln.key], why = v.t === "why";
    card.innerHTML = '<div class="prompt recall card-anim">' +
      '<div class="sess-crumb"><span class="dot"></span>' + V.esc(sec.subj.name + " › " + sec.sheet.tab) + '<a href="' + C.lineHref(ln) + '" style="margin-left:auto">Open in notes ' + V.icon("out", "sm") + "</a></div>" +
      '<div class="kind">' + V.icon(why ? "question" : v.t === "rev" || v.t === "col" ? "target" : v.t === "qa" ? "flag" : "recall", "sm") + V.esc(C.variantLabel(ln, v)) + (it ? '<span class="muted" style="font-weight:600;letter-spacing:0;text-transform:none;margin-left:auto">seen ' + it.n + "× · last " + LABEL[it.lr] + "</span>" : "") + "</div>" +
      '<div class="sec-h">' + sec.subj.M.fmt(sec.h) + "</div>" + C.promptHTML(ln, v, S.settings.listPref) +
      (why ? '<p class="why-ask">Explain it before you move on — the reason, the rule or the history behind it. Say it in your head, or write it in your notes for this section.</p>' + V.noteBox(sec.key, false) : "") + "</div>";
    V.markHidden(card, { hideTags: S.settings.hideTags });
    const first = V.$(".hid", card); if (first) first.classList.add("next");
    foot.innerHTML = '<span class="hint"><span>' + (why ? "Explain it in your own words first" : "Answer in your head first") + '</span><span><kbd>S</kbd> skip</span></span><button class="btn primary lg" data-reveal>' + V.icon(why ? "check" : "eye", "sm") + (why ? "Done — rate it" : "Reveal") + " <kbd style=\"margin-left:6px;background:transparent;color:inherit;border-color:currentColor;opacity:.7\">Space</kbd></button>";
    window.scrollTo(0, 0);
  }
  function reveal() {
    const card = V.$("#card", ds.el); revealAllIn(card); ds.revealed = true;
    V.$("#foot", ds.el).innerHTML = '<span class="hint"><span>' + (ds.list[ds.i].v.t === "why" ? "How well could you explain it?" : "How did it go?") + "</span></span>" + rateBtns(null);
  }
  function rateItem(r) {
    const { ln } = ds.list[ds.i]; S.rateItem(ln.key, ln.sec.key, r); ds.res.push([ln, r]); ds.i++;
    V.$("#card", ds.el).style.opacity = "0"; setTimeout(() => { if (ds) { V.$("#card", ds.el).style.opacity = ""; drawPrompt(); } }, 120);
  }
  function onDrillClick(e) {
    const nb = e.target.closest('[data-act="note"]'); if (nb) { V.toggleNote(nb); return; }
    if (e.target.closest("[data-reveal]")) { reveal(); return; }
    const r = e.target.closest("[data-rate]"); if (r) { rateItem(+r.dataset.rate); return; }
    const h = e.target.closest(".hid"); if (h && !ds.revealed) { h.classList.add("shown"); const card = V.$("#card", ds.el); V.$$(".hid.next", card).forEach(x => x.classList.remove("next")); const nx = V.$(".hid:not(.shown)", card); if (nx) nx.classList.add("next"); else reveal(); }
  }
  function drillSummary(card, foot) {
    const c = [0, 0, 0, 0, 0]; ds.res.forEach(([, r]) => c[r]++);
    const missed = ds.res.filter(([, r]) => r <= 2); V.lastMissed = missed.map(([ln]) => ln.key);
    const n = ds.res.length;
    card.innerHTML = '<div class="prompt card-anim" style="font-size:16px"><div class="eyebrow" style="margin-top:24px">' + V.esc(ds.title) + '</div><h1 class="h1">' + (n ? V.pct(c[3] + c[4], n) + "% recalled" : "Session ended") + '</h1><p class="lede">' + V.plural(n, "prompt") + " across " + V.plural(new Set(ds.res.map(([ln]) => ln.sec.sheet.key)).size, "sheet") + ".</p>" +
      V.ratingBar({ a: c[1], h: c[2], g: c[3], e: c[4] }) +
      (missed.length ? '<section class="block-sec" style="margin-top:22px"><h2 class="h2">Missed — go back to the source</h2>' + missed.map(([ln, r]) => '<a class="hit" href="' + C.lineHref(ln) + '"><div class="hp"><span class="rate-dot r' + r + '"></span>' + V.esc(C.crumb(ln.sec)) + '</div><div class="hx">' + V.lineHTML(ln, []) + "</div></a>").join("") + "</section>" : "") +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">' + (missed.length ? '<a class="btn primary" href="#/recall/session?preset=missed">' + V.icon("revise", "sm") + "Drill the " + missed.length + " missed again</a>" : "") +
      '<a class="btn" href="#/recall/session?preset=mix" data-again>' + V.icon("shuffle", "sm") + 'New mixed drill</a><a class="btn ghost" href="#/recall">Recall hub</a></div></div>';
    foot.parentNode.hidden = true;
    V.$$("a[href^='#/recall/session']", card).forEach(a => a.addEventListener("click", e => { if (location.hash === a.getAttribute("href")) { e.preventDefault(); V.rerender(); } }));
  }

  /* ================= My cards — written by the student, scheduled by S.rate as "card:<id>" ================= */
  const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;
  const cardHref = c => { const ln = c.lineKey && C.lineByKey[c.lineKey], sec = C.secByKey[c.sectionKey]; return ln ? C.lineHref(ln) : sec ? C.secHref(sec) : null; };
  const cardCrumb = c => { const sec = C.secByKey[c.sectionKey]; return sec ? C.crumb(sec) : "Section no longer in the notes"; };

  V.cardDialog = (secKey, lineKey, id, onSave) => {
    const c = id && S.cards[id]; if (c) { secKey = c.sectionKey; lineKey = c.lineKey; }
    const sec = C.secByKey[secKey], lines = sec ? sec.lines : [];
    const html = '<p class="muted" style="margin:0 0 16px;font-size:13.5px">' + V.esc(c ? cardCrumb(c) : sec ? C.crumb(sec) : "") + "</p>" +
      (lines.length ? '<div class="fld"><label for="cd-line">From</label><select class="select" id="cd-line"><option value="">The whole section</option>' + lines.map(ln => '<option value="' + V.escAttr(ln.key) + '"' + (ln.key === lineKey ? " selected" : "") + ">" + V.esc(trunc(ln.plain, 90)) + "</option>").join("") + '</select><div class="cd-src" id="cd-src" hidden></div></div>' : "") +
      '<div class="fld"><label for="cd-q">Prompt</label><textarea class="input cd-in" id="cd-q" rows="2" placeholder="A question in your own words">' + V.esc(c ? c.prompt : "") + "</textarea></div>" +
      '<div class="fld"><label for="cd-a">Answer</label><textarea class="input cd-in" id="cd-a" rows="3" placeholder="What you should be able to say — check it against the line">' + V.esc(c ? c.answer : "") + "</textarea></div>" +
      '<div class="cd-foot"><span class="muted">' + (c ? "" : "It comes up for review tomorrow, then on the same schedule as sections.") + '</span><button class="btn" data-close>Cancel</button><button class="btn primary" id="cd-save" disabled>Save card</button></div>';
    V.dialog(c ? "Edit card" : "Write a card", html, (d, close) => {
      const sel = V.$("#cd-line", d), src = V.$("#cd-src", d), q = V.$("#cd-q", d), a = V.$("#cd-a", d), save = V.$("#cd-save", d);
      const showSrc = () => { if (!src) return; const ln = C.lineByKey[sel.value]; src.hidden = !ln; src.innerHTML = ln ? V.lineHTML(ln, []) : ""; };
      const ok = () => { save.disabled = !(q.value.trim() && a.value.trim()); };
      const done = () => {
        if (save.disabled) return;
        const nid = S.saveCard(id, { sectionKey: secKey, lineKey: sel ? sel.value || null : lineKey || null, prompt: q.value.trim(), answer: a.value.trim() });
        close(); V.toast(c ? "Card updated" : "Card saved — first review tomorrow"); V.renderNav(); if (onSave) onSave(nid);
      };
      if (sel) sel.addEventListener("change", showSrc);
      d.addEventListener("input", ok);
      d.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done(); } });
      save.addEventListener("click", done);
      showSrc(); ok(); q.focus();
    });
  };

  V.views.cards = {
    title: () => "My cards",
    render() {
      const t = V.today(), ids = Object.keys(S.cards), due = S.dueCards(), n = Math.min(due.length, S.settings.drillLength);
      const dueIn = id => { const e = S.srs["card:" + id]; return e ? e.due - t : 0; };
      let o = '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Active recall</div><h1 class="h1">My cards</h1><p class="lede">Prompts you wrote yourself from the notes. Writing the question is part of learning it; reviews follow the same schedule as sections.</p></div>' +
        (n ? '<a class="btn primary lg" href="#/cards/session">' + V.icon("recall", "sm") + "Review · " + V.plural(n, "card") + "</a>" : '<button class="btn lg" disabled>Nothing due</button>') + "</div>";
      if (!ids.length) return o + '<div class="empty">No cards yet. In the reader, click a line, then choose <b>Write a card</b> under its section.</div></div>';
      o += '<div class="stat-line"><div class="fig"><div class="v">' + due.length + '</div><div class="l">due now</div></div><div class="fig"><div class="v">' + ids.length + '</div><div class="l">cards written</div></div></div>';
      o += '<section class="block-sec"><h2 class="h2">All cards</h2>' + ids.sort((a, b) => dueIn(a) - dueIn(b) || S.cards[b].createdAt - S.cards[a].createdAt).map(id => {
        const c = S.cards[id], d = dueIn(id), href = cardHref(c);
        const main = '<span class="rl-main"><div class="rl-t">' + V.esc(c.prompt) + '</div><div class="rl-s">' + V.esc(cardCrumb(c)) + '</div></span><span class="rl-end">' + (d <= 0 ? '<span class="tag due">due</span>' : "in " + V.ivl(d)) + "</span>";
        return '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;min-width:0">' + (href ? '<a class="rowlink" href="' + href + '" title="Open in notes">' + main + V.icon("right", "sm go") + "</a>" : '<div class="rowlink">' + main + "</div>") + "</div>" +
          '<button class="ibtn" data-edit="' + V.escAttr(id) + '" aria-label="Edit card" title="Edit">' + V.icon("pen", "sm") + '</button><button class="ibtn" data-del="' + V.escAttr(id) + '" aria-label="Delete card" title="Delete">' + V.icon("trash", "sm") + "</button></div>";
      }).join("") + "</section>";
      return o + "</div>";
    },
    mount(el) {
      el.addEventListener("click", e => {
        const ed = e.target.closest("[data-edit]"); if (ed) { V.cardDialog(null, null, ed.dataset.edit, () => V.rerender()); return; }
        const del = e.target.closest("[data-del]");
        if (del) { const undo = S.deleteCard(del.dataset.del); V.rerender(); V.toast("Card deleted", { label: "Undo", run: () => { undo(); if (V.app.name === "cards") V.rerender(); else V.renderNav(); } }); }
      });
    }
  };

  let cs = null;
  V.views.cardSession = {
    mode: "session", title: () => "My cards",
    render() {
      const t = V.today(), dueOf = id => (S.srs["card:" + id] || {}).due || t;
      cs = { ids: S.dueCards().sort((a, b) => dueOf(a) - dueOf(b)).slice(0, S.settings.drillLength), i: 0, res: [], revealed: false };
      if (!cs.ids.length) return sessShell("My cards", "").replace('<div id="card"></div>', '<div class="prompt"><h1 class="h1" style="margin-top:30px">No cards due</h1><p class="lede">A new card comes up the day after you write it.</p><p><a class="btn" href="#/cards">My cards</a></p></div>');
      const sec = C.secByKey[S.cards[cs.ids[0]].sectionKey];
      return sessShell("My cards", sec ? sec.subj.accent : "");
    },
    mount(el) { if (!cs || !cs.ids.length) return null; cs.el = el; drawCard(); el.addEventListener("click", onCardClick); return () => { cs = null; }; },
    key(e) {
      if (!cs || !cs.ids.length || cs.i >= cs.ids.length) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!cs.revealed) revealCard(); }
      else if (/^[1-4]$/.test(e.key) && cs.revealed) rateCard(+e.key);
      else if (e.key === "s") { cs.i++; drawCard(); }
    }
  };
  function drawCard() {
    const card = V.$("#card", cs.el), foot = V.$("#foot", cs.el);
    progress(cs.i, cs.ids.length);
    if (cs.i >= cs.ids.length) return cardSummary(card, foot);
    const id = cs.ids[cs.i], c = S.cards[id], sec = C.secByKey[c.sectionKey], ln = c.lineKey && C.lineByKey[c.lineKey], href = cardHref(c);
    cs.revealed = false;
    cs.el.firstChild.style.setProperty("--subj", sec ? sec.subj.accent : "var(--accent)");
    card.innerHTML = '<div class="prompt recall card-anim">' +
      '<div class="sess-crumb"><span class="dot"></span>' + V.esc(sec ? sec.subj.name + " › " + sec.sheet.tab : cardCrumb(c)) + " · " + lastInfo("card:" + id) + (href ? '<a href="' + href + '" style="margin-left:auto">Open in notes ' + V.icon("out", "sm") + "</a>" : "") + "</div>" +
      '<div class="kind">' + V.icon("pen", "sm") + "Your card</div>" + (sec ? '<div class="sec-h">' + sec.subj.M.fmt(sec.h) + "</div>" : "") +
      '<div class="mycard"><div class="mycard-q">' + V.esc(c.prompt) + '</div><div class="mycard-a"><span class="hid next">' + V.esc(c.answer) + "</span></div></div>" +
      (ln ? '<div class="mycard-src" hidden><div class="lbl">From the notes</div>' + V.lineHTML(ln, []) + "</div>" : "") + "</div>";
    foot.innerHTML = '<span class="hint"><span>Answer in your head first</span><span><kbd>S</kbd> skip</span></span><button class="btn primary lg" data-reveal>' + V.icon("eye", "sm") + "Reveal <kbd style=\"margin-left:6px;background:transparent;color:inherit;border-color:currentColor;opacity:.7\">Space</kbd></button>";
    window.scrollTo(0, 0);
  }
  function revealCard() {
    const card = V.$("#card", cs.el), src = V.$(".mycard-src", card); revealAllIn(card); if (src) src.hidden = false; cs.revealed = true;
    V.$("#foot", cs.el).innerHTML = '<span class="hint"><span>You wrote both sides — rate honestly</span></span>' + rateBtns(S.preview("card:" + cs.ids[cs.i]));
  }
  function rateCard(r) {
    const id = cs.ids[cs.i]; S.rate("card:" + id, r, "card"); cs.res.push([id, r]); cs.i++;
    V.$("#card", cs.el).style.opacity = "0"; setTimeout(() => { if (cs) { V.$("#card", cs.el).style.opacity = ""; drawCard(); } }, 120);
  }
  function onCardClick(e) {
    if (e.target.closest("[data-reveal]")) { revealCard(); return; }
    const r = e.target.closest("[data-rate]"); if (r) { rateCard(+r.dataset.rate); return; }
    if (e.target.closest(".hid") && !cs.revealed) revealCard();
  }
  function cardSummary(card, foot) {
    const c = [0, 0, 0, 0, 0]; cs.res.forEach(([, r]) => c[r]++);
    const left = S.dueCards().length, missed = cs.res.filter(([id, r]) => r <= 2 && S.cards[id]);
    card.innerHTML = '<div class="prompt card-anim" style="font-size:16px"><div class="eyebrow" style="margin-top:24px">My cards</div><h1 class="h1">' + V.plural(cs.res.length, "card") + " reviewed</h1>" +
      V.ratingBar({ a: c[1], h: c[2], g: c[3], e: c[4] }) +
      (missed.length ? '<section class="block-sec" style="margin-top:22px"><h2 class="h2">Needs another look</h2>' + missed.map(([id, r]) => { const cd = S.cards[id];
        return '<a class="rowlink" href="' + (cardHref(cd) || "#/cards") + '"><span class="rate-dot r' + r + '"></span><span class="rl-main"><div class="rl-t">' + V.esc(cd.prompt) + '</div><div class="rl-s">' + V.esc(cardCrumb(cd)) + "</div></span>" + V.icon("right", "sm go") + "</a>"; }).join("") + "</section>" : "") +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">' + (left ? '<a class="btn primary" href="#/cards/session" data-again>' + V.icon("revise", "sm") + "Continue · " + left + " still due</a>" : "") +
      '<a class="btn" href="#/cards">' + V.icon("pen", "sm") + 'My cards</a><a class="btn ghost" href="#/recall">Recall hub</a></div></div>';
    foot.parentNode.hidden = true;
    const again = V.$("[data-again]", card); if (again) again.addEventListener("click", e => { e.preventDefault(); V.rerender(); });
  }
})();
