/* Adapter: plain static HTML notes (fallback for sources that are not "Master Sheets" data files).
   Content HTML is kept verbatim; only executable/presentational wrappers are removed.
   <h2> → sheet, <h3> → section. With no <h2>, <h1> is used; with neither, one sheet. */
export const name = "generic-html";
export const markup = "ms1";

export function detect() { return true; }

const strip = h => h.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

function sanitize(h) {
  return h
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(link|meta|base)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

function splitBy(html, tag) {
  const re = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + "\\s*>", "gi");
  const parts = []; let last = 0, m, head = null;
  while ((m = re.exec(html))) {
    parts.push({ h: head, html: html.slice(last, m.index) });
    head = strip(m[1]); last = re.lastIndex;
  }
  parts.push({ h: head, html: html.slice(last) });
  return parts.filter(p => p.h !== null || strip(p.html));
}

export function extract(html, { fileTitle }) {
  const title = strip((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "") || fileTitle;
  const desc = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || "";
  let body = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [])[1] || html;
  body = sanitize(body);
  const top = /<h2\b/i.test(body) ? "h2" : /<h1\b/i.test(body) ? "h1" : null;
  const chunks = top ? splitBy(body, top) : [{ h: title, html: body }];
  const sheets = chunks.map((c, i) => {
    const sheetTitle = c.h || (i === 0 ? "Introduction" : "Section " + (i + 1));
    const secs = splitBy(c.html, "h3");
    const blocks = secs.filter(s => strip(s.html)).map(s => ({ h: s.h || sheetTitle, kind: "core", html: s.html.trim() }));
    return { id: "", group: "Sheets", tab: sheetTitle, title: sheetTitle, note: "", pri: "p2", type: "notes", blocks };
  }).filter(s => s.blocks.length);
  return {
    adapter: name, title, description: desc, version: "", updated: "", sources: [], legendHTML: null,
    groups: [{ label: "Sheets", sheets: [] }], sheets, reference: null, warnings: []
  };
}
