/* Study Vault v2 — taxonomy-agnostic data contract and read-only indexes.
   The adapter keeps KnowledgeUnit and PYQ intelligence payloads open-ended: UI defaults are added,
   unknown fields are preserved, and no current taxonomy count is treated as business logic. */
(function () {
  "use strict";
  const V2 = window.V2 = window.V2 || {};

  const arr = value => Array.isArray(value) ? value : [];
  const text = value => value == null ? "" : String(value);
  const norm = value => text(value).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const cloneOpen = (value, defaults) => Object.assign({}, defaults || {}, value || {});

  function createModel(payload) {
    const source = payload || {};
    const subjects = [], chapters = [], topics = [], subtopics = [], knowledgeUnits = [], pyqs = [];
    const bySubject = {}, byChapter = {}, byTopic = {}, bySubtopic = {}, byUnit = {}, byPyq = {};
    const warnings = [];

    arr(source.subjects).forEach((subjectRaw, si) => {
      const subject = cloneOpen(subjectRaw, { id: "subject-" + (si + 1), name: "Untitled subject", accent: "#567064" });
      subject.id = text(subject.id); subject.name = text(subject.name); subject.chapters = [];
      if (bySubject[subject.id]) warnings.push("Duplicate subject id: " + subject.id);
      bySubject[subject.id] = subject; subjects.push(subject);

      arr(subjectRaw.chapters).forEach((chapterRaw, ci) => {
        const chapter = cloneOpen(chapterRaw, { id: subject.id + "-chapter-" + (ci + 1), subjectId: subject.id, title: "Untitled chapter", order: ci + 1 });
        chapter.id = text(chapter.id); chapter.subjectId = text(chapter.subjectId || subject.id); chapter.title = text(chapter.title); chapter.topics = [];
        if (byChapter[chapter.id]) warnings.push("Duplicate chapter id: " + chapter.id);
        byChapter[chapter.id] = chapter; chapters.push(chapter); subject.chapters.push(chapter);

        arr(chapterRaw.topics).forEach((topicRaw, ti) => {
          const topic = cloneOpen(topicRaw, { id: chapter.id + "-topic-" + (ti + 1), chapterId: chapter.id, title: "Untitled topic" });
          topic.id = text(topic.id); topic.chapterId = text(topic.chapterId || chapter.id); topic.title = text(topic.title); topic.subtopics = []; topic.knowledgeUnitIds = arr(topic.knowledgeUnitIds).map(text);
          if (byTopic[topic.id]) warnings.push("Duplicate topic id: " + topic.id);
          byTopic[topic.id] = topic; topics.push(topic); chapter.topics.push(topic);

          arr(topicRaw.subtopics).forEach((subtopicRaw, ui) => {
            const subtopic = cloneOpen(subtopicRaw, { id: topic.id + "-subtopic-" + (ui + 1), topicId: topic.id, title: "Untitled subtopic" });
            subtopic.id = text(subtopic.id); subtopic.topicId = text(subtopic.topicId || topic.id); subtopic.title = text(subtopic.title); subtopic.knowledgeUnitIds = arr(subtopic.knowledgeUnitIds).map(text);
            if (bySubtopic[subtopic.id]) warnings.push("Duplicate subtopic id: " + subtopic.id);
            bySubtopic[subtopic.id] = subtopic; subtopics.push(subtopic); topic.subtopics.push(subtopic);
          });
        });
      });
    });

    arr(source.knowledgeUnits).forEach((unitRaw, i) => {
      const unit = cloneOpen(unitRaw, { id: "knowledge-" + (i + 1), type: "fact", content: "" });
      unit.id = text(unit.id); unit.type = text(unit.type || "fact"); unit.pyqIds = arr(unit.pyqIds).map(text);
      if (byUnit[unit.id]) warnings.push("Duplicate knowledge unit id: " + unit.id);
      byUnit[unit.id] = unit; knowledgeUnits.push(unit);
    });

    arr(source.pyqs).forEach((pyqRaw, i) => {
      const pyq = cloneOpen(pyqRaw, { id: "pyq-" + (i + 1), exam: "", year: "", question: "", answer: "" });
      pyq.id = text(pyq.id); pyq.exam = text(pyq.exam); pyq.year = text(pyq.year); pyq.question = text(pyq.question);
      if (byPyq[pyq.id]) warnings.push("Duplicate PYQ id: " + pyq.id);
      byPyq[pyq.id] = pyq; pyqs.push(pyq);
    });

    topics.forEach(topic => {
      topic.chapter = byChapter[topic.chapterId] || null;
      topic.subject = topic.chapter ? bySubject[topic.chapter.subjectId] : null;
      topic.units = topic.knowledgeUnitIds.map(id => byUnit[id]).filter(Boolean);
      topic.subtopics.forEach(subtopic => { subtopic.units = subtopic.knowledgeUnitIds.map(id => byUnit[id]).filter(Boolean); });
    });
    knowledgeUnits.forEach(unit => { unit.pyqs = unit.pyqIds.map(id => byPyq[id]).filter(Boolean); });

    const searchRows = [];
    subjects.forEach(subject => searchRows.push({ type: "Subject", id: subject.id, title: subject.name, path: subject.name, href: "#/v2/s/" + encodeURIComponent(subject.id), search: norm(subject.name) }));
    topics.forEach(topic => searchRows.push({ type: "Topic", id: topic.id, title: topic.title, path: topic.subject ? topic.subject.name : "", href: "#/v2/t/" + encodeURIComponent(topic.id), search: norm([topic.title, topic.description, topic.chapter && topic.chapter.title, topic.subject && topic.subject.name].join(" ")) }));
    subtopics.forEach(subtopic => {
      const topic = byTopic[subtopic.topicId];
      searchRows.push({ type: "Subtopic", id: subtopic.id, title: subtopic.title, path: topic ? [topic.subject && topic.subject.name, topic.title].filter(Boolean).join(" › ") : "", href: topic ? "#/v2/t/" + encodeURIComponent(topic.id) + "?at=" + encodeURIComponent(subtopic.id) : "#/v2/", search: norm([subtopic.title, topic && topic.title].join(" ")) });
    });
    knowledgeUnits.forEach(unit => {
      const topic = topics.find(item => item.knowledgeUnitIds.indexOf(unit.id) >= 0 || item.subtopics.some(sub => sub.knowledgeUnitIds.indexOf(unit.id) >= 0));
      searchRows.push({ type: "Knowledge", id: unit.id, title: text(unit.heading || unit.title || unit.content).slice(0, 100), path: topic ? [topic.subject && topic.subject.name, topic.title].filter(Boolean).join(" › ") : "", href: topic ? "#/v2/t/" + encodeURIComponent(topic.id) + "?at=" + encodeURIComponent(unit.id) : "#/v2/", search: norm([unit.heading, unit.title, unit.content, unit.explanation].join(" ")) });
    });
    pyqs.forEach(pyq => {
      const taxonomy = pyq.taxonomy || {};
      const topic = byTopic[taxonomy.topicId];
      searchRows.push({ type: "PYQ", id: pyq.id, title: [pyq.exam, pyq.year, pyq.questionNo ? "Q" + pyq.questionNo : ""].filter(Boolean).join(" "), path: topic ? [topic.subject && topic.subject.name, topic.title].filter(Boolean).join(" › ") : "", href: "#/v2/pyq?open=" + encodeURIComponent(pyq.id), search: norm([pyq.exam, pyq.year, pyq.questionNo, pyq.question, topic && topic.title].join(" ")) });
    });

    const search = (query, limit) => {
      const tokens = norm(query).split(" ").filter(Boolean);
      if (!tokens.length) return [];
      return searchRows.map(row => ({ row, score: tokens.reduce((score, token) => score + (row.search.indexOf(token) >= 0 ? (row.search.indexOf(token) === 0 ? 3 : 1) : -20), 0) }))
        .filter(item => item.score >= 0).sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title)).slice(0, limit || 20).map(item => item.row);
    };

    const filterPyqs = filters => pyqs.filter(pyq => {
      const f = filters || {}, tx = pyq.taxonomy || {}, intel = pyq.intelligence || {};
      return (!f.exam || pyq.exam === f.exam) && (!f.year || pyq.year === f.year) && (!f.subject || tx.subjectId === f.subject) &&
        (!f.chapter || tx.chapterId === f.chapter) && (!f.topic || tx.topicId === f.topic) && (!f.format || intel.questionFormat === f.format) &&
        (!f.trap || arr(intel.trapTypes).indexOf(f.trap) >= 0) && (!f.temporal || intel.temporalDependency === f.temporal);
    });

    return { source, subjects, chapters, topics, subtopics, knowledgeUnits, pyqs, bySubject, byChapter, byTopic, bySubtopic, byUnit, byPyq, warnings, search, filterPyqs };
  }

  V2.createModel = createModel;
})();
