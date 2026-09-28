/* Study Vault — section body renderer (figures + tables + fact lists).
   Every row/item carries data-l="r<i>" / "i<j>" so search, recall and revision can point
   back to the exact line. Shared by the browser and tools/build.mjs (fidelity check). */
(function (root) {
  "use strict";
  const base = () => root.VaultMarkup;

  /* ---- figures (Master Sheet v2 `fig`: {kind, src, alt, caption}) ----
     Only ever an inline <svg> or a base64 data: image; anything else shows a notice instead.
     The build has already checked every figure (tools/lib/figures.mjs). figHTML and imgSize are
     the same code as in the RENDER region of templates/Master_Sheet_TEMPLATE.html, and the build
     compares the two outputs figure by figure — change both or neither. */
  const escA = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  /* pixel size of a base64 PNG / GIF / WebP / JPEG, read from its header bytes, so the page can
     reserve the image's space before it is decoded (no layout shift) */
  function imgSize(src) {
    const m = /^data:image\/(png|gif|webp|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src); if (!m) return null;
    const t = m[1], b = m[2], A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const at = i => { const q = 4 * Math.floor(i / 3); if (q + 4 > b.length) return -1; let n = 0; for (let j = 0; j < 4; j++) n = n * 64 + Math.max(0, A.indexOf(b[q + j])); return Math.floor(n / Math.pow(256, 2 - i % 3)) % 256; };
    const be = (i, k) => { let n = 0; for (let j = 0; j < k; j++) n = n * 256 + at(i + j); return n; };
    const le = (i, k) => { let n = 0; for (let j = k - 1; j >= 0; j--) n = n * 256 + at(i + j); return n; };
    const str = (i, k) => { let s = ""; for (let j = 0; j < k; j++) s += String.fromCharCode(at(i + j)); return s; };
    let w = 0, h = 0;
    if (t === "png" && str(1, 3) === "PNG" && str(12, 4) === "IHDR") { w = be(16, 4); h = be(20, 4); }
    else if (t === "gif" && str(0, 4) === "GIF8") { w = le(6, 2); h = le(8, 2); }
    else if (t === "webp" && str(0, 4) === "RIFF" && str(8, 4) === "WEBP") {
      const c = str(12, 4);
      if (c === "VP8 ") { w = le(26, 2) % 16384; h = le(28, 2) % 16384; }
      else if (c === "VP8L") { const v = le(21, 4); w = v % 16384 + 1; h = Math.floor(v / 16384) % 16384 + 1; }
      else if (c === "VP8X") { w = le(24, 3) + 1; h = le(27, 3) + 1; }
    } else if (t === "jpeg" && be(0, 2) === 65496) {
      /* walk the segments to the first start-of-frame marker (C0–CF except C4, C8, CC) */
      for (let i = 2, k = 0; k < 500 && at(i) === 255; k++) {
        const mk = at(i + 1);
        if (mk === 255) { i++; continue; }
        if (mk >= 192 && mk <= 207 && mk !== 196 && mk !== 200 && mk !== 204) { h = be(i + 5, 2); w = be(i + 7, 2); break; }
        i += mk === 1 || (mk >= 208 && mk <= 216) ? 2 : 2 + be(i + 2, 2);
      }
    }
    return w > 0 && h > 0 ? [w, h] : null;
  }
  function figHTML(f) {
    let m = "";
    if (f.kind === "svg" && /^<svg[\s>]/.test(f.src)) m = '<div class="nfig-m" role="img" aria-label="' + escA(f.alt) + '">' + f.src + "</div>";
    else if (f.kind === "img") { const d = imgSize(f.src); if (d) m = '<div class="nfig-m"><img src="' + f.src + '" alt="' + escA(f.alt) + '" width="' + d[0] + '" height="' + d[1] + '" decoding="async"></div>'; }
    if (!m) m = '<p class="nfig-bad">Figure not shown: it is not an inline &lt;svg&gt; or a base64 data: image. The build explains why.</p>';
    return '<figure class="nfig nfig-' + escA(f.kind) + '">' + m + (f.caption ? "<figcaption>" + escA(f.caption) + "</figcaption>" : "") + "</figure>";
  }

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
     A block's figure comes first. Returns "" when every line is filtered out: under a filter a
     figure shows only beside surviving lines, so a figure-only block is hidden. */
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
    if (b.fig && (n || !keep)) h = figHTML(b.fig) + h;
    return h && (n || !keep) ? h : "";
  }

  root.VaultRender = { blockBody, rowParts, itemParts, rowHTML, listItemHTML, figHTML, imgSize };
})(typeof window !== "undefined" ? window : globalThis);
