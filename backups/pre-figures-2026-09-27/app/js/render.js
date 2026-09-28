/* Study Vault — section body renderer (tables + fact lists).
   Every row/item carries data-l="r<i>" / "i<j>" so search, recall and revision can point
   back to the exact line. Shared by the browser and tools/build.mjs (fidelity check). */
(function (root) {
  "use strict";
  const base = () => root.VaultMarkup;

  function rowParts(r) {
    const last = r[r.length - 1];
    if (r.length && last && typeof last === "object") return { cells: r.slice(0, -1), tail: last };
    return { cells: r, tail: null };
  }
  function itemParts(it) {
    if (Array.isArray(it)) return { text: it[0], meta: it[1] || {} };
    return { text: it, meta: {} };
  }

  function rowHTML(r, i, ncols, M) {
    M = M || base();
    const p = rowParts(r), cells = p.cells, tail = p.tail;
    let tds = cells.map((c, k) => "<td" + (k === 0 ? ' class="k-wrap"' : "") + ">" + M.cellHTML(c) +
      (k === cells.length - 1 && tail && tail.y ? M.yrs(tail.y) : "") + "</td>").join("");
    for (let k = cells.length; k < ncols; k++) tds += "<td></td>";
    return '<tr data-l="r' + i + '"' + (tail && tail.t ? ' class="trow"' : "") + ">" + tds + "</tr>";
  }
  function listItemHTML(it, j, pref, M) {
    M = M || base();
    const p = itemParts(it);
    const trap = p.meta.t || /!!/.test(p.text);
    const r = M.itemHTML(p.text, pref);
    return '<li data-l="i' + j + '" class="rm-' + r.mode + (trap ? " t" : "") + '">' + r.html + (p.meta.y ? M.yrs(p.meta.y) : "") + "</li>";
  }

  /* opt.keep(kind "r"|"i", index) → false hides a line (filters); opt.pref = list recall preference.
     opt.hide = table recall column mode; opt.M = the subject's markup dialect.
     Returns "" when every line is filtered out. */
  function blockBody(b, opt) {
    opt = opt || {};
    const M = opt.M || base();
    const keep = opt.keep || null;
    let h = "", n = 0;
    if (b.html != null) { if (!b.rows && !b.list) return '<div class="src-html">' + b.html + "</div>"; h = '<div class="src-html">' + b.html + "</div>"; n++; }
    if (b.rows && b.rows.length) {
      const rows = [];
      b.rows.forEach((r, i) => { if (!keep || keep("r", i)) rows.push(rowHTML(r, i, b.cols.length, M)); });
      if (rows.length) {
        n += rows.length;
        h += '<div class="tw"><table data-hide="' + (opt.hide || "answers") + '"><thead><tr>' +
          b.cols.map(c => "<th>" + M.fmt(c) + "</th>").join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
      }
    }
    if (b.list && b.list.length) {
      const items = [];
      b.list.forEach((it, j) => { if (!keep || keep("i", j)) items.push(listItemHTML(it, j, opt.pref, M)); });
      if (items.length) { n += items.length; h += '<ul class="facts">' + items.join("") + "</ul>"; }
    }
    return n ? h : "";
  }

  root.VaultRender = { blockBody, rowParts, itemParts, rowHTML, listItemHTML };
})(typeof window !== "undefined" ? window : globalThis);
