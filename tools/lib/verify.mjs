/* Fidelity check: the vault's renderer must show the same text, line by line, as the source's own
   renderer. Runs app/js/markup.js + render.js (the exact files the browser uses) in a VM, with the
   subject's markup dialect. Also compares headings, figures (whole markup, not counted as lines) and,
   when available, sheet notes and stats lines. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const text = h => h.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
/* figures are compared whole, as markup, and are not lines; they are cut out before lines are read */
const FIG = /<figure class="nfig[\s\S]*?<\/figure>/g;
const figs = h => h.match(FIG) || [];
const lines = h => [...h.replace(FIG, "").matchAll(/<(tr|li)\b[\s\S]*?<\/\1>/g)].map(m => m[0]).filter(x => !/^<tr><th/.test(x));
const heads = h => [...h.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(m => text(m[1]).replace(/`/g, ""));

export function loadRenderer(appDir) {
  const ctx = vm.createContext({});
  for (const f of ["markup.js", "render.js"]) vm.runInContext(fs.readFileSync(path.join(appDir, "js", f), "utf8"), ctx, { filename: f });
  return { VM: ctx.VaultMarkup, R: ctx.VaultRender };
}

/* True when every word of `a` appears in `b` in order (a is a lossy rendering of b). */
function isSubsequence(a, b) {
  const wa = a.split(" "), wb = b.split(" "); let j = 0;
  for (const w of wb) if (j < wa.length && w === wa[j]) j++;
  return j === wa.length;
}

export function verify(subject, reference, appDir, sheetReference) {
  const { VM, R } = loadRenderer(appDir);
  const M = VM.dialect(subject.markup || "ms1");
  const report = { blocks: 0, lines: 0, identical: 0, sourceOmits: [], mismatches: [], headers: 0, notes: 0, figures: 0, figIdentical: 0, checked: !!reference };
  subject.sheets.forEach(s => {
    if (s.type !== "notes") return;
    const sr = sheetReference && sheetReference[s.id];
    if (sr) {
      if (text(M.fmt(s.note || "")) !== text(sr.note)) report.mismatches.push({ sheet: s.id, block: "(sheet note)", issue: "note text differs" });
      else report.notes++;
      (s.stats || []).forEach((x, i) => { if (text(M.fmt(x)) !== text(sr.stats[i] || "")) report.mismatches.push({ sheet: s.id, block: "(sheet stats)", issue: "stats line " + (i + 1) + " differs" }); else report.notes++; });
    }
    s.blocks.forEach((b, bi) => {
      report.blocks++;
      const mine = R.blockBody(b, { M });
      const ml = lines(mine);
      const expectedLines = (b.rows ? b.rows.length : 0) + (b.list ? b.list.length : 0);
      if (b.html == null && ml.length !== expectedLines) report.mismatches.push({ sheet: s.id, block: b.h, issue: `rendered ${ml.length} of ${expectedLines} lines` });
      report.lines += ml.length;
      const mf = figs(mine); report.figures += mf.length;
      const ref = reference && reference[s.id] && reference[s.id][bi];
      if (!ref) return;
      if (text(M.fmt(b.h)) !== text(ref.head)) report.mismatches.push({ sheet: s.id, block: b.h, issue: "heading text differs" });
      const body = ref.html.slice(ref.html.indexOf("</summary>") + 10);
      /* a figure must come out of both renderers as the very same markup */
      const rf = figs(body);
      if (mf.length && !rf.length) report.mismatches.push({ sheet: s.id, block: b.h, issue: "figure missing from the source renderer — this file's RENDER region predates figures: replace it with the RENDER region of templates/Master_Sheet_TEMPLATE.html" });
      else if (mf.length !== rf.length || mf.some((f, i) => f !== rf[i])) {
        const a = rf.join(" "), v = mf.join(" "); let k = 0; while (k < a.length && a[k] === v[k]) k++;
        const at = t => (k > 40 ? "…" : "") + t.slice(Math.max(0, k - 40), k + 80) + (t.length > k + 80 ? "…" : "");
        report.mismatches.push({ sheet: s.id, block: b.h, issue: "figure differs from the source renderer (the RENDER region's figure code was changed — restore it from the template)", source: at(a), vault: at(v) });
      }
      else report.figIdentical += mf.length;
      const rl = lines(body);
      if (rl.length !== ml.length) { report.mismatches.push({ sheet: s.id, block: b.h, issue: `source shows ${rl.length} lines, vault ${ml.length}` }); return; }
      const hm = heads(mine), hr = heads(body);
      if (hm.join("|") !== hr.join("|")) report.mismatches.push({ sheet: s.id, block: b.h, issue: "column headers differ" });
      else report.headers += hm.length;
      ml.forEach((l, i) => {
        const a = text(rl[i]), v = text(l);
        if (a === v) { report.identical++; return; }
        if (v.length > a.length && isSubsequence(a, v)) report.sourceOmits.push({ sheet: s.id, block: b.h, source: a, vault: v });
        else report.mismatches.push({ sheet: s.id, block: b.h, issue: "line text differs", source: a, vault: v });
      });
    });
  });
  return report;
}
