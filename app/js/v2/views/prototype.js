/* Study Vault v2 — isolated prototype routes and interactions.
   Legacy routes and data remain authoritative; this module renders only contract-backed v2 mock views. */
(function () {
  "use strict";
  const V = window.V, S = V.S, V2 = window.V2, P = V2.components;
  const model = V2.model = V2.createModel(V2.MOCK_DATA);
  const STATE_KEY = "vault.v2.foundation";
  const readState = () => { try { return Object.assign({ read: {}, bookmarks: {}, doubts: {}, notes: {}, review: {} }, JSON.parse(localStorage.getItem(STATE_KEY) || "{}")); } catch (e) { return { read: {}, bookmarks: {}, doubts: {}, notes: {}, review: {} }; } };
  const state = V2.state = readState();
  const saveState = () => { try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { console.warn("Study Vault v2: progress could not be saved", e); } };
  const topicKey = topic => "topic:" + topic.id;
  const unitKey = (topic, id) => topicKey(topic) + "/" + id;
  const unique = items => items.filter((item, i) => items.indexOf(item) === i);

  function activeFor(topic, page) {
    return topic ? { subjectId: topic.subject.id, chapterId: topic.chapter.id, topicId: topic.id, page } : { subjectId: "geography", page };
  }

  function commonMount(root, options) {
    const o = options || {}, shell = root.querySelector(".v2-shell"), layer = root.querySelector(".v2-sheet-layer");
    let paletteCleanup = null;
    const closeSheet = () => { if (layer) layer.innerHTML = ""; shell && shell.classList.remove("v2-sheet-open"); };
    const openSheet = html => { if (!layer) return; layer.innerHTML = html; shell.classList.add("v2-sheet-open"); const close = layer.querySelector('[data-v2-act="close-sheet"]'); if (close) close.focus({ preventScroll: true }); };
    const showPyqs = ids => {
      const list = ids && ids.length ? ids.map(id => model.byPyq[id]).filter(Boolean) : model.pyqs;
      openSheet(P.pyqDrawer(list));
    };
    const setActiveToc = () => {
      if (!o.topic) return;
      const links = Array.from(root.querySelectorAll("[data-v2-anchor]"));
      const units = links.map(link => document.getElementById(link.dataset.v2Anchor)).filter(Boolean);
      let active = units[0];
      units.forEach(unit => { if (unit.getBoundingClientRect().top <= 150) active = unit; });
      links.forEach(link => link.classList.toggle("is-active", active && link.dataset.v2Anchor === active.id));
    };
    const updateProgress = () => {
      const bar = root.querySelector(".v2-reading-progress i");
      if (bar) {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 100) + "%";
      }
      setActiveToc();
    };
    const refreshTopicProgress = () => {
      if (!o.topic) return;
      const read = !!state.read[topicKey(o.topic)], labels = root.querySelectorAll("[data-v2-progress-label]");
      labels.forEach(label => { label.textContent = read ? "Read" : "Not started"; });
      root.querySelectorAll(".v2-progress-ring i").forEach(ring => { ring.style.setProperty("--v2-progress", read ? "100%" : "0%"); });
    };

    const onClick = event => {
      const action = event.target.closest("[data-v2-act]");
      if (!action) return;
      const act = action.dataset.v2Act;
      if (act === "open-nav") { shell.classList.add("v2-nav-open"); event.preventDefault(); }
      else if (act === "close-nav") { shell.classList.remove("v2-nav-open"); event.preventDefault(); }
      else if (act === "palette") { event.preventDefault(); V2.palette(); }
      else if (act === "theme") { event.preventDefault(); V.cycleTheme(); }
      else if (act === "close-sheet") { event.preventDefault(); closeSheet(); }
      else if (act === "open-context") { event.preventDefault(); const context = root.querySelector(".v2-context-inner"); if (context) openSheet(P.contextSheet(context.outerHTML)); }
      else if (act === "open-pyq") { event.preventDefault(); showPyqs((action.dataset.pyqs || "").split(",").filter(Boolean)); }
      else if (act === "open-pyq-one") { event.preventDefault(); showPyqs([action.dataset.pyq]); }
      else if (act === "mark-topic" && o.topic) { event.preventDefault(); state.read[topicKey(o.topic)] = Date.now(); saveState(); refreshTopicProgress(); V.toast("Marked read in the v2 demo"); }
      else if (act === "unit-menu" && o.topic) {
        event.preventDefault(); const key = unitKey(o.topic, action.dataset.unit), hasNote = !!state.notes[key];
        V.popover(action, [
          { label: state.bookmarks[key] ? "Remove bookmark" : "Bookmark", icon: "bookmark", on: !!state.bookmarks[key], run: () => { if (state.bookmarks[key]) delete state.bookmarks[key]; else state.bookmarks[key] = Date.now(); saveState(); V.toast(state.bookmarks[key] ? "Bookmarked" : "Bookmark removed"); } },
          { label: hasNote ? "Edit note" : "Add note", icon: "pen", on: hasNote, run: () => openNote(key) },
          { label: state.doubts[key] ? "Clear doubt" : "Flag doubt", icon: "question", on: !!state.doubts[key], run: () => { if (state.doubts[key]) delete state.doubts[key]; else state.doubts[key] = Date.now(); saveState(); V.toast(state.doubts[key] ? "Doubt flagged" : "Doubt cleared"); } },
          { label: state.review[key] ? "Remove from review" : "Review later", icon: "revise", on: !!state.review[key], run: () => { if (state.review[key]) delete state.review[key]; else state.review[key] = Date.now(); saveState(); V.toast(state.review[key] ? "Added to v2 review" : "Removed from v2 review"); } },
          { label: "Show PYQs", icon: "target", run: () => { const unit = model.byUnit[action.dataset.unit]; showPyqs((unit && unit.pyqIds) || []); } }
        ], { align: "left", focus: true });
      }
    };
    const openNote = key => {
      V.dialog("Personal note", '<label class="v2-note-label" for="v2-note-input">Your note</label><textarea id="v2-note-input" class="v2-note-input" rows="7" placeholder="Write what you want to remember…">' + V.esc(state.notes[key] || "") + '</textarea><div class="v2-dialog-actions"><button class="v2-button" data-close>Cancel</button><button class="v2-button v2-button-accent" data-v2-save-note>Save note</button></div>', (dialog, close) => {
        const input = dialog.querySelector("textarea"); input.focus();
        dialog.querySelector("[data-v2-save-note]").onclick = () => { const value = input.value.trim(); if (value) state.notes[key] = value; else delete state.notes[key]; saveState(); close(); V.toast(value ? "Note saved" : "Note removed"); };
      });
    };
    const onKey = event => {
      if (event.key === "Escape") { if (shell.classList.contains("v2-nav-open")) { shell.classList.remove("v2-nav-open"); event.stopPropagation(); } else if (layer && layer.children.length) { closeSheet(); event.stopPropagation(); } }
    };
    const onHashAnchor = event => {
      const link = event.target.closest("[data-v2-anchor]"); if (!link) return;
      const target = document.getElementById(link.dataset.v2Anchor); if (target) { event.preventDefault(); target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); closeSheet(); }
    };
    root.addEventListener("click", onClick); root.addEventListener("click", onHashAnchor); document.addEventListener("keydown", onKey, true); addEventListener("scroll", updateProgress, { passive: true });
    refreshTopicProgress(); requestAnimationFrame(updateProgress);
    if (o.openPyq) setTimeout(() => showPyqs([o.openPyq]), 0);
    return () => { root.removeEventListener("click", onClick); root.removeEventListener("click", onHashAnchor); document.removeEventListener("keydown", onKey, true); removeEventListener("scroll", updateProgress); if (paletteCleanup) paletteCleanup(); };
  }

  V2.toggleNav = () => { const shell = document.querySelector(".v2-shell"); if (shell) shell.classList.toggle("v2-nav-open"); };
  V2.escape = () => {
    const shell = document.querySelector(".v2-shell"), layer = document.querySelector(".v2-sheet-layer");
    if (shell && shell.classList.contains("v2-nav-open")) { shell.classList.remove("v2-nav-open"); return true; }
    if (layer && layer.children.length) { layer.innerHTML = ""; shell && shell.classList.remove("v2-sheet-open"); return true; }
    return false;
  };

  V2.palette = initial => {
    const old = document.querySelector(".v2-command-wrap"); if (old) { old.remove(); return; }
    const wrap = document.createElement("div"); wrap.className = "v2-command-wrap";
    wrap.innerHTML = '<div class="v2-command" role="dialog" aria-modal="true" aria-label="Search knowledge"><div class="v2-command-input">' + V.icon("search") + '<input aria-label="Search topics, knowledge and PYQs" placeholder="Search topics, knowledge, PYQs or commands…" autocomplete="off"><kbd>Esc</kbd></div><div class="v2-command-results" role="listbox"></div><footer><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span>Results are from provisional sample data</span></footer></div>';
    document.body.appendChild(wrap);
    const input = wrap.querySelector("input"), results = wrap.querySelector(".v2-command-results"); let rows = [], active = 0;
    const commands = [
      { type: "Command", title: "Open v2 Geography", path: "Subject overview", href: "#/v2/s/geography", search: "open geography subject" },
      { type: "Command", title: "Open v2 PYQ explorer", path: "Question-first interface", href: "#/v2/pyq", search: "open pyq questions" },
      { type: "Command", title: "Return to legacy Vault", path: "Current production reader", href: "#/", search: "legacy current reader" }
    ];
    const draw = () => {
      const q = input.value.trim(), nq = q.toLowerCase();
      rows = q ? model.search(q, 12).concat(commands.filter(row => row.search.indexOf(nq) >= 0)) : [model.search("earth", 3)[0], commands[0], commands[1]].filter(Boolean);
      active = Math.min(active, Math.max(0, rows.length - 1));
      const groups = ["Topic", "Subtopic", "Knowledge", "PYQ", "Command"], html = groups.map(group => {
        const subset = rows.filter(row => row.type === group); return subset.length ? '<div class="v2-command-group">' + group + "</div>" + subset.map(row => P.commandRow(row)).join("") : "";
      }).join("");
      results.innerHTML = html || P.emptyState("No matches", "Try a topic, concept, year or command.");
      Array.from(results.querySelectorAll(".v2-command-row")).forEach((row, i) => row.classList.toggle("is-active", i === active));
    };
    const choose = () => { const row = results.querySelectorAll(".v2-command-row")[active]; if (row && row.dataset.href) { wrap.remove(); V.go(row.dataset.href); } };
    input.addEventListener("input", draw);
    input.addEventListener("keydown", event => {
      const buttons = results.querySelectorAll(".v2-command-row");
      if (event.key === "ArrowDown") { event.preventDefault(); active = Math.min(buttons.length - 1, active + 1); draw(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); active = Math.max(0, active - 1); draw(); }
      else if (event.key === "Enter") { event.preventDefault(); choose(); }
      else if (event.key === "Escape") { event.preventDefault(); wrap.remove(); }
    });
    results.addEventListener("mousemove", event => { const row = event.target.closest(".v2-command-row"); if (row) { active = Array.from(results.querySelectorAll(".v2-command-row")).indexOf(row); Array.from(results.querySelectorAll(".v2-command-row")).forEach((item, i) => item.classList.toggle("is-active", i === active)); } });
    results.addEventListener("click", event => { const row = event.target.closest(".v2-command-row"); if (row) { active = Array.from(results.querySelectorAll(".v2-command-row")).indexOf(row); choose(); } });
    wrap.addEventListener("pointerdown", event => { if (event.target === wrap) wrap.remove(); });
    input.value = initial || ""; draw(); input.focus();
  };

  V.views.v2Home = {
    mode: "v2", title: () => "Study Vault v2",
    render: () => {
      const subject = model.subjects[0], continueTopic = model.byTopic["earth-latitude-gravity"];
      const content = '<div class="v2-page v2-home">' + P.demoNotice() + '<header class="v2-home-head"><p class="v2-eyebrow">Knowledge workspace</p><h1>Read with focus.<br>Open intelligence when you need it.</h1><p>Study Vault v2 separates the knowledge hierarchy, the reading experience and question intelligence so each can do one job well.</p></header><section class="v2-continue"><div><span class="v2-section-label">Continue</span><h2>' + V.esc(continueTopic.title) + '</h2><p>' + V.esc(continueTopic.chapter.title) + '</p></div><a class="v2-button v2-button-accent" href="#/v2/t/' + encodeURIComponent(continueTopic.id) + '">Resume reading ' + V.icon("arrowR", "sm") + '</a></section><section class="v2-home-subject"><div><p class="v2-eyebrow">Available subject</p><h2>' + V.esc(subject.name) + '</h2><p>' + subject.chapters.length + ' chapters · ' + model.topics.length + ' topics in this representative dataset</p></div><a class="v2-text-link" href="#/v2/s/' + encodeURIComponent(subject.id) + '">Browse the knowledge map ' + V.icon("arrowR", "sm") + '</a></section><div class="v2-home-grid"><a href="#/v2/pyq"><span>' + V.icon("target") + '</span><strong>Question explorer</strong><small>Canonical-question interface shell</small></a><a href="#/revise"><span>' + V.icon("revise") + '</span><strong>Review</strong><small>Existing spaced revision remains available</small></a><a href="#/"><span>' + V.icon("history") + '</span><strong>Legacy Vault</strong><small>Current notes and progress are unchanged</small></a></div></div>';
      return P.shell(model, { accent: subject.accent, active: activeFor(null, "home"), content });
    }, mount: root => commonMount(root, {})
  };

  V.views.v2Subject = {
    mode: "v2", title: p => (model.bySubject[p.subj] || {}).name || "Subject",
    render: p => {
      const subject = model.bySubject[p.subj]; if (!subject) return P.shell(model, { active: {}, content: P.errorState("Subject not found", "This sample subject does not exist or has moved.") });
      const completed = subject.chapters.reduce((sum, chapter) => sum + chapter.topics.filter(topic => state.read[topicKey(topic)]).length, 0);
      const next = subject.chapters.flatMap(chapter => chapter.topics).find(topic => !state.read[topicKey(topic)]) || subject.chapters[0].topics[0];
      const content = '<div class="v2-page v2-subject-page">' + P.demoNotice() + P.subjectHeader(subject) + (next ? '<section class="v2-subject-continue"><div><span class="v2-section-label">Continue</span><h2>' + V.esc(next.chapter.title) + ' <span>→</span> ' + V.esc(next.title) + '</h2></div><a class="v2-button" href="#/v2/t/' + encodeURIComponent(next.id) + '">Open topic ' + V.icon("arrowR", "sm") + "</a></section>" : "") + '<div class="v2-chapters">' + subject.chapters.map((chapter, i) => { const done = chapter.topics.filter(topic => state.read[topicKey(topic)]).length; return P.chapterRow(chapter, i, chapter.topics.length ? Math.round(done / chapter.topics.length * 100) : 0); }).join("") + '</div><p class="v2-subject-footnote">Progress is intentionally navigational. This demo stores v2 state separately from legacy sheet progress until a migration design is approved.</p></div>';
      const right = '<div class="v2-context-inner"><p class="v2-context-label">Subject progress</p><div class="v2-subject-progress-big"><strong>' + completed + '</strong><span>of ' + model.topics.length + ' topics read</span></div><div class="v2-context-sep"></div><p class="v2-context-label">Chapters</p><nav class="v2-toc">' + subject.chapters.map(chapter => '<a href="#/v2/s/' + encodeURIComponent(subject.id) + '?at=chapter-' + encodeURIComponent(chapter.id) + '" data-v2-anchor="chapter-' + V.escAttr(chapter.id) + '">' + V.esc(chapter.title) + "</a>").join("") + "</nav></div>";
      return P.shell(model, { accent: subject.accent, active: { subjectId: subject.id }, content, right });
    }, mount: root => commonMount(root, {})
  };

  V.views.v2Topic = {
    mode: "v2", title: p => (model.byTopic[p.topic] || {}).title || "Topic",
    render: p => {
      const topic = model.byTopic[p.topic]; if (!topic) return P.shell(model, { active: {}, content: P.errorState("Topic not found", "The taxonomy may have changed or this sample route is invalid.") });
      const content = '<article class="v2-reader">' + P.demoNotice() + P.topicHeader(topic) + (topic.units.length ? '<div class="v2-reader-body">' + topic.units.map(P.unit).join("") + "</div>" : P.emptyState("Knowledge units are not ready", "This topic is valid, but canonical knowledge units have not been generated yet.")) + '<footer class="v2-topic-end"><span>End of sample topic</span><a href="#/v2/s/' + encodeURIComponent(topic.subject.id) + '">Back to ' + V.esc(topic.subject.name) + "</a></footer></article>";
      return P.shell(model, { accent: topic.subject.accent, active: activeFor(topic, "topic"), content, right: P.topicToc(topic) });
    }, mount: (root, p) => commonMount(root, { topic: model.byTopic[p.topic] })
  };

  function pyqOptions(items, current) { return '<option value="">All</option>' + unique(items.filter(Boolean)).map(item => '<option value="' + V.escAttr(item) + '"' + (item === current ? " selected" : "") + ">" + V.esc(item) + "</option>").join(""); }
  function pyqResults(filters) { const rows = model.filterPyqs(filters); return '<div class="v2-pyq-count">' + rows.length + " sample question" + (rows.length === 1 ? "" : "s") + '</div>' + (rows.length ? rows.map(pyq => P.pyqCard(pyq, true)).join("") : P.emptyState("No questions match", "Adjust a filter to broaden this sample result set.")); }

  V.views.v2Pyq = {
    mode: "v2", title: () => "PYQ explorer",
    render: p => {
      const filters = { exam: p.q.exam || "", year: p.q.year || "", subject: p.q.subject || "", chapter: p.q.chapter || "", topic: p.q.topic || "", format: p.q.format || "", trap: p.q.trap || "", temporal: p.q.temporal || "" };
      const content = '<div class="v2-page v2-pyq-page">' + P.demoNotice() + '<header class="v2-pyq-head"><p class="v2-eyebrow">Question-first study</p><h1>PYQ explorer</h1><p>Questions are independent records here. Filters narrow canonical questions, not note-line tags or line counts.</p></header><section class="v2-filter-panel" aria-label="PYQ filters"><label>Exam<select data-pyq-filter="exam">' + pyqOptions(model.pyqs.map(pyq => pyq.exam), filters.exam) + '</select></label><label>Year<select data-pyq-filter="year">' + pyqOptions(model.pyqs.map(pyq => pyq.year), filters.year) + '</select></label><label>Subject<select data-pyq-filter="subject">' + pyqOptions(model.subjects.map(subject => subject.id), filters.subject) + '</select></label><label>Chapter<select data-pyq-filter="chapter">' + pyqOptions(model.chapters.map(chapter => chapter.id), filters.chapter) + '</select></label><label>Topic<select data-pyq-filter="topic">' + pyqOptions(model.topics.map(topic => topic.id), filters.topic) + '</select></label><label>Format<select data-pyq-filter="format">' + pyqOptions(model.pyqs.map(pyq => pyq.intelligence && pyq.intelligence.questionFormat), filters.format) + '</select></label><label>Trap type<select data-pyq-filter="trap">' + pyqOptions(model.pyqs.flatMap(pyq => (pyq.intelligence && pyq.intelligence.trapTypes) || []), filters.trap) + '</select></label><label>Knowledge type<select data-pyq-filter="temporal">' + pyqOptions(model.pyqs.map(pyq => pyq.intelligence && pyq.intelligence.temporalDependency), filters.temporal) + '</select></label></section><section class="v2-pyq-results">' + pyqResults(filters) + "</section></div>";
      return P.shell(model, { accent: model.subjects[0].accent, active: activeFor(null, "pyq"), content });
    }, mount: (root, p) => {
      const cleanup = commonMount(root, { openPyq: p.q.open });
      const filters = {}; root.querySelectorAll("[data-pyq-filter]").forEach(select => { filters[select.dataset.pyqFilter] = select.value; select.addEventListener("change", () => { filters[select.dataset.pyqFilter] = select.value; root.querySelector(".v2-pyq-results").innerHTML = pyqResults(filters); }); });
      return cleanup;
    }
  };
})();
