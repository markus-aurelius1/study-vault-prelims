# Study Vault: Notes Format Guide

The exact format a notes file must follow to be added to the Study Vault. Follow it and a new subject
builds first time, with every feature working: exam chips, the PYQ explorer, the exam filter, trap drills,
recall prompts, search, spaced revision, progress, and diagrams, maps and photos.

- **Format name:** Master Sheet v2 (the format of `sources/Polity_Master_Sheet_v2.html`). Use it for every new subject.
  **Figures** (diagrams, maps and photos, §14) were added to v2 on 27 Sept 2026. The addition is strictly
  additive: a v2 file without figures builds exactly as before, and Polity needed no change. To *use* figures,
  a file needs the current template's `<style>` and RENDER region.
- **Starting point:** `templates/Master_Sheet_TEMPLATE.html`. It contains the exact page shell and renderer the build checks against.
- **Audience:** you, and any AI or person who writes the next subject file. Give them this guide and the template.

Every rule here comes from the build (`tools/build.mjs`, `tools/lib/*`) and the app (`app/js/*`). The
behaviour described under "what happens if you don't" was confirmed by building deliberately broken
files.

---

## Contents

1. [The rules that matter most](#1-the-rules-that-matter-most)
2. [How the website reads a notes file](#2-how-the-website-reads-a-notes-file)
3. [The file: name, place, anatomy, hard technical rules](#3-the-file)
4. [Sheets: `SEC({...})`](#4-sheets)
5. [Sections (blocks): tables and lists](#5-sections-blocks)
6. [Inline markup](#6-inline-markup)
7. [Exam tags](#7-exam-tags)
8. [Writing lines that work in Recall](#8-writing-lines-that-work-in-recall)
9. [Updating a subject without losing progress](#9-updating-a-subject-without-losing-progress)
10. [Adding the subject to the Vault](#10-adding-the-subject-to-the-vault)
11. [Reading the build output](#11-reading-the-build-output)
12. [Asking an AI to generate a subject](#12-asking-an-ai-to-generate-a-subject)
13. [Pre-flight checklist](#13-pre-flight-checklist)
14. [Figures: diagrams, maps and photos](#14-figures-diagrams-maps-and-photos)
- [Appendix A: Type definitions](#appendix-a-type-definitions)
- [Appendix B: A complete example sheet](#appendix-b-a-complete-example-sheet)
- [Appendix C: Other formats (do not use)](#appendix-c-other-formats-do-not-use)

---

## 1. The rules that matter most

1. **Start from the template.** Copy `templates/Master_Sheet_TEMPLATE.html`. Change only the content region
   and four header strings. Never edit the `<style>` or the RENDER script.
2. **One subject means one file**, named `<Subject>_Master_Sheet_v<N>.html` and placed directly in `sources/`.
   Keep only one version of a subject in `sources/` at a time.
3. **All note text is double-quoted JavaScript strings.** Numbers are strings too: write `"1950"`, never `1950`.
4. **Every sheet has a unique, permanent `id`** made of `a-z`, `0-9` and `-` only.
5. **Every block has a heading `h`** that is unique within its sheet, plus exactly one body: a table
   (`cols` + `rows`), a list (`list`) or a figure (`fig`). A table or list may also carry a `fig`, shown
   above its lines (§14).
6. **Blocks use only the fields** `h`, `t`, `k`, `cols`, `rows`, `list` and `fig`. Never use `sub` or `html`,
   never put objects inside rows, and never put arrays inside lists.
7. **Headings, sheet titles, group names and column headers are plain text.** No `**`, `!!`, `==`,
   backticks or `[tags]`.
8. **Exam tags go at the end of the line:** `[CSE 2021; UPPCS 2023, 2019]`. Use semicolons between exams and
   commas between years of the same exam.
9. **Tag only real PYQs** that you can verify. A tag is a claim that the paper asked this fact.
10. **Every list line needs a cue or a key term:** `cue — answer`, `cue: answer`, `question :: answer`,
    or a **bold** / `` `backtick` `` term. Otherwise it is never drilled. **Bold the key term or number in
    every line.** Bold is what the notes file blurs in Recall mode (§8.4).
11. **Every testable fact lives in a block line** (a table row or list item). Sheet `note` and `stats`
    are not searchable and are never drilled.
12. **One fact, one line.** Don't write several lines in a block that restate one concept for different
    PYQ years; write one line and give it every tag. When a reference sheet (Articles, Cases, Numbers,
    Radar) repeats a thematic fact, both copies carry the same particulars and the same tags (§8.5).
13. **UPPCS is the exam; UPPSC is the Commission.** Write tags as `[UPPCS 2023]`, and use "UPPSC" only
    for the Commission and its other exams (§7.6).
14. **A build only counts as good when** the subject shows `master-sheet-v2`, `N/N lines identical`, and no
    line starting with `!` or `✗`. Several mistakes pass the build silently (see §11).
15. **Figures are SVG by default and never fetch anything** (§14). Draw diagrams and simple maps as inline SVG
    coloured only through the page's theme variables. Use a photo only when nothing else will do, embedded
    as a compressed base64 `data:` image. A figure is reference material: it is never blurred, drilled or
    counted as a line, so every testable fact it shows must also be written in a line.

---

## 2. How the website reads a notes file

```
sources/Geography_Master_Sheet_v1.html
        │
        ▼   node tools/build.mjs   (or double-click "Build Vault.cmd")
 1. Detect the format. It needs an inline <script> containing `const S=[]` and `SEC({`.
 2. Run the file's own <script> in a sandbox, which fills the array S with sheets.
 3. Capture the file's own renderer (fmt, blockHTML, KEY, GROUPS) at the last "})();" in the file.
 4. Check every figure for safety and size (tools/lib/figures.mjs). A bad figure fails the build.
 5. Render every line and every figure with the Vault's renderer and compare them, one by one, with
    the file's own renderer. Any difference fails the build.
 6. Write data/subjects/<id>.js and data/manifest.js.
        │
        ▼
 index.html loads data/ and the subject appears everywhere: dashboard, reader, search,
 recall, revision, PYQ explorer, progress.
```

What follows from this:

- **The Vault reads only the `S` array.** Anything outside a `SEC({...})` call never becomes content.
  That includes text written directly into the HTML body.
- **The file must run cleanly as a web page.** If its script throws an error partway, every sheet after
  that point is lost, and the build only prints a warning.
- **The file's renderer is the reference.** That is why the RENDER script must stay exactly as it is in
  the template.
- **The build never modifies the file.** It only reads it.

---

## 3. The file

### 3.1 Name and place

The **subject id** (used in URLs and in every progress key) and the **display name** come from the file
name. To derive them, the build:

- drops the extension;
- turns `_` and `-` into spaces and removes brackets;
- removes the words `Master Sheet(s)`, `Sheet(s)`, `Note(s)`, `Revision`, `Final`, `Latest` and `Updated`,
  plus version tags like `v1` and `v2.1`.

What remains is the name. Lower-cased, with `&` turned into `and` and every other symbol into `-`, it is the id.

| File name | Subject id | Display name |
|---|---|---|
| `Polity_Master_Sheet_v2.html` | `polity` | Polity |
| `Geography_Master_Sheet_v1.html` | `geography` | Geography |
| `Indian_Economy_Master_Sheet_v1.html` | `indian-economy` | Indian Economy |
| `Modern_History_Master_Sheet_v3.html` | `modern-history` | Modern History |
| `Art_&_Culture_Master_Sheet_v1.html` | `art-and-culture` | Art & Culture |
| `Science_and_Technology_Master_Sheet_v1.html` | `science-and-technology` | Science and Technology |
| `Environment & Ecology Master Sheets.html` | `environment-and-ecology` | Environment & Ecology |
| ⚠ `Geography_Master_Sheet_v1 (1).html` | `geography-1` | Geography 1 (a **new** subject) |
| ⚠ `Geography_Master_Sheet_v1 - Copy.html` | `geography-copy` | Geography Copy (a **new** subject) |

Rules:

- **Use the pattern `<Subject>_Master_Sheet_v<N>.html`.** Use underscores between words and plain ASCII letters.
- **Watch for browser download suffixes.** A second download often gets ` (1)` or ` - Copy` added to its
  name. Rename the file before building, or it becomes a separate subject.
- **Keep the subject words identical across versions.** `Geography_Master_Sheet_v1` → `Geography_Master_Sheet_v2`
  keeps all progress. Changing the words (for example `Geography` → `Indian_Geography`) changes the id, and
  the whole subject starts over.
- **Put the file directly in `sources/`.** Subfolders are ignored, so `sources/old/` is a safe place to
  archive previous versions.
- **Only subject notes files belong in `sources/`.** Every `.html` file there becomes a subject, including
  PYQ papers, analyses and drafts.
- **Two files that resolve to the same id** stop the build with `subject id "…" already used`.

### 3.2 Encoding and characters

- Save as **UTF-8** (the template declares `<meta charset="utf-8">`).
- Typographic characters are welcome: `“ ” ’ — – → ↔ · × ≥ ≤ ° ₹ ² ₂`.
- **Write characters, not HTML.** Write `&` rather than `&amp;`, `<` rather than `&lt;`, `CO₂` rather than
  `CO<sub>2</sub>`. Any HTML inside note text is shown literally, tags and entities included.
- **The one exception is a figure's `src`** (§14): SVG markup or an image `data:` URI, never shown as text,
  and checked element by element by the build. Everything else, including a figure's `alt` and `caption`,
  follows the rule above.

### 3.3 Anatomy of the file

| Region | What it is | May you edit it? |
|---|---|---|
| `<head>` including `<style>` | the standalone page's styling | Only `<title>` (and optionally add a `<meta name="description">`) |
| `<header>` in `<body>` | the standalone page's toolbar | Only the `<h1>` text, the `<span class="sub">` text and the search `placeholder` |
| **CONTENT** (between the two banners) | `const S=[];`, `function SEC(…)` and your `SEC({...})` calls | **Yes. This is the notes.** |
| **RENDER** (from the RENDER banner to `</script>`) | the file's own renderer | **Never** |

What the editable header strings do:

| String | Example | Used by |
|---|---|---|
| `<title>` | `Geography Master Sheet` | The Vault: the subject's title (subject search; the subject page falls back to it when there is no description) |
| `<span class="sub">` | `UPSC CSE Prelims · UPPCS Prelims` | The Vault: the one-line description on the subject page |
| `<meta name="description" content="…">` | optional | Takes precedence over `<span class="sub">` when present |
| `<h1>` | `Geography Master Sheet` | The standalone page only |
| `placeholder="…"` | `Search everything — a term, a number or a year` | The standalone page only |

The skeleton (`…` stands for parts copied unchanged from the template):

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Geography Master Sheet</title>
<style> … unchanged … </style>
</head>
<body>
<header class="top" id="top"> … <h1>Geography Master Sheet</h1><span class="sub">UPSC CSE Prelims · UPPCS Prelims</span> … </header>
… unchanged …
<script>
(function(){ … theme … })();
/* ===================== CONTENT ===================== */
const S=[];
function SEC(o){o.blocks=o.blocks||[];S.push(o);return o;}
/* ===== 01 SHEET TITLE IN CAPITALS ===== */
SEC({ … sheet 1 … });

/* ===== 02 SHEET TITLE IN CAPITALS ===== */
SEC({ … sheet 2 … });


/* ===================== RENDER ===================== */
(function(){
… unchanged …
})();
</script>


</body>
</html>
```

The `/* ===== 01 … ===== */` banner above each sheet is a convention for humans. The build ignores comments.

### 3.4 Hard technical rules

The build depends on each of these. The "if broken" column shows what the build actually does.

| Rule | If broken |
|---|---|
| Keep `const S=[];` and `function SEC(o){o.blocks=o.blocks||[];S.push(o);return o;}` exactly as in the template. Don't change `const` to `let` or `var`. | The file isn't recognised. It is imported as plain HTML with **0 lines**, and the build doesn't flag it as an error. |
| Put the content in the same inline `<script>` as the renderer, before the RENDER banner. Never load content with `<script src=…>`. | External scripts are never read, so that content is missing. |
| The renderer's closing `})();` must be the **last** `})();` in the file. Add no `<script>` after it. | The fidelity check is silently skipped (`0/N lines identical`). |
| Never write `</script` or `<!--` anywhere in note text. | The script ends early: `✗ No SEC({...}) sheets found`. |
| Use **double-quoted** strings `"…"` for all text. **Never** use template literals `` `…` `` (the backtick is the number marker). | Syntax error: `✗ No SEC({...}) sheets found`. |
| Inside text, write a straight double quote as `\"`, or better, use typographic quotes `“ ”`. For apostrophes use `’` (a plain `'` also works inside `"…"`). Write a backslash as `\\`. | Syntax error, or the text is changed. |
| No line breaks inside a string. One line of notes is one string. | Syntax error. |
| A figure's `src` is the only value that may be split: several double-quoted strings joined with `+`, one SVG element per line (§14.4). Write SVG attributes in single quotes, `viewBox='0 0 640 400'`, so they need no escaping. | A missing `+` between two pieces is a syntax error: `✗ No SEC({...}) sheets found`. |
| Put a comma between every array element and every object property. No double commas `,,`. | A missing comma is a syntax error. `,,` creates an empty entry that shows as "undefined". |
| **Every** text value is a string: `"1950"`, `"8,611 m"`, `""`. No bare numbers, `true`, `null` or `undefined`. | A bare number in a table cell **crashes the whole build** (`TypeError: s.match is not a function`), so no subject gets rebuilt. |
| Put **only** `SEC({...})` calls and `/* comments */` in the content region. No variables, helper functions or computed text (joining a figure's `src` pieces with `+` is the one exception). | Any runtime error (for example an unquoted word) **silently drops every sheet after it**. The only sign is a `!` warning. |

---

## 4. Sheets

A **sheet** is one chapter-sized topic, with its own page and navigation entry in the Vault (for example
"Fundamental Rights & Writs" in Polity, which has 22 sheets). Write one `SEC({...})` call per sheet, in the
order they should appear.

```js
SEC({id:"climate",title:"Indian Climate & Monsoon",group:"Physical Geography",tier:1,
stats:["UPSC CSE: …","UPPCS Pre: …","Formats: …"],
note:"…",
blocks:[
{ …block… },
{ …block… }
]});
```

| Field | Required | Type | Rules | What the Vault does with it |
|---|---|---|---|---|
| `id` | **yes** | string | Unique within the file. Only `a-z`, `0-9` and `-`, for example `"fr"`, `"climate"` or `"land-reforms"`. Keep it short (2–30 characters). **Never change it once the subject is in use.** | Forms the URL `#/s/<subject>/<id>` and is part of the key for every piece of progress on this sheet |
| `title` | **yes** | string | Plain text. Aim for at most 45 characters. | Sheet name in navigation, page header, search, crumbs |
| `group` | **yes** | string | Plain text. **All sheets of a group must be consecutive.** | Navigation group heading, and the label on the sheet page |
| `tier` | **yes** | number `1`, `2` or `3` | 1 = heavily tested, learn cold · 2 = regular · 3 = occasional, skim | P1/P2/P3 badge. P1 sheets lead "Start here" and the high-yield list, and are weighted up in drills. If missing, the Vault treats it as P3 and the standalone page shows "Pundefined". |
| `stats` | **yes** (may be `[]`) | array of strings | House convention is 3 lines: UPSC CSE frequency, UPPCS frequency, question formats. Markup is allowed. Leave out exam tags. | Shown under the sheet title. **Not searchable, not drilled.** |
| `note` | **yes** (may be `""`) | string | 1–2 sentences of orientation. Markup is allowed. Leave out exam tags. | Shown under the sheet title. **Not searchable, not drilled.** |
| `blocks` | **yes** | array of blocks | At least one block. | The sheet's sections (§5) |

**Duplicate sheet ids are the worst silent failure.** In testing, a second sheet reusing an id replaced
the first sheet's content entirely: the first sheet's sections vanished and the other sheet appeared twice.
The build did not report it.

**Group ordering.** The Vault groups sheets in the order each group first appears. If a group comes back
later in the file, that sheet is pulled up next to its group. The Vault order then no longer matches the
file order, and the standalone page's previous/next buttons disagree with its sidebar. Keep each group's
sheets together.

**House conventions (from Polity; optional but recommended):**

- Use 4–8 groups for about 15–25 sheets.
- Write `stats` as exactly three lines in this shape:
  `"UPSC CSE: 25 Q (2009–25), mostly …"`, `"UPPCS Pre: 5 Q (2018–25) + …"`, `"Formats: sequence, matching, …"`.
- End with a **Revise** group, for example a "Numbers & Trap Bank" sheet and an "Exam Radar" sheet.

---

## 5. Sections (blocks)

A **block** is one section of a sheet: a heading plus a table, a fact list or a figure. It is the unit of
reading progress and of spaced revision, because each block is scheduled on its own. Size it like a revision
card: roughly **3 to 25 lines**, one sub-topic.

### 5.1 The three shapes

**Table block**

```js
{h:"Lapse of Bills on dissolution",t:1,cols:["Bill","Lapses?"],rows:[
["Pending in LS (originated in either House)","**Lapses** [CSE 2024]"],
["Originated and pending in RS (not passed by LS)","**Does not lapse** [CSE 2016]"],
["Pending on **prorogation**","Never lapses [CSE 2016]"]]},
```

**List block**

```js
{h:"Road to a Constituent Assembly",t:2,list:[
"Idea of a CA for India first put forward by **M.N. Roy (1934)** [UP GIC 2017; UP UDA 2001]",
"**August Offer 1940**: British accept in principle that Indians should frame their own Constitution",
"**Cabinet Mission 1946** (Pethick-Lawrence, Stafford Cripps, A.V. Alexander — !!William Wood was not a member!!) → CA formed Nov 1946 [UP Lower 2015; UP Lower 2009]"]},
```

(Both examples are real lines from the Polity file.)

**Figure block** (§14): a diagram, map or photo with its own heading. A table or list block can also carry
a `fig`, which is then shown above its lines.

```js
{h:"Pressure belts and planetary winds",t:1,fig:{kind:"svg",
alt:"Schematic of the pressure belts from 90°N to 90°S with the trade winds, westerlies and polar easterlies",
caption:"Pressure belts and planetary winds (schematic)",
src:"<svg viewBox='0 0 640 400' xmlns='http://www.w3.org/2000/svg'>"+
"<line x1='70' y1='200' x2='430' y2='200' style='stroke:var(--ink-2);stroke-dasharray:6 5'/>"+
"<text x='446' y='205'>Equatorial low</text>"+
"</svg>"}},
```

### 5.2 Block fields

| Field | Required | Values | Rules and effect |
|---|---|---|---|
| `h` | **yes** | string | Section heading. Plain text, **unique within the sheet**, at most about 60 characters. The heading text is the section's permanent progress key (§9). |
| `t` | always set it | number `1`, `2` or `3` | Priority badge on the section (P1/P2/P3). Same scale as the sheet `tier`. |
| `k` | optional | `"core"` (default), `"trap"`, `"support"` | `"trap"` adds a *Traps* badge and marks **every** line as a trap (Trap drill, high-yield filter). Use it for trap sets and elimination lists. `"support"` is for background/context: the section starts collapsed, gets a *Support* badge and is hidden by the high-yield filter. Leave `k` out for normal sections. A figure-only block has no lines, so `"trap"` there fails the build. |
| `cols` | table | array of **≥ 2** plain-text strings | Column headers. **No markup of any kind.** `**`, `!!`, `==` or `[tags]` here fail the build with `column headers differ`. |
| `rows` | table | array of arrays of strings | Each row has **exactly** `cols.length` strings. Use `""` for an empty cell. |
| `list` | list | array of strings | One fact per string. No empty strings. |
| `fig` | figure block; optional on a table or list | object `{kind, src, alt, caption}` | A diagram, map or photo (§14). On its own it makes a **figure block**. On a table or list block it is shown above the lines. |

### 5.3 Not allowed in a block

The build does not stop most of these. They break things quietly.

| Don't write | What happens |
|---|---|
| `sub:"…"` | The standalone page shows it after the heading, but **the Vault never shows it**, so that text is invisible in the Vault. Put it in `h` or in a line instead. |
| `html:"…"` | A raw HTML block bypasses markup, exam tags, recall and the line-by-line check. |
| An object at the end of a row: `["a","b",{y:"23"}]` | This is old v1 syntax. The build fails with `line text differs … [object Object]`. |
| An array as a list item: `["text",{y:"23"}]` | This is old v1 syntax. It crashes the file's renderer, which **silently skips the fidelity check**. |
| A block with no `rows`, no `list` and no `fig` | An empty section appears in the Vault, counted in progress but with nothing to read. |
| `fig` as anything but `{kind, src, alt, caption}` (extra fields such as `width`, a string, an array) | The build fails with a figure problem (§11.2). |
| `cols` without `rows`, or `rows` without `cols` | An empty section, or a crash. |
| `id`, `tags`, `no`, `one` | Computed or standalone-only; don't set them. |
| Both `rows` and `list` in one block | This works (table first, then list), but split it into two blocks instead. |

### 5.4 Table rules

- **At least 2 columns.** Recall keeps column 1 visible as the cue and hides the rest, so a one-column
  table can't be drilled. Use a list instead.
- **Column 1 is the key**, the thing being asked about: the Act, Article, river, pass, case or year.
- **Every row has exactly `cols.length` cells.** Use `""` for an empty cell.
- **Keep cells short.** Long explanations belong in a list block.
- **"Exam hook" as the last column** is the house pattern: traps plus tags, for example
  `"!!Lemaister was a puisne judge, not CJ!! [UPPCS M 2010; UP RO 2016]"`.
- **Reverse prompts** ("Identify the Article") are generated when column 1's header **starts with** one of
  `Art`, `Article`, `Articles`, `Amdt`, `Amendment`, `Sch`, `Schedule`, `Part`, `Age`, `Year`, `Date`,
  `Case`, `Committee`, `Body`, `State`, `Act`, `Writ`, `Source`, `Office` or `List`, **or** when the row's
  first cell is 14 characters or fewer. The second cell must also be 240 characters or fewer.
- **Year prompts.** Any column whose header starts with `Year` or `Date` gets "Identify the year/date"
  prompts. Name year columns `Year`.

### 5.5 List rules

- One fact per string. Tightly related mini-facts may share a line, separated by ` · `.
- Shape every line for recall (§8).
- No empty strings.

---

## 6. Inline markup

These markers work inside **list lines, table cells, `stats` and `note`**.

| Write | Shows as | Meaning | Effect in the Vault |
|---|---|---|---|
| `**Board of Control**` | **bold** | Exact term, key name, key figure | Hidden in "Fill in the key terms" recall |
| `` `280` `` | monospace, blue | Article, section, entry number or other number | Hidden in "Fill in the key terms" recall |
| `!!not 109!!` | red trap chip | The wrong option examiners use | The line counts as a **trap** (Trap drill, high-yield) |
| `==key distinction==` | yellow highlight | A distinction that decides questions | The line counts as **high-yield** |
| `[CSE 2021; UPPCS 2019]` | chips `CSE’21` `UP’19` | PYQ tags (§7) | PYQ explorer, exam filter, year filter, high-yield, drills by exam |
| `cue :: answer` (**list lines only**) | cue → answer | An explicit question → answer pair | Everything after ` :: ` is blurred in Recall |

Rules:

1. **Open and close each marker inside the same string.** An unpaired `**` shows literally as `**`.
2. **Don't use marker characters for other purposes.**
   - Use ` = ` for "equals", never `==`.
   - No `!!` for emphasis.
   - No backtick as an apostrophe (use `’`).
   - For asides use `( )`, not `[ ]`. Square brackets are reserved for exam tags.
3. **In a `::` line, a marker pair must not straddle the ` :: `.** `**a :: b**` shows stray asterisks;
   write `**a** :: **b**`.
4. **Different markers may nest** (`**!!x!!**`), but keep it simple.
5. **`::` needs a space on both sides** (` :: `). Written `a::b`, it is plain text. In table cells `::` is
   always plain text.
6. **No HTML and no other Markdown.** `<b>`, `<br>`, `&amp;`, `# Heading`, `- bullet`, `_italic_`, `*single*`
   and `[link](url)` all appear literally.
7. **Where markup must not be used:** sheet `title`, `group` and `cols` (plain text only), and block
   headings `h`. In `h` markup does render, but keep headings plain: navigation strips it and it complicates
   the progress key. A figure's `alt` and `caption` are plain text too; any marker or `[tag]` there fails
   the build.

---

## 7. Exam tags

### 7.1 Grammar

```
[ EXAM YEARS ; EXAM YEARS ; … ]

EXAM   an exam name from the table below (letters, spaces and dots)
YEARS  one or more 4-digit years (19xx or 20xx), separated by ", " or "/" or a space,
       optionally followed by the paper number I or II
```

- The text inside the brackets must be 4–200 characters, with no `[` or `]` inside.
- **If any part fails to parse, the whole bracket is shown as plain text.** It gets no chips and is not
  counted in the PYQ explorer, and **the build does not warn you**.

### 7.2 Exam names

| Write | Chip | Filter family |
|---|---|---|
| `CSE 2021` · `UPSC 2021` · `UPSC CSE 2021` | CSE’21 | UPSC CSE |
| `UPPCS 2023` · `UPPCS Prelims 2023` (`UPPSC 2023` also parses, but write UPPCS, see §7.6) | UP’23 | UPPSC |
| `UP RO 2016` | RO’16 | UPPSC |
| `UP Lower 2013` | UPL’13 | UPPSC |
| `UP UDA 2002` · `UP BEO 2019` · `UP GIC 2017` · `UP RI 2014` · `UP Spl 2008` · `UP Other 2011` | UP·’02 … | UPPSC |
| `UPPCS M 2010` · `UPM 2010` · `UPPCS Spl M 2008` (Special Mains) | UPM’10 · UPM’08 | UPPCS Mains |
| `CDS 2016` · `CDS 2016 II` | CDS’16 | CDS / NDA |
| `NDA 2019` | NDA’19 | CDS / NDA |
| `CAPF 2018` | CAPF’18 | CAPF |
| `BPSC 2011` | BP’11 | Other PCS |
| `MPPCS 2015` | MP’15 | Other PCS |
| `CGPCS 2014` | CG’14 | Other PCS |
| `JPSC 2016` | JH’16 | Other PCS |
| `RAS 2013` · `RPSC 2018` · `HPSC 2018` · `MPSC 2019` | RAS’13 … | Other PCS |
| `UKPCS 2021` · `Uttarakhand 2021` | UK’21 | Other PCS |
| `PCS 2015` · `Other 2015` (any other state PCS) | PCS’15 | Other PCS |

### 7.3 Valid and invalid tags (tested)

| Tag | Result |
|---|---|
| `[CSE 2021; UPPCS 2023, 2019]` | ✓ CSE’21 UP’23 UP’19 |
| `[UPPCS 2023/2019]` · `[UPPCS 2023 2019]` | ✓ UP’23 UP’19 |
| `[CDS 2016 II]` · `[CDS II 2016]` | ✓ CDS’16 |
| `[CSE 2021, UPPCS 2019]` | ✗ plain text. **Use `;` between exams.** |
| `[UPPCS 2019-2021]` · `[UPPCS 2019–21]` | ✗ plain text. List each year: `[UPPCS 2019, 2020, 2021]`. |
| `[UPPCS '19]` · `[UPPCS 19]` | ✗ plain text. Use 4-digit years. |
| `[CDS 2016 (II)]` · `[CSE 2021 III]` | ✗ plain text. Paper is `I` or `II`, without brackets. |
| `[UPPCS 2023 Mains]` | ✗ plain text. Write `[UPPCS M 2023]`. |
| `[CSE 2021; ]` | ✗ plain text (empty part) |
| `[UPSSSC 2019]` · `[SSC 2019]` · `[IAS 2010]` · `[WBCS …]` · `[OPSC …]` · `[TNPSC …]` · `[KPSC …]` · `[APPSC …]` | ✗ plain text (unsupported names). Write IAS as `CSE`. Tag other state PCS as `PCS 2015`. |

### 7.4 Tags that parse but land in the wrong family (silent)

| Written | Counted as | Write instead |
|---|---|---|
| `[UPSC CAPF 2018]` | **UPSC CSE** | `[CAPF 2018]` |
| `[UPSC CDS 2016]` | **UPSC CSE** | `[CDS 2016]` |
| `[UPPSC RO 2016]` | UPPSC, chip `UP’16` instead of `RO’16` | `[UP RO 2016]` |

Anything that starts with `UPSC` is counted as CSE. (`[UPPCS Spl M …]` used to be filed under the Prelims
chip. Since Sept 2026 the parser, in both the notes file and the Vault, files it as UPPCS Mains.)

### 7.5 Placement

- **Put tags at the end of the line or cell.** The notes file never blurs a tag. In the Vault, trailing tags
  stay visible while the answer is blurred, but a tag in the middle of a line blurs with the answer. (When
  one line merges facts from two questions of the same year, put each tag next to its clause instead; see
  §8.5.)
- **Use one bracket per line** when possible. Several brackets at the end (`… [CSE 2021] [UPPCS 2019]`)
  also work.
- **Tags can go on the same line as a trap:** `"Fact :: !!wrong option!! [UPPCS 2022]"`.
- **Don't put tags in `stats`, `note`, `h`, `title` or `cols`.** They are not counted there.
- **Only tag real, verified PYQs.**

### 7.6 UPPCS or UPPSC?

The legend decides this:

- **UPPCS** is the exam. Its Prelims chip is `UP’24` and its Mains chip is `UPM’10`.
- **UPPSC** is the Commission and its other exams: RO/ARO, Lower Subordinate, BEO, UDA/LDA and GIC.

So:

| Write | Not |
|---|---|
| `[UPPCS 2023]`, `[UPPCS M 2010]` | `[UPPSC 2023]` (it parses, but contradicts the legend) |
| “UPPSC keyed …”, “the UPPSC item”, “other UPPSC papers” (the Commission’s key or paper) | “UPPCS keyed …” |
| stats: `UPPCS Pre: …`, `UPPCS Mains · UPPSC RO/ARO & Lower: …` | `UPPSC Mains/RO/Lower` |

---

## 8. Writing lines that work in Recall

### 8.1 List lines

Each list line becomes a recall prompt by the **first** rule that matches:

| # | Line shape | Prompt | Example |
|---|---|---|---|
| 1 | Contains ` :: ` | Cue shown; everything after the **first** ` :: ` hidden | `The Preamble is :: **a part of the Constitution but has no legal effect independently of other parts** [CSE 2020]` |
| 2 | Short cue (up to 70 visible characters), then ` — `, `: ` or ` = ` | Cue shown; the rest hidden ("Complete the fact") | `**Andhra** — first linguistic State, **1 Oct 1953** … [UPPCS 2018]` |
| 3 | No cue, but has **bold** or `` `backtick` `` terms | Those terms hidden ("Fill in the key terms") | `Idea of a CA … first put forward by **M.N. Roy (1934)** [UP GIC 2017]` |
| 4 | Cue up to 140 characters, then a separator | As rule 2 | |
| 5 | None of the above | The whole line blurs in the reader, but **the line is never used in drills** | `The Western Ghats are older than the Himalayas` |

(A reader who sets their list preference to "cloze" gets rule 3 before rule 2.)

Cue rules:

- The only separators are ` — ` (**em dash**, with a space either side), `: ` (colon then space) and ` = `.
  **A hyphen ` - ` and an en dash ` – ` are not separators.**
- For each separator, only its **first** occurrence is tried. The cue before it must have balanced markers,
  balanced `( )` and balanced quotes, or that separator is skipped. For example,
  `“A quoted — phrase” — answer` fails, because the first ` — ` is inside the quotes.
- Use ` :: ` for question → answer and fact → trap pairs:
  `"Joint sitting = **Art 108** :: !!not 109!!; Speaker presides"`.
- Put the tags at the end so they stay visible (§7.5).

### 8.2 Table rows

Tables are drilled column-wise. Column 1 is given and the rest are asked (plus reverse and year prompts,
see §5.4). A good table puts the key in column 1 and keeps each answer cell focused.

### 8.3 What counts as high-yield

A line is high-yield if it has **at least one valid exam tag**, a `!!trap!!` or a `==mark==`, **or** it sits
in a `k:"trap"` block. High-yield lines drive the High-yield filter, get extra weight in drills, and also
get a "Why is this true?" prompt.

### 8.4 What Recall hides in the notes file itself

The standalone notes file (its own **Recall** button) blurs less than the Vault does, and blurs in a
different way:

| Line | What blurs | What stays visible |
|---|---|---|
| `prompt :: answer` | the answer after → | the whole prompt, including its **bold** |
| any other line with **bold** | only the **bold** terms | everything else, which is the cue |
| a line with no bold but a ` — ` or `: ` separator | the text after the first separator | the cue before it |
| a line with none of these | nothing | the whole line, so there is nothing to test |
| a table row | columns 2+ | column 1 |

Exam-tag chips are **never** blurred, in lines or in cells. Tapping a line or cell reveals it, and
tapping again hides it.

The practical rule: **bold the key term or number in every line.** In the Polity file, 82 of 1,105 list
lines have neither bold nor a usable separator, so nothing in them can be tested in Recall mode.

### 8.5 One fact, one line

- **Don't restate one concept across several lines of a block** for different PYQ years ("Chief purpose
  of a Constitution…", "Constitutional government means…", "A constitutional government by definition
  is…"). Write **one** line carrying the full fact and every tag, e.g.
  `"Constitutional government, by definition :: a **limited government** — … [CSE 2023, 2021, 2020, 2014; CAPF 2014]"`.
- **If two merged questions share an exam and year** (two CSE 2017 items), keep each tag next to its own
  clause, so that neither question disappears.
- **Reference sheets may repeat thematic facts on purpose** (Articles, Parts & Schedules; Cases; Numbers &
  Trap Bank; Exam Radar; the state file). When they do, every copy states the **same particulars** and
  carries the **same tags** for that fact. If a reference row bundles several facts, put each tag next to
  its own sub-fact.
- **When you change a fact, change every copy.** Search the file for the Article number or key term before
  saving. Copies that drift apart (different tags, one copy updated and the other not) are the commonest
  quiet error in a big sheet.

---

## 9. Updating a subject without losing progress

Progress is stored per section, under the key `subject-id / sheet-id / section-slug`. The **section slug**
is the heading `h` lower-cased, with markers removed, `&` turned into `and`, every other symbol into `-`,
and cut at 64 characters. Missed-line statistics are keyed by the exact text of the line.

| Change in the new version | Effect on progress |
|---|---|
| Edit, add or remove lines inside a block | Kept (an edited line loses only its missed-line history) |
| Add new blocks or sheets | Kept; the new ones start fresh |
| Add, redraw or remove a figure, or add a `fig` to an existing table or list | Kept (a figure is not a line and has no progress of its own) |
| Reorder blocks or sheets | Kept |
| Change `title`, `group`, `tier`, `t`, `stats` or `note` | Kept |
| **Rename a block heading `h`** | **That section starts over** |
| **Move a block to another sheet** | **That section starts over** |
| **Change a sheet `id`** | **Every section in that sheet starts over** |
| **Change the subject words in the file name** | **The whole subject starts over** |

Headings must be unique within a sheet. Two headings collide when they differ only in case, punctuation
or markers, or share their first ~64 characters. For example,
`Fundamental Rights — Art 12–35 & writs` and `Fundamental Rights: Art 12–35 & Writs` produce the same slug.
The second heading then gets `-2` added, and its progress can swap with the first if they are reordered.

To install a new version:

1. Move the old file out of `sources/`, for example into `sources/old/`.
2. Put the new file in `sources/`.
3. Rebuild.

---

## 10. Adding the subject to the Vault

1. **Create the file.**
   1. Copy `templates/Master_Sheet_TEMPLATE.html` to `sources/Geography_Master_Sheet_v1.html`.
   2. Set `<title>`, `<h1>`, `<span class="sub">` and the search `placeholder`.
   3. Delete **all three** example sheets and replace them with the subject's `SEC({...})` calls.
2. **Optional: set the subject's name, order and colour** in `vault.config.json`, keyed by the subject id
   (see below).
3. **Check the file on its own.** Open it directly in Chrome or Edge. The sidebar must list every sheet,
   the *Recall* button must blur answers, and the browser console (F12) must show no red errors. Look at
   every figure once, press *Dark* and look again: every line and label must stay visible.
4. **Build.** Double-click `Build Vault.cmd`, or run `node tools/build.mjs`.
5. **Check the build output** against the acceptance test in §11. Don't skip this step.
6. **Open `index.html`** (reload if it is already open). The subject appears on the dashboard. Spot-check a
   sheet, one table and one list in Recall mode, and a search.
7. **Publish.** Run `npx vercel deploy --prod --yes` (the folder is linked to the `study-vault` project).
   Only `index.html`, `manifest.webmanifest`, `sw.js`, `app/` and `data/` are uploaded; `sources/`,
   `templates/`, `backups/` and `tools/` stay local. The build publishes the notes file itself at
   `data/sheets/<id>.html` (readable offline from the subject page), and it gives `sw.js` a new version,
   so installed phone and desktop copies update the next time they're opened.

### `vault.config.json`

```json
{
  "_help": "…keep as is…",
  "subjects": {
    "polity":    { "name": "Polity", "order": 1 },
    "geography": { "name": "Geography", "order": 2 }
  }
}
```

| Field | Meaning |
|---|---|
| `name` | Display name (default: from the file name) |
| `title` | Subject title (default: the file's `<title>`) |
| `description` | One-line description (default: `<meta name="description">`, else `<span class="sub">`) |
| `accent` | Colour as `#RRGGBB` |
| `order` | Position on the dashboard; lower comes first. Default `100`, and subjects with the same order sort alphabetically. |
| `id` | Advanced: map a renamed file back to its old id so progress is kept. For example, `"indian-geography": { "id": "geography" }`. |

⚠ **The file must be valid JSON** (no trailing commas, no comments). If it isn't, the build **silently
ignores the whole file**, and every subject loses its configured name and order.

Default colours by subject name (override them with `accent`):

| Name contains | Colour |
|---|---|
| polity / constitution / governance | `#3E55C4` |
| geograph | `#0F7F86` |
| econom | `#2F7D32` |
| history / culture / art | `#A0582A` |
| environment / ecology | `#3C7A3A` |
| science / tech | `#6D4BC3` |
| ethic | `#9B3F75` |
| current | `#B0453A` |
| anything else | `#4A5568` |

The match is a plain substring, so "Earth Science" matches "art" and gets the History colour. Economy and
Environment greens are close; setting a distinct `accent` for one of them helps.

---

## 11. Reading the build output

### 11.1 A good build

```
● Geography  (Geography_Master_Sheet_v1.html · master-sheet-v2)
  18 sheets · 142 sections · 1650 lines · 9 figures (8 SVG, 1 image · 164 KB)
  fidelity: 1650/1650 lines identical to the source renderer · 120 column headers match · 72 sheet notes/stats lines match · 9/9 figures identical

Done — 2 subject(s) in the vault. Open index.html.
```

A file without figures prints neither figure part, exactly as before figures existed.

**Acceptance test.** All of these must hold for the new subject:

1. The first line ends in **`· master-sheet-v2`**. (`generic-html` means the format was not recognised.)
2. **Sheets** equals the number of `SEC({...})` calls, and **sections** equals the number of blocks you wrote,
   figure blocks included.
3. **`fidelity: X/Y`** has **X = Y**, and Y equals the total number of table rows plus list lines. `0/Y`
   means the check did not run. **Figures are not lines and are never part of Y**: a figure block adds 0,
   and a `fig` on a table or list adds nothing to that block's count. Figures are counted in item 8.
4. **Column headers match** is greater than 0 if the file has tables.
5. **Sheet notes/stats lines match** equals the number of sheets plus the total number of `stats` lines
   (Polity: 22 + 66 = 88).
6. **No line** under the subject starts with `!` or `✗`. This includes the figure-budget warning
   (`! figures total … over the 1 MB budget`); compress until it goes away.
7. The last line starts with **`Done`**, not `Finished with errors`.
8. **Figures** (only if the file has any): `F figures` on the first line equals the number of `fig` objects you
   wrote (figure blocks plus figures on tables and lists), and the fidelity line ends in **`· F/F figures
   identical`**. Each figure's complete markup from the file's own renderer must equal the Vault's, character
   for character.

`note: the source renderer hides part of N line(s)…` is informational, not an error. The Vault shows the
full line; read the listed lines to be sure they are intended.

### 11.2 Error messages

| Build output | Cause | Fix |
|---|---|---|
| `✗ <file>: No SEC({...}) sheets found in source` | JavaScript syntax error: a missing comma or quote, an unescaped `"`, a template literal, or `</script>` in the text | Open the file in Chrome and press F12. The console names the line. |
| `! Source script stopped early (X is not defined)` and fewer sheets than written | Runtime error in the content, such as an unquoted word or a variable. **Everything after it is dropped.** | Quote the value |
| `! Source script stopped early (s.split is not a function)` | A list item that isn't a string (for example an array) | Make it a plain string |
| `fidelity: 0/N lines identical` | The renderer was not captured: a script after the renderer, an edited renderer, or the renderer crashed on bad data | Restore the RENDER region from the template, remove extra scripts, and check for `!` lines |
| `· generic-html` with `0 lines` | `const S=[]` is missing or was changed | Restore the two CONTENT header lines from the template |
| `✗ … column headers differ` | Markup in `cols` | Make headers plain text |
| `✗ … line text differs … [object Object]` | An object at the end of a row | Remove it |
| `TypeError: s.match is not a function` (build stops; **no** subject rebuilt) | A table cell that isn't a string (bare number, `true`, `null`) | Quote it: `"1950"` |
| `✗ … subject id "x" already used` | Two files in `sources/` map to the same subject | Keep one version (§3.1) |
| `✗ … heading text differs` · `note text differs` · `stats line N differs` · `source shows A lines, vault B` · `rendered A of B lines` | The file's renderer and the Vault disagree, usually because the renderer was edited | Restore the RENDER region from the template |

**Figure problems.** They are listed under `✗ N figure problem(s):`, one per line, as
`[sheet-id] Block heading: svg: …` or `…: img: …`. The subject is not built until every one is fixed. The
rules behind them are in §14.

| Build output (after `[sheet] heading:`) | Cause | Fix |
|---|---|---|
| `svg: <script>: scripts are not allowed` · `<foreignObject>: not allowed (it can carry HTML)` · `<style>: not allowed …` · `<a>: links are not allowed` · `<animate>: animation is not allowed` · `<image>: not allowed …` · `<filter>: filters are not supported` · `<x>: not an allowed SVG element` | An element outside the allowlist (§14.4) | Remove it. For a photo inside a drawing, use a figure of kind `"img"` instead. |
| `svg: <rect>: event handlers (onclick) are not allowed` · `class is not allowed …` · `data-act is not allowed …` · `attribute x is not allowed — did you mean …?` | An attribute outside the allowlist | Remove it, or fix its spelling (SVG names are case-sensitive: `viewBox`, `refX`, `markerWidth`) |
| `svg: <rect> fill: "#ff0000" is a fixed colour, which breaks dark mode …` | A hex, `rgb()` or named colour | `style='fill:var(--navy)'` with a token from §14.5, or `currentColor` / `none` |
| `svg: … put var() inside style …` · `var(--brand) — use one of the page's colour variables …` | `var()` in an attribute, an unknown token, or a token with a fallback | Move it into `style='…'`; use only the §14.5 tokens, with no fallback value |
| `svg: … points outside the figure — only url(#id) …` · `only "#id" of an element in this figure …` · `refers to no id in this figure` · `image-set() is not allowed here` | A reference to anything outside this one figure: a URL, a file, another figure's id | Draw it inside the figure; point only to ids defined in the same `<svg>` |
| `svg: id "arrow" must start with the sheet id and an underscore …` · `id "…" is already used by [sheet] heading` | A bare id, or one reused in another figure | Rename it `<sheet-id>_name`, unique across the whole file |
| `svg: <svg> needs a viewBox …` · `viewBox "…" must be four numbers` · `remove width='…' …` | No viewBox, a malformed one, or a fixed size on the root | `<svg viewBox='0 0 640 400'>` and nothing else fixing its size |
| `svg: src must start with <svg …` · `must end with </svg> …` · `comments <!-- … --> are not allowed …` · `<!DOCTYPE>, <![CDATA[…]]> and <?xml …?> are not allowed …` | Editor output pasted as is | Keep only `<svg …>…</svg>`, with no comments |
| `svg: </g> does not close <text>` · `<g> is never closed` · `malformed attribute near …` · `text may use only the entities …` · `<title> may contain only text` | Malformed markup: an unclosed or mismatched tag, an unquoted attribute, a bare `&` | Close every element, quote every attribute, write `&` as `&amp;` |
| `the SVG is N KB — the limit is 60 KB …` | Too many points in the paths | Simplify and round coordinates. For a very detailed map, use a compressed image. |
| `img: remote images are not allowed …` · `src must be a base64 data: URI …` · `an SVG belongs in a figure of kind "svg" …` | A URL, an unsupported type (AVIF, SVG, BMP) or not a `data:` URI | Embed a PNG, JPEG, WebP or GIF as `data:image/…;base64,…` (§14.6) |
| `img: the image is N KB as stored — the limit is 200 KB …` · `img: the image is W×H px — at most 1600 px …` | Over a size cap | Resize and recompress (§14.6) |
| `img: the base64 data is malformed …` · `img: the image data is incomplete …` · `img: the data is not a PNG image …` · `img: the image's width and height cannot be read …` | Line breaks or spaces in the data, a truncated string, the wrong `image/…` type, or an unusual encoding | Paste the whole `data:` URI again from the converter, with the type it gives |
| `alt is required …` · `alt is plain text: no **, !!, ==, backticks or [tags]` · `caption is plain text: write characters, not HTML` · `alt is N characters — keep it under 400 …` | A missing or marked-up `alt` or `caption` | Plain text, at most 400 characters |
| `fig has an unknown field "width" …` · `fig must be an object …` · `kind must be "svg" or "img" …` · `k:"trap" needs lines to drill …` | A malformed `fig`, or a trap figure block | Use exactly `{kind, src, alt, caption}`; leave `k` out of a figure block |
| `! figures total N MB, over the 1 MB budget …` · `✗ figures total N MB — the limit for one file is 2 MB …` | Too much figure data in the file | Prefer SVG; compress or drop photos |
| `✗ the file's <style> predates figures …` | Figures in a file whose `<style>` came from an older template | Copy the `<style>` block and the RENDER region from the current template |
| `✗ … figure missing from the source renderer — this file's RENDER region predates figures …` | Figures in a file whose RENDER region came from an older template | Replace the RENDER region (and `<style>`) with the current template's |
| `✗ … figure differs from the source renderer (the RENDER region's figure code was changed …)`, followed by the point where they differ | The figure code in the file's RENDER region was edited | Restore the RENDER region from the template |

### 11.3 Problems the build does NOT catch

Check these yourself (the checklist in §13 covers them all):

- **Duplicate sheet `id`.** A whole sheet's content is replaced by another sheet's.
- **`sub` on a block.** Its text is invisible in the Vault.
- **Malformed exam tags.** They show as plain text and are not counted.
- **Tags in the wrong family**, such as `UPSC CAPF`.
- **List lines with no cue, separator or bold/backtick term.** They are never drilled.
- **Empty blocks.**
- **Missing `tier`.** The sheet silently becomes P3.
- **A group split across the file.** The Vault order differs from the file order.
- **Duplicate or near-duplicate headings.** Progress keys collide.
- **Browser-download names** like `… (1).html`. They create a new subject.
- **A figure that gives away its own block's answers.** Figures are never blurred. A map above a table that
  labels what the table drills shows the answers during Recall and revision.
- **A fact that exists only in a figure.** It is never drilled, never counted, and found by search only
  through `alt`.
- **Image data damaged in the middle** (retyped or hand-edited). The build checks the start and the end of the
  data, so a truncated image fails, but a changed character inside it passes and shows as a garbled picture.
  Always paste from a converter, and look at every photo once.
- **Labels too small to read on a phone**, or drawn outside the `viewBox` (clipped).
- **An `alt` that does not name what the figure shows.** Search looks only at `alt` and `caption`, never at the
  labels inside the SVG.

---

## 12. Asking an AI to generate a subject

A full subject is large (Polity is about 350 KB, roughly 90,000 tokens), and an AI re-typing the 35 KB page
shell can alter the renderer. The most reliable workflow:

1. **Ask only for the CONTENT region**, meaning the `SEC({...})` calls, and ask for **a few sheets per reply**.
2. **Paste each reply, in order,** into your copy of the template, between the CONTENT and RENDER banners
   (after the `function SEC…` line). Delete the template's example sheets.
3. **Build and apply the acceptance test** (§11).
4. **Figures:** an SVG figure is typically 2–8 KB of markup, so expect **two or three per reply** at most. An AI
   cannot produce a photograph. Have it mark where one would help with a comment, and add the image yourself
   (§14.6).

A prompt to start with (attach this guide):

> Write Study Vault notes for **<Subject>**, sheets **<n–m>**, in the Master Sheet v2 format defined in
> the attached NOTES_FORMAT_GUIDE.md. Output only `SEC({...})` calls, each preceded by a
> `/* ===== NN SHEET TITLE ===== */` comment, in one code block, with no other code. Follow the guide
> exactly: double-quoted strings only; every value a string; unique lowercase sheet ids; unique block
> headings; tables with at least 2 plain-text columns and equal-length rows; no `sub`, no `html`, no
> objects in rows. Put exam tags at the end of lines in the §7 grammar, and tag only PYQs you are certain
> of, writing UPPCS for the exam and UPPSC only for the Commission. Bold the key term or number in every
> line, and give every list line a cue (` — `, `: `, ` :: `). One fact, one line: never restate a concept
> across several lines of a block for different years; merge them into one line carrying every tag.
> Where a diagram or map carries a topic better than words (drainage systems, pressure belts and winds,
> ocean currents, cross-sections, passes and boundaries), add a figure as §14 defines it: a figure block, or
> a `fig` on the table it illustrates. Draw it as inline SVG in a `viewBox` about 640 units wide, with no
> width or height. Write attributes in single quotes and split `src` into strings joined with `+`, one element
> per line. Colour only with `style='fill:var(--token)'` / `style='stroke:var(--token)'` using the §14.5
> tokens, or `currentColor` / `none`; never hex, rgb or colour names. Prefix every id with the sheet id and an
> underscore. Make labels at least 15 units high and keep everything inside the viewBox. Use no script,
> style, class, event handler, link, image, filter, animation or comment. Give every figure a plain-text
> `alt` naming each labelled feature, and an optional plain-text `caption`. Every fact a figure shows must
> also be in a line, and a figure on a table must not label the answers that table drills. Never output a
> raster image or any URL: where a photograph would help, write `/* PHOTO: what it should show */` in its
> place. Before answering, check your output against the §13 checklist.

---

## 13. Pre-flight checklist

**File**

- [ ] Made from `templates/Master_Sheet_TEMPLATE.html`, with `<style>` and the RENDER region untouched
- [ ] Named `<Subject>_Master_Sheet_v<N>.html`, with the same subject words as earlier versions and no ` (1)` or ` - Copy`
- [ ] Sits directly in `sources/`, as the only version of this subject there
- [ ] `<title>`, `<h1>`, `<span class="sub">` and the search placeholder are updated
- [ ] All three template example sheets are deleted
- [ ] If the file has figures, its `<style>` and RENDER region come from the current template (the one with an example figure sheet)
- [ ] Only `SEC({...})` calls and comments between the CONTENT and RENDER banners
- [ ] `const S=[];` and `function SEC(o){…}` unchanged
- [ ] No `</script`, `<!--`, template literals, bare numbers, `null` or `,,` anywhere in the content

**Sheets**

- [ ] Every sheet has `id`, `title`, `group`, `tier`, `stats`, `note` and `blocks`
- [ ] Every `id` is unique, uses only `a-z 0-9 -`, and matches the previous version's id for the same sheet
- [ ] `tier` is 1, 2 or 3 (a number)
- [ ] Sheets of the same group are consecutive
- [ ] `title` and `group` are plain text
- [ ] No testable fact exists only in `note` or `stats`

**Blocks**

- [ ] Every block has `h` (plain text, unique in the sheet, at most ~60 characters) and `t` (1–3)
- [ ] `k` is absent, `"trap"` or `"support"` (a figure-only block: absent or `"support"`)
- [ ] Each block has exactly one body: `cols` (≥ 2 plain-text headers) + `rows`, `list`, or `fig`; a table or list may also carry a `fig`
- [ ] Every row has exactly `cols.length` strings
- [ ] No `sub`, `html`, `id`, objects in rows, arrays in lists, empty strings in lists, or empty blocks
- [ ] Headings unchanged from the previous version, unless a progress reset is intended

**Text**

- [ ] Every `**`, `!!`, `==` and `` ` `` pair opens and closes in the same string
- [ ] No marker pair straddles ` :: `
- [ ] No `==` used as "equals", no `!!` used as emphasis, no backtick used as an apostrophe
- [ ] No HTML tags, entities or Markdown

**Tags**

- [ ] At the end of the line or cell
- [ ] `;` between exams, 4-digit years, paper written as `I` or `II` without brackets
- [ ] Only exam names from §7.2; `CAPF` and `CDS` never prefixed with `UPSC`
- [ ] UPPCS (the exam) in tags and exam references; UPPSC only for the Commission and its other exams (§7.6)
- [ ] Every tag is a real, verified PYQ

**Recall**

- [ ] Every list line has ` :: `, a cue with ` — ` / `: ` / ` = `, or a **bold** / `` `backtick` `` term
- [ ] Every line bolds its key term or number (that is what the notes file blurs, §8.4)
- [ ] In every table, column 1 is the key, and year columns are headed `Year` or `Date`

**Duplicates**

- [ ] No two lines in a block restate the same concept for different years (merge them, §8.5)
- [ ] Facts repeated on a reference sheet (Articles, Cases, Numbers, Radar) have the same particulars and tags in every copy

**Figures** (§14)

- [ ] Every `fig` is exactly `{kind, src, alt, caption}` (caption optional), with `kind` `"svg"` or `"img"`
- [ ] SVG unless it is a photograph, or a map too detailed to draw
- [ ] `src` starts with `<svg` and ends with `</svg>`, has a `viewBox` (about 640 wide), and no `width` / `height` on `<svg>`
- [ ] Only the elements in §14.4: no `script`, `style`, `foreignObject`, `image`, `a`, animation, `filter`, nested `svg`, comments or `<?xml ?>`
- [ ] No event handlers, `class` or `data-*`; every attribute quoted (single quotes inside the JS string)
- [ ] Colours only through `style='…:var(--token)'` (§14.5 tokens, no fallback), `currentColor` or `none`: no hex, `rgb()` or colour names, and no `var()` outside `style`
- [ ] Every id is `<sheet-id>_name` and unique in the file; `url(#…)` and `href='#…'` point only inside the same figure
- [ ] Labels at least 15 units high; nothing outside the `viewBox`; each figure at most 60 KB
- [ ] Images: `data:image/webp|jpeg|png|gif;base64,…`, at most 1600 px on the longest side and 200 KB as stored, pasted from a converter and never retyped
- [ ] All figures in the file together at most 1 MB
- [ ] `alt` (required) names what the figure shows and each labelled feature; `alt` and `caption` are plain text, at most 400 characters
- [ ] Every fact a figure shows is also in a line; a figure on a table or list doesn't label the answers that block drills

**Build**

- [ ] The file opens standalone with no console errors
- [ ] Every figure shows, and stays readable after pressing *Dark*
- [ ] The build output passes the acceptance test (§11.1), including `F/F figures identical` when there are figures
- [ ] The subject appears in `index.html`, and Recall works on a table and on a list

---

## 14. Figures: diagrams, maps and photos

A **figure** is a diagram, a map or, rarely, a photograph that is part of a sheet: drainage systems, pressure
belts and winds, ocean currents, cross-sections, cycles, outline maps with labelled points, passes and
boundaries, a landform photo. It is a structured field, `fig`, checked by the build. It is not HTML pasted
into a line.

Figures are **reference material**. They are always visible, never blurred, never drilled, and never counted
as lines. The facts are still learned from lines: a figure shows how the lines fit together.

### 14.1 When to add a figure

| Add a figure when… | Don't, when… |
|---|---|
| Position, direction or shape *is* the fact: a river's course, a wind's deflection, the order of belts, which side of a range a pass lies on | A table or list already says it as clearly |
| Several lines describe one arrangement that a picture shows at a glance (a cross-section, a cycle, a flow) | The picture would hold a fact that no line states. Write the line first. |
| A PYQ asks you to locate or order things on a map | It is decoration |

A figure is never blurred, so **label it with cues, not answers**. A diagram above a table can name what
column 1 names, but not what the other columns drill: in the template's fold example, the figure says
*Anticline* and *Syncline*, and the table asks for the shape and the rocks at the core.

### 14.2 Two ways to place a figure

**A figure block** is a section of its own: a heading, a tier and a `fig`, with no `cols`, `rows` or `list`.

```js
{h:"Pressure belts and planetary winds",t:1,fig:{kind:"svg",alt:"…",caption:"…",src:"<svg viewBox='0 0 640 400'>…</svg>"}},
```

**A figure on a table or list** sits above that block's lines. Use it when a diagram belongs to its own
data table, such as a fold cross-section above a *Fold · Shape · Rocks at the core* table.

```js
{h:"Folds",t:2,cols:["Fold","Shape","Rocks at the core"],rows:[ … ],fig:{kind:"svg",alt:"…",src:"<svg …>…</svg>"}},
```

`templates/Master_Sheet_TEMPLATE.html` contains a working example of each (sheet 03), and Appendix B has a
complete one.

### 14.3 The `fig` object

| Field | Required | Type | Rules | If broken |
|---|---|---|---|---|
| `kind` | **yes** | `"svg"` or `"img"` | `"svg"` for anything that can be drawn as line art (the default). `"img"` only for a photograph, a satellite image, or a map too detailed to draw. | `kind must be "svg" or "img"` |
| `src` | **yes** | string | `"svg"`: inline SVG markup following §14.4–14.5. `"img"`: a base64 `data:` URI following §14.6. **Never a URL.** | A figure problem naming the rule; the subject is not built |
| `alt` | **yes** | string | Plain text, at most 400 characters. Say what the figure shows and name every labelled feature: search finds a figure only through `alt` and `caption`, never through the labels inside it. Screen readers read it too. | `alt is required …` · `alt is plain text …` |
| `caption` | optional | string | Plain text, at most 400 characters, shown under the figure. A title plus one sentence of reading guidance. | `caption is plain text …` |

Nothing else goes in `fig`: no `width`, `height`, `title` or `class` (`fig has an unknown field …`). Like
every other value, all four are double-quoted strings. `alt` and `caption` take no markup at all: no `**`,
`!!`, `==`, backticks, `[tags]` or HTML.

### 14.4 Writing the SVG

The build parses every SVG and accepts only a small, safe subset. **It never strips or repairs anything**: a
figure either passes as written, or the build fails and names the problem.

| Rule | If broken |
|---|---|
| `src` is exactly one `<svg …>…</svg>` element: nothing before `<svg`, nothing after `</svg>`. No `<?xml ?>`, `<!DOCTYPE>`, `<![CDATA[`, and no `<!-- comments -->` anywhere (a comment can end the file's script). | `src must start with <svg …` · `must end with </svg> …` · `comments … are not allowed` |
| The root `<svg>` has a `viewBox` (`viewBox='0 0 640 400'`) and **no** `width`, `height`, `x` or `y`. The page sizes the figure from the viewBox. | `<svg> needs a viewBox …` · `remove width='…' …` |
| `xmlns='http://www.w3.org/2000/svg'` (and `xmlns:xlink='http://www.w3.org/1999/xlink'`) are optional, and allowed only on the root with exactly those values. | `xmlns must be …` |
| **Elements allowed:** `svg` (the root only), `g`, `defs`, `symbol`, `use`, `title`, `desc`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `textPath`, `marker`, `linearGradient`, `radialGradient`, `stop`, `pattern`, `clipPath`, `mask`. Names are case-sensitive (`linearGradient`, not `lineargradient`). `title` and `desc` hold text only. | `<x>: not an allowed SVG element` · `write <linearGradient> …` |
| **Never:** `script`, `style` (it would restyle the whole page), `foreignObject` (it can carry HTML), `image` (use `kind:"img"`), `a`, `animate` / `animateMotion` / `animateTransform` / `set`, `filter`, `metadata`, a nested `svg`. | `<script>: scripts are not allowed` … |
| **Attributes allowed:** geometry (`x y x1 y1 x2 y2 cx cy r rx ry fx fy fr width height d points pathLength dx dy rotate textLength lengthAdjust startOffset method spacing side transform viewBox preserveAspectRatio`), markers, gradients, patterns, clips and masks (`markerWidth markerHeight markerUnits refX refY orient offset gradientUnits gradientTransform spreadMethod patternUnits patternContentUnits patternTransform clipPathUnits maskUnits maskContentUnits`), the SVG presentation properties (`fill stroke stroke-width opacity font-size text-anchor marker-end paint-order …`), `id`, `style`, `href` / `xlink:href`, `xml:space`, `xml:lang`, `lang`. | `attribute x is not allowed — did you mean …?` |
| **Never:** event handlers (`onload`, `onclick` …), `class` (it would pick up the page's own styles), `data-*` (it drives the page's controls). | `event handlers … are not allowed` · `class is not allowed …` |
| Every attribute has a quoted value, separated by spaces. Inside the double-quoted JS string, **write SVG attributes in single quotes**: `<rect x='10' y='20'/>`. (`\"` also works but is hard to read.) | `malformed attribute near …` |
| **Nothing outside the figure.** `url(…)` may only be `url(#id)`, and `href` only `'#id'`, pointing to an element inside the same `<svg>`. No `http:`, no file names, no `data:`, no `javascript:`, no reference to another figure. The only functions are `url(#…)`, the transform functions (`translate rotate scale matrix skewX skewY`) and, inside `style`, `var()` and `calc()`. | `points outside the figure …` · `refers to no id in this figure` · `image-set() is not allowed here` |
| **ids** are `<sheet-id>_name`, such as `climate_arrow`: the sheet's own id, an underscore, then letters, digits, `-` or `_`. Each id is unique across the whole file. Ids share one namespace with the page, and a duplicate breaks the second figure's markers and gradients. | `id "arrow" must start with the sheet id and an underscore …` · `… is already used by …` |
| Text uses characters directly (`°`, `→`, `’`, `—`). The only entities allowed are `&amp; &lt; &gt; &quot; &apos;` and numeric `&#…;`. | `text may use only the entities …` |
| Each SVG is at most **60 KB**. A clean diagram is 2–8 KB. | `the SVG is N KB — the limit is 60 KB …` |
| Split a long `src` into double-quoted pieces joined with `+`, one element (or a short group) per line, as in the examples. It is the only place the format allows `+` (§3.4). | Syntax error if a `+` is missing |

### 14.5 Colour, type and size

**Theme-aware colour.** A figure takes its colours from the page's variables, so it repaints with the
light/dark toggle exactly like the text. The build rejects any fixed colour.

- By default everything is **ink**: the page sets `fill: currentColor` on the figure, so shapes and text come
  out in the page's text colour in both themes. Strokes default to none.
- Colour anything else with **`style='…'`** and a token: `style='fill:var(--navy-bg);stroke:var(--navy);stroke-width:2'`.
  Set it on a `<g>` to colour a whole group.
- **Allowed colour values:** `var(--token)` (tokens below, inside `style` only, with no fallback),
  `currentColor`, `none`, `transparent`, `inherit`, and `url(#id)` for a gradient or pattern in the same figure.
- **Never:** hex (`#1a73e8`), `rgb()`, `hsl()` or colour names (`red`, `white`). They cannot follow the theme,
  and a black line vanishes in dark mode. `var()` belongs inside `style`: browsers differ on `var()` in SVG
  attributes, so the build accepts it only there.

| Token | Meaning on the page | Suggested use in a figure |
|---|---|---|
| `--ink` | body text (the default) | main labels, coastlines, outlines |
| `--ink-2` | secondary text | minor labels, grid and latitude lines (with `stroke-opacity`), axes |
| `--rule` · `--rule-2` | hairlines (very faint) | background gridlines only |
| `--sheet` | the background right behind the figure | halos behind labels, knock-outs, box fills |
| `--paper` | a slightly deeper background tone | panels, insets |
| `--navy` · `--navy-bg` | blue | water, rivers, cold currents, high pressure · seas, lakes |
| `--teal` · `--teal-bg` | teal | winds, flows, arrows · shallow water, wetlands |
| `--omr` · `--omr-bg` | crimson | warm currents, low pressure, the thing to notice · danger zones |
| `--good` · `--good-bg` | green | vegetation, lowlands · plains |
| `--warn` · `--warn-bg` | amber-brown | relief, mountains, rock strata · deserts, plateaus |
| `--plum` · `--plum-bg` | purple | boundaries, special zones · shaded regions |
| `--mark` · `--mark-ink` | highlighter yellow · its text | one highlighted feature |

The notes file defines these in its `<style>`, for light and dark. The Vault maps each one onto its own
matching colour. Only these 20 names are accepted.

**Type.** Text inherits the page's font at **16 units**. Set `font-size` in viewBox units, and use
`font-weight`, `font-style` and `text-anchor` freely. Do not name fonts, and never load one: a figure must work
offline. For a label that crosses lines, add a halo:
`style='paint-order:stroke;stroke:var(--sheet);stroke-width:4;stroke-linejoin:round'`.

**Size.** The figure always fills the reading column and keeps its viewBox's proportions. It never has a
fixed pixel size. In the Vault the column is about 750 px wide on a desktop and about 340 px on a phone. In
the notes file a figure is at most 820 px wide.

- Draw in a **viewBox about 640 units wide** (600–720). A 16-unit label is then about 19 px on a desktop and
  8.5 px on a phone. Pinch-zoom keeps it sharp, because it is vector.
- **Labels at least 15 units**, key labels 16–18. Strokes at least 1.5 units. Few labels: leave detail to the
  lines.
- Keep everything **inside the viewBox**: anything outside it is clipped.
- Portrait figures get tall on a desktop (a 640 × 800 map is about 940 px high). Prefer landscape, or crop to
  the region the lines discuss.

A starting skeleton (valid as written, for a sheet with id `rivers`):

```js
{h:"Rivers of the plateau (schematic)",t:1,fig:{kind:"svg",
alt:"Schematic map: a river rises in the north-west and flows south-east across the plateau to the sea",
caption:"Starting skeleton: sea, land, a river with an arrowhead, and labels with a halo",
src:"<svg viewBox='0 0 640 360' xmlns='http://www.w3.org/2000/svg'>"+
"<defs><marker id='rivers_arrow' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='4' markerHeight='4' orient='auto'><path d='M0 0L10 5L0 10z' style='fill:var(--navy)'/></marker></defs>"+
"<rect width='640' height='360' rx='8' style='fill:var(--navy-bg)'/>"+
"<path d='M60 40L420 30L560 150L470 330L120 320Z' style='fill:var(--good-bg);stroke:var(--ink-2);stroke-width:1.5'/>"+
"<path d='M150 70C210 150 260 180 330 250' style='fill:none;stroke:var(--navy);stroke-width:3' marker-end='url(#rivers_arrow)'/>"+
"<g font-size='16' style='paint-order:stroke;stroke:var(--sheet);stroke-width:4;stroke-linejoin:round'><text x='250' y='150'>River</text><text x='420' y='230' style='fill:var(--ink-2)'>Plateau</text></g>"+
"</svg>"}},
```

### 14.6 Photographs and detailed maps (`kind:"img"`)

Use an image only when an SVG cannot do the job: a photograph of a landform, a satellite view, a map too
detailed to redraw. Keep images rare. They do not repaint in dark mode, cannot be searched inside, and cost
far more bytes than a drawing.

| Rule | Limit | If broken |
|---|---|---|
| `src` is `data:image/<type>;base64,<data>` with type `webp` (best), `jpeg`, `png` (only for flat graphics) or `gif`. No URL, no AVIF, no SVG. | — | `remote images are not allowed …` · `src must be a base64 data: URI …` |
| The data is complete, unbroken base64: no spaces or line breaks, and the type matches the file | — | `the base64 data is malformed …` · `the image data is incomplete …` · `the data is not a PNG image …` |
| Longest side | **1600 px** (1000–1200 is plenty) | `the image is W×H px — at most 1600 px …` |
| Size as stored (the base64 text, about 4/3 of the file) | **200 KB** per image | `the image is N KB as stored — the limit is 200 KB …` |

**Making one:**

1. Resize to at most 1200 px on the longest side, and export as **WebP** (or JPEG) at quality about 70 with
   metadata removed. Any image editor or a browser tool such as Squoosh does this. A photo then comes out at
   roughly 60–150 KB as stored.
2. Turn the file into a data URI and copy it to the clipboard (PowerShell):

   ```powershell
   "data:image/webp;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\landform.webp")) | Set-Clipboard
   ```

   Change `webp` to `jpeg` or `png` to match the file.
3. **Paste it as the `src` value. Never retype, trim or edit base64.** The build catches a cut-short string,
   but one changed character in the middle passes and shows as a garbled picture. Look at every photo once in
   the file.

The renderer reads the image's pixel size from its header and writes it as `width` and `height`, so the page
reserves the space before the picture decodes and nothing shifts. The image then scales down to the column,
and to the phone screen.

### 14.7 What a figure does in the file and in the Vault

| | Figure block | `fig` on a table or list |
|---|---|---|
| **Reader** | Its own section with a *Figure* badge, and no line count or read dot | The usual section, with a *Figure* badge; the figure sits above the lines |
| **Recall mode, pretest** | Never blurred; no rating buttons | Lines are blurred as usual; the figure never is, so it must not label the answers (§14.1) |
| **Reading progress, revision** | Not counted and never scheduled: reference material, like the reference sheets | Counted and scheduled as a section; the figure appears in the revision card |
| **Drills, PYQ explorer, Trap drill** | Never | The lines only |
| **High-yield / exam filter** | Hidden (it has no tagged lines) | Shown while at least one of the block's lines passes the filter |
| **Search** (Vault and file) | Found by words in `alt`, `caption` or the heading, and listed as a figure that opens its section. In the file, a match in the caption is highlighted; a match only in `alt` shows the figure unhighlighted. | The same, plus the lines as usual |
| **Bookmark, doubt, my notes, write a card** | Yes. Writing your own card is how to drill a figure in this version. | Yes |
| **Dark mode** | Repaints with the page (§14.5) | The same |
| **Print** (file) | Every card opens for printing, and no figure is split across a page break (`break-inside: avoid`, like the cards) | The same |
| **Offline** | Nothing is fetched to view or print a figure: it is part of the file | The same |

A future "blank map, tap to reveal the labels" mode is a separate, larger feature. It is not part of this
format version.

### 14.8 Size budget

Polity, all text, is about 350 KB. With figures, aim for a file **under about 1.3 MB**: the text, 30–60 SVG
figures at 2–8 KB each, and a handful of photos at 60–150 KB.

- The build **warns above 1 MB** of figure data in one file and **fails above 2 MB**. It counts the stored
  size of every `src`.
- The Vault carries each figure twice: once in the subject data for the reader and once in the published
  notes file (`data/sheets/<id>.html`). An installed phone app downloads both once, for offline use. So 1 MB
  of figures costs about 2 MB of first download.

### 14.9 Counting, and the fidelity check

- **Figures are not lines.** The build's `fidelity: X/Y lines` counts only table rows and list lines. Figures
  are counted separately, as `F figures` on the summary line and `F/F figures identical` on the fidelity line
  (§11.1, item 8).
- The build renders each figure with the file's own renderer and with the Vault's, and requires the complete
  markup to be **identical, character for character**. Both renderers share one piece of figure code (the
  RENDER region's `figHTML` and `imgSize`, and `app/js/render.js`). An edited RENDER region fails with
  `figure differs from the source renderer`.
- The renderer places the SVG as written inside `<figure class="nfig"><div class="nfig-m" role="img"
  aria-label="…alt…">…</div><figcaption>…</figcaption></figure>`, and an image as `<img src alt width height>`.
  Anything that is not an inline `<svg…` or a base64 image shows as a *Figure not shown* notice. The renderer
  never writes a URL.
- **Older files:** a v2 file without figures builds exactly as before, with an older RENDER region too. To add
  figures to such a file, copy the `<style>` block and the RENDER region from the current template first
  (`the file's <style> predates figures …` or `figure missing from the source renderer …` otherwise).

---

## Appendix A: Type definitions

In TypeScript notation, for precision (the file itself is plain JavaScript):

```ts
// One call per sheet, in display order:
SEC(sheet: Sheet)

interface Sheet {
  id: string;        // /^[a-z0-9]+(-[a-z0-9]+)*$/ · unique in the file · permanent
  title: string;     // plain text · ≤ 45 chars recommended
  group: string;     // plain text · sheets sharing a group are consecutive
  tier: 1 | 2 | 3;   // 1 heavily tested · 2 regular · 3 occasional
  stats: string[];   // usually 3 lines · markup allowed · no exam tags · [] if none
  note: string;      // markup allowed · no exam tags · "" if none
  blocks: Block[];   // at least 1
}

type Block = TableBlock | ListBlock | FigureBlock;

interface BlockBase {
  h: string;                           // plain text · unique within the sheet · ≤ ~60 chars · permanent
  t: 1 | 2 | 3;                        // section priority
  k?: "core" | "trap" | "support";     // omit for "core"
}

interface TableBlock extends BlockBase {
  cols: string[];    // ≥ 2 · plain text only
  rows: string[][];  // each row: exactly cols.length strings ("" for empty)
  fig?: Figure;      // optional · shown above the table · never drilled
}

interface ListBlock extends BlockBase {
  list: string[];    // ≥ 1 · non-empty strings · one fact each
  fig?: Figure;      // optional · shown above the list · never drilled
}

interface FigureBlock extends BlockBase {   // a section that is only a figure (§14)
  fig: Figure;       // no cols, rows or list · k absent or "support", never "trap"
}                    // not a line: not read progress, not scheduled, not drilled

interface Figure {   // exactly these fields, all strings
  kind: "svg" | "img";
  src: string;       // "svg": inline <svg viewBox='…'>…</svg> · allowlisted elements/attributes · colours only
                     //        via style='…:var(--token)' / currentColor / none · ids "<sheet-id>_name" · ≤ 60 KB (§14.4–14.5)
                     // "img": "data:image/(webp|jpeg|png|gif);base64,…" · ≤ 1600 px longest side · ≤ 200 KB stored (§14.6)
                     //        never a URL · may be split into "…"+"…" pieces
  alt: string;       // required · plain text · ≤ 400 chars · what it shows, naming each labelled feature (searched)
  caption?: string;  // plain text · ≤ 400 chars · shown under the figure (searched)
}
// Nothing else: no sub, html, id, tags, no, one; no objects in rows; no arrays in list;
// no other fields in fig. All figures in one file ≤ 1 MB (warning) / 2 MB (error).
```

---

## Appendix B: A complete example sheet

A sheet assembled from real Polity lines, showing a table block, a list block with each line shape, a trap
block, and a figure block. The figure only draws what the lines already state: the joint sitting, Art 108,
the Speaker, and the Money Bill and amendment Bill exclusions (in its caption).

```js
/* ===== 08 PARLIAMENT (EXCERPT) ===== */
SEC({id:"parl-example",title:"Parliament",group:"Union & States",tier:1,
stats:["UPSC CSE: …","UPPCS Pre: …","Formats: statements, match the list, Assertion–Reason"],
note:"One or two sentences that orient the reader; shown under the title, never drilled.",
blocks:[
{h:"Lapse of Bills on dissolution",t:1,cols:["Bill","Lapses?"],rows:[
["Pending in LS (originated in either House)","**Lapses** [CSE 2024]"],
["Passed by LS, pending in RS","**Lapses** [CSE 2024]"],
["Originated and pending in RS (not passed by LS)","**Does not lapse** [CSE 2016]"],
["Joint sitting already **notified** before dissolution","**Does not lapse** — sitting still held [CSE 2024; CGPCS 2018]"],
["Pending on **prorogation**","Never lapses [CSE 2016]"]]},
{h:"Constitutional government",t:1,list:[
"Constitutional government, by definition :: a **limited government** — **limited by the terms of the Constitution**, whose chief purpose is to **define and limit the powers of government** [CSE 2023, 2021, 2020]",
"**Andhra** — first linguistic State, **1 Oct 1953**, after Potti Sriramulu’s fast-unto-death [UPPCS 2018; UPPCS M 2009]"]},
{h:"Trap bank — fact vs the wrong option",t:1,k:"trap",list:[
"Joint sitting = **Art 108** :: !!not 109!!; Speaker presides; no joint sitting for Money Bills or amendment Bills",
"CoM collectively responsible to the **LS only** :: ministers hold office at the pleasure of the **President**, !!not the PM!!"]},
{h:"Joint sitting — the route",t:2,fig:{kind:"svg",
alt:"Flow diagram: a Bill passes between the Lok Sabha and the Rajya Sabha; when the two Houses deadlock, a joint sitting under Art 108, presided over by the Speaker, decides it",
caption:"Deadlock between the Houses leads to a joint sitting (Art 108). Money Bills and Constitution amendment Bills never go to one.",
src:"<svg viewBox='0 0 640 200' xmlns='http://www.w3.org/2000/svg'>"+
"<defs><marker id='parl-example_arrow' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='4' markerHeight='4' orient='auto'><path d='M0 0L10 5L0 10z' style='fill:var(--ink-2)'/></marker></defs>"+
"<g style='fill:var(--sheet);stroke:var(--ink-2);stroke-width:1.5'><rect x='20' y='24' width='160' height='48' rx='6'/><rect x='20' y='128' width='160' height='48' rx='6'/></g>"+
"<rect x='240' y='76' width='140' height='48' rx='6' style='fill:var(--omr-bg);stroke:var(--omr);stroke-width:1.5'/>"+
"<rect x='416' y='62' width='208' height='76' rx='6' style='fill:var(--navy-bg);stroke:var(--navy);stroke-width:1.5'/>"+
"<g style='stroke:var(--ink-2);stroke-width:2' marker-end='url(#parl-example_arrow)'><line x1='80' y1='76' x2='80' y2='124'/><line x1='120' y1='124' x2='120' y2='76'/>"+
"<line x1='184' y1='100' x2='236' y2='100'/><line x1='384' y1='100' x2='412' y2='100'/></g>"+
"<g text-anchor='middle' font-size='17'><text x='100' y='54'>Lok Sabha</text><text x='100' y='158'>Rajya Sabha</text>"+
"<text x='310' y='106' style='fill:var(--omr);font-weight:700'>Deadlock</text><text x='520' y='94' style='font-weight:700'>Joint sitting</text>"+
"<text x='520' y='120' font-size='15' style='fill:var(--ink-2)'>Art 108 · Speaker presides</text></g>"+
"</svg>"}}
]});
```

Built on its own, this sheet reports `9/9 lines identical · 1/1 figures identical`: the figure block adds a
section and a figure, but no lines.

`templates/Master_Sheet_TEMPLATE.html` contains a smaller, self-describing example that builds cleanly
(`11/11 lines identical · 2/2 figures identical`). Delete it when you add real sheets.

---

## Appendix C: Other formats (do not use)

The build also accepts two other formats, which exist only for older files:

- **Master Sheets v1** (`const SHEETS=[]` + `SHEETS.push({...})`). This is legacy. It has a looser tag
  grammar and v1-only row and list metadata. Don't mix its syntax into v2 files.
- **Plain HTML** (`<h2>` becomes a sheet, `<h3>` a section). This is the fallback for unrecognised files.
  It has no exam tags, no traps, no recall shapes and no fidelity check.

New subjects use **Master Sheet v2** only.
