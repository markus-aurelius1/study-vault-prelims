# AGENTS.md

This file is read automatically by Codex (and other agents) at the start of
every session in this repository. It is the durable source of truth for how
to work on this project. Keep it accurate — if Codex makes the same mistake
twice, that's a signal this file needs an update, not just a one-off
correction.

Read `CODEX_HANDOFF.md` next: it holds the architecture, the current state and
the Output Quality Specs this file refers to. Before touching any notes
content, also read `NOTES_FORMAT_GUIDE.md` (the authority on the notes format).

---

## 1. Project summary

Study Vault is a personal, offline-first revision web app for one UPSC CSE / UPPCS Prelims aspirant. A Node build
reads the user's subject notes files (self-contained HTML "Master Sheets" in `sources/`) **without changing a
word**. It checks line by line that the app renders them exactly as each file's own renderer does, and publishes
a static PWA with search, active recall, spaced revision, PYQ filters and progress. Polity is live at
https://study-vault-mocha.vercel.app. Geography (subject #2) is being written by an AI agent in user-reviewed
batches from the user's raw notes and PYQ compilations.

## 2. Repo layout

- `index.html`, `manifest.webmanifest` — app shell and PWA metadata
- `app/js/` — the app: `markup.js` (inline markup + exam tags), `render.js` (section renderer, shared with the
  build), `content.js` (derived index and recall prompts), `store.js` (localStorage `vault.v1.*`), `views/*`, `app.js` (router)
- `app/css/vault.css` — the only stylesheet (theme tokens, light/dark)
- `tools/build.mjs` + `tools/lib/` — the build: format adapters, VM sandbox, fidelity check (`verify.mjs`),
  figure checks (`figures.mjs`), service worker (`pwa.mjs`)
- `sources/` — live subject notes files; **every `.html` directly in it becomes a subject**
- `drafts/` — subjects in progress (`Geography_Master_Sheet_v1.html`); never in `sources/` until final assembly
- `templates/Master_Sheet_TEMPLATE.html` — the page shell every new subject copies
- `raw-sources/<Subject>/` — inputs for a subject build (user's notes, PYQ PDFs, analyses); local only
- `examples/` — outputs the user approved (the quality ground truth)
- `backups/` — originals, change reports and pre-change copies of code
- `data/`, `sw.js` — **generated** by the build; never hand-edit
- `NOTES_FORMAT_GUIDE.md` — notes-format spec, §1–§14 (never renumber); `README.md` — user-facing overview

## 3. Environment setup

Windows 11; paths contain spaces, so quote them. There is no `package.json` and nothing to install.

- Install: nothing. Needs Node.js on PATH (v24.19.0 here) and Python 3 for the local server.
- Run locally: open `index.html` directly, or `python -m http.server 8765 --bind 127.0.0.1` (the `vault`
  config in `.claude/launch.json`)
- Test: no test suite. The build is the test: `node tools/build.mjs`, then apply the acceptance test in
  `NOTES_FORMAT_GUIDE.md` §11.1. To check a draft without rewriting `data/`, build a scratch copy
  (`CODEX_HANDOFF.md` §8).
- Lint / typecheck: none configured. For notes, run the §11.3 checks from `CODEX_HANDOFF.md` §4.1 (no lint
  script is committed yet).
- Build: `node tools/build.mjs` (or double-click `Build Vault.cmd`). Deploy: `npx --yes vercel@latest deploy
  --prod --yes`, only when the user asks.

## 4. Engineering conventions

- **Style** (no formatter; match surrounding code): `"use strict"` IIFEs hanging off `window.V`, double quotes,
  semicolons, 2-space indent, long single lines are normal, `const` arrow helpers. Each file opens with a
  `/* … */` block saying what it does and why. Build code is ESM `.mjs` with Node built-ins only.
- **The Vault never alters note text.** Recall blurs spans, filters hide whole lines, and everything else
  (search keys, prompts, schedules, progress) is derived and stored separately.
- **Two renderers must agree:** `app/js/markup.js` + `render.js` vs each notes file's RENDER region. Figure code
  (`figHTML`, `imgSize`) exists in `render.js` and in the template, so change both or neither. The build
  enforces this (`N/N lines identical`, `F/F figures identical`).
- **Progress keys are permanent:** subject words in the file name, sheet `id`s and block headings `h`.
- **No git:** before changing code or docs, copy each file you'll touch to
  `backups/pre-<change>-<YYYY-MM-DD>/` with the same relative path (as in `backups/pre-figures-2026-09-27/`).
- **Notes content** follows `NOTES_FORMAT_GUIDE.md` for mechanics and `CODEX_HANDOFF.md` §4.1 for quality.
- **UI copy:** calm, second person, sentence case, no exclamation marks, spaced em dash for asides
  (`CODEX_HANDOFF.md` §4.6).

## 5. Constraints and do-not rules

Ask the user before:
- deploying to Vercel (it is outward-facing);
- changing **any** content of a user-supplied notes file (`sources/Polity_Master_Sheet_v2.html`) or of an
  already-approved batch. When asked, follow `CODEX_HANDOFF.md` §4.4: back up, apply exact find → replace,
  verify that no citation or heading is lost, rebuild, and write a change report;
- editing a notes file's `<style>` or RENDER region, the template's, or `figHTML`/`imgSize` in `render.js`;
- changing id or slug derivation, `localStorage` keys (`vault.v1.*`), sheet ids, block headings or subject file
  names (each resets the user's progress);
- adding a dependency, a `package.json`, a bundler or a framework;
- anything toward UPPCS Mains or answer-writing (a separate project);
- deleting or moving anything in `backups/`, `raw-sources/` or `examples/`;
- touching `drafts/` while another session is drafting a batch;
- `git init` or any other change to project tooling.

Never:
- invent, guess or approximate a PYQ tag; tag only questions verified in the PYQ compilations or keys;
- name a source book, PDF, coaching brand or toolkit anywhere in the notes (keep the reasoning, drop the attribution);
- write `UPSC CDS`, `UPSC CAPF`, or `UPPSC` as the exam name in tags (write `CDS`, `CAPF`, `UPPCS`);
- embed images from the user's notes or reference PDFs (watermarked); redraw them as SVG or leave a `/* PHOTO: … */` placeholder;
- retype, trim or hand-edit base64 image data;
- hand-edit `data/**` or `sw.js`;
- put anything but finished subject notes files in `sources/`;
- renumber `NOTES_FORMAT_GUIDE.md` sections (the user's generation prompt cites them by number);
- print, copy or publish `.env.local`;
- treat a clean build as proof that the content is right.

## 6. What "done" means

Before considering any task complete:
- [ ] Relevant tests written/updated and passing. There is no test suite: the build is the test.
      `node tools/build.mjs` (on a scratch copy for drafts) passes the acceptance test in
      `NOTES_FORMAT_GUIDE.md` §11.1: `· master-sheet-v2`, `N/N lines identical`, `F/F figures identical`, no line
      starting `!` or `✗`, last line `Done`.
- [ ] Lint/typecheck clean. None are configured: for notes, run the §11.3 checks (`CODEX_HANDOFF.md` §4.1); for
      app changes, check the preview in light and dark themes at phone and desktop widths, with no console errors.
- [ ] Behavior matches the request
- [ ] Diff reviewed for regressions or risky patterns (against the `backups/pre-…` copies; there is no git)
- [ ] `CODEX_HANDOFF.md` updated (see Section 7)
- [ ] If the change touches a content-generating feature, output checked
      against its spec in `CODEX_HANDOFF.md` Section 4 (Output Quality Specs)

---

## 7. Handoff Protocol (read before starting any task)

Maintain a file named `CODEX_HANDOFF.md` in the project root. It exists so
any agent — Codex, Claude Code, or a human — can pick up this project with
zero prior context AND reproduce the same quality bar the project has been
held to, not just working code.

**Update rule:** After ANY change to this project — new features, bug fixes,
refactors, dependency changes, config changes, or architecture/design
decisions — update `CODEX_HANDOFF.md` before considering the task done. This
is part of the change itself, not a separate follow-up step. Update the
relevant section rather than rewriting the whole file.

**Specifically:** if the change touches any feature that generates content
for the user (notes, summaries, emails, reports, descriptions, or any other
free-form output), Section 4 of `CODEX_HANDOFF.md` (Output Quality Specs)
must be updated to reflect the current standard for that feature — not just
that the feature exists or was modified.

If `CODEX_HANDOFF.md` doesn't exist yet, create it on the first change after
this rule is in effect, using a full pass over the codebase to populate every
section listed below.

### Required sections of CODEX_HANDOFF.md

1. **Project summary** — what this does, 2-3 sentences.
2. **Tech stack** — languages, frameworks, key libraries, with versions.
3. **Architecture overview** — folder structure, how major pieces connect,
   data flow.
4. **Output Quality Specs** — for every feature that produces content (not
   just processes data), document the bar that content must hit:
   - **What "good" looks like**: structure, length, tone, level of detail.
     For notes specifically: bullet vs. prose, how much summarization vs.
     verbatim capture, whether headers are used, target length relative to
     input length.
   - **What to avoid**: known failure modes already corrected for (e.g.
     "don't just paraphrase the transcript — extract decisions and action
     items separately").
   - **Concrete example(s)** of acceptable output, pulled from real project
     data where possible, not hypothetical.
   - **Edge cases and how they're handled** (empty input, very long input,
     ambiguous input, conflicting information).
   - Any rubric, checklist, or informal scoring logic already in place.
   - This section should be detailed enough that a new agent could generate
     a new instance of that output and a reviewer couldn't tell it apart
     from one made under original guidance.
5. **Current state** — what works, what's in progress, what's known-broken.
6. **Recent changes** — running log, newest first, one line each:
   `date — what changed — why`. Keep the last ~10; trim older entries.
7. **Conventions** — naming, style, patterns, anything non-obvious.
8. **Environment setup** — exact commands to install, run, test, build.
9. **Known issues / gotchas** — traps, flaky tests, workarounds in place.
10. **Next steps / open TODOs** — priority order.

### Style for CODEX_HANDOFF.md

Write for an agent with no memory of prior sessions and no access to the
reasoning that shaped the quality bar — only what's written down. Be
concrete: real file paths, real command names, real examples, real version
numbers. When describing a quality standard, show it, don't just assert it
("notes should be concise" is useless; "notes should be under 150 words,
structured as Summary → Key Points → Action Items, written in third person"
is usable). No filler.

### Approved-output examples

When a human approves a generated output (a note, summary, etc.) as meeting
the bar, save it into `/examples/<feature-name>/` and reference it from the
relevant Output Quality Spec entry in `CODEX_HANDOFF.md`. Real approved
examples are stronger ground truth than adjectives — prefer pointing to one
over describing it. (Saved so far: `examples/geography-notes/batch-01_sheets-01-04.js`,
Geography sheets 01–04 as the user verified them on 2026-09-27.)

---

## 8. Review

Run `/review` against the base branch before treating any non-trivial change
as finished. If a `code_review.md` file exists in this repo, follow it during
review. (This folder is not a git repository, so there is no base branch:
review the changed files against their `backups/pre-…` copies, or run
`/code-review` on the changed paths.)
