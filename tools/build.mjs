#!/usr/bin/env node
/* Study Vault build — ingests every notes file in sources/ into data/.
     node tools/build.mjs          (or double-click "Build Vault.cmd")
   Source files are only read, never written. Output:
     data/subjects/<id>.js   normalised content for one subject
     data/manifest.js        subject list loaded by index.html
     data/registry.json      first-seen dates (keeps "recently added" stable across builds) */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as masterSheetV2 from "./lib/master-sheet-v2.mjs";
import * as masterSheets from "./lib/master-sheets.mjs";
import * as genericHtml from "./lib/generic-html.mjs";
import { verify, loadRenderer } from "./lib/verify.mjs";
import { checkFigures, kb } from "./lib/figures.mjs";
import { publishSheet, writeServiceWorker } from "./lib/pwa.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "sources"), DATA = path.join(ROOT, "data"), OUT = path.join(DATA, "subjects"), APP = path.join(ROOT, "app");
const ADAPTERS = [masterSheetV2, masterSheets, genericHtml];   /* first match wins; generic is the fallback */

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const slug = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[`*!=\[\]]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "section";

/* Default identity per subject; override any of it in vault.config.json. */
const ACCENTS = [
  [/polity|constitution|governance/i, "#3E55C4"], [/geograph/i, "#0F7F86"], [/econom/i, "#2F7D32"],
  [/history|culture|art/i, "#A0582A"], [/environment|ecology/i, "#3C7A3A"], [/science|tech/i, "#6D4BC3"],
  [/ethic/i, "#9B3F75"], [/current/i, "#B0453A"]
];
const accentFor = name => (ACCENTS.find(([re]) => re.test(name)) || [null, "#4A5568"])[1];

/* "Polity Master Sheets.html", "Polity_Master_Sheet_v2.html", "Economy notes (final).html" → the subject word(s) */
function subjectNames(file, title) {
  const base = path.basename(file, path.extname(file));
  const name = base.replace(/[_-]+/g, " ").replace(/[()[\]]/g, " ")
    .replace(/\b(master\s*sheets?|notes?|sheets?|revision|final|latest|updated|v\d+(\.\d+)*)\b/gi, "")
    .replace(/\s+/g, " ").trim() || base;
  return { id: slug(name), name, title: title || base };
}

function build() {
  if (!fs.existsSync(SRC)) { console.error("No sources/ folder."); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const config = readJSON(path.join(ROOT, "vault.config.json"), {});
  const registry = readJSON(path.join(DATA, "registry.json"), { subjects: {} });
  const files = fs.readdirSync(SRC).filter(f => /\.html?$/i.test(f)).sort();
  if (!files.length) console.warn("sources/ has no .html files.");
  const manifest = [], seen = new Set();
  const { R: vaultRender } = loadRenderer(APP);   /* the Vault's own renderer, for the figure checks */
  let failed = false;

  for (const file of files) {
    const full = path.join(SRC, file);
    const buf = fs.readFileSync(full), mtime = fs.statSync(full).mtime;
    const html = buf.toString("utf8");
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    const adapter = ADAPTERS.find(a => a.detect(html));
    let x;
    try { x = adapter.extract(html, { fileTitle: path.basename(file, path.extname(file)) }); }
    catch (e) { console.error(`✗ ${file}: ${e.message}`); failed = true; continue; }

    const names = subjectNames(file, x.title);
    const cfg = (config.subjects || {})[names.id] || {};
    const id = cfg.id || names.id;
    if (seen.has(id)) { console.error(`✗ ${file}: subject id "${id}" already used — set a different id in vault.config.json`); failed = true; continue; }
    seen.add(id);

    /* Stable ids: sheets keep source ids; sections get a slug of their heading. */
    const sheetIds = new Set();
    x.sheets.forEach((s, i) => {
      let sid = s.id || slug(s.title); while (sheetIds.has(sid)) sid += "-" + (i + 1);
      s.id = sid; sheetIds.add(sid); s.num = i + 1;
      if (s.blocks) { const used = new Set(); s.blocks.forEach(b => { let bid = slug(b.h), k = 2; while (used.has(bid)) bid = slug(b.h) + "-" + k++; used.add(bid); b.id = bid; }); }
    });
    if (x.adapter === "generic-html") x.groups[0].sheets = x.sheets.map(s => s.id);

    const reg = registry.subjects[id] || (registry.subjects[id] = { addedAt: new Date().toISOString() });
    reg.file = file; reg.sha256 = sha256;

    const subject = {
      schema: 1, id, name: cfg.name || names.name, title: cfg.title || names.title, description: cfg.description || x.description,
      accent: cfg.accent || accentFor(names.name), order: cfg.order ?? 100,
      source: { file: "sources/" + file, sha256, bytes: buf.length, adapter: x.adapter }, markup: x.markup || "ms1",
      version: x.version, updated: x.updated || mtime.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      sources: x.sources, addedAt: reg.addedAt, builtAt: new Date().toISOString(), sheet: "data/sheets/" + id + ".html",
      legendHTML: x.legendHTML, groups: x.groups, sheets: x.sheets
    };

    /* Figures: safety and size checks (a subject with a bad figure is not built). */
    const figs = checkFigures(subject.sheets, vaultRender);
    /* the fidelity check compares markup, not CSS: a file with figures also needs the template's figure styles */
    if (figs.count && !/\.nfig-m svg\s*\{/.test(html)) figs.errors.push("the file's <style> predates figures — copy the <style> block (and the RENDER region) from templates/Master_Sheet_TEMPLATE.html");
    /* Fidelity check against the source's own renderer. */
    const rep = verify(subject, x.reference, APP, x.sheetReference);
    const nSheets = subject.sheets.length, nBlocks = subject.sheets.reduce((a, s) => a + (s.blocks ? s.blocks.length : 0), 0);
    console.log(`\n● ${subject.name}  (${file} · ${x.adapter})`);
    console.log(`  ${nSheets} sheets · ${nBlocks} sections · ${rep.lines} lines` +
      (figs.count ? ` · ${figs.count} figure${figs.count === 1 ? "" : "s"} (${[figs.svg ? figs.svg + " SVG" : "", figs.img ? figs.img + " image" + (figs.img === 1 ? "" : "s") : ""].filter(Boolean).join(", ")} · ${kb(figs.bytes)})` : ""));
    x.warnings.forEach(w => console.log("  ! " + w));
    figs.warnings.forEach(w => console.log("  ! " + w));
    if (rep.checked) {
      console.log(`  fidelity: ${rep.identical}/${rep.lines} lines identical to the source renderer · ${rep.headers} column headers match` + (rep.notes ? ` · ${rep.notes} sheet notes/stats lines match` : "") +
        (rep.figures ? ` · ${rep.figIdentical}/${rep.figures} figures identical` : ""));
      if (rep.sourceOmits.length) {
        console.log(`  note: the source renderer hides part of ${rep.sourceOmits.length} line(s); the vault shows the full text:`);
        rep.sourceOmits.forEach(o => console.log(`    · [${o.sheet}] ${o.vault}`));
      }
    } else console.log("  fidelity: no source renderer to compare against (content kept verbatim)");
    if (figs.errors.length) {
      console.error(`  ✗ ${figs.errors.length} figure problem(s):`);
      figs.errors.slice(0, 30).forEach(e => console.error(`    · ${e}`));
      if (figs.errors.length > 30) console.error(`    · … and ${figs.errors.length - 30} more`);
    }
    if (rep.mismatches.length) {
      console.error(`  ✗ ${rep.mismatches.length} fidelity problem(s):`);
      rep.mismatches.slice(0, 20).forEach(m => console.error(`    · [${m.sheet}] ${m.block}: ${m.issue}${m.source ? `\n        source: ${m.source}\n        vault:  ${m.vault}` : ""}`));
    }
    if (figs.errors.length || rep.mismatches.length) { failed = true; continue; }

    const js = `/* Generated by tools/build.mjs from ${subject.source.file} — do not edit; rebuild instead. */\n` +
      `(window.VAULT_SUBJECTS = window.VAULT_SUBJECTS || []).push(${JSON.stringify(subject)});\n`;
    fs.writeFileSync(path.join(OUT, id + ".js"), js);
    publishSheet(html, path.join(DATA, "sheets", id + ".html"));   /* the notes file itself, for offline reading in the app */
    manifest.push({ id, name: subject.name, title: subject.title, accent: subject.accent, order: subject.order, file: "data/subjects/" + id + ".js", addedAt: subject.addedAt, updated: subject.updated, version: subject.version, sheets: nSheets, sections: nBlocks, lines: rep.lines, ...(figs.count ? { figures: figs.count } : {}), sha256 });
  }

  /* Remove outputs for subjects whose source file is gone. */
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".js") && !seen.has(f.slice(0, -3))) { fs.unlinkSync(path.join(OUT, f)); console.log(`  removed stale data/subjects/${f}`); }
  const SHEETS = path.join(DATA, "sheets");
  if (fs.existsSync(SHEETS)) for (const f of fs.readdirSync(SHEETS)) if (f.endsWith(".html") && !seen.has(f.slice(0, -5))) { fs.unlinkSync(path.join(SHEETS, f)); console.log(`  removed stale data/sheets/${f}`); }

  manifest.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(DATA, "manifest.js"), `/* Generated by tools/build.mjs — do not edit. */\nwindow.VAULT_MANIFEST = ${JSON.stringify({ builtAt: new Date().toISOString(), subjects: manifest }, null, 1)};\n`);
  fs.writeFileSync(path.join(DATA, "registry.json"), JSON.stringify(registry, null, 1));
  const sw = writeServiceWorker(ROOT);   /* last, so its version covers everything written above */
  console.log(`\n  offline app: sw.js ${sw.VERSION} precaches ${sw.files} files`);
  console.log(`\n${failed ? "Finished with errors" : "Done"} — ${manifest.length} subject(s) in the vault. Open index.html.`);
  if (failed) process.exitCode = 1;
}

build();
