/* Adapter: "Master Sheet" v2 files (const S=[] + SEC({id,title,group,tier,stats,note,blocks})).
   Blocks: {h, t: tier 1–3, k: "trap"|…, cols+rows | list, fig?}. Markup dialect: ms2 (stricter exam tags,
   UPPCS Mains family, text after a second "::" kept). The source's own renderer is captured as the
   reference for the fidelity check — block bodies, headings, sheet notes and stats lines. */
import { inlineScripts, run, titleOf, descriptionOf } from "./sandbox.mjs";

export const name = "master-sheet-v2";
export const markup = "ms2";

export function detect(html) {
  return /<script/i.test(html) && /\bconst\s+S\s*=\s*\[\s*\]/.test(html) && /\bSEC\s*\(\s*\{/.test(html);
}

const EXPORT_RENDERER = `;globalThis.__R={
  fmt: typeof fmt!=="undefined"?fmt:null, blockHTML: typeof blockHTML!=="undefined"?blockHTML:null,
  KEY: typeof KEY!=="undefined"?KEY:null, GROUPS: typeof GROUPS!=="undefined"?GROUPS:null };\n`;

const COLLECT = `(function(){
  const R = globalThis.__R || {}, SS = typeof S!=="undefined" ? S : null, ref = {}, sref = {};
  if (SS && R.blockHTML && R.fmt) SS.forEach(s => {
    ref[s.id] = s.blocks.map(b => ({ html: R.blockHTML(b, true), head: R.fmt(b.h) }));
    sref[s.id] = { note: s.note ? R.fmt(s.note) : "", stats: (s.stats || []).map(R.fmt) };
  });
  globalThis.__OUT = JSON.parse(JSON.stringify({ S: SS, ref, sref, key: R.KEY || null,
    groups: R.GROUPS ? R.GROUPS.map(g => [g[0], g[1].map(s => s.id)]) : null }));
})();`;

export function extract(html) {
  const { out, warnings } = run(inlineScripts(html), EXPORT_RENDERER, COLLECT);
  if (!out.S || !out.S.length) throw new Error("No SEC({...}) sheets found in source");
  const byId = Object.fromEntries(out.S.map(s => [s.id, s]));
  let groups = out.groups;
  if (!groups) { groups = []; out.S.forEach(s => { let g = groups.find(x => x[0] === s.group); if (!g) groups.push(g = [s.group || "Sheets", []]); g[1].push(s.id); }); }

  const sheets = [];
  groups.forEach(([label, ids]) => ids.forEach(id => {
    const s = byId[id]; if (!s) return;
    sheets.push({
      id: s.id, group: label, tab: s.title, title: s.title, note: s.note || "", stats: s.stats || [],
      pri: "p" + (s.tier || 3), type: "notes",
      blocks: s.blocks.map(b => {
        /* b.id / b.tags / b.no are added by the source renderer at run time — not content, not kept */
        const o = { h: b.h, kind: b.k || "core" };
        if (b.t) o.tier = b.t; if (b.sub) o.sub = b.sub; if (b.cols) o.cols = b.cols; if (b.rows) o.rows = b.rows; if (b.list) o.list = b.list;
        if (b.html) o.html = b.html;
        if (b.fig !== undefined) o.fig = b.fig;   /* checked by lib/figures.mjs before anything is written */
        return o;
      })
    });
  }));

  /* legend = the source's "Key to marks & tags" panel, without its <details> wrapper and recall hint */
  const legendHTML = out.key ? ((out.key.match(/<div class="legend">[\s\S]*<\/div>(?=<\/details>)/) || [])[0] || null) : null;
  const subtitle = (html.match(/<span class="sub">([^<]*)<\/span>/) || [])[1] || "";

  return {
    adapter: name, markup,
    title: titleOf(html), description: descriptionOf(html) || subtitle,
    version: "", updated: "", sources: [],
    legendHTML, groups: groups.map(([label, ids]) => ({ label, sheets: ids.filter(id => byId[id]) })),
    sheets, reference: out.ref, sheetReference: out.sref, warnings
  };
}
