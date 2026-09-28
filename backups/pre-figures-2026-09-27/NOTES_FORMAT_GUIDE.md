# Study Vault: Notes Format Guide

The exact format a notes file must follow to be added to the Study Vault. Follow it and a new subject
builds first time, with every feature working: exam chips, the PYQ explorer, the exam filter, trap drills,
recall prompts, search, spaced revision and progress.

- **Format name:** Master Sheet v2 (the format of `sources/Polity_Master_Sheet_v2.html`). Use it for every new subject.
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
   (`cols` + `rows`) or a list (`list`).
6. **Blocks use only the fields** `h`, `t`, `k`, `cols`, `rows` and `list`. Never use `sub` or `html`, never
   put objects inside rows, and never put arrays inside lists.
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

---

## 2. How the website reads a notes file

```
sources/Geography_Master_Sheet_v1.html
        │
        ▼   node tools/build.mjs   (or double-click "Build Vault.cmd")
 1. Detect the format. It needs an inline <script> containing `const S=[]` and `SEC({`.
 2. Run the file's own <script> in a sandbox, which fills the array S with sheets.
 3. Capture the file's own renderer (fmt, blockHTML, KEY, GROUPS) at the last "})();" in the file.
 4. Render every line with the Vault's renderer and compare it, line by line, with the file's
    own renderer. Any difference fails the build.
 5. Write data/subjects/<id>.js and data/manifest.js.
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
| Put a comma between every array element and every object property. No double commas `,,`. | A missing comma is a syntax error. `,,` creates an empty entry that shows as "undefined". |
| **Every** text value is a string: `"1950"`, `"8,611 m"`, `""`. No bare numbers, `true`, `null` or `undefined`. | A bare number in a table cell **crashes the whole build** (`TypeError: s.match is not a function`), so no subject gets rebuilt. |
| Put **only** `SEC({...})` calls and `/* comments */` in the content region. No variables, helper functions or computed text. | Any runtime error (for example an unquoted word) **silently drops every sheet after it**. The only sign is a `!` warning. |

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

A **block** is one section of a sheet: a heading plus a table or a fact list. It is the unit of reading
progress and of spaced revision, because each block is scheduled on its own. Size it like a revision card:
roughly **3 to 25 lines**, one sub-topic.

### 5.1 The two shapes

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

### 5.2 Block fields

| Field | Required | Values | Rules and effect |
|---|---|---|---|
| `h` | **yes** | string | Section heading. Plain text, **unique within the sheet**, at most about 60 characters. The heading text is the section's permanent progress key (§9). |
| `t` | always set it | number `1`, `2` or `3` | Priority badge on the section (P1/P2/P3). Same scale as the sheet `tier`. |
| `k` | optional | `"core"` (default), `"trap"`, `"support"` | `"trap"` adds a *Traps* badge and marks **every** line as a trap (Trap drill, high-yield filter). Use it for trap sets and elimination lists. `"support"` is for background/context: the section starts collapsed, gets a *Support* badge and is hidden by the high-yield filter. Leave `k` out for normal sections. |
| `cols` | table | array of **≥ 2** plain-text strings | Column headers. **No markup of any kind.** `**`, `!!`, `==` or `[tags]` here fail the build with `column headers differ`. |
| `rows` | table | array of arrays of strings | Each row has **exactly** `cols.length` strings. Use `""` for an empty cell. |
| `list` | list | array of strings | One fact per string. No empty strings. |

### 5.3 Not allowed in a block

The build does not stop most of these. They break things quietly.

| Don't write | What happens |
|---|---|
| `sub:"…"` | The standalone page shows it after the heading, but **the Vault never shows it**, so that text is invisible in the Vault. Put it in `h` or in a line instead. |
| `html:"…"` | A raw HTML block bypasses markup, exam tags, recall and the line-by-line check. |
| An object at the end of a row: `["a","b",{y:"23"}]` | This is old v1 syntax. The build fails with `line text differs … [object Object]`. |
| An array as a list item: `["text",{y:"23"}]` | This is old v1 syntax. It crashes the file's renderer, which **silently skips the fidelity check**. |
| A block with no `rows` and no `list` | An empty section appears in the Vault, counted in progress but with nothing to read. |
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
   the progress key.

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
   3. Delete **both** example sheets and replace them with the subject's `SEC({...})` calls.
2. **Optional: set the subject's name, order and colour** in `vault.config.json`, keyed by the subject id
   (see below).
3. **Check the file on its own.** Open it directly in Chrome or Edge. The sidebar must list every sheet,
   the *Recall* button must blur answers, and the browser console (F12) must show no red errors.
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
  18 sheets · 142 sections · 1650 lines
  fidelity: 1650/1650 lines identical to the source renderer · 120 column headers match · 72 sheet notes/stats lines match

Done — 2 subject(s) in the vault. Open index.html.
```

**Acceptance test.** All of these must hold for the new subject:

1. The first line ends in **`· master-sheet-v2`**. (`generic-html` means the format was not recognised.)
2. **Sheets** equals the number of `SEC({...})` calls, and **sections** equals the number of blocks you wrote.
3. **`fidelity: X/Y`** has **X = Y**, and Y equals the total number of table rows plus list lines. `0/Y`
   means the check did not run.
4. **Column headers match** is greater than 0 if the file has tables.
5. **Sheet notes/stats lines match** equals the number of sheets plus the total number of `stats` lines
   (Polity: 22 + 66 = 88).
6. **No line** under the subject starts with `!` or `✗`.
7. The last line starts with **`Done`**, not `Finished with errors`.

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

---

## 12. Asking an AI to generate a subject

A full subject is large (Polity is about 350 KB, roughly 90,000 tokens), and an AI re-typing the 29 KB page
shell can alter the renderer. The most reliable workflow:

1. **Ask only for the CONTENT region**, meaning the `SEC({...})` calls, and ask for **a few sheets per reply**.
2. **Paste each reply, in order,** into your copy of the template, between the CONTENT and RENDER banners
   (after the `function SEC…` line). Delete the template's example sheets.
3. **Build and apply the acceptance test** (§11).

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
> Before answering, check your output against the §13 checklist.

---

## 13. Pre-flight checklist

**File**

- [ ] Made from `templates/Master_Sheet_TEMPLATE.html`, with `<style>` and the RENDER region untouched
- [ ] Named `<Subject>_Master_Sheet_v<N>.html`, with the same subject words as earlier versions and no ` (1)` or ` - Copy`
- [ ] Sits directly in `sources/`, as the only version of this subject there
- [ ] `<title>`, `<h1>`, `<span class="sub">` and the search placeholder are updated
- [ ] Both template example sheets are deleted
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
- [ ] `k` is absent, `"trap"` or `"support"`
- [ ] Each block has exactly one body: `cols` (≥ 2 plain-text headers) + `rows`, or `list`
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

**Build**

- [ ] The file opens standalone with no console errors
- [ ] The build output passes the acceptance test (§11.1)
- [ ] The subject appears in `index.html`, and Recall works on a table and on a list

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

type Block = TableBlock | ListBlock;

interface BlockBase {
  h: string;                           // plain text · unique within the sheet · ≤ ~60 chars · permanent
  t: 1 | 2 | 3;                        // section priority
  k?: "core" | "trap" | "support";     // omit for "core"
}

interface TableBlock extends BlockBase {
  cols: string[];    // ≥ 2 · plain text only
  rows: string[][];  // each row: exactly cols.length strings ("" for empty)
}

interface ListBlock extends BlockBase {
  list: string[];    // ≥ 1 · non-empty strings · one fact each
}
// Nothing else: no sub, html, id, tags, no, one; no objects in rows; no arrays in list.
```

---

## Appendix B: A complete example sheet

A sheet assembled from real Polity lines, showing a table block, a list block with each line shape, and
a trap block:

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
"CoM collectively responsible to the **LS only** :: ministers hold office at the pleasure of the **President**, !!not the PM!!"]}
]});
```

`templates/Master_Sheet_TEMPLATE.html` contains a smaller, self-describing example that builds cleanly
(`9/9 lines identical`). Delete it when you add real sheets.

---

## Appendix C: Other formats (do not use)

The build also accepts two other formats, which exist only for older files:

- **Master Sheets v1** (`const SHEETS=[]` + `SHEETS.push({...})`). This is legacy. It has a looser tag
  grammar and v1-only row and list metadata. Don't mix its syntax into v2 files.
- **Plain HTML** (`<h2>` becomes a sheet, `<h3>` a section). This is the fallback for unrecognised files.
  It has no exam tags, no traps, no recall shapes and no fidelity check.

New subjects use **Master Sheet v2** only.
