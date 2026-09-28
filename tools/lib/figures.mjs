/* Figures (Master Sheet v2 block field `fig`): build-time safety and size checks.
     fig = { kind: "svg" | "img", src, alt, caption? }
   "svg": src is inline SVG markup. It is parsed here and checked against an allowlist of elements and
   attributes: no script, no event handlers, no foreignObject, no <style>, no class/data-* hooks into the
   page, no reference outside the figure itself, colours only through the page's theme variables.
   "img": src is a base64 data: URI (PNG, JPEG, WebP or GIF) within the size caps below.
   Nothing here edits a figure. Every problem is reported and the subject is not built, so what ships is
   exactly what the notes file shows. The rules are documented in NOTES_FORMAT_GUIDE.md §14. */

export const LIMITS = {
  svgBytes: 60 * 1024,        /* one SVG figure's markup */
  imgBytes: 200 * 1024,       /* one image figure's data: URI, as stored (base64 is ~4/3 of the image file) */
  imgSide: 1600,              /* longest side of an image, px */
  warnTotal: 1024 * 1024,     /* all figures in one file: warning above this */
  maxTotal: 2 * 1024 * 1024,  /* all figures in one file: error above this */
  text: 400                   /* alt and caption, characters */
};

/* The page's colour variables. Defined by the notes file's own <style> (light and dark) and mapped onto
   the Vault palette by app/css/vault.css, so a figure repaints with the theme in both places. */
export const TOKENS = ["ink", "ink-2", "rule", "rule-2", "paper", "sheet", "navy", "navy-bg", "omr", "omr-bg", "teal", "teal-bg",
  "good", "good-bg", "warn", "warn-bg", "plum", "plum-bg", "mark", "mark-ink"];

const ELEMENTS = new Set(["svg", "g", "defs", "symbol", "use", "title", "desc", "path", "rect", "circle", "ellipse", "line",
  "polyline", "polygon", "text", "tspan", "textPath", "marker", "linearGradient", "radialGradient", "stop", "pattern", "clipPath", "mask"]);
const WHY_NOT = {
  script: "scripts are not allowed", style: "not allowed (it would restyle the whole page) — use style='…' attributes",
  foreignObject: "not allowed (it can carry HTML)", image: "not allowed — use a figure of kind \"img\" for a raster image",
  a: "links are not allowed", animate: "animation is not allowed", animateMotion: "animation is not allowed",
  animateTransform: "animation is not allowed", set: "animation is not allowed", filter: "filters are not supported",
  metadata: "editor metadata is not allowed — export a plain SVG", svg: "only the root may be an <svg> — use <g> or <symbol>"
};
const TEXT_ONLY = new Set(["title", "desc"]);
const GEOMETRY = ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "fr", "width", "height", "d", "points", "pathLength",
  "dx", "dy", "rotate", "textLength", "lengthAdjust", "startOffset", "method", "spacing", "side", "transform", "viewBox", "preserveAspectRatio",
  "markerWidth", "markerHeight", "markerUnits", "refX", "refY", "orient", "offset", "gradientUnits", "gradientTransform", "spreadMethod",
  "patternUnits", "patternContentUnits", "patternTransform", "clipPathUnits", "maskUnits", "maskContentUnits"];
/* presentation properties: allowed both as attributes and inside style='…' */
const PRESENTATION = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "opacity", "color", "font-family", "font-size", "font-weight", "font-style",
  "font-variant", "text-anchor", "dominant-baseline", "alignment-baseline", "baseline-shift", "letter-spacing", "word-spacing",
  "text-decoration", "writing-mode", "paint-order", "vector-effect", "shape-rendering", "text-rendering", "marker-start", "marker-mid",
  "marker-end", "stop-color", "stop-opacity", "clip-path", "clip-rule", "mask", "display", "visibility"];
const ATTRS = new Set(["id", "style", "href", "xlink:href", "xmlns", "xmlns:xlink", "xml:space", "xml:lang", "lang", ...GEOMETRY, ...PRESENTATION]);
const ATTR_BY_LOWER = new Map([...ATTRS].map(a => [a.toLowerCase(), a]));
const COLOURS = new Set(["fill", "stroke", "color", "stop-color"]);
const NS = { xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink" };
const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d{1,7}|#x[0-9a-fA-F]{1,6});/g;

export const kb = n => n >= 1048576 ? (n / 1048576).toFixed(2).replace(/\.?0+$/, "") + " MB" : (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
const decode = v => v.replace(ENTITY, e => e === "&amp;" ? "&" : e === "&lt;" ? "<" : e === "&gt;" ? ">" : e === "&quot;" ? '"' : e === "&apos;" ? "'"
  : String.fromCodePoint(e[2] === "x" ? parseInt(e.slice(3, -1), 16) : parseInt(e.slice(2, -1), 10)));

/* ---------- SVG: a strict tokenizer for the subset of SVG the format allows ---------- */
function parseSVG(s, err) {
  const els = [], stack = [];
  const TAG = /<([A-Za-z][A-Za-z0-9:-]*)/y, CLOSE = /<\/([A-Za-z][A-Za-z0-9:-]*)\s*>/y, WS = /\s*/y;
  const ATTR = /([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y;
  let i = 0, done = false;
  const text = t => {
    if (!t) return;
    if (!stack.length || done) { if (t.trim()) err("text outside the <svg> element"); return; }
    if (/&/.test(t.replace(ENTITY, ""))) err("text may use only the entities &amp; &lt; &gt; &quot; &apos; and &#…; — write & as &amp; and other characters directly");
  };
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    text(s.slice(i, lt < 0 ? s.length : lt));
    if (lt < 0) break;
    if (done) { err("nothing may follow the closing </svg>"); return els; }
    if (s.startsWith("<!--", lt)) { err("comments <!-- … --> are not allowed (they can end the notes file's script)"); return els; }
    if (s[lt + 1] === "!" || s[lt + 1] === "?") { err("<!DOCTYPE>, <![CDATA[…]]> and <?xml …?> are not allowed: start the markup at <svg"); return els; }
    if (s[lt + 1] === "/") {
      CLOSE.lastIndex = lt; const m = CLOSE.exec(s);
      if (!m) { err("malformed closing tag near " + JSON.stringify(s.slice(lt, lt + 24))); return els; }
      const top = stack.pop();
      if (!top || top.name !== m[1]) { err(`</${m[1]}> does not close <${top ? top.name : "…"}>`); return els; }
      i = CLOSE.lastIndex; if (!stack.length) done = true;
      continue;
    }
    TAG.lastIndex = lt; const m = TAG.exec(s);
    if (!m) { err("a bare < in text: write &lt;"); return els; }
    const name = m[1], attrs = new Map(); let j = TAG.lastIndex, self = false;
    for (;;) {
      WS.lastIndex = j; const ws = WS.exec(s)[0]; j += ws.length;
      if (s.startsWith("/>", j)) { self = true; j += 2; break; }
      if (s[j] === ">") { j++; break; }
      if (j >= s.length) { err(`<${name}> is never closed with >`); return els; }
      ATTR.lastIndex = j; const a = ATTR.exec(s);
      if (!ws || !a) { err(`<${name}>: malformed attribute near ${JSON.stringify(s.slice(j, j + 30))} — every attribute needs a quoted value, separated by a space`); return els; }
      if (attrs.has(a[1])) err(`<${name}>: attribute ${a[1]} appears twice`);
      attrs.set(a[1], a[2] !== undefined ? a[2] : a[3]); j = ATTR.lastIndex;
    }
    const parent = stack[stack.length - 1] || null;
    if (!parent && els.length) { err("only one <svg> root element is allowed"); return els; }
    if (parent && TEXT_ONLY.has(parent.name)) err(`<${parent.name}> may contain only text`);
    const el = { name, attrs, parent };
    els.push(el); if (!self) stack.push(el); else if (!parent) done = true;
    i = j;
  }
  if (stack.length) err(`<${stack[stack.length - 1].name}> is never closed`);
  return els;
}

function checkRefs(v, where, ids, err) {
  const refs = v.match(/url\(([^)]*)\)/gi) || [];
  refs.forEach(r => {
    const m = /^url\(\s*#([A-Za-z][\w.-]*)\s*\)$/i.exec(r);
    if (!m) err(`${where}: ${r} points outside the figure — only url(#id) of an element in this figure is allowed`);
    else if (!ids.has(m[1])) err(`${where}: ${r} refers to no id in this figure`);
  });
}
function checkColour(prop, v, where, err, inStyle) {
  const s = v.trim();
  if (/^(none|transparent|currentcolor|inherit)$/i.test(s) || /^url\(\s*#[^)]*\)$/i.test(s)) return;
  if (inStyle && /^var\(--[a-z0-9-]+\)$/.test(s)) return;   /* the token itself is checked with every var() */
  if (!inStyle && /var\(/.test(s)) { err(`${where}: put var() inside style — write style='${prop}:${s}' (browsers differ on var() in SVG attributes)`); return; }
  err(`${where}: ${JSON.stringify(s)} is a fixed colour, which breaks dark mode — use a theme variable, style='${prop}:var(--ink)' (one of: ${TOKENS.map(t => "--" + t).join(" ")}), or currentColor / none`);
}

/* functions allowed in a value: url(#id) everywhere (checked by checkRefs), plus the transform functions or,
   inside style, var() and calc() — nothing that could fetch (image-set(), image(), src() …) */
const TRANSFORMS = ["translate", "rotate", "scale", "matrix", "skewX", "skewY"];
function checkFunctions(v, where, allowed, err) {
  (v.match(/[A-Za-z-]+(?=\s*\()/g) || []).forEach(f => { if (f.toLowerCase() !== "url" && !allowed.includes(f)) err(`${where}: ${f}() is not allowed here`); });
}

function checkSVG(src, sheetId, fileIds, label, err) {
  if (!/^<svg[\s>]/.test(src)) { err("src must start with <svg (no spaces, <?xml ?> or comments before it)"); return; }
  if (!/<\/svg>$/.test(src)) { err("src must end with </svg> (nothing after it)"); return; }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(src)) err("control characters are not allowed");
  const els = parseSVG(src, err);
  if (!els.length) return;
  const root = els[0];
  if (root.name !== "svg") { err("the root element must be <svg>"); return; }
  const vb = root.attrs.get("viewBox");
  const n = vb ? vb.trim().split(/[\s,]+/).map(Number) : [];
  if (!vb) err("<svg> needs a viewBox, e.g. viewBox='0 0 640 400' (the figure scales to the page from it)");
  else if (n.length !== 4 || n.some(x => !isFinite(x)) || n[2] <= 0 || n[3] <= 0) err(`<svg> viewBox ${JSON.stringify(vb)} must be four numbers: x y width height`);
  ["width", "height", "x", "y"].forEach(a => { if (root.attrs.has(a)) err(`<svg>: remove ${a}='…' — the figure's size comes from viewBox and the page`); });

  /* ids first, so references can be resolved */
  const ids = new Set();
  els.forEach(el => {
    const id = el.attrs.get("id"); if (id === undefined) return;
    if (!id.startsWith(sheetId + "_") || !/^[a-z0-9-]+_[A-Za-z0-9_-]+$/.test(id)) err(`id ${JSON.stringify(id)} must start with the sheet id and an underscore, e.g. "${sheetId}_arrow" (letters, digits, - and _ only)`);
    else if (fileIds.has(id)) err(`id ${JSON.stringify(id)} is already used by ${fileIds.get(id)} — ids must be unique across the whole file`);
    if (ids.has(id)) err(`id ${JSON.stringify(id)} appears twice in this figure`);
    ids.add(id);
  });

  els.forEach(el => {
    const tag = `<${el.name}>`;
    if (!ELEMENTS.has(el.name) || (el.name === "svg" && el !== root)) {
      const lower = [...ELEMENTS].find(e => e.toLowerCase() === el.name.toLowerCase());
      err(`${tag}: ${WHY_NOT[el.name] || (lower && lower !== el.name ? `write <${lower}> (SVG names are case-sensitive)` : "not an allowed SVG element")}`);
      return;
    }
    el.attrs.forEach((raw, name) => {
      const where = `${tag} ${name}`;
      if (/^on/i.test(name)) { err(`${tag}: event handlers (${name}) are not allowed`); return; }
      if (name === "class") { err(`${tag}: class is not allowed (it would pick up the page's own styles) — use style='…'`); return; }
      if (/^data-/i.test(name)) { err(`${tag}: ${name} is not allowed (data-* attributes drive the page's own controls)`); return; }
      if (!ATTRS.has(name)) { const fix = ATTR_BY_LOWER.get(name.toLowerCase()); err(`${tag}: attribute ${name} is not allowed` + (fix ? ` — did you mean ${fix}?` : "")); return; }
      if (/&(?!(?:amp|lt|gt|quot|apos|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/.test(raw)) { err(`${where}: a bare & — write &amp;`); return; }
      const v = decode(raw);
      if (/[<>]/.test(v)) { err(`${where}: < and > are not allowed in attribute values`); return; }
      if (/javascript:|vbscript:|data:|expression\(|@import|\\/i.test(v.replace(/[\s\u0000-\u001F]+/g, ""))) { err(`${where}: ${JSON.stringify(v.slice(0, 60))} is not allowed`); return; }
      if (name === "xmlns" || name === "xmlns:xlink") { if (el !== root || v !== NS[name]) err(`${where} must be "${NS[name]}", on <svg> only`); return; }
      if (name === "href" || name === "xlink:href") {
        const m = /^#([A-Za-z][\w.-]*)$/.exec(v);
        if (!m) err(`${where}: ${JSON.stringify(v.slice(0, 60))} points outside the figure — only "#id" of an element in this figure is allowed`);
        else if (!ids.has(m[1])) err(`${where}: "#${m[1]}" refers to no id in this figure`);
        return;
      }
      checkRefs(v, where, ids, err);
      checkFunctions(v, where, name === "style" ? ["var", "calc"] : /transform$/i.test(name) ? TRANSFORMS : COLOURS.has(name) ? ["var"] : [], err);
      if (name === "style") {
        v.split(";").map(d => d.trim()).filter(Boolean).forEach(d => {
          const k = d.indexOf(":"), prop = k > 0 ? d.slice(0, k).trim().toLowerCase() : "", val = k > 0 ? d.slice(k + 1).trim() : "";
          if (!prop || !val) { err(`${where}: ${JSON.stringify(d)} is not a property: value pair`); return; }
          if (!PRESENTATION.includes(prop)) { err(`${where}: property ${prop} is not allowed (allowed: the SVG presentation properties, e.g. fill, stroke, stroke-width, opacity, font-size)`); return; }
          (val.match(/var\([^)]*\)/g) || []).forEach(x => { const t = /^var\(--([a-z0-9-]+)\)$/.exec(x); if (!t || !TOKENS.includes(t[1])) err(`${where}: ${x} — use one of the page's colour variables: ${TOKENS.map(t => "--" + t).join(" ")} (no fallback value)`); });
          if (COLOURS.has(prop)) checkColour(prop, val, where, err, true);
        });
        return;
      }
      if (/var\(/.test(v) && !COLOURS.has(name)) { err(`${where}: put var() inside style='…' (browsers differ on var() in SVG attributes)`); return; }
      if (COLOURS.has(name)) checkColour(name, v, where, err, false);
    });
  });
  ids.forEach(id => fileIds.set(id, label));
}

/* ---------- raster: a base64 data: URI within the caps ---------- */
const MAGIC = { png: b => b[0] === 0x89 && b.toString("latin1", 1, 4) === "PNG", jpeg: b => b[0] === 0xFF && b[1] === 0xD8,
  gif: b => b.toString("latin1", 0, 4) === "GIF8", webp: b => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" };
/* each format's end marker: a string cut short (by a copy, an editor or an AI) fails here. Damage in the
   middle of the data cannot be seen without decoding it, so always paste base64 from a converter, never retype it. */
const COMPLETE = { png: b => b.length > 12 && b.toString("latin1", b.length - 8, b.length - 4) === "IEND", jpeg: b => b[b.length - 2] === 0xFF && b[b.length - 1] === 0xD9,
  gif: b => b[b.length - 1] === 0x3B, webp: b => b.readUInt32LE(4) + 8 === b.length };

function checkImg(src, R, err) {
  if (/^(https?:)?\/\//i.test(src)) { err("remote images are not allowed (the Vault must work offline): embed the image as a data: URI — data:image/webp;base64,…"); return; }
  if (/^data:image\/svg/i.test(src)) { err("an SVG belongs in a figure of kind \"svg\", as inline markup"); return; }
  const m = /^data:image\/(png|jpeg|gif|webp);base64,(.*)$/.exec(src);
  if (!m) { err(`src must be a base64 data: URI of a PNG, JPEG, WebP or GIF image (data:image/webp;base64,…), not ${JSON.stringify(src.slice(0, 40))}…`); return; }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(m[2]) || m[2].length % 4) { err("the base64 data is malformed — no spaces or line breaks, and not truncated"); return; }
  if (src.length > LIMITS.imgBytes) err(`the image is ${kb(src.length)} as stored — the limit is ${kb(LIMITS.imgBytes)}: resize it (≤ ${LIMITS.imgSide} px on the longest side) and compress it (WebP or JPEG, quality about 70, metadata stripped)`);
  const bin = Buffer.from(m[2], "base64");
  if (!MAGIC[m[1]](bin)) { err(`the data is not a ${m[1].toUpperCase()} image (its first bytes do not match data:image/${m[1]})`); return; }
  if (!COMPLETE[m[1]](bin)) err("the image data is incomplete (it does not end the way a " + m[1].toUpperCase() + " file ends) — paste the whole data: URI again from the converter");
  const d = R.imgSize(src);
  if (!d) { err("the image's width and height cannot be read from its header — re-export it as a baseline PNG, JPEG or WebP"); return; }
  if (Math.max(d[0], d[1]) > LIMITS.imgSide) err(`the image is ${d[0]}×${d[1]} px — at most ${LIMITS.imgSide} px on the longest side`);
  return d;
}

const plainText = (label, v, err) => {
  if (typeof v !== "string" || !v.trim()) { err(`${label} is required: a plain-text string saying what the figure shows`); return; }
  if (v.length > LIMITS.text) err(`${label} is ${v.length} characters — keep it under ${LIMITS.text}; put detail in the block's lines`);
  if (/\*\*|!!|==|`|\[[^\]]*\]/.test(v)) err(`${label} is plain text: no **, !!, ==, backticks or [tags]`);
  if (/<[A-Za-z!\/]|&[A-Za-z]+;|&#/.test(v)) err(`${label} is plain text: write characters, not HTML`);
};

/* sheets: extracted subject sheets. R: the Vault renderer (VaultRender), whose imgSize the pages use.
   Returns { count, svg, img, bytes, errors[], warnings[] }. */
export function checkFigures(sheets, R) {
  const rep = { count: 0, svg: 0, img: 0, bytes: 0, errors: [], warnings: [] };
  const fileIds = new Map();
  sheets.forEach(s => (s.blocks || []).forEach(b => {
    if (b.fig === undefined) return;
    const err = msg => rep.errors.push(`[${s.id}] ${b.h}: ${msg}`);
    const f = b.fig;
    if (!f || typeof f !== "object" || Array.isArray(f)) { err("fig must be an object {kind, src, alt, caption}"); return; }
    rep.count++;
    Object.keys(f).forEach(k => { if (!["kind", "src", "alt", "caption"].includes(k)) err(`fig has an unknown field ${JSON.stringify(k)} (allowed: kind, src, alt, caption)`); });
    const figOnly = !b.rows && !b.list && b.html == null;
    if (figOnly && b.kind === "trap") err('k:"trap" needs lines to drill — leave k out of a figure-only block (or use "support")');
    plainText("alt", f.alt, err);
    if (f.caption !== undefined) plainText("caption", f.caption, err);
    if (typeof f.src !== "string" || !f.src) { err("src is required: a string of SVG markup, or a data: URI"); return; }
    rep.bytes += f.src.length;
    if (f.kind === "svg") {
      rep.svg++;
      if (f.src.length > LIMITS.svgBytes) err(`the SVG is ${kb(f.src.length)} — the limit is ${kb(LIMITS.svgBytes)}: simplify paths (fewer points, rounded coordinates) or, for a very detailed map, use a compressed image`);
      checkSVG(f.src, s.id, fileIds, `[${s.id}] ${b.h}`, m => err("svg: " + m));
    } else if (f.kind === "img") {
      rep.img++;
      checkImg(f.src, R, m => err("img: " + m));
    } else err(`kind must be "svg" or "img", not ${JSON.stringify(f.kind)}`);
  }));
  if (rep.bytes > LIMITS.maxTotal) rep.errors.push(`figures total ${kb(rep.bytes)} — the limit for one file is ${kb(LIMITS.maxTotal)}; compress or drop images`);
  else if (rep.bytes > LIMITS.warnTotal) rep.warnings.push(`figures total ${kb(rep.bytes)}, over the ${kb(LIMITS.warnTotal)} budget (the build fails above ${kb(LIMITS.maxTotal)}) — prefer SVG, and compress images`);
  return rep;
}
