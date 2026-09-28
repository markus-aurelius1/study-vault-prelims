/* Study Vault — note markup.
   Ports of the inline-markup rules used by the source note files:
     **bold** = exact term   !!trap!! = wrong option seen   ==mark== = key distinction
     `num` = number/Article  [CSE 2021; UPPCS M 2004] = exam tags   "cue :: answer" = recall pair
   Each source format has its own "dialect" (how exam tags parse, how "::" renders):
     ms1 — "Master Sheets" v1 (SHEETS.push data)      ms2 — "Master Sheet" v2 (SEC({...}) data)
   The visible text produced here must match the source renderer character for character;
   tools/build.mjs verifies this on every build. Recall helpers only wrap spans around
   existing text — they never add, drop or reorder words.
   Loaded by the browser (window.VaultMarkup) and by Node during the build.            */
(function (root) {
  "use strict";

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = s => esc(s).replace(/"/g, "&quot;");
  const qAttr = s => String(s).replace(/"/g, "&quot;");

  /* Exam families across all dialects (filters, PYQ explorer). */
  const EXAMS = [
    { id: "cse", label: "UPSC CSE", full: "UPSC Civil Services Prelims" },
    { id: "up", label: "UPPSC", full: "UPPSC exams (Prelims, RO/ARO, Lower Sub. and others)" },
    { id: "upm", label: "UPPCS Mains", full: "UPPCS Mains" },
    { id: "cds", label: "CDS / NDA", full: "CDS / NDA" },
    { id: "capf", label: "CAPF", full: "CAPF (AC)" },
    { id: "oth", label: "Other PCS", full: "Other state PCS (BPSC, MPPCS, RAS, CGPCS, JPSC …)" }
  ];

  /* ================= ms1: v1 "Master Sheets" rules ================= */
  function fam1(n) {
    n = n.toUpperCase();
    if (/UPSC|CSE|IAS/.test(n) && !/UPPSC|UPPCS/.test(n)) return "cse";
    if (/U\.?\s?P\b|UPP|UPPCS|UPPSC|UK|UTTARAKHAND|^UP|U\.P/.test(n)) return "up";
    if (/CDS|NDA/.test(n)) return "cds";
    if (/CAPF/.test(n)) return "capf";
    if (/PCS|PSC|RAS|BPSC|MPPCS|CGPCS|CHHATTISGARH|JHARKHAND|JPSC|HPSC|RPSC|UPSSSC|SSC|BIHAR|RAJASTHAN|HARYANA|GUJARAT|MPSC|OPSC|TNPSC|KPSC|WBCS|APPSC|TSPSC/.test(n)) return "oth";
    return null;
  }
  function lab1(n, f) {
    const u = n.toUpperCase();
    if (f === "up") { if (/\bM\b|MAINS/.test(u)) return "UPM"; if (/RO/.test(u)) return "RO"; if (/LOWER/.test(u)) return "UPL"; if (/UK|UTTARAKHAND/.test(u)) return "UK"; return "UP"; }
    if (f === "cse") return "CSE"; if (f === "capf") return "CAPF"; if (f === "cds") return /NDA/.test(u) ? "NDA" : "CDS";
    if (/CHHATTISGARH|CG/.test(u)) return "CG"; if (/JHARKHAND|JPSC/.test(u)) return "JH"; if (/MPPCS|M\.P/.test(u)) return "MP";
    return u.replace(/[^A-Z]/g, "").slice(0, 5) || "PCS";
  }
  function parseTags1(inner) {
    const parts = inner.split(/\s*[;,]\s*/); const tags = [], rest = [];
    parts.forEach(p => {
      const m = p.match(/^(.*?)\s*\(?((?:19|20)\d\d)\)?(.*)$/); const f = m && m[1] && fam1(m[1]);
      if (f) {
        const ys = [m[2]].concat((m[3].match(/(?:19|20)\d\d/g) || []));
        ys.forEach(y => tags.push({ f: f, l: lab1(m[1], f), y: y, t: p }));
        const r = m[3].replace(/\/?(?:19|20)\d\d/g, "").replace(/^\s*\(?(I{1,3}|IV)\)?\b/, "").trim(); if (r) rest.push(r);
      } else rest.push(p);
    });
    return tags.length ? { tags: tags, rest: rest } : null;
  }
  const TAGFULL1 = { up: "UPPSC exam", cse: "UPSC CSE Prelims", cds: "CDS / NDA", capf: "CAPF (AC)", oth: "Other state PCS" };

  /* ================= ms2: v2 "Master Sheet" rules ================= */
  function famLab2(n) {
    const u = n.toUpperCase().replace(/\s+/g, " ").trim();
    if (/^(CSE|UPSC)/.test(u)) return ["cse", "CSE"];
    if (/^UPPCS M|^UPPCS SPL M|^UPM/.test(u)) return ["upm", "UPM"];
    if (/^UPPCS|^UPPSC/.test(u)) return ["up", "UP"];
    if (/^UP RO/.test(u)) return ["up", "RO"];
    if (/^UP LOWER/.test(u)) return ["up", "UPL"];
    if (/^UP (BEO|UDA|GIC|RI|SPL|OTHER)/.test(u)) return ["up", "UP·"];
    if (/^UKPCS|^UTTARAKHAND/.test(u)) return ["oth", "UK"];
    if (/^CDS/.test(u)) return ["cds", "CDS"]; if (/^NDA/.test(u)) return ["cds", "NDA"];
    if (/^CAPF/.test(u)) return ["capf", "CAPF"];
    if (/^(BPSC|MPPCS|RAS|CGPCS|JPSC|HPSC|OTHER|RPSC|MPSC|PCS)/.test(u)) return ["oth", u.split(" ")[0].replace("MPPCS", "MP").replace("CGPCS", "CG").replace("JPSC", "JH").replace("BPSC", "BP").replace("OTHER", "PCS")];
    return null;
  }
  /* strict: every ";"-part must be an exam + year(s), otherwise the bracket stays literal text */
  function parseTags2(inner) {
    const parts = inner.split(/\s*;\s*/), tags = []; let ok = true;
    parts.forEach(p => {
      const m = p.match(/^([A-Za-z][A-Za-z .]*?)\s*((?:19|20)\d\d(?:\s*[,/ ]\s*(?:19|20)\d\d)*)\s*(I{1,2})?$/);
      if (!m) { ok = false; return; } const fl = famLab2(m[1]); if (!fl) { ok = false; return; }
      m[2].match(/(?:19|20)\d\d/g).forEach(y => tags.push({ f: fl[0], l: fl[1], y: y, t: m[1].trim() + " " + y + (m[3] ? " " + m[3] : "") }));
    });
    return ok && tags.length ? { tags: tags, rest: [] } : null;
  }
  const TAGFULL2 = { cse: "UPSC CSE Prelims", up: "UPPSC exam", upm: "UPPCS Mains", cds: "CDS / NDA", capf: "CAPF", oth: "Other State PCS" };

  const RULES = {
    ms1: { tag: "[^\\[\\]]{3,160}", parse: parseTags1, full: TAGFULL1, tnote: true, qaJoin: null },
    ms2: { tag: "[^\\[\\]]{4,200}", parse: parseTags2, full: TAGFULL2, tnote: false, qaJoin: " :: " }
  };

  /* ================= shared helpers ================= */
  /* Plain text for search/snippets: markers removed, tag text kept verbatim. */
  const plain = s => String(s).replace(/\*\*|!!|==|`/g, "");
  const hasTrap = s => /!!.+?!!/.test(s);
  const hasMark = s => /==.+?==/.test(s);
  const balanced = s => ((s.match(/\*\*/g) || []).length % 2 === 0) && ((s.match(/!!/g) || []).length % 2 === 0) &&
    ((s.match(/==/g) || []).length % 2 === 0) && ((s.match(/`/g) || []).length % 2 === 0) &&
    ((s.match(/\[/g) || []).length === (s.match(/\]/g) || []).length);
  const hasKeyTerms = s => /\*\*.+?\*\*|`.+?`/.test(s);
  function cueSplit(s, sep, maxCue) {
    const i = s.indexOf(sep);
    if (i <= 0) return null;
    const cue = s.slice(0, i);
    if (!balanced(cue) || plain(cue).trim().length > maxCue || plain(cue).trim().length < 2) return null;
    /* never cut inside brackets or a quotation */
    if ((cue.match(/\(/g) || []).length !== (cue.match(/\)/g) || []).length) return null;
    if ((cue.match(/“/g) || []).length !== (cue.match(/”/g) || []).length || (cue.match(/"/g) || []).length % 2) return null;
    return { cue: cue, sep: sep, ans: s.slice(i + sep.length) };
  }
  const ans = html => html ? '<span class="ans">' + html + "</span>" : "";

  function makeDialect(id) {
    const R = RULES[id];
    const TAG_RE = new RegExp("\\[(" + R.tag + ")\\]", "g");
    const TAIL_RE = new RegExp("^([\\s\\S]*?)(\\s*)((?:\\[" + R.tag + "\\]\\s*)+)$");
    const parseTags = R.parse, TAGFULL = R.full;

    /* `inner` arrives already HTML-escaped (fmt escapes first), so it is not escaped again. */
    const chip = t => '<span class="y ' + t.f + '" title="' + qAttr(t.t + " — " + TAGFULL[t.f]) + '">' + t.l + "’" + t.y.slice(2) + "</span>";
    function tagHTML(inner) {
      const r = parseTags(inner); if (!r) return null;
      return '<span class="yrs">' + r.tags.map(chip).join("") + (R.tnote && r.rest.length ? '<span class="tnote">' + r.rest.join(" · ") + "</span>" : "") + "</span>";
    }
    /* Same substitution order as the source renderers. */
    const fmt = s => esc(s)
      .replace(TAG_RE, (all, inner) => tagHTML(inner) || all)
      .replace(/!!(.+?)!!/g, '<span class="trap">$1</span>')
      .replace(/==(.+?)==/g, '<span class="hl">$1</span>')
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`(.+?)`/g, '<span class="num">$1</span>');

    /* v1 row-tail UPPCS Prelims years: {y:"25 23"} */
    const yrs = y => y ? '<span class="yrs">' + y.split(/\s+/).map(v => '<span class="y up" title="UPPCS Prelims 20' + v + '">UP’' + v + "</span>").join("") + "</span>" : "";

    function examTags(text, y) {
      const out = [];
      if (y) y.split(/\s+/).filter(Boolean).forEach(v => out.push({ f: "up", l: "UP", y: "20" + v, t: "UPPCS Prelims 20" + v }));
      (text.match(TAG_RE) || []).forEach(b => { const r = parseTags(b.slice(1, -1)); if (r) r.tags.forEach(t => out.push(t)); });
      return out;
    }

    /* How a list fact is prompted. Priority: explicit "::" pair → short cue before " — " / ": " / " = "
       → key-term cloze (bold / numbers) → longer cue → whole line.                              */
    function itemRecall(s, pref) {
      if (s.indexOf(" :: ") >= 0) { const p = s.split(" :: "); return { mode: "qa", cue: p[0], parts: R.qaJoin ? [p.slice(1).join(R.qaJoin)] : p.slice(1) }; }
      if (pref === "cloze" && hasKeyTerms(s)) return { mode: "cloze" };
      const seps = [" — ", ": ", " = "];
      for (const sep of seps) { const c = cueSplit(s, sep, 70); if (c) return Object.assign({ mode: "cue" }, c); }
      if (hasKeyTerms(s)) return { mode: "cloze" };
      for (const sep of seps) { const c = cueSplit(s, sep, 140); if (c) return Object.assign({ mode: "cue" }, c); }
      return { mode: "whole" };
    }
    /* Keep trailing exam tags outside the blurred answer so PYQ metadata stays visible. */
    function splitTrailingTags(s) {
      const m = s.match(TAIL_RE);
      if (!m || !m[1].trim()) return { body: s, gap: "", tail: "" };
      const tags = m[3].match(TAG_RE) || [];
      if (!tags.every(t => parseTags(t.slice(1, -1)))) return { body: s, gap: "", tail: "" };
      if (!balanced(m[1])) return { body: s, gap: "", tail: "" };
      return { body: m[1], gap: m[2], tail: m[3] };
    }
    function ansFmt(s) { const t = splitTrailingTags(s); return ans(fmt(t.body)) + t.gap + (t.tail ? fmt(t.tail) : ""); }

    /* List item → {mode, html}. Read mode shows exactly the source text. */
    function itemHTML(s, pref) {
      const r = itemRecall(s, pref);
      let html;
      if (r.mode === "qa") html = '<span class="cue">' + fmt(r.cue) + "</span> → " + r.parts.map(ansFmt).join(" → ");
      else if (r.mode === "cue") html = '<span class="cue">' + fmt(r.cue) + "</span>" + r.sep + ansFmt(r.ans);
      else if (r.mode === "cloze") html = fmt(s);
      else html = ansFmt(s);
      return { mode: r.mode, html: html };
    }
    const cellHTML = s => ansFmt(s);

    return { id, esc, escAttr, fmt, yrs, parseTags, tagHTML, examTags, plain, hasTrap, hasMark, itemRecall, itemHTML, cellHTML, balanced, EXAMS, TAGFULL };
  }

  const cache = {};
  const dialect = id => cache[RULES[id] ? id : "ms1"] || (cache[RULES[id] ? id : "ms1"] = makeDialect(RULES[id] ? id : "ms1"));
  root.VaultMarkup = Object.assign({}, dialect("ms1"), { dialect, DIALECTS: Object.keys(RULES) });
})(typeof window !== "undefined" ? window : globalThis);
