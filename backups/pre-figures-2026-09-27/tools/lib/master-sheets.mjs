/* Adapter: "Master Sheets" v1 files (data-driven HTML: const SHEETS=[] + SHEETS.push({...})).
   The source's own script runs in the sandbox, so the extracted content is exactly what the source
   shows in a browser — including its own post-processing. Markup dialect: ms1. */
import { inlineScripts, run, titleOf, descriptionOf } from "./sandbox.mjs";

export const name = "master-sheets";
export const markup = "ms1";

export function detect(html) {
  return /<script/i.test(html) && /\bSHEETS\s*\.push\s*\(/.test(html);
}

const EXPORT_RENDERER = `;globalThis.__R={
  GROUPS: typeof GROUPS!=="undefined"?GROUPS:null, SPECIAL: typeof SPECIAL!=="undefined"?SPECIAL:null,
  byId: typeof byId!=="undefined"?byId:null, sheetHTML: typeof sheetHTML!=="undefined"?sheetHTML:null,
  blockHTML: typeof blockHTML!=="undefined"?blockHTML:null, fmt: typeof fmt!=="undefined"?fmt:null,
  LEGEND: typeof LEGEND!=="undefined"?LEGEND:null };\n`;

const COLLECT = `(function(){
  const R = globalThis.__R || {};
  const D = { META: typeof META!=="undefined"?META:null, SHEETS: typeof SHEETS!=="undefined"?SHEETS:null };
  const X = { groups: null, special: {}, legend: R.LEGEND || null, ref: {} };
  if (R.GROUPS) X.groups = R.GROUPS.map(g => [g[0], g[1].slice()]);
  if (R.blockHTML && D.SHEETS) D.SHEETS.forEach(s => { X.ref[s.id] = s.blocks.map(b => ({ html: R.blockHTML(b).html, head: R.fmt ? R.fmt(b.h) : null })); });
  if (R.SPECIAL && R.sheetHTML && R.byId) Object.keys(R.SPECIAL).forEach(id => {
    const sp = R.SPECIAL[id]; let html = R.sheetHTML(R.byId(id));
    if (R.LEGEND && html.indexOf(R.LEGEND) >= 0) html = html.slice(html.indexOf(R.LEGEND) + R.LEGEND.length);
    X.special[id] = { id: sp.id, tab: sp.tab, pri: sp.pri, title: sp.title, note: sp.note, noteHTML: R.fmt ? R.fmt(sp.note || "") : null, html };
  });
  globalThis.__OUT = JSON.parse(JSON.stringify({ D, X }));
})();`;

export function extract(html) {
  const { out, warnings } = run(inlineScripts(html), EXPORT_RENDERER, COLLECT);
  const { D, X } = out;
  if (!D.SHEETS || !D.SHEETS.length) throw new Error("No SHEETS found in source");

  /* Sheet order: the source's own tab groups when present, else source order. */
  const byId = Object.fromEntries(D.SHEETS.map(s => [s.id, s]));
  let groups = X.groups;
  if (!groups) groups = [["Sheets", D.SHEETS.map(s => s.id)]];
  const listed = new Set(groups.flatMap(g => g[1]));
  const unlisted = D.SHEETS.filter(s => !listed.has(s.id)).map(s => s.id);
  if (unlisted.length) groups.push(["More", unlisted]);

  const sheets = [];
  groups.forEach(([label, ids]) => ids.forEach(id => {
    if (byId[id]) {
      const s = byId[id];
      sheets.push({ id: s.id, group: label, tab: s.tab, title: s.title, note: s.note || "", pri: s.pri || "p3", type: "notes",
        blocks: s.blocks.map(b => { const o = { h: b.h, kind: b.kind || "core" }; if (b.cols) o.cols = b.cols; if (b.rows) o.rows = b.rows; if (b.list) o.list = b.list; if (b.sub) o.sub = b.sub; return o; }) });
    } else if (X.special[id]) {
      const s = X.special[id];
      sheets.push({ id: s.id, group: label, tab: s.tab, title: s.title, note: s.note || "", noteHTML: s.noteHTML, pri: s.pri || "p3", type: "html", html: s.html });
    }
  }));

  /* The legend explains the chip colours; drop the source's recall-mode hint paragraph (UI chrome). */
  const legendHTML = X.legend ? X.legend.replace(/<p class="recall-hint">[\s\S]*?<\/p>/, "") : null;

  return {
    adapter: name, markup,
    title: titleOf(html), description: descriptionOf(html),
    version: D.META && D.META.version || "", updated: D.META && D.META.updated || "",
    sources: D.META && D.META.sources || [],
    legendHTML, groups: groups.map(([label, ids]) => ({ label, sheets: ids.filter(id => sheets.some(s => s.id === id)) })),
    sheets, reference: X.ref, sheetReference: null, warnings
  };
}
