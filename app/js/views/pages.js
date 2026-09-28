/* Study Vault — dashboard, library, subject overview, bookmarks, settings (+ small chart helper). */
(function () {
  "use strict";
  const V = window.V, S = V.S, C = V.C, M = window.VaultMarkup;

  /* ---------- charts: single-series columns (thin marks, 4px rounded data-end, hover tooltip) ---------- */
  V.columns = (data, o) => {
    o = Object.assign({ h: 120, w: 560, label: true, pad: 22 }, o || {});
    const max = Math.max(1, ...data.map(d => d.v)), peakAt = data.map(d => d.v).lastIndexOf(max), n = data.length, slot = (o.w) / n, bw = Math.min(22, slot * 0.62), H = o.h - o.pad;
    let s = '<svg viewBox="0 0 ' + o.w + " " + o.h + '" role="img" aria-label="' + V.escAttr(o.aria || "Chart") + '" preserveAspectRatio="none" style="height:' + o.h + 'px">';
    s += '<line class="base" x1="0" x2="' + o.w + '" y1="' + H + '" y2="' + H + '"/>';
    data.forEach((d, i) => {
      const x = i * slot + (slot - bw) / 2, h = d.v ? Math.max(3, (d.v / max) * (H - 16)) : 0, y = H - h, r = Math.min(4, h, bw / 2);
      s += '<g' + (o.click ? ' style="cursor:pointer" data-click="' + i + '"' : "") + '><rect class="hit" x="' + (i * slot) + '" y="0" width="' + slot + '" height="' + o.h + '" data-tip="' + V.escAttr(d.tip || String(d.v)) + '" data-x="' + (x + bw / 2) + '"/>';
      if (h) s += '<path class="bar' + (d.dim ? " dim" : "") + '" d="M' + x + "," + H + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + bw - r) + "Q" + (x + bw) + "," + y + " " + (x + bw) + "," + (y + r) + "V" + H + 'Z" pointer-events="none"/>';
      if (o.label && d.l != null) s += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (o.h - 5) + '" text-anchor="middle">' + V.esc(d.l) + "</text>";
      if (d.v && i === peakAt && o.peak !== false) s += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle" style="fill:var(--ink-2)">' + d.v + "</text>";
    });
    return '<div class="chart" data-w="' + o.w + '">' + s + '</svg><div class="tip" role="tooltip"></div></div>';
  };
  document.addEventListener("mouseover", e => {
    const h = e.target.closest && e.target.closest(".chart [data-tip]"); if (!h) return;
    const ch = h.closest(".chart"), tip = V.$(".tip", ch), svg = V.$("svg", ch);
    const sc = svg.getBoundingClientRect().width / +ch.dataset.w;
    tip.textContent = h.dataset.tip; tip.style.left = (+h.dataset.x * sc) + "px"; tip.style.top = "8px"; tip.classList.add("on");
    h.addEventListener("mouseleave", () => tip.classList.remove("on"), { once: true });
  });

  const RL = ["Again", "Hard", "Good", "Easy"], RC = ["var(--r-again)", "var(--r-hard)", "var(--r-good)", "var(--r-easy)"];
  V.ratingBar = t => {
    const v = [t.a, t.h, t.g, t.e], tot = v.reduce((a, b) => a + b, 0);
    if (!tot) return "";
    return '<div class="stackbar" role="img" aria-label="Ratings: ' + RL.map((l, i) => l + " " + v[i]).join(", ") + '">' + v.map((x, i) => x ? '<i style="flex-grow:' + x + ";background:" + RC[i] + '" title="' + RL[i] + ": " + x + '"></i>' : "").join("") + "</div>" +
      '<div class="lgd">' + v.map((x, i) => '<span><i class="sw" style="background:' + RC[i] + '"></i>' + RL[i] + " <b>" + x + "</b></span>").join("") + "</div>";
  };

  const secRow = (sec, end, extra) => '<a class="rowlink" href="' + C.secHref(sec) + '" style="--subj:' + sec.subj.accent + '"><span class="st ' + S.state(sec.key) + '"></span><span class="rl-main"><div class="rl-t">' + V.esc(sec.hPlain) + '</div><div class="rl-s">' + V.esc(sec.subj.name + " › " + sec.sheet.tab) + (extra || "") + "</div></span>" + (end ? '<span class="rl-end">' + end + "</span>" : "") + V.icon("right", "sm go") + "</a>";
  V.secRow = secRow;
  const dueSecs = () => S.dueKeys().map(k => C.secByKey[k]).filter(Boolean);
  const overdue = sec => { const d = V.today() - S.srs[sec.key].due; return d <= 0 ? "due today" : d === 1 ? "1 day overdue" : d + " days overdue"; };

  /* ================= Dashboard ================= */
  V.views.dashboard = {
    title: () => "Dashboard",
    render() {
      const h = new Date().getHours();
      const greet = h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
      const due = dueSecs(), weak = S.weakKeys().map(k => C.secByKey[k]).filter(Boolean), cardsDue = S.dueCards().length;
      const last = S.progress.last, lsh = last && C.sheetByKey[last.k];
      const totalLines = C.subjects.reduce((a, s) => a + s.stats.lines, 0);
      const ls = S.lastStudied();
      let sum;
      if (!ls) sum = "Your vault holds " + V.plural(C.subjects.length, "subject") + ", " + V.plural(C.sheets.length, "sheet") + " and " + V.num(totalLines) + " lines. Start reading — revision and recall build up from what you study.";
      else sum = [due.length ? V.plural(due.length, "section") + " due for revision" : "Nothing due for revision", cardsDue ? V.plural(cardsDue, "card") + " due" : null, weak.length ? V.plural(weak.length, "weak area") : null, "last studied " + V.ago(ls)].filter(Boolean).join(" · ");

      let o = '<div class="page"><div class="page-head"><div class="grow"><div class="eyebrow">' + V.dateLong(Date.now()) + '</div><h1 class="hello">' + greet + '</h1><div class="today">' + sum + "</div></div>" +
        '<button class="btn" data-act="palette">' + V.icon("search", "sm") + "Search<kbd style=\"margin-left:4px\">Ctrl K</kbd></button></div>";

      /* continue */
      if (lsh) {
        const sec = C.secByKey[lsh.key + "/" + last.b], pr = C.sheetProgress(lsh);
        o += '<a class="continue" href="' + C.sheetHref(lsh, "resume=1") + '" style="--subj:' + lsh.subj.accent + '"><div class="cx"><div class="c1"><span class="dot"></span>Continue where you left off · ' + V.ago(last.at) + '</div><div class="c2">' + V.esc(lsh.title) + '</div><div class="c3">' + V.esc(lsh.subj.name + (sec ? " › " + sec.hPlain : "")) + "</div>" +
          (pr.total ? '<div style="display:flex;align-items:center;gap:10px;margin-top:12px;font-size:12.5px;color:var(--ink-3)"><span class="meter" style="width:200px;margin:0"><i style="width:' + V.pct(pr.read, pr.total) + '%"></i></span>' + pr.read + " of " + pr.total + " sections read</div>" : "") + '</div><span class="go">' + V.icon("arrowR") + "</span></a>";
      } else {
        const first = C.sheets.find(sh => sh.type === "notes" && sh.pri === "p1") || C.sheets[0];
        if (first) o += '<a class="continue" href="' + C.sheetHref(first) + '" style="--subj:' + first.subj.accent + '"><div class="cx"><div class="c1"><span class="dot"></span>Start here · priority 1 sheet</div><div class="c2">' + V.esc(first.title) + '</div><div class="c3">' + V.esc(first.subj.name + " · " + first.sections.filter(s => !s.ref).length + " sections · " + first.lineCount + " lines") + '</div></div><span class="go">' + V.icon("arrowR") + "</span></a>";
      }

      o += '<div class="grid-2"><div>';
      /* due */
      o += '<section class="block-sec"><h2 class="h2">Revision due' + (due.length ? '<a class="aside" href="#/revise">Queue ›</a>' : "") + "</h2>";
      if (due.length) {
        const q = V.orderQueue(due).slice(0, 6);
        o += q.map(sec => secRow(sec, overdue(sec))).join("");
        o += '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary" href="#/revise/session">' + V.icon("revise", "sm") + "Start revision · " + Math.min(due.length, S.settings.sessionSize) + " sections</a>" + '<a class="btn" href="#/recall/session?preset=mix">' + V.icon("shuffle", "sm") + "Mixed recall</a></div>";
      } else {
        const up = S.upcoming(7, k => !!C.secByKey[k]), nx = up.findIndex(x => x > 0);
        o += '<div class="empty">' + (Object.keys(S.srs).length ? "You're clear for today." + (nx >= 0 ? " Next: <b>" + up[nx] + "</b> section" + (up[nx] > 1 ? "s" : "") + " " + (nx === 0 ? "tomorrow" : "in " + (nx + 1) + " days") + "." : "") :
          "Sections enter the queue after you read them (first review the next day) or rate them in Recall mode.") + "</div>";
      }
      if (cardsDue) o += '<a class="rowlink" href="#/cards/session" style="margin-top:8px"><span class="st due"></span><span class="rl-main"><div class="rl-t">Your cards</div><div class="rl-s">Prompts you wrote yourself</div></span><span class="rl-end">' + cardsDue + " due</span>" + V.icon("right", "sm go") + "</a>";
      o += "</section>";

      /* subjects */
      o += '<section class="block-sec"><h2 class="h2">Subjects<a class="aside" href="#/subjects">Library ›</a></h2>' + C.subjects.map(subjRow).join("") + "</section>";
      o += "</div><div>";

      /* recall perf */
      const days = S.daysRange(7), tot = S.ratingTotals(7), n = tot.a + tot.h + tot.g + tot.e;
      o += '<section class="block-sec"><h2 class="h2">Recall · last 7 days</h2>';
      if (n) {
        o += '<div class="stat-line"><div class="fig"><div class="v">' + n + '</div><div class="l">answers rated</div></div><div class="fig"><div class="v">' + V.pct(tot.g + tot.e, n) + '%</div><div class="l">recalled (good/easy)</div></div></div>';
        o += V.columns(days.map(([d, x]) => { const t = x ? x.a + x.h + x.g + x.e : 0, dt = V.dayDate(d); return { v: t, l: dt.toLocaleDateString("en-GB", { weekday: "narrow" }), tip: dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " · " + t + " rated" + (t ? " · " + V.pct(x.g + x.e, t) + "% recalled" : "") }; }), { h: 96, w: 320, aria: "Answers rated per day, last 7 days" });
        o += V.ratingBar(tot);
      } else o += '<div class="empty">No recall yet. Switch a sheet to <b>Recall</b> mode, or try a <a href="#/recall/session?preset=mix">mixed recall</a> — prompts come straight from your notes.</div>';
      o += "</section>";

      /* weak / most reviewed */
      const most = Object.keys(S.srs).map(k => [C.secByKey[k], (S.srs[k].hist || []).length]).filter(x => x[0] && x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
      o += '<section class="block-sec"><h2 class="h2">Focus areas<span class="aside"><span class="seg" style="transform:scale(.92);transform-origin:right"><button data-tab="weak" aria-pressed="true">Weak</button><button data-tab="most" aria-pressed="false">Most reviewed</button></span></span></h2>' +
        '<div data-pane="weak">' + (weak.length ? weak.slice(0, 5).map(sec => secRow(sec, "")).join("") + (weak.length ? '<div style="margin-top:10px"><a class="btn sm" href="#/recall/session?preset=weak">' + V.icon("target", "sm") + "Drill weak areas</a></div>" : "") : '<div class="empty">Sections you miss (Again / Hard) show up here.</div>') + "</div>" +
        '<div data-pane="most" hidden>' + (most.length ? most.map(([sec, c]) => secRow(sec, c + "×")).join("") : '<div class="empty">Your most-reviewed sections appear here.</div>') + "</div></section>";

      /* recent */
      const rec = S.progress.recent.map(k => C.sheetByKey[k]).filter(Boolean).slice(0, 5);
      if (rec.length) o += '<section class="block-sec"><h2 class="h2">Recently visited</h2>' + rec.map(sh => '<a class="rowlink" href="' + C.sheetHref(sh) + '" style="--subj:' + sh.subj.accent + '">' + V.ring((C.sheetProgress(sh).read || 0) / (C.sheetProgress(sh).total || 1)) + '<span class="rl-main"><div class="rl-t">' + V.esc(sh.title) + '</div><div class="rl-s">' + V.esc(sh.subj.name) + '</div></span><span class="rl-end">' + V.ago((S.progress.sheets[sh.key] || {}).l) + "</span></a>").join("") + "</section>";
      const bms = Object.keys(S.progress.bookmarks).map(k => C.secByKey[k]).filter(Boolean);
      if (bms.length) o += '<section class="block-sec"><h2 class="h2">Bookmarks<a class="aside" href="#/bookmarks">All ›</a></h2>' + bms.slice(-4).reverse().map(sec => secRow(sec, "")).join("") + "</section>";
      return o + "</div></div></div>";
    },
    mount(el) {
      el.addEventListener("click", e => {
        const t = e.target.closest("[data-tab]"); if (!t) return;
        V.$$("[data-tab]", el).forEach(b => b.setAttribute("aria-pressed", String(b === t)));
        V.$$("[data-pane]", el).forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
      });
    }
  };

  function subjRow(s) {
    const p = C.subjectProgress(s), isNew = Date.now() - Date.parse(s.addedAt) < 21 * 86400000;
    return '<a class="subj-row" href="#/s/' + s.id + '" style="--subj:' + s.accent + '"><div class="sn"><span class="dot" style="width:11px;height:11px"></span>' + V.esc(s.name) + (isNew ? '<span class="tag new">New</span>' : "") + "</div>" +
      '<div class="sd">' + V.plural(s.sheets.length, "sheet") + " · " + V.num(s.stats.sections) + " sections · " + V.num(s.stats.lines) + " lines" + (s.version ? " · " + V.esc(s.version) : "") + "</div>" +
      '<div class="bars"><span style="display:inline-flex;align-items:center;gap:8px"><span class="meter" title="Read"><i style="width:' + V.pct(p.read, p.total) + '%"></i></span>' + V.pct(p.read, p.total) + '% read</span><span style="display:inline-flex;align-items:center;gap:8px"><span class="meter" style="width:120px" title="Reviewed"><i class="rev" style="width:' + V.pct(p.rev, p.total) + '%"></i></span>' + V.pct(p.rev, p.total) + "% reviewed</span></div>" +
      '<div class="sm">' + (p.due ? '<span class="tag due">' + p.due + " due</span>" : "") + "<span>" + (s.updated ? "Updated " + V.esc(s.updated) : "Added " + new Date(s.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })) + "</span></div></a>";
  }

  /* queue order: most overdue relative to interval, then priority; interleaved across sheets */
  V.orderQueue = secs => {
    const t = V.today(), pri = s => ({ p1: 0, p2: 1, p3: 2 })[s.sheet.pri] || 1;
    const sorted = secs.slice().sort((a, b) => {
      const ea = S.srs[a.key], eb = S.srs[b.key];
      const ra = (t - ea.due + 1) / (ea.ivl + 1) + S.weakness(a.key), rb = (t - eb.due + 1) / (eb.ivl + 1) + S.weakness(b.key);
      return rb - ra || pri(a) - pri(b) || a.sheet.index - b.sheet.index || a.idx - b.idx;
    });
    if (!S.settings.interleave) return sorted;
    const out = [], pool = sorted.slice();
    while (pool.length) { const prev = out.length ? out[out.length - 1].sheet : null; let i = pool.findIndex(s => s.sheet !== prev); if (i < 0) i = 0; out.push(pool.splice(i, 1)[0]); }
    return out;
  };

  /* ================= Library ================= */
  V.views.library = {
    title: () => "Subjects",
    render() {
      return '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Library</div><h1 class="h1">Subjects</h1><p class="lede">Every subject shares the same reader, search, recall and revision. Notes stay exactly as supplied.</p></div></div>' +
        (C.subjects.length ? C.subjects.map(subjRow).join("") : '<div class="empty">No subjects built yet.</div>') +
        '<section class="block-sec" style="margin-top:28px"><h2 class="h2">Adding the next subject</h2><ol style="margin:0;padding-left:20px;color:var(--ink-2);line-height:1.8">' +
        "<li>Put the notes file (for example <b>Geography Master Sheets.html</b>) in the <b>sources</b> folder.</li><li>Double-click <b>Build Vault.cmd</b> (or run <code class=\"mono\">node tools/build.mjs</code>).</li><li>Reload this page. The build checks the vault shows every line exactly as the source does.</li></ol>" +
        '<p class="muted" style="font-size:13.5px">Optional: name, colour and order per subject in <b>vault.config.json</b>. Your progress is never touched by a rebuild.</p></section></div>';
    }
  };

  /* ================= Subject overview ================= */
  V.views.subject = {
    title: p => (C.bySubj[p.subj] || {}).name || "Subject",
    render(p) {
      const s = C.bySubj[p.subj];
      if (!s) return '<div class="page"><h1 class="h1">Subject not found</h1><p class="lede"><a href="#/subjects">All subjects</a></p></div>';
      const pr = C.subjectProgress(s), last = S.progress.last, lsh = last && C.sheetByKey[last.k] && C.sheetByKey[last.k].subj === s ? C.sheetByKey[last.k] : null;
      const start = lsh || s.sheets.find(sh => sh.type === "notes");
      let o = '<div class="page" style="--subj:' + s.accent + '"><div class="page-head"><div class="grow"><div class="eyebrow"><span class="dot"></span>Subject' + (s.version ? " · " + V.esc(s.version) : "") + (s.updated ? " · updated " + V.esc(s.updated) : "") + '</div><h1 class="h1">' + V.esc(s.name) + '</h1><p class="lede">' + V.esc(s.description || s.title) + "</p>" +
        (s.sheet ? '<p class="lede" style="font-size:14px"><a href="' + V.escAttr(s.sheet) + '">Open the original notes file</a> — the sheet as written, also available offline</p>' : "") + "</div></div>";
      o += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:-6px 0 26px">' + (start ? '<a class="btn primary" href="' + C.sheetHref(start, lsh ? "resume=1" : "") + '">' + V.icon("book", "sm") + (lsh ? "Continue reading" : "Start reading") + "</a>" : "") +
        (pr.due ? '<a class="btn" href="#/revise/session?subj=' + s.id + '">' + V.icon("revise", "sm") + "Revise " + pr.due + " due</a>" : "") +
        '<a class="btn" href="#/recall/session?preset=mix&subj=' + s.id + '">' + V.icon("shuffle", "sm") + "Mixed recall</a>" +
        '<a class="btn" href="#/pyq?subj=' + s.id + '">' + V.icon("target", "sm") + "PYQs</a></div>";
      o += '<div class="stat-line" style="margin-bottom:26px"><div class="fig"><div class="v">' + s.sheets.length + '</div><div class="l">sheets</div></div><div class="fig"><div class="v">' + s.stats.sections + '</div><div class="l">sections</div></div><div class="fig"><div class="v">' + V.num(s.stats.lines) + '</div><div class="l">lines</div></div>' + (s.stats.figures ? '<div class="fig"><div class="v">' + s.stats.figures + '</div><div class="l">figures</div></div>' : "") + '<div class="fig"><div class="v">' + V.pct(pr.read, pr.total) + '%</div><div class="l">read</div></div><div class="fig"><div class="v">' + V.pct(pr.rev, pr.total) + '%</div><div class="l">reviewed</div></div></div>';
      s.groups.forEach(g => {
        o += '<section class="block-sec"><h2 class="h2">' + V.esc(g.label) + '</h2><table class="ptable" style="table-layout:fixed"><thead><tr><th style="width:44px">#</th><th>Sheet</th><th style="width:56px">Pri</th><th style="width:64px;text-align:right">Lines</th><th style="width:26%">Read</th><th style="width:56px;text-align:right">Due</th></tr></thead><tbody>';
        g.sheets.forEach(id => {
          const sh = s.sheetById[id]; if (!sh) return; const sp = C.sheetProgress(sh);
          o += '<tr><td class="mono muted">' + String(sh.num).padStart(2, "0") + '</td><td><a href="' + C.sheetHref(sh) + '"><b>' + V.esc(sh.tab) + '</b></a><div class="muted" style="font-size:12.5px;font-weight:400">' + V.esc(sh.title) + "</div></td>" +
            '<td><span class="pri ' + sh.pri + '">' + sh.pri.toUpperCase() + '</span></td><td class="mono" style="text-align:right">' + sh.lineCount + "</td>" +
            "<td>" + (sp.total ? '<span style="display:flex;align-items:center;gap:8px"><span class="meter" style="flex:1"><i style="width:' + V.pct(sp.read, sp.total) + '%"></i></span><span class="mono muted" style="font-size:12px">' + sp.read + "/" + sp.total + "</span></span>" : '<span class="muted" style="font-size:12.5px">reference</span>') + "</td>" +
            '<td class="mono" style="text-align:right">' + (sp.due ? '<span class="tag due">' + sp.due + "</span>" : '<span class="muted">—</span>') + "</td></tr>";
        });
        o += "</tbody></table></section>";
      });
      o += '<section class="block-sec"><h2 class="h2">About these notes</h2><div style="font-size:14px;color:var(--ink-2);line-height:1.7">' +
        (s.sources && s.sources.length ? "<b>Sources merged into the notes</b><ul style=\"margin:6px 0 14px;padding-left:20px\">" + s.sources.map(x => "<li>" + V.esc(x) + "</li>").join("") + "</ul>" : "") +
        'Source file <span class="mono">' + V.esc(s.source.file) + "</span> · " + V.esc(s.source.adapter) + " format · built " + new Date(s.builtAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + '<br><span class="muted" style="font-size:12.5px">SHA-256 ' + V.esc(s.source.sha256) + "</span></div></section>";
      return o + "</div>";
    }
  };

  /* ================= Bookmarks ================= */
  V.views.bookmarks = {
    title: () => "Bookmarks",
    render() {
      const bms = Object.entries(S.progress.bookmarks).map(([k, v]) => [C.secByKey[k], v, k]).sort((a, b) => b[1].at - a[1].at);
      let o = '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Library</div><h1 class="h1">Bookmarks</h1><p class="lede">Sections you marked with ' + V.icon("bookmark", "sm") + " in the reader (or <kbd>b</kbd>).</p></div></div>";
      if (!bms.length) return o + '<div class="empty">No bookmarks yet.</div></div>';
      o += bms.map(([sec, v, k]) => sec ? '<div style="display:flex;align-items:center;gap:6px">' + '<div style="flex:1;min-width:0">' + secRow(sec, V.ago(v.at)) + '</div><button class="ibtn" data-rm="' + V.escAttr(k) + '" aria-label="Remove bookmark" title="Remove">' + V.icon("x", "sm") + "</button></div>"
        : '<div class="rowlink"><span class="rl-main"><div class="rl-t muted">Section no longer in the notes</div><div class="rl-s">' + V.esc(k) + '</div></span><button class="ibtn" data-rm="' + V.escAttr(k) + '" aria-label="Remove">' + V.icon("x", "sm") + "</button></div>").join("");
      return o + "</div>";
    },
    mount(el) { el.addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { S.toggleBookmark(b.dataset.rm); V.rerender(); } }); }
  };

  /* ================= Doubts ================= */
  V.views.doubts = {
    title: () => "Doubts",
    render() {
      const ds = Object.entries(S.doubts).map(([k, v]) => [C.secByKey[k], v, k]).sort((a, b) => b[1].at - a[1].at);
      let o = '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Library</div><h1 class="h1">Doubts</h1><p class="lede">Sections you flagged with ' + V.icon("question", "sm") + " in the reader (or <kbd>d</kbd>) to check or ask about. Clear the flag once it is settled.</p></div></div>";
      if (!ds.length) return o + '<div class="empty">No doubts flagged.</div></div>';
      const note = k => { const t = S.noteOf(k).trim().split("\n")[0]; return t ? " · “" + V.esc(t.length > 90 ? t.slice(0, 90) + "…" : t) + "”" : ""; };
      o += ds.map(([sec, v, k]) => sec ? '<div style="display:flex;align-items:center;gap:6px">' + '<div style="flex:1;min-width:0">' + secRow(sec, V.ago(v.at), note(k)) + '</div><button class="ibtn" data-rm="' + V.escAttr(k) + '" aria-label="Clear doubt" title="Clear">' + V.icon("x", "sm") + "</button></div>"
        : '<div class="rowlink"><span class="rl-main"><div class="rl-t muted">Section no longer in the notes</div><div class="rl-s">' + V.esc(k) + '</div></span><button class="ibtn" data-rm="' + V.escAttr(k) + '" aria-label="Clear">' + V.icon("x", "sm") + "</button></div>").join("");
      return o + "</div>";
    },
    mount(el) { el.addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) { S.toggleDoubt(b.dataset.rm); V.rerender(); } }); }
  };

  /* ================= Settings ================= */
  V.views.settings = {
    title: () => "Settings",
    render() {
      const s = S.settings;
      const seg = (key, opts) => '<div class="seg">' + opts.map(([v, l]) => '<button data-k="' + key + '" data-v="' + v + '" aria-pressed="' + (String(s[key]) === String(v)) + '">' + l + "</button>").join("") + "</div>";
      const tg = key => '<button class="toggle" data-t="' + key + '" aria-pressed="' + !!s[key] + '"></button>';
      const row = (t, sub, ctl) => '<div class="set-row"><div class="sl"><b>' + t + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" + ctl + "</div>";
      let o = '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Preferences</div><h1 class="h1">Settings</h1></div></div>';
      o += '<div class="set-group"><h3>Reading</h3>' +
        row("Theme", "Auto follows your system", seg("theme", [["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]])) +
        row("Text size", "Notes are never shrunk to fit", seg("size", [["s", "S"], ["m", "M"], ["l", "L"], ["xl", "XL"]])) +
        row("Line spacing", "", seg("density", [["comfortable", "Comfortable"], ["compact", "Compact"]])) +
        row("Line length", "Shorter lines are faster to scan", seg("width", [["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"]])) +
        row("Typeface", "Hyperlegible separates I/l/1 and O/0 — useful for Article numbers", seg("font", [["hyper", "Hyperlegible"], ["serif", "Serif"], ["system", "System"]])) +
        row("Section outline", "A quiet list of sections beside the notes (t)", tg("outline")) +
        row("Focus mode", "Hide the reader bar while scrolling down (f)", tg("focus")) +
        row("Keep navigation open while reading", "Wide screens only", tg("pinNav")) + "</div>";
      o += '<div class="set-group"><h3>Recall & revision</h3>' +
        row("Fact prompts", "Auto uses the cue already in each line (before “—”, “:”, “::”) and falls back to hiding key terms", seg("listPref", [["auto", "Auto"], ["cloze", "Key terms"]])) +
        row("Tables in Recall mode hide", "Per-table override from the section header", seg("tableHide", [["answers", "Answers"], ["first", "First column"]])) +
        row("Hide exam tags in drills", "Adds “which exam asked this?” to every prompt", tg("hideTags")) +
        row("Drill length", "", seg("drillLength", [[10, "10"], [20, "20"], [40, "40"]])) +
        row("Sections per revision session", "", seg("sessionSize", [[10, "10"], [15, "15"], [25, "25"], [50, "50"]])) +
        row("Interleave sheets in revision", "Alternate sheets instead of revising one sheet in a block", tg("interleave")) +
        row("Try new sections first", "A section you haven't read opens with its answers blurred, so you guess before you read. One click shows the notes", tg("pretestNew")) + "</div>";
      o += '<div class="set-group"><h3>Your data</h3><p class="muted" style="margin:0 0 10px;font-size:13.5px">Progress and everything you write — notes, cards, highlights — live in this browser only (separate from the vault\'s notes). Export a backup now and then — and to move to another device.</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act2="export">' + V.icon("download", "sm") + 'Export progress</button><label class="btn" style="cursor:pointer">' + V.icon("upload", "sm") + 'Import backup<input type="file" accept=".json,application/json" data-act2="import" hidden></label>' +
        '<button class="btn ghost" data-act2="reset" style="color:var(--bad)">' + V.icon("trash", "sm") + "Reset progress…</button></div></div>";
      o += '<div class="set-group"><h3>Library</h3>' + C.subjects.map(sj => '<div class="set-row"><div class="sl"><b>' + V.esc(sj.name) + "</b><span>" + V.esc(sj.source.file) + " · " + V.esc(sj.source.adapter) + " · " + V.num(sj.stats.lines) + " lines · built " + new Date(sj.builtAt).toLocaleDateString("en-GB") + "</span></div></div>").join("") +
        '<p class="muted" style="font-size:13.5px">To add a subject: drop its HTML into <b>sources/</b> and run <b>Build Vault.cmd</b>. See <a href="#/subjects">Subjects</a>.</p></div>';
      o += '<div class="set-group"><h3>Keyboard</h3><div class="kbd-grid">' + V.KEYS.map(k => "<div><span>" + V.esc(k[1]) + "</span><span>" + k[0].split(/\s{2}or\s{2}| \/ | – /).map(x => "<kbd>" + V.esc(x) + "</kbd>").join(" ") + "</span></div>").join("") + "</div></div>";
      return o + "</div>";
    },
    mount(el) {
      el.addEventListener("click", e => {
        const b = e.target.closest("[data-k],[data-t],[data-act2]"); if (!b) return;
        if (b.dataset.k) { const v = /^\d+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; S.set(b.dataset.k, v); V.$$('[data-k="' + b.dataset.k + '"]', el).forEach(x => x.setAttribute("aria-pressed", String(x === b))); V.renderNav(); }
        else if (b.dataset.t) { S.set(b.dataset.t, !S.settings[b.dataset.t]); b.setAttribute("aria-pressed", String(!!S.settings[b.dataset.t])); V.applyDrawerMode(); }
        else if (b.dataset.act2 === "export") {
          S.flush(); const blob = new Blob([S.exportJSON()], { type: "application/json" }), a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = "study-vault-progress-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } else if (b.dataset.act2 === "reset") {
          V.dialog("Reset all progress?", '<p style="color:var(--ink-2)">This clears reading progress, revision schedule, recall history, bookmarks, checklists, your own notes, doubt flags, cards and highlights in this browser. Settings and the vault\'s notes are kept. Consider exporting a backup first.</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="do-reset" style="background:var(--bad);border-color:var(--bad)">Reset progress</button></div>',
            (d, close) => V.$("#do-reset", d).onclick = () => { S.resetProgress(); close(); location.reload(); });
        }
      });
      el.addEventListener("change", e => {
        const inp = e.target.closest('[data-act2="import"]'); if (!inp || !inp.files[0]) return;
        inp.files[0].text().then(t => { try { S.importJSON(t); V.toast("Backup imported — reloading"); setTimeout(() => location.reload(), 700); } catch (err) { V.toast("Import failed: " + err.message); } });
      });
    }
  };
})();
