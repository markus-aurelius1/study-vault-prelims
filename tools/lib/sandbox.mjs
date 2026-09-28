/* Runs a source file's own <script> code in an isolated VM with inert DOM stubs, so the notes are
   extracted exactly as the source page would build them. An export statement can be injected just
   before the last "})();" (the render IIFE) to capture the source's own renderer for fidelity checks. */
import vm from "node:vm";

/* A do-nothing object that absorbs any DOM access the source renderer performs. */
function inert() {
  const store = Object.create(null);
  const target = function () {};
  return new Proxy(target, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => "";
      if (k === Symbol.iterator) return function* () {};
      if (k === "then") return undefined;
      if (k === "length") return 0;
      if (k in store) return store[k];
      return (store[k] = inert());
    },
    set(t, k, v) { store[k] = v; return true; },
    apply() { return inert(); },
    construct() { return inert(); }
  });
}

function context() {
  const mem = Object.create(null);
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
    document: inert(), location: inert(), history: inert(), navigator: inert(),
    addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0, matchMedia: () => inert(),
    setTimeout: () => 0, clearTimeout() {}, requestAnimationFrame: () => 0, getComputedStyle: () => inert()
  };
  ctx.window = ctx; ctx.self = ctx;
  return vm.createContext(ctx);
}

export const inlineScripts = html => [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join("\n;\n");

/* Run `src`, injecting `exportCode` before the last "})();", then run `collect` and return its value
   (collect must assign a JSON-safe result to globalThis.__OUT). */
export function run(src, exportCode, collect) {
  const k = src.lastIndexOf("})();");
  if (k > 0 && exportCode) src = src.slice(0, k) + exportCode + src.slice(k);
  const ctx = context(), warnings = [];
  try { vm.runInContext(src, ctx, { timeout: 15000, filename: "source.js" }); }
  catch (e) { warnings.push("Source script stopped early (" + e.message + ") — data defined before that point is used."); }
  vm.runInContext(collect, ctx, { timeout: 15000 });
  return { out: ctx.__OUT, warnings };
}

export const titleOf = html => { const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]; return t ? t.trim() : null; };
export const descriptionOf = html => (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || "";
