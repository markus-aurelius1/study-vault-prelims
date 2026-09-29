/* Study Vault v2 — small presentation components for the premium shell, reader and intelligence layer.
   Components consume the v2 contract only; they do not inspect legacy sheets, sections, lines or tags. */
(function () {
  "use strict";
  const V = window.V, V2 = window.V2 = window.V2 || {};
  const P = V2.components = {};
  const e = V.esc, ea = V.escAttr;
  const icon = (name, cls) => V.icon(name, cls);
  const hrefTopic = id => "#/v2/t/" + encodeURIComponent(id);
  const countTopics = subject => subject.chapters.reduce((sum, chapter) => sum + chapter.topics.length, 0);

  P.demoNotice = () => '<div class="v2-demo-note" role="note"><span class="v2-demo-dot"></span><span><strong>Interface sample.</strong> Taxonomy, notes and question intelligence shown here are provisional mock data.</span></div>';

  P.knowledgeSidebar = (model, active) => {
    const subject = model.subjects[0];
    const tree = subject ? subject.chapters.map(chapter => {
      const open = active && (active.chapterId === chapter.id || active.subjectId === subject.id && !active.chapterId && chapter.order === 1);
      return '<details class="v2-tree-chapter"' + (open ? " open" : "") + '><summary><span>' + e(chapter.title) + '</span><span class="v2-tree-count">' + chapter.topics.length + '</span></summary><div class="v2-tree-topics">' +
        (chapter.topics.length ? chapter.topics.map(topic => '<a href="' + hrefTopic(topic.id) + '" class="v2-tree-topic' + (active && active.topicId === topic.id ? " is-active" : "") + '"><span>' + e(topic.title) + '</span></a>').join("") : P.inlineEmpty("No topics yet")) +
        "</div></details>";
    }).join("") : P.inlineEmpty("No subjects available");
    return '<aside class="v2-sidebar" aria-label="Knowledge navigation"><div class="v2-side-head"><a class="v2-wordmark" href="#/v2/"><span class="v2-mark">S</span><span>Study Vault</span><small>v2 preview</small></a><button class="v2-icon-btn v2-mobile-only" data-v2-act="close-nav" aria-label="Close navigation">' + icon("x") + '</button></div>' +
      '<button class="v2-search-trigger" data-v2-act="palette">' + icon("search", "sm") + '<span>Search knowledge</span><kbd>Ctrl K</kbd></button>' +
      '<nav class="v2-side-scroll"><div class="v2-side-label">Knowledge</div>' + (subject ? '<a class="v2-subject-link' + (active && active.subjectId === subject.id && !active.topicId ? " is-active" : "") + '" href="#/v2/s/' + encodeURIComponent(subject.id) + '" style="--v2-accent:' + ea(subject.accent) + '"><span class="v2-accent-dot"></span><span>' + e(subject.name) + '</span><small>' + countTopics(subject) + ' topics</small></a>' : "") + tree +
      '<div class="v2-side-label v2-utility-label">Utilities</div><a class="v2-utility-link" href="#/v2/">' + icon("home", "sm") + '<span>Home</span></a><a class="v2-utility-link' + (active && active.page === "pyq" ? " is-active" : "") + '" href="#/v2/pyq">' + icon("target", "sm") + '<span>PYQs</span></a><a class="v2-utility-link" href="#/revise">' + icon("revise", "sm") + '<span>Review</span></a><a class="v2-utility-link" href="#/progress">' + icon("chart", "sm") + '<span>Progress</span></a></nav>' +
      '<div class="v2-side-foot"><a href="#/settings">' + icon("sliders", "sm") + '<span>Settings & backup</span></a><a href="#/">Legacy Vault</a></div></aside>';
  };

  P.shell = (model, options) => {
    const o = options || {}, right = o.right || "";
    return '<div class="v2-shell" style="--v2-accent:' + ea(o.accent || "#2F6F68") + '">' + P.knowledgeSidebar(model, o.active || {}) +
      '<button class="v2-nav-scrim" data-v2-act="close-nav" aria-label="Close navigation"></button>' +
      '<div class="v2-workspace"><header class="v2-topbar"><button class="v2-icon-btn" data-v2-act="open-nav" aria-label="Open knowledge navigation">' + icon("menu") + '</button><a href="#/v2/" class="v2-top-title">Study Vault</a><div class="v2-top-actions"><button class="v2-icon-btn" data-v2-act="palette" aria-label="Search">' + icon("search") + '</button>' + (right ? '<button class="v2-icon-btn v2-context-trigger" data-v2-act="open-context" aria-label="Open page outline">' + icon("list") + "</button>" : "") + '<button class="v2-icon-btn" data-v2-act="theme" aria-label="Change theme">' + icon("moon") + '</button></div></header>' +
      '<div class="v2-reading-progress" aria-hidden="true"><i></i></div><main class="v2-main" id="v2-main">' + o.content + '</main>' + P.mobileUtility(o.active || {}) + '</div>' +
      (right ? '<aside class="v2-context" aria-label="Page context">' + right + "</aside>" : "") +
      '<div class="v2-sheet-layer" aria-live="polite"></div></div>';
  };

  P.mobileUtility = active => '<nav class="v2-mobile-utility" aria-label="Study utilities"><a href="#/v2/t/earth-latitude-gravity"' + (active.topicId ? ' class="is-active"' : "") + '>' + icon("book", "sm") + '<span>Notes</span></a><a href="#/v2/pyq"' + (active.page === "pyq" ? ' class="is-active"' : "") + '>' + icon("target", "sm") + '<span>PYQs</span></a><a href="#/revise">' + icon("revise", "sm") + '<span>Review</span></a></nav>';

  P.breadcrumb = items => '<nav class="v2-breadcrumb" aria-label="Breadcrumb">' + items.map((item, i) => (i ? '<span aria-hidden="true">/</span>' : "") + (item.href ? '<a href="' + item.href + '">' + e(item.label) + "</a>" : '<span aria-current="page">' + e(item.label) + "</span>")).join("") + "</nav>";

  P.metadata = items => '<div class="v2-meta">' + items.filter(Boolean).map(item => '<span class="v2-meta-chip">' + e(item) + "</span>").join("") + "</div>";

  P.topicHeader = topic => {
    const meta = topic.metadata || {};
    return '<header class="v2-topic-header">' + P.breadcrumb([{ label: topic.subject.name, href: "#/v2/s/" + encodeURIComponent(topic.subject.id) }, { label: topic.chapter.title, href: "#/v2/s/" + encodeURIComponent(topic.subject.id) + "?chapter=" + encodeURIComponent(topic.chapter.id) }]) +
      '<p class="v2-eyebrow">' + e(topic.subject.name + " · " + topic.chapter.title) + '</p><h1>' + e(topic.title) + '</h1><p class="v2-orientation">' + e(topic.description) + '</p>' +
      P.metadata([meta.level || "Sample", meta.readingMinutes ? meta.readingMinutes + " min" : "", topic.subtopics.length ? topic.subtopics.length + " subtopics" : "No subtopics", "Mock intelligence"]) + "</header>";
  };

  const sectionOpen = (unit, body, cls) => '<section class="v2-unit ' + (cls || "") + '" id="' + ea(unit.id) + '" data-v2-unit="' + ea(unit.id) + '"><div class="v2-unit-head"><h2>' + e(unit.heading || unit.title || "Untitled") + '</h2><button class="v2-unit-menu" data-v2-act="unit-menu" data-unit="' + ea(unit.id) + '" aria-label="Actions for ' + ea(unit.heading || "section") + '">' + icon("dots") + "</button></div>" + body + "</section>";

  P.introduction = unit => '<section class="v2-concept" id="' + ea(unit.id) + '"><span class="v2-concept-label">' + e(unit.heading || "Concept") + '</span><p>' + e(unit.content) + "</p></section>";
  P.factSection = unit => sectionOpen(unit, '<div class="v2-prose"><p>' + e(unit.content) + '</p>' + (unit.bullets && unit.bullets.length ? '<ul>' + unit.bullets.map(item => "<li>" + e(item) + "</li>").join("") + "</ul>" : "") + "</div>");
  P.comparison = unit => sectionOpen(unit, '<div class="v2-table-wrap"><table class="v2-comparison"><thead><tr>' + unit.columns.map(col => "<th>" + e(col) + "</th>").join("") + "</tr></thead><tbody>" + unit.rows.map(row => "<tr>" + row.map(cell => "<td>" + e(cell) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>", "v2-unit-table");
  P.callout = (unit, kind) => sectionOpen(unit, '<div class="v2-callout-body"><span class="v2-callout-kicker">' + (kind === "trap" ? "Watch the reversal" : "Keep distinct") + '</span><p>' + e(unit.content) + "</p></div>", "v2-callout v2-" + kind);
  P.figure = unit => sectionOpen(unit, '<figure class="v2-figure"><div class="v2-figure-frame" role="img" aria-label="Schematic comparing the rotational effect and apparent weight at the equator and poles"><svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg"><ellipse cx="340" cy="150" rx="218" ry="126"/><path d="M340 22v256M122 150h436"/><path class="v2-fig-accent" d="M76 150h528"/><circle cx="122" cy="150" r="7"/><circle cx="558" cy="150" r="7"/><circle cx="340" cy="24" r="7"/><circle cx="340" cy="276" r="7"/><g><text x="340" y="52" text-anchor="middle">Pole</text><text x="340" y="266" text-anchor="middle">Pole</text><text x="340" y="140" text-anchor="middle">Equatorial plane</text><text x="340" y="178" text-anchor="middle">Greatest rotational effect</text></g></svg></div><figcaption>' + e(unit.content) + "</figcaption></figure>", "v2-unit-figure");
  P.quickRevision = unit => sectionOpen(unit, '<ol class="v2-quick-list">' + unit.items.map(item => "<li>" + e(item) + "</li>").join("") + '</ol><div class="v2-quick-actions"><button class="v2-button v2-button-accent" data-v2-act="mark-topic">Mark this sample read</button><button class="v2-button" data-v2-act="open-pyq" data-pyqs="' + ea((unit.pyqIds || []).join(",")) + '">Open related PYQs</button></div>', "v2-quick");
  P.unit = unit => ({ introduction: P.introduction, section: P.factSection, fact: P.factSection, comparison: P.comparison, trap: item => P.callout(item, "trap"), distinction: item => P.callout(item, "distinction"), figure: P.figure, quickRevision: P.quickRevision }[unit.type] || P.factSection)(unit);

  P.topicToc = topic => '<div class="v2-context-inner"><p class="v2-context-label">On this page</p><nav class="v2-toc">' + topic.units.filter(unit => unit.heading).map(unit => '<a href="#' + ea(unit.id) + '" data-v2-anchor="' + ea(unit.id) + '">' + e(unit.heading) + "</a>").join("") + '</nav><div class="v2-context-sep"></div><p class="v2-context-label">Topic progress</p><div class="v2-context-progress"><span><b data-v2-progress-label>Not started</b><small>Saved on this device</small></span><span class="v2-progress-ring" aria-hidden="true"><i></i></span></div><button class="v2-context-button" data-v2-act="open-pyq" data-pyqs="' + ea(topic.units.flatMap(unit => unit.pyqIds || []).filter((id, i, all) => all.indexOf(id) === i).join(",")) + '">' + icon("target", "sm") + "Explore related PYQs</button></div>";

  P.subjectHeader = subject => '<header class="v2-subject-header"><p class="v2-eyebrow">Subject overview</p><h1>' + e(subject.name) + '</h1><p>' + subject.chapters.length + " chapters · " + countTopics(subject) + ' topics</p></header>';
  P.chapterRow = (chapter, index, progress) => '<section class="v2-chapter-row" id="chapter-' + ea(chapter.id) + '"><div class="v2-chapter-num">' + String(index + 1).padStart(2, "0") + '</div><div class="v2-chapter-main"><h2>' + e(chapter.title) + '</h2><p>' + e(chapter.description || "Topics will appear here when the taxonomy is ready.") + '</p><div class="v2-chapter-topics">' + (chapter.topics.length ? chapter.topics.map(topic => '<a href="' + hrefTopic(topic.id) + '">' + e(topic.title) + icon("arrowR", "sm") + "</a>").join("") : P.inlineEmpty("No topics in this chapter")) + '</div></div><div class="v2-chapter-stat"><span>' + chapter.topics.length + ' topics</span><div class="v2-line-progress"><i style="width:' + progress + '%"></i></div><small>' + progress + "% read</small></div></section>";

  P.pyqCard = (pyq, compact) => {
    const intelligence = pyq.intelligence || {}, answer = compact ? "" : '<details class="v2-pyq-detail"><summary>Accepted answer</summary><p>' + e(pyq.answer || "Not available") + "</p></details>";
    return '<article class="v2-pyq-card" data-pyq-id="' + ea(pyq.id) + '"><div class="v2-pyq-meta"><span class="v2-sample-pill">Demo record</span><span>' + e(pyq.exam) + "</span><span>·</span><span>" + e(pyq.year) + "</span><span>·</span><span>" + e(pyq.paper || "") + "</span>" + (pyq.questionNo ? "<span>·</span><span>Q" + e(pyq.questionNo) + "</span>" : "") + '</div><h3>' + e(pyq.question) + '</h3>' + (pyq.options ? '<ol class="v2-options" type="A">' + pyq.options.map(option => "<li>" + e(option) + "</li>").join("") + "</ol>" : "") + answer + (compact ? '<button class="v2-text-button" data-v2-act="open-pyq-one" data-pyq="' + ea(pyq.id) + '">Open question intelligence ' + icon("arrowR", "sm") + "</button>" : P.pyqIntelligence(pyq)) + "</article>";
  };

  P.pyqIntelligence = pyq => {
    const intel = pyq.intelligence || {}, demanded = intel.knowledgeDemanded || [], distractors = intel.distractors || {};
    return '<div class="v2-intelligence"><section><h4>Knowledge demanded</h4>' + (demanded.length ? "<ul>" + demanded.map(item => "<li>" + e(item) + "</li>").join("") + "</ul>" : P.inlineEmpty("No knowledge-demand analysis in this sample")) + '</section><section><h4>Answer logic</h4><p>' + e(intel.answerLogic || "Not available in this sample.") + '</p></section><section><h4>Distractor logic</h4>' + (Object.keys(distractors).length ? '<dl class="v2-distractors">' + Object.keys(distractors).map(key => "<dt>" + e(key) + "</dt><dd>" + e(distractors[key]) + "</dd>").join("") + "</dl>" : P.inlineEmpty("No distractor analysis available")) + '</section>' + ((intel.relatedPyqIds || []).length ? '<section><h4>Related PYQs</h4><div class="v2-related-links">' + intel.relatedPyqIds.map(id => '<button data-v2-act="open-pyq-one" data-pyq="' + ea(id) + '">' + e(id.replace(/^mock-/, "").replace(/-/g, " ")) + "</button>").join("") + "</div></section>" : "") + "</div>";
  };

  P.pyqDrawer = pyqs => '<div class="v2-sheet-backdrop" data-v2-act="close-sheet"></div><section class="v2-drawer v2-pyq-drawer" role="dialog" aria-modal="true" aria-label="PYQ intelligence"><header><div><p class="v2-eyebrow">Question intelligence</p><h2>Related PYQs</h2></div><button class="v2-icon-btn" data-v2-act="close-sheet" aria-label="Close">' + icon("x") + '</button></header><div class="v2-drawer-body">' + (pyqs.length ? pyqs.map(pyq => P.pyqCard(pyq, false)).join("") : P.emptyState("No related questions", "Canonical question mappings will appear here after integration.")) + "</div></section>";
  P.contextSheet = html => '<div class="v2-sheet-backdrop" data-v2-act="close-sheet"></div><section class="v2-bottom-sheet" role="dialog" aria-modal="true" aria-label="Page outline"><div class="v2-sheet-grip"></div><header><h2>On this page</h2><button class="v2-icon-btn" data-v2-act="close-sheet" aria-label="Close">' + icon("x") + '</button></header><div class="v2-bottom-body">' + html + "</div></section>";

  P.loadingState = label => '<div class="v2-state" role="status"><span class="v2-spinner"></span><h2>Loading</h2><p>' + e(label || "Preparing this view…") + "</p></div>";
  P.emptyState = (title, body) => '<div class="v2-state"><span class="v2-state-icon">' + icon("layers") + "</span><h2>" + e(title) + "</h2><p>" + e(body) + "</p></div>";
  P.errorState = (title, body) => '<div class="v2-state v2-state-error" role="alert"><span class="v2-state-icon">' + icon("info") + "</span><h2>" + e(title) + "</h2><p>" + e(body) + '</p><a class="v2-button" href="#/v2/">Return to v2 home</a></div>';
  P.inlineEmpty = label => '<span class="v2-inline-empty">' + e(label) + "</span>";

  P.commandRow = row => '<button class="v2-command-row" role="option" data-href="' + ea(row.href || "") + '"><span class="v2-command-type">' + e(row.type) + '</span><span class="v2-command-copy"><strong>' + e(row.title) + "</strong><small>" + e(row.path || "") + "</small></span>" + icon("arrowR", "sm") + "</button>";
})();
