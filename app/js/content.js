/* Study Vault — content index. Built once at start-up from data/subjects/*.js.
   Nothing here alters note text: it only derives metadata (exam tags, traps, search keys,
   recall prompt shapes) from the structure the notes already have.                        */
(function () {
  "use strict";
  const V = window.V, M = window.VaultMarkup, R = window.VaultRender;
  const C = V.C = { subjects: [], bySubj: {}, sheets: [], sheetByKey: {}, sections: [], secByKey: {}, lines: [], lineByKey: {}, years: [], figures: [] };

  C.init = () => {
    const man = (window.VAULT_MANIFEST && window.VAULT_MANIFEST.subjects) || [];
    const rank = id => { const i = man.findIndex(s => s.id === id); return i < 0 ? 999 : i; };
    (window.VAULT_SUBJECTS || []).slice().sort((a, b) => rank(a.id) - rank(b.id)).forEach(indexSubject);
    const ys = new Set(); C.lines.forEach(l => l.years.forEach(y => ys.add(y))); C.years = [...ys].sort((a, b) => a - b);
  };

  function indexSubject(subj) {
    C.subjects.push(subj); C.bySubj[subj.id] = subj;
    subj.M = M.dialect(subj.markup || "ms1");   /* the source format's own markup rules */
    subj.sheetById = {}; subj.stats = { sections: 0, lines: 0, figures: 0 };
    subj.sheets.forEach((sh, si) => {
      sh.subj = subj; sh.key = subj.id + "/" + sh.id; sh.index = si; sh.sections = [];
      subj.sheetById[sh.id] = sh; C.sheets.push(sh); C.sheetByKey[sh.key] = sh;
      if (sh.type === "notes") sh.blocks.forEach((b, bi) => indexBlock(subj, sh, b, bi));
      else indexHtmlSheet(subj, sh);
      subj.stats.sections += sh.sections.filter(s => !s.ref).length;
      sh.figures = sh.sections.filter(s => s.fig).length; subj.stats.figures += sh.figures;
      sh.lineCount = sh.sections.reduce((a, s) => a + s.lines.length, 0);
      if (sh.type === "notes") subj.stats.lines += sh.lineCount;
    });
    subj.studySections = C.sections.filter(s => s.subj === subj && !s.ref);
  }

  function newSection(subj, sh, id, h, kind, extra) {
    const sec = Object.assign({ key: sh.key + "/" + id, id, h, hPlain: M.plain(h), kind: kind || "core", sheet: sh, subj, lines: [], byLid: {}, ref: false }, extra || {});
    sec.hsearch = " " + V.norm(sec.hPlain) + " ";
    sh.sections.push(sec); C.sections.push(sec); C.secByKey[sec.key] = sec;
    return sec;
  }

  function addLine(sec, lid, kind, raw, text, y, trapFlag) {
    const tags = sec.subj.M.examTags(text, y);
    let key = sec.key + "#" + V.hash(kind === "r" ? JSON.stringify(raw) : text);
    if (C.lineByKey[key]) key += "~" + lid;
    const plain = M.plain(text);
    const line = {
      key, lid, kind, raw, sec, text, plain, tags,
      fams: new Set(tags.map(t => t.f)), years: new Set(tags.map(t => +t.y)),
      trap: !!trapFlag || M.hasTrap(text) || sec.kind === "trap", hl: M.hasMark(text)
    };
    line.hy = tags.length > 0 || line.trap || line.hl;
    line.search = " " + V.norm(plain + (y ? " " + y.split(/\s+/).map(v => "uppcs 20" + v).join(" ") : "")) + " ";
    sec.lines.push(line); C.lines.push(line); C.lineByKey[key] = line;
    sec.byLid[lid] = line;
    return line;
  }

  /* A figure is not a line: it is never drilled or counted. A block that is only a figure becomes a
     reference section (navigable, bookmarkable, searchable by its alt text and caption, but not part of
     reading progress or revision); a table or list that carries a figure stays a normal section. */
  function indexBlock(subj, sh, b, bi) {
    const figOnly = !!b.fig && !b.rows && !b.list && b.html == null;
    const sec = newSection(subj, sh, b.id, b.h, b.kind, { block: b, idx: bi, ref: figOnly });
    if (b.fig) { sec.fig = b.fig; sec.figSearch = " " + V.norm(b.fig.alt + " " + (b.fig.caption || "")) + " "; C.figures.push(sec); }
    if (b.html != null) {
      htmlEls(b.html).forEach((el, k) => {
        const tr = el.tagName === "TR", cols = tr && el.closest("table") ? V.$$("thead th", el.closest("table")).map(th => th.textContent.trim()) : null;
        addLine(sec, "x" + k, "x", { html: el.innerHTML, cells: tr ? Array.from(el.cells).map(c => c.innerHTML) : null, cols }, elText(el), "", false);
      });
      return;
    }
    (b.rows || []).forEach((r, i) => {
      const p = R.rowParts(r);
      const ln = addLine(sec, "r" + i, "r", r, p.cells.join(" · "), (p.tail && p.tail.y) || "", p.tail && p.tail.t);
      ln.first = " " + V.norm(M.plain(p.cells[0] || "")) + " ";
    });
    (b.list || []).forEach((it, j) => { const p = R.itemParts(it); addLine(sec, "i" + j, "i", it, p.text, p.meta.y || "", p.meta.t); });
    sec.hy = sec.lines.filter(l => l.hy).length;
    sec.pyq = sec.lines.filter(l => l.tags.length).length;
  }

  /* Reference sheets rendered by the source (radar, audit, log) and generic HTML blocks:
     lines are the table rows / list items / checklist entries, in document order. */
  const LINE_SEL = "tbody tr, li, .check label, p:not(li p, td p)";
  C.LINE_SEL = LINE_SEL;
  function htmlEls(html) { const t = document.createElement("template"); t.innerHTML = html; return V.$$(LINE_SEL, t.content); }
  /* table rows read as "cell · cell"; everything else as its text */
  const elText = el => (el.tagName === "TR" ? Array.from(el.cells).map(c => c.textContent.trim()).join(" · ") : el.textContent).replace(/\s+/g, " ").trim();
  function indexHtmlSheet(subj, sh) {
    const t = document.createElement("template"); t.innerHTML = sh.html;
    const all = V.$$(LINE_SEL, t.content);
    const blocks = V.$$(".block", t.content);
    blocks.forEach((bl, k) => {
      const h3 = bl.querySelector("h3");
      const h = h3 ? (h3.childNodes[0] && h3.childNodes[0].textContent || h3.textContent).trim() : "Section " + (k + 1);
      const sec = newSection(subj, sh, "h" + k, h, "core", { ref: true, idx: k });
      V.$$(LINE_SEL, bl).forEach(el => addLine(sec, "h" + all.indexOf(el), "h", null, elText(el), "", false));
    });
  }

  /* ---------- lookups ---------- */
  C.sheet = (subjId, sheetId) => { const s = C.bySubj[subjId]; return s && s.sheetById[sheetId]; };
  C.neighbours = sh => { const a = sh.subj.sheets; return { prev: a[sh.index - 1] || null, next: a[sh.index + 1] || null }; };
  C.sheetHref = (sh, q) => "#/s/" + sh.subj.id + "/" + sh.id + (q ? "?" + q : "");
  C.secHref = sec => C.sheetHref(sec.sheet, "at=" + encodeURIComponent(sec.id));
  C.lineHref = ln => C.sheetHref(ln.sec.sheet, "at=" + encodeURIComponent(ln.sec.id) + "&l=" + ln.lid);
  C.crumb = sec => sec.subj.name + " › " + sec.sheet.tab + " › " + sec.hPlain;

  /* sheet coverage for rings/bars */
  C.sheetProgress = sh => {
    const secs = sh.sections.filter(s => !s.ref); if (!secs.length) return { read: 0, rev: 0, total: 0, due: 0 };
    const S = V.S, t = V.today();
    let read = 0, rev = 0, due = 0;
    secs.forEach(s => { if (S.progress.sections[s.key]) read++; const e = S.srs[s.key]; if (e && e.reps > 0) rev++; if (e && e.due <= t) due++; });
    return { read, rev, due, total: secs.length };
  };
  C.subjectProgress = subj => {
    let read = 0, rev = 0, due = 0, total = 0;
    subj.sheets.forEach(sh => { const p = C.sheetProgress(sh); read += p.read; rev += p.rev; due += p.due; total += p.total; });
    return { read, rev, due, total };
  };

  /* ---------- line filters (reader filters, PYQ, drills) ---------- */
  C.lineMatch = (ln, f) => {
    if (!f) return true;
    if (f.subj && ln.sec.subj.id !== f.subj) return false;
    if (f.sheet && ln.sec.sheet.key !== f.sheet) return false;
    if (f.exam && !ln.fams.has(f.exam)) return false;
    if (f.from || f.to) {
      const ys = f.exam ? ln.tags.filter(t => t.f === f.exam).map(t => +t.y) : [...ln.years];
      if (!ys.some(y => (!f.from || y >= f.from) && (!f.to || y <= f.to))) return false;
    }
    if (f.trap && !ln.trap) return false;
    if (f.hl && !ln.hl) return false;
    if (f.hy && !ln.hy) return false;
    if (f.pyq && !ln.tags.length) return false;
    return true;
  };

  /* ---------- search ---------- */
  C.search = (q, f, limit) => {
    const toks = V.norm(q).split(" ").filter(Boolean);
    const out = { lines: [], nav: [], figures: [], total: 0, toks };
    if (!toks.length) return out;
    const phrase = " " + toks.join(" ");
    const hits = [];
    for (const ln of C.lines) {
      if (f && !C.lineMatch(ln, f)) continue;
      let score = 0, inText = 0, ok = true;
      for (const t of toks) {
        const k = " " + t, inT = ln.search.indexOf(k) >= 0, inH = ln.sec.hsearch.indexOf(k) >= 0;
        if (!inT && !inH) { ok = false; break; }
        if (inT) { inText++; score += ln.search.indexOf(k + " ") >= 0 ? 3 : 1.6; if (ln.first && ln.first.indexOf(k) >= 0) score += ln.first.indexOf(k + " ") >= 0 ? 4 : 2; }
        else score += 0.6;
      }
      if (!ok || !inText) continue;
      if (toks.length > 1 && ln.search.indexOf(phrase) >= 0) score += 5;
      if (ln.hy) score += 0.4;
      if (ln.sec.ref) score -= 1.5;
      hits.push([score, ln]);
    }
    hits.sort((a, b) => b[0] - a[0]);
    out.total = hits.length;
    out.lines = hits.slice(0, limit || 300).map(h => h[1]);
    /* navigation targets: subjects, sheets, sections whose names contain every token */
    const all = s => toks.every(t => s.indexOf(" " + t) >= 0);
    C.subjects.forEach(s => { if (all(" " + V.norm(s.name + " " + s.title) + " ")) out.nav.push({ type: "subject", subj: s }); });
    C.sheets.forEach(sh => { if (all(" " + V.norm(sh.tab + " " + sh.title) + " ")) out.nav.push({ type: "sheet", sheet: sh }); });
    C.sections.forEach(sec => { if (all(sec.hsearch)) out.nav.push({ type: "section", sec }); });
    /* figures: every token in the alt text, caption or heading, at least one in the alt text or caption.
       They carry no exam tags, so an exam / trap / highlight filter leaves them out. */
    const figOk = sec => !f || (!f.exam && !f.trap && !f.hl && !f.hy && !f.pyq && !f.from && !f.to && (!f.subj || sec.subj.id === f.subj) && (!f.sheet || sec.sheet.key === f.sheet));
    out.figures = C.figures.filter(sec => figOk(sec) && all(sec.figSearch + sec.hsearch) && toks.some(t => sec.figSearch.indexOf(" " + t) >= 0));
    return out;
  };
  /* the text a figure hit shows: its caption or its alt text, whichever holds more of the query (caption on a tie) */
  C.figLabel = (sec, toks) => {
    const n = s => { const x = " " + V.norm(s || "") + " "; return (toks || []).filter(t => x.indexOf(" " + t) >= 0).length; };
    return sec.fig.caption && n(sec.fig.caption) >= n(sec.fig.alt) ? sec.fig.caption : sec.fig.alt;
  };
  /* Highlight query tokens inside already-escaped text. */
  C.mark = (html, toks) => {
    if (!toks || !toks.length) return html;
    const parts = html.split(/(<[^>]+>)/);
    const re = new RegExp("(^|[^a-z0-9])(" + toks.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return parts.map(p => p.charAt(0) === "<" ? p : p.replace(re, "$1<mark>$2</mark>")).join("");
  };

  /* ---------- recall prompts ---------- */
  const REV = /^(art|article|articles|amdt|amendment|sch|schedule|part|age|year|date|case|committee|body|state|act|writ|source|office|list)\b/i;
  const NOUN = { art: "Article", article: "Article", articles: "Articles", amdt: "Amendment", sch: "Schedule", part: "Part" };
  /* fact-recall shapes first; a high-yield line that has one can also be asked "why" (self-explanation) */
  C.variants = (ln, pref) => { const v = factVariants(ln, pref); if (v.length && ln.hy) v.push({ t: "why" }); return v; };
  const factVariants = (ln, pref) => {
    if (ln.kind === "r") {
      const cells = R.rowParts(ln.raw).cells, cols = ln.sec.block.cols;
      if (cells.length < 2 || !M.plain(cells.slice(1).join("")).trim()) return [];
      const v = [{ t: "fwd" }];
      if (cells[1] && M.plain(cells[1]).trim() && (REV.test(cols[0]) || M.plain(cells[0]).length <= 14) && M.plain(cells[1]).length <= 240) v.push({ t: "rev" });
      cols.forEach((c, k) => { if (k > 0 && /^(year|date)/i.test(c) && cells[k] && M.plain(cells[k]).trim()) v.push({ t: "col", k }); });
      return v;
    }
    if (ln.kind === "i") { const r = ln.sec.subj.M.itemRecall(R.itemParts(ln.raw).text, pref); return r.mode === "whole" ? [] : [{ t: r.mode }]; }
    if (ln.kind === "x" && ln.raw) { if (ln.raw.cells && ln.raw.cells.length >= 2) return [{ t: "fwd" }]; if (/<(b|strong)[\s>]/i.test(ln.raw.html)) return [{ t: "cloze" }]; }
    return [];
  };
  C.variantLabel = (ln, v) => {
    const cols = (ln.sec.block && ln.sec.block.cols) || (ln.raw && ln.raw.cols) || [];
    const noun = c => { const w = M.plain(c).trim(); return NOUN[w.toLowerCase()] || w; };
    if (v.t === "fwd") return "Recall the row" + (cols[0] ? " · " + M.plain(cols[0]) + " given" : "");
    if (v.t === "rev") return "Identify the " + noun(cols[0]);
    if (v.t === "col") return "Identify the " + noun(cols[v.k]).toLowerCase();
    if (v.t === "qa") return "Fact → what the trap gets wrong";
    if (v.t === "cue") return "Complete the fact";
    if (v.t === "cloze") return "Fill in the key terms";
    if (v.t === "why") return "Why is this true?";
    return "Recall";
  };
  C.promptHTML = (ln, v, pref) => {
    const D = ln.sec.subj.M;
    if (ln.kind === "x") {
      if (v.t === "why") return ln.raw.cells ? '<dl class="rp">' + ln.raw.cells.map((c, k) => "<div><dt>" + V.esc((ln.raw.cols && ln.raw.cols[k]) || "Column " + (k + 1)) + "</dt><dd>" + c + "</dd></div>").join("") + "</dl>" : '<div class="pline rm-why">' + ln.raw.html + "</div>";
      if (v.t === "fwd") return '<dl class="rp">' + ln.raw.cells.map((c, k) => '<div class="' + (k ? "ask" : "") + '"><dt>' + V.esc((ln.raw.cols && ln.raw.cols[k]) || "Column " + (k + 1)) + "</dt><dd>" + (k ? '<span class="ans">' + c + "</span>" : c) + "</dd></div>").join("") + "</dl>";
      return '<div class="pline rm-cloze">' + ln.raw.html + "</div>";
    }
    if (ln.kind === "r") {
      const p = R.rowParts(ln.raw), cells = p.cells, cols = ln.sec.block.cols;
      const ask = k => v.t === "why" ? false : v.t === "fwd" ? k > 0 : v.t === "rev" ? k !== 1 : k === v.k;
      /* given columns first, then what is asked — the source column order is kept within each group */
      const order = cols.map((c, k) => k).sort((a, b) => ask(a) - ask(b));
      return '<dl class="rp">' + order.map(k => {
        const cell = cells[k] || "";
        if (!M.plain(cell).trim() && k >= cells.length) return "";
        return '<div class="' + (ask(k) ? "ask" : "") + '"><dt>' + D.fmt(cols[k]) + "</dt><dd>" + D.cellHTML(cell) + (k === cells.length - 1 && p.tail && p.tail.y ? D.yrs(p.tail.y) : "") + "</dd></div>";
      }).join("") + "</dl>";
    }
    const p = R.itemParts(ln.raw), r = D.itemHTML(p.text, pref);
    /* "why" shows the whole fact: rm-why matches none of the markHidden selectors */
    return '<div class="pline rm-' + (v.t === "why" ? "why" : r.mode) + (ln.trap ? " t" : "") + '">' + r.html + (p.meta.y ? D.yrs(p.meta.y) : "") + "</div>";
  };

  /* Apply recall hiding to rendered content (reader sections, sessions, prompts). */
  V.markHidden = (root, opt) => {
    opt = opt || {};
    V.$$(".hid", root).forEach(e => e.classList.remove("hid", "shown", "next"));
    V.$$("table[data-hide]", root).forEach(t => {
      const m = t.dataset.hide;
      V.$$("tbody tr", t).forEach(tr => Array.from(tr.children).forEach((td, k) => {
        const hide = m === "answers" ? k > 0 : m === "first" ? k === 0 : m === "c" + k;
        if (hide) { const a = td.querySelector(":scope > .ans"); if (a && a.textContent.trim()) a.classList.add("hid"); }
      }));
    });
    V.$$(".rm-qa .ans, .rm-cue .ans, .rm-whole .ans, .rp .ask dd > .ans", root).forEach(a => { if (a.textContent.trim()) a.classList.add("hid"); });
    V.$$(".rm-cloze b, .rm-cloze strong, .rm-cloze .num", root).forEach(a => { if (!a.closest(".yrs")) a.classList.add("hid"); });
    V.$$(".src-html td:not(:first-child), .src-html li", root).forEach(a => a.classList.add("hid"));
    if (opt.hideTags) V.$$(".yrs", root).forEach(a => a.classList.add("hid"));
  };
})();
