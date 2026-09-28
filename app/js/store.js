/* Study Vault — study state. Kept entirely separate from the notes (localStorage, per browser).
   Keys:  section = "<subject>/<sheet>/<sectionId>"   line = section + "#" + hash(line text)
   Revision schedule: day-based, SM-2-style — Again/Hard/Good/Easy move a section's next due day;
   drill misses pull their section forward. No knobs exposed beyond session sizes.             */
(function () {
  "use strict";
  const V = window.V;
  const NS = "vault.v1.";
  const DAY = 86400000;
  const read = (k, d) => { try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };

  const DEFAULTS = {
    theme: "auto", size: "m", density: "comfortable", width: "normal", font: "hyper",
    outline: false, pinNav: false, listPref: "auto", tableHide: "answers", hideTags: false,
    drillLength: 20, sessionSize: 15, interleave: true, filter: { hy: false, exam: "" }, recall: false, pretestNew: true
  };
  const S = V.S = {
    settings: Object.assign({}, DEFAULTS, read("settings", {})),
    progress: Object.assign({ sections: {}, sheets: {}, last: null, recent: [], bookmarks: {} }, read("progress", {})),
    srs: read("srs", {}),
    items: read("items", {}),
    log: Object.assign({ days: {}, events: [] }, read("log", {})),
    checks: read("checks", {}),
    notes: read("notes", {}),
    doubts: read("doubts", {}),
    cards: read("cards", {}),
    highlights: read("highlights", {})
  };
  S.settings.filter = Object.assign({ hy: false, exam: "" }, S.settings.filter);

  const dirty = new Set();
  let saveT = null;
  function flush() {
    dirty.forEach(k => { try { localStorage.setItem(NS + k, JSON.stringify(S[k])); } catch (e) { console.warn("Study Vault: could not save", k, e); } });
    dirty.clear(); saveT = null;
  }
  function touch(k) { dirty.add(k); if (!saveT) saveT = setTimeout(flush, 350); S.emit(k); }
  S.flush = flush;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  /* change notifications */
  const subs = {};
  S.on = (k, fn) => { (subs[k] = subs[k] || []).push(fn); return () => { subs[k] = subs[k].filter(f => f !== fn); }; };
  S.emit = k => (subs[k] || []).concat(subs["*"] || []).forEach(fn => { try { fn(k); } catch (e) { console.error(e); } });

  /* ---------- settings ---------- */
  S.set = (k, v) => { S.settings[k] = v; touch("settings"); S.applySettings(); };
  S.applySettings = () => {
    const d = document.documentElement.dataset, s = S.settings;
    if (s.theme === "auto") delete d.theme; else d.theme = s.theme;
    d.size = s.size; d.density = s.density; d.width = s.width; d.font = s.font;
  };

  /* ---------- day log ---------- */
  const day = () => { const t = V.today(); return S.log.days[t] || (S.log.days[t] = { r: 0, s: 0, p: 0, a: 0, h: 0, g: 0, e: 0, ms: 0 }); };
  const RK = [null, "a", "h", "g", "e"];
  function event(kind, key, r) { S.log.events.push([Date.now(), kind, key, r || 0]); if (S.log.events.length > 600) S.log.events.splice(0, S.log.events.length - 600); }

  /* active study time: counted in 15 s ticks while the page is visible and in use */
  let lastAct = Date.now();
  S.activity = () => { lastAct = Date.now(); };
  ["pointerdown", "keydown", "scroll", "wheel", "touchstart"].forEach(ev => window.addEventListener(ev, S.activity, { passive: true, capture: true }));
  setInterval(() => { if (document.visibilityState === "visible" && Date.now() - lastAct < 90000) { day().ms += 15000; touch("log"); } }, 15000);

  /* ---------- reading progress ---------- */
  S.markRead = key => {
    const p = S.progress.sections[key], now = Date.now();
    if (!p) {
      S.progress.sections[key] = { f: now, l: now, n: 1 };
      if (!S.srs[key]) { S.srs[key] = { due: V.today() + 1, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: 0, hist: [] }; touch("srs"); }
      day().r++; event("read", key); touch("log");
    } else {
      if (now - p.l > 30 * 60000) p.n++;
      p.l = now;
    }
    touch("progress");
  };
  S.isRead = key => !!S.progress.sections[key];
  S.visitSheet = sheetKey => {
    const p = S.progress, s = p.sheets[sheetKey] || (p.sheets[sheetKey] = { v: 0, l: 0 });
    s.v++; s.l = Date.now();
    p.recent = [sheetKey].concat(p.recent.filter(k => k !== sheetKey)).slice(0, 12);
    touch("progress");
  };
  S.setLast = pos => { S.progress.last = Object.assign({ at: Date.now() }, pos); touch("progress"); };

  S.toggleBookmark = key => {
    const b = S.progress.bookmarks;
    if (b[key]) delete b[key]; else b[key] = { at: Date.now() };
    touch("progress"); return !!b[key];
  };
  S.isBookmarked = key => !!S.progress.bookmarks[key];

  S.toggleDoubt = key => {
    const d = S.doubts;
    if (d[key]) delete d[key]; else d[key] = { at: Date.now() };
    touch("doubts"); return !!d[key];
  };
  S.isDoubted = key => !!S.doubts[key];

  /* the student's own notes, one per section — stored beside the notes, never mixed into them */
  S.noteOf = key => (S.notes[key] && S.notes[key].text) || "";
  S.setNote = (key, text) => { text = String(text); if (text.trim()) S.notes[key] = { text, updatedAt: Date.now() }; else delete S.notes[key]; touch("notes"); };

  /* the student's highlights, one per line, each with the reason it matters (the cap lives in the reader) */
  S.setHighlight = (lineKey, reason) => { reason = String(reason).trim(); if (!reason) return false; S.highlights[lineKey] = { reason, at: Date.now() }; touch("highlights"); return true; };
  S.removeHighlight = lineKey => { delete S.highlights[lineKey]; touch("highlights"); };

  S.check = (sheetKey, i, on) => { const c = S.checks[sheetKey] || (S.checks[sheetKey] = {}); if (on) c[i] = 1; else delete c[i]; touch("checks"); };

  /* ---------- spaced revision (sections) ---------- */
  function next(e, r, today) {
    e = Object.assign({ ease: 2.5, ivl: 0, reps: 0, lapses: 0, due: today }, e || {});
    let ease = e.ease, ivl = e.ivl, reps = e.reps, lapses = e.lapses;
    /* reviewing late earns partial credit for the extra time the memory survived */
    const elapsed = e.last ? Math.max(0, today - V.dayOf(e.last)) : 0;
    const base = ivl > 0 ? Math.max(ivl, Math.round((ivl + elapsed) / 2)) : 0;
    if (r === 1) { ease = Math.max(1.3, ease - 0.2); ivl = 0; lapses++; reps = 0; }
    else if (r === 2) { ease = Math.max(1.3, ease - 0.15); ivl = base < 1 ? 1 : Math.max(base + 1, Math.round(base * 1.2)); reps++; }
    else if (r === 3) { ivl = base < 1 ? (reps === 0 ? 2 : 3) : Math.max(base + 1, Math.round(base * ease)); reps++; }
    else { ease = Math.min(3.2, ease + 0.15); ivl = base < 1 ? 4 : Math.max(base + 2, Math.round(base * ease * 1.3)); reps++; }
    ivl = Math.min(ivl, 180);
    return { ease: +ease.toFixed(2), ivl, reps, lapses, due: today + ivl };
  }
  S.preview = key => { const t = V.today(), e = S.srs[key]; return [1, 2, 3, 4].map(r => next(e, r, t).ivl); };
  S.rate = (key, r, src) => {
    const prev = S.srs[key] ? JSON.parse(JSON.stringify(S.srs[key])) : null;
    const prevDay = Object.assign({}, day());
    const n = next(prev, r, V.today());
    S.srs[key] = Object.assign({}, prev || {}, n, { last: Date.now(), hist: ((prev && prev.hist) || []).concat([[Date.now(), r, src || "sec"]]).slice(-24) });
    const card = S.isCardKey(key);   /* a card is a prompt, not a section: no read mark, counted with rated prompts */
    if (!card && !S.progress.sections[key]) S.progress.sections[key] = { f: Date.now(), l: Date.now(), n: 1 };
    const d = day(); if (card) d.p++; else d.s++; d[RK[r]]++; event(card ? "card" : "sec", key, r);
    touch("srs"); touch("log"); touch("progress");
    return () => { if (prev) S.srs[key] = prev; else delete S.srs[key]; S.log.days[V.today()] = prevDay; S.log.events.pop(); touch("srs"); touch("log"); };
  };
  S.rateItem = (lineKey, secKey, r) => {
    const it = S.items[lineKey] || (S.items[lineKey] = { n: 0, c: [0, 0, 0, 0], last: 0, lr: 0 });
    it.n++; it.c[r - 1]++; it.last = Date.now(); it.lr = r;
    const d = day(); d.p++; d[RK[r]]++; event("item", lineKey, r);
    /* a missed line pulls its section into tomorrow's queue */
    if (r === 1) {
      const e = S.srs[secKey], t = V.today();
      if (!e) S.srs[secKey] = { due: t + 1, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: 0, hist: [] };
      else if (e.due > t + 1) e.due = t + 1;
      touch("srs");
    }
    itemIdx = null; touch("items"); touch("log");
  };

  S.state = key => {
    const e = S.srs[key], t = V.today();
    if (!e) return S.progress.sections[key] ? "read" : "none";
    if (S.weakness(key) >= 0.9) return "weak";
    if (e.due <= t) return "due";
    return e.reps > 0 ? "ok" : "read";
  };
  S.dueKeys = () => { const t = V.today(); return Object.keys(S.srs).filter(k => S.srs[k].due <= t); };
  S.dueCount = filterFn => S.dueKeys().filter(k => !filterFn || filterFn(k)).length;
  /* ---------- the student's own cards: scheduled by the same engine under "card:<id>" ---------- */
  const CARD = "card:";
  S.isCardKey = key => key.indexOf(CARD) === 0;
  S.saveCard = (id, c) => {
    const isNew = !id || !S.cards[id];
    if (isNew) id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    S.cards[id] = Object.assign({ createdAt: Date.now() }, S.cards[id], c);
    if (isNew) { S.srs[CARD + id] = { due: V.today() + 1, ivl: 0, ease: 2.5, reps: 0, lapses: 0, last: 0, hist: [] }; touch("srs"); }
    touch("cards"); return id;
  };
  S.deleteCard = id => {
    const c = S.cards[id], e = S.srs[CARD + id];
    delete S.cards[id]; delete S.srs[CARD + id]; touch("cards"); touch("srs");
    return () => { S.cards[id] = c; if (e) S.srs[CARD + id] = e; touch("cards"); touch("srs"); };
  };
  /* a card with no schedule (e.g. restored from an older backup) counts as due */
  S.dueCards = () => { const t = V.today(); return Object.keys(S.cards).filter(id => { const e = S.srs[CARD + id]; return !e || e.due <= t; }); };
  S.upcoming = (days, ok) => { const t = V.today(), out = new Array(days).fill(0); Object.keys(S.srs).forEach(k => { if (ok && !ok(k)) return; const d = S.srs[k].due - t; if (d >= 1 && d <= days) out[d - 1]++; }); return out; };

  /* ---------- weak areas ---------- */
  let itemIdx = null;
  const itemsBySection = () => {
    if (itemIdx) return itemIdx; itemIdx = {};
    Object.keys(S.items).forEach(k => { const s = k.slice(0, k.indexOf("#")); (itemIdx[s] = itemIdx[s] || []).push(S.items[k]); });
    return itemIdx;
  };
  S.weakness = key => {
    const now = Date.now(); let w = 0;
    const e = S.srs[key];
    if (e && e.hist) e.hist.forEach(([ts, r]) => { const dec = Math.pow(0.5, (now - ts) / DAY / 21); w += (r === 1 ? 1 : r === 2 ? 0.45 : r === 3 ? -0.15 : -0.3) * dec; });
    (itemsBySection()[key] || []).forEach(it => { const dec = Math.pow(0.5, (now - it.last) / DAY / 21); w += (it.lr === 1 ? 0.4 : it.lr === 2 ? 0.15 : -0.05) * dec; });
    return Math.max(0, w);
  };
  S.weakKeys = () => {
    const keys = new Set(Object.keys(S.srs).concat(Object.keys(itemsBySection())));
    return [...keys].map(k => [k, S.weakness(k)]).filter(x => x[1] >= 0.9).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  };
  S.itemWeak = lineKey => { const it = S.items[lineKey]; if (!it) return 0; const dec = Math.pow(0.5, (Date.now() - it.last) / DAY / 21); return (it.c[0] * 1 + it.c[1] * 0.4) / it.n * (it.lr <= 2 ? 1 : 0.5) * dec; };

  /* ---------- summaries ---------- */
  S.daysRange = n => { const t = V.today(), out = []; for (let i = n - 1; i >= 0; i--) out.push([t - i, S.log.days[t - i] || null]); return out; };
  S.ratingTotals = n => { const tot = { a: 0, h: 0, g: 0, e: 0 }; S.daysRange(n).forEach(([, d]) => { if (d) { tot.a += d.a; tot.h += d.h; tot.g += d.g; tot.e += d.e; } }); return tot; };
  S.lastStudied = () => { const ev = S.log.events[S.log.events.length - 1]; const l = S.progress.last; return Math.max(ev ? ev[0] : 0, l ? l.at : 0); };

  /* ---------- backup ---------- */
  const KEYS = ["settings", "progress", "srs", "items", "log", "checks", "notes", "doubts", "cards", "highlights"];
  S.exportJSON = () => JSON.stringify({ app: "study-vault", version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(KEYS.map(k => [k, S[k]])) }, null, 1);
  S.importJSON = txt => {
    const o = JSON.parse(txt);
    if (!o || o.app !== "study-vault" || !o.data) throw new Error("Not a Study Vault backup file");
    KEYS.forEach(k => { if (o.data[k]) localStorage.setItem(NS + k, JSON.stringify(o.data[k])); });
  };
  S.resetProgress = () => { KEYS.filter(k => k !== "settings").forEach(k => localStorage.removeItem(NS + k)); };
})();
