/* Study Vault — search, PYQ explorer, progress & history. */
(function () {
  "use strict";
  const V = window.V, S = V.S, C = V.C, M = window.VaultMarkup, R = window.VaultRender;
  const LABEL = ["", "Again", "Hard", "Good", "Easy"];

  /* One line rendered for result lists: note markup kept, query terms highlighted. */
  function lineHTML(ln, toks) {
    let h; const M = ln.sec.subj.M;
    if (ln.kind === "r") {
      const p = R.rowParts(ln.raw), cols = ln.sec.block.cols;
      h = p.cells.map((c, k) => (cols[k] ? '<span class="cellh">' + V.esc(M.plain(cols[k])) + "</span>" : "") + M.fmt(c)).join(' <span class="muted">·</span> ') + (p.tail && p.tail.y ? M.yrs(p.tail.y) : "");
    } else if (ln.kind === "i") { const p = R.itemParts(ln.raw); h = M.itemHTML(p.text).html + (p.meta.y ? M.yrs(p.meta.y) : ""); }
    else h = V.esc(ln.text);
    return C.mark(h, toks);
  }
  V.lineHTML = lineHTML;
  const hitHTML = (ln, toks) => '<a class="hit" href="' + C.lineHref(ln) + '"><div class="hp">' + (ln.trap ? '<span class="kbadge trap" style="font-size:10px">trap</span>' : "") + V.esc(ln.sec.hPlain) + '</div><div class="hx">' + lineHTML(ln, toks) + "</div></a>";

  function grouped(lines, toks, limit) {
    const groups = new Map();
    lines.slice(0, limit).forEach(ln => { const k = ln.sec.sheet.key; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(ln); });
    let h = "";
    groups.forEach((arr, k) => { const sh = C.sheetByKey[k];
      h += '<div class="res-sheet" style="--subj:' + sh.subj.accent + '"><span class="dot"></span><a href="' + C.sheetHref(sh) + '">' + V.esc(sh.title) + '</a><span class="muted">' + V.esc(sh.subj.name) + " · " + arr.length + "</span></div>" + arr.map(ln => hitHTML(ln, toks)).join(""); });
    return h;
  }

  /* ================= Search ================= */
  V.views.search = {
    title: () => "Search",
    render(p) {
      const q = p.q.q || "";
      return '<div class="page narrow"><div class="page-head"><div class="grow"><div class="eyebrow">Search</div><h1 class="h1">Search the vault</h1></div></div>' +
        '<div class="search-box">' + V.icon("search") + '<input class="input" id="sq" type="search" value="' + V.escAttr(q) + '" placeholder="Article numbers, names, years, “exact phrases”…" aria-label="Search" autocomplete="off" spellcheck="false"></div>' +
        '<div class="filters" id="sf"><select class="select" data-f="subj" aria-label="Subject"><option value="">All subjects</option>' + C.subjects.map(s => '<option value="' + s.id + '"' + (p.q.subj === s.id ? " selected" : "") + ">" + V.esc(s.name) + "</option>").join("") + "</select>" +
        '<span class="sp"></span>' + M.EXAMS.map(x => '<button class="chipbtn" data-exam="' + x.id + '" aria-pressed="' + (p.q.exam === x.id) + '">' + x.label + "</button>").join("") +
        '<span class="sp"></span><button class="chipbtn" data-flag="trap" aria-pressed="' + (p.q.trap === "1") + '">' + V.icon("flag", "sm") + 'Traps</button><button class="chipbtn" data-flag="hl" aria-pressed="' + (p.q.hl === "1") + '">Highlights</button></div><div id="sres"></div></div>';
    },
    mount(el, p) {
      const input = V.$("#sq", el), out = V.$("#sres", el);
      const f = { subj: p.q.subj || "", exam: p.q.exam || "", trap: p.q.trap === "1", hl: p.q.hl === "1" };
      let limit = 120;
      const run = () => {
        const q = input.value.trim(), qs = new URLSearchParams();
        if (q) qs.set("q", q); if (f.subj) qs.set("subj", f.subj); if (f.exam) qs.set("exam", f.exam); if (f.trap) qs.set("trap", "1"); if (f.hl) qs.set("hl", "1");
        history.replaceState(null, "", "#/search" + (qs.toString() ? "?" + qs : ""));
        const filt = { subj: f.subj, exam: f.exam, trap: f.trap, hl: f.hl };
        if (!q) {
          const any = f.exam || f.trap || f.hl;
          if (!any) { out.innerHTML = '<div class="empty">Search every line of every subject. Examples: <b>280</b> · <b>Speaker</b> · <b>1977</b> · <b>"double jeopardy"</b> · <b>cse 2021</b>. Use the chips to narrow by exam, traps or highlighted distinctions. <kbd>Ctrl K</kbd> searches from anywhere.</div>'; return; }
          const lines = C.lines.filter(ln => C.lineMatch(ln, filt));
          out.innerHTML = '<p class="muted" style="font-size:14px">' + V.num(lines.length) + " lines</p>" + grouped(lines, [], limit) + (lines.length > limit ? '<button class="btn" data-more style="margin-top:14px">Show more</button>' : "");
          return;
        }
        const r = C.search(q, filt, 600);
        let h = "";
        if (r.nav.length) h += '<div class="nav-hits">' + r.nav.slice(0, 6).map(n => n.type === "section" ? V.secRow(n.sec, "section") : n.type === "sheet" ? '<a class="rowlink" href="' + C.sheetHref(n.sheet) + '"><span class="rl-main"><div class="rl-t">' + C.mark(V.esc(n.sheet.title), r.toks) + '</div><div class="rl-s">' + V.esc(n.sheet.subj.name) + ' · sheet</div></span>' + V.icon("right", "sm go") + "</a>" : '<a class="rowlink" href="#/s/' + n.subj.id + '"><span class="rl-main"><div class="rl-t">' + V.esc(n.subj.name) + '</div><div class="rl-s">subject</div></span></a>').join("") + "</div>";
        h += '<p class="muted" style="font-size:14px;margin:8px 0 0">' + (r.total ? V.num(r.total) + " matching line" + (r.total === 1 ? "" : "s") + (r.total > r.lines.length ? " (best " + r.lines.length + " shown)" : "") : "No lines match") + "</p>";
        h += grouped(r.lines, r.toks, limit);
        if (r.lines.length > limit) h += '<button class="btn" data-more style="margin-top:14px">Show more</button>';
        if (!r.total && !r.nav.length) h += '<div class="empty">Try fewer words, an Article number, or remove a filter.</div>';
        out.innerHTML = h;
      };
      const deb = V.debounce(run, 90);
      input.addEventListener("input", () => { limit = 120; deb(); });
      V.$("#sf", el).addEventListener("click", e => {
        const x = e.target.closest("[data-exam]"); if (x) { f.exam = f.exam === x.dataset.exam ? "" : x.dataset.exam; V.$$("[data-exam]", el).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.exam === f.exam))); run(); }
        const fl = e.target.closest("[data-flag]"); if (fl) { f[fl.dataset.flag] = !f[fl.dataset.flag]; fl.setAttribute("aria-pressed", String(f[fl.dataset.flag])); run(); }
      });
      V.$("#sf", el).addEventListener("change", e => { if (e.target.dataset.f) { f[e.target.dataset.f] = e.target.value; run(); } });
      out.addEventListener("click", e => { if (e.target.closest("[data-more]")) { limit += 200; run(); } });
      run(); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    }
  };

  /* ================= PYQ explorer ================= */
  V.views.pyq = {
    title: () => "PYQ explorer",
    render(p) {
      const q = p.q, f = { subj: q.subj || "", exam: q.exam || "", from: +q.from || 0, to: +q.to || 0, trap: q.trap === "1" };
      const base = C.lines.filter(ln => ln.tags.length && !ln.sec.ref && (!f.subj || ln.sec.subj.id === f.subj) && (!f.trap || ln.trap));
      const count = id => base.filter(ln => !id || ln.fams.has(id)).length;
      const lines = base.filter(ln => C.lineMatch(ln, f));
      /* year distribution for the chosen exam (all exams when none) */
      const yc = {}; base.filter(ln => !f.exam || ln.fams.has(f.exam)).forEach(ln => new Set(ln.tags.filter(t => !f.exam || t.f === f.exam).map(t => +t.y)).forEach(y => { yc[y] = (yc[y] || 0) + 1; }));
      const ys = Object.keys(yc).map(Number).sort((a, b) => a - b);
      const lo = ys[0], hi = ys[ys.length - 1];
      const chip = (id, label) => '<button class="chipbtn" data-exam="' + id + '" aria-pressed="' + (f.exam === id) + '">' + label + ' <span class="ct">' + count(id) + "</span></button>";
      const qs = x => { const o = Object.assign({}, f, x), u = new URLSearchParams(); ["subj", "exam"].forEach(k => { if (o[k]) u.set(k, o[k]); }); if (o.from) u.set("from", o.from); if (o.to) u.set("to", o.to); if (o.trap) u.set("trap", "1"); return u.toString(); };
      V.pyqQS = qs;
      let o = '<div class="page"><div class="page-head"><div class="grow"><div class="eyebrow">Exam intelligence</div><h1 class="h1">PYQ explorer</h1><p class="lede">Every line in your notes that a previous paper tested, by exam and year. Tags are read from the notes themselves.</p></div>' +
        (lines.length ? '<a class="btn primary" href="#/recall/session?preset=pyq&' + qs({}) + '">' + V.icon("recall", "sm") + "Recall these " + V.num(Math.min(lines.length, S.settings.drillLength)) + "</a>" : "") + "</div>";
      o += '<div class="filters" id="pf">' + chip("", "All exams") + M.EXAMS.filter(x => count(x.id) || f.exam === x.id).map(x => chip(x.id, x.label)).join("") + '<span class="sp"></span>' +
        '<select class="select" data-f="subj" aria-label="Subject"><option value="">All subjects</option>' + C.subjects.map(s => '<option value="' + s.id + '"' + (f.subj === s.id ? " selected" : "") + ">" + V.esc(s.name) + "</option>").join("") + "</select>" +
        '<button class="chipbtn" data-flag="trap" aria-pressed="' + f.trap + '">' + V.icon("flag", "sm") + "Traps only</button></div>";
      if (ys.length) {
        const span = []; for (let y = Math.max(lo, hi - 30); y <= hi; y++) span.push(y);
        o += '<section class="block-sec" style="padding-top:4px"><h2 class="h2">Lines tested per year' + (f.exam ? " · " + M.EXAMS.find(x => x.id === f.exam).label : "") + (f.from || f.to ? '<a class="aside" href="#/pyq?' + qs({ from: 0, to: 0 }) + '">All years ×</a>' : '<span class="aside muted" style="font-weight:500">click a year to filter</span>') + "</h2>" +
          V.columns(span.map(y => ({ v: yc[y] || 0, l: (y % 5 === 0 || span.length < 14) ? "’" + String(y).slice(2) : "", tip: y + " · " + (yc[y] || 0) + " line" + (yc[y] === 1 ? "" : "s"), dim: (f.from || f.to) && !(y >= (f.from || 0) && y <= (f.to || 9999)) })), { h: 130, w: 900, aria: "Tagged lines per year", click: true }) +
          '<div class="form-row" style="padding-bottom:0"><span class="muted" style="font-size:13px">Range</span><select class="select" data-y="from" aria-label="From year"><option value="">' + (lo || "From") + "</option>" + ys.map(y => '<option value="' + y + '"' + (f.from === y ? " selected" : "") + ">" + y + "</option>").join("") + '</select><span class="muted">to</span><select class="select" data-y="to" aria-label="To year"><option value="">' + (hi || "To") + "</option>" + ys.slice().reverse().map(y => '<option value="' + y + '"' + (f.to === y ? " selected" : "") + ">" + y + "</option>").join("") + "</select></div></section>";
        V.pyqSpan = span;
      }
      o += '<p class="muted" style="font-size:14px;margin:18px 0 0"><b style="color:var(--ink)">' + V.num(lines.length) + "</b> line" + (lines.length === 1 ? "" : "s") + (f.exam ? " tested in " + M.EXAMS.find(x => x.id === f.exam).full : " carrying a PYQ tag") + (f.from || f.to ? ", " + (f.from || lo) + "–" + (f.to || hi) : "") + "</p>";
      o += '<div id="pres">' + grouped(lines, [], 150) + "</div>" + (lines.length > 150 ? '<button class="btn" data-more style="margin-top:14px">Show all ' + V.num(lines.length) + "</button>" : "");
      V.pyqLines = lines;
      return o + "</div>";
    },
    mount(el) {
      const go = x => V.go("#/pyq?" + V.pyqQS(x));
      el.addEventListener("click", e => {
        const x = e.target.closest("[data-exam]"); if (x) { go({ exam: x.dataset.exam, from: 0, to: 0 }); return; }
        const fl = e.target.closest("[data-flag]"); if (fl) { go({ trap: fl.getAttribute("aria-pressed") !== "true" }); return; }
        const c = e.target.closest("[data-click]"); if (c && V.pyqSpan) { const y = V.pyqSpan[+c.dataset.click]; go({ from: y, to: y }); return; }
        if (e.target.closest("[data-more]")) { V.$("#pres", el).innerHTML = grouped(V.pyqLines, [], 1e6); e.target.closest("[data-more]").remove(); }
      });
      el.addEventListener("change", e => {
        if (e.target.dataset.f) go({ [e.target.dataset.f]: e.target.value });
        if (e.target.dataset.y) go({ [e.target.dataset.y]: +e.target.value || 0 });
      });
    }
  };

  /* ================= Progress ================= */
  const hm = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " min" : ""); };
  V.views.progress = {
    title: () => "Progress",
    render() {
      const all = C.sections.filter(s => !s.ref);
      const read = all.filter(s => S.isRead(s.key)).length, rev = all.filter(s => S.srs[s.key] && S.srs[s.key].reps > 0).length;
      const tot = S.ratingTotals(30), n = tot.a + tot.h + tot.g + tot.e;
      const d30 = S.daysRange(30), ms7 = S.daysRange(7).reduce((a, [, d]) => a + (d ? d.ms : 0), 0), active = d30.filter(([, d]) => d && (d.r || d.s || d.p)).length;
      let o = '<div class="page"><div class="page-head"><div class="grow"><div class="eyebrow">Study history</div><h1 class="h1">Progress</h1><p class="lede">Tracked in this browser, separately from the notes. It exists to steer revision, not to keep score.</p></div></div>';
      o += '<div class="stat-line" style="margin-bottom:8px"><div class="fig"><div class="v">' + read + '<span class="muted" style="font-size:18px"> / ' + all.length + '</span></div><div class="l">sections read</div></div><div class="fig"><div class="v">' + rev + '</div><div class="l">sections reviewed</div></div>' +
        '<div class="fig"><div class="v">' + (n ? V.pct(tot.g + tot.e, n) + "%" : "—") + '</div><div class="l">recalled · 30 days</div></div><div class="fig"><div class="v">' + (ms7 ? hm(ms7) : "—") + '</div><div class="l">study time · 7 days</div></div><div class="fig"><div class="v">' + active + '</div><div class="l">active days · 30</div></div></div>';
      o += '<div class="grid-2"><div>';
      o += '<section class="block-sec"><h2 class="h2">Activity · 30 days</h2>' + V.columns(d30.map(([d, x], i) => { const dt = V.dayDate(d), v = x ? x.r + x.s + x.p : 0;
        return { v, l: i % 5 === 4 ? String(dt.getDate()) : "", tip: dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + (x ? " · " + x.r + " read · " + (x.s + x.p) + " rated" + (x.ms ? " · " + hm(x.ms) : "") : " · no study") }; }), { h: 120, w: 600, aria: "Sections read plus answers rated per day" }) +
        (n ? '<div style="margin-top:14px"><div class="muted" style="font-size:13px;font-weight:600">Ratings · 30 days</div>' + V.ratingBar(tot) + "</div>" : "") + "</section>";
      /* coverage */
      C.subjects.forEach(s => {
        o += '<section class="block-sec" style="--subj:' + s.accent + '"><h2 class="h2"><span class="dot"></span>' + V.esc(s.name) + ' · coverage</h2><table class="ptable"><thead><tr><th>Sheet</th><th style="width:26%">Read</th><th style="width:26%">Reviewed</th><th style="text-align:right">Due</th><th style="text-align:right">Weak</th></tr></thead><tbody>';
        s.sheets.filter(sh => sh.type === "notes").forEach(sh => {
          const pr = C.sheetProgress(sh), weak = sh.sections.filter(x => S.weakness(x.key) >= 0.9).length;
          o += '<tr><td><a href="' + C.sheetHref(sh) + '">' + V.esc(sh.tab) + '</a></td><td><span class="meter" title="' + pr.read + "/" + pr.total + '"><i style="width:' + V.pct(pr.read, pr.total) + '%"></i></span></td><td><span class="meter" title="' + pr.rev + "/" + pr.total + '"><i class="rev" style="width:' + V.pct(pr.rev, pr.total) + '%"></i></span></td><td class="mono" style="text-align:right">' + (pr.due || '<span class="muted">—</span>') + '</td><td class="mono" style="text-align:right">' + (weak ? '<span class="tag bad">' + weak + "</span>" : '<span class="muted">—</span>') + "</td></tr>";
        });
        o += "</tbody></table></section>";
      });
      o += "</div><div>";
      const weak = S.weakKeys().map(k => C.secByKey[k]).filter(Boolean).slice(0, 8);
      o += '<section class="block-sec"><h2 class="h2">Weak sections</h2>' + (weak.length ? weak.map(sec => V.secRow(sec, S.srs[sec.key] ? S.srs[sec.key].lapses + " lapse" + (S.srs[sec.key].lapses === 1 ? "" : "s") : "")).join("") : '<div class="empty">None yet.</div>') + "</section>";
      const missed = Object.keys(S.items).map(k => [C.lineByKey[k], S.items[k]]).filter(x => x[0] && x[1].c[0] > 0).sort((a, b) => S.itemWeak(b[0].key) - S.itemWeak(a[0].key)).slice(0, 8);
      if (missed.length) o += '<section class="block-sec"><h2 class="h2">Most-missed lines<a class="aside" href="#/recall/session?preset=weak">Drill ›</a></h2>' + missed.map(([ln, it]) => '<a class="hit" href="' + C.lineHref(ln) + '"><div class="hp">' + V.esc(C.crumb(ln.sec)) + " · missed " + it.c[0] + '×</div><div class="hx" style="font-size:14.5px">' + lineHTML(ln, []) + "</div></a>").join("") + "</section>";
      const ev = S.log.events.slice(-40).reverse();
      o += '<section class="block-sec"><h2 class="h2">Recent history</h2>' + (ev.length ? ev.map(([ts, kind, key, r]) => {
        const ln = kind === "item" ? C.lineByKey[key] : null, sec = ln ? ln.sec : C.secByKey[key]; if (!sec) return "";
        const what = kind === "read" ? "Read" : kind === "sec" ? "Revised · " + LABEL[r] : "Recalled a line · " + LABEL[r];
        return '<a class="rowlink" href="' + (ln ? C.lineHref(ln) : C.secHref(sec)) + '">' + (r ? '<span class="rate-dot r' + r + '"></span>' : '<span class="st read"></span>') + '<span class="rl-main"><div class="rl-t" style="font-weight:500">' + V.esc(sec.hPlain) + '</div><div class="rl-s">' + what + " · " + V.esc(sec.subj.name + " › " + sec.sheet.tab) + '</div></span><span class="rl-end">' + V.ago(ts) + "</span></a>";
      }).join("") : '<div class="empty">Nothing yet — history starts with your first read.</div>') + "</section>";
      return o + "</div></div></div>";
    }
  };
})();
