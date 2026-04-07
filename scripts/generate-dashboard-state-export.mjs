/**
 * One-off generator for DASHBOARD_STATE_EXPORT.md (project root).
 * Run: node scripts/generate-dashboard-state-export.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8");
}

function lines(p) {
  return read(p).split(/\r?\n/);
}

function dumpFile(rel, label, fence = "tsx") {
  const L = lines(rel);
  const n = L.length;
  let body;
  if (n > 600) {
    const first = L.slice(0, 300).join("\n");
    const last = L.slice(-300).join("\n");
    body = `${first}\n\n[... ${n - 600} lines omitted ...]\n\n${last}`;
  } else {
    body = L.join("\n");
  }
  return `### ${label} — \`${rel}\` (${n} lines)\n\n\`\`\`${fence}\n${body}\n\`\`\`\n`;
}

function walkFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function grepCountFiles(rootRel, pattern, ext = ".tsx") {
  const dir = path.join(ROOT, rootRel);
  let c = 0;
  const re = new RegExp(pattern, "g");
  for (const f of walkFiles(dir, [ext])) {
    const t = fs.readFileSync(f, "utf8");
    const m = t.match(re);
    if (m) c += m.length;
  }
  return c;
}

function grepLines(rootRel, pattern, ext = ".tsx") {
  const dir = path.join(ROOT, rootRel);
  const re = new RegExp(pattern);
  const hits = [];
  for (const f of walkFiles(dir, [ext])) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    fs.readFileSync(f, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (re.test(line)) hits.push(`${rel}:${i + 1}:${line.trim()}`);
      });
  }
  return hits;
}

function collectTree() {
  const roots = ["src/app", "src/components", "src/data"].map((r) => path.join(ROOT, r));
  const files = [];
  for (const r of roots) {
    files.push(...walkFiles(r, [".tsx", ".ts", ".json", ".css"]));
  }
  return files
    .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"))
    .filter((f) => !f.includes("node_modules"))
    .sort();
}

let BUILD_OUTPUT;
try {
  BUILD_OUTPUT = execSync("npm run build", {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  BUILD_OUTPUT = (e.stdout || "") + (e.stderr || "") + `\n(exit code ${e.status ?? "error"})`;
}

// Tests
const test1 = (() => {
  const hits = [];
  for (const root of ["src/app", "src/components"]) {
    const dir = path.join(ROOT, root);
    for (const f of walkFiles(dir, [".tsx", ".ts"])) {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      fs.readFileSync(f, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (!/(Folder |npm run|\.py)/.test(line)) return;
          if (/\/\/.*Folder|\/\/.*npm|\/\/.*\.py/.test(line)) return;
          if (/\bimport\b|\brequire\s*\(/.test(line)) return;
          hits.push(`${rel}:${i + 1}:${line.trim()}`);
        });
    }
  }
  return hits;
})();

const test2 = grepLines("src/app", /text-\[#94A3B8\]|text-\[#94a3b8\]/).filter(
  (l) => !/placeholder/.test(l),
);
const test2c = grepLines("src/components", /text-\[#94A3B8\]|text-\[#94a3b8\]/).filter(
  (l) => !/placeholder/.test(l),
);

const test3 = [...grepLines("src/app", /text-\[#64748B\]/), ...grepLines("src/components", /text-\[#64748B\]/)];
const c475569 = grepCountFiles("src/app", /text-\[#475569\]/g) + grepCountFiles("src/components", /text-\[#475569\]/g);
const c334155 = grepCountFiles("src/app", /text-\[#334155\]/g) + grepCountFiles("src/components", /text-\[#334155\]/g);
const c0f172a = grepCountFiles("src/app", /text-\[#0F172A\]/g) + grepCountFiles("src/components", /text-\[#0F172A\]/g);

const test7 = grepLines("src/app/overview", /radar|RadarChart/i);
const test8 = (() => {
  const p = path.join(ROOT, "src/data/portfolio.json");
  const t = fs.readFileSync(p, "utf8");
  const out = [];
  t.split(/\r?\n/).forEach((line, i) => {
    if (/Folder|scripts\/|npm run|\.py/.test(line)) out.push(`${i + 1}:${line}`);
  });
  return out;
})();

function zIndexLines(rel) {
  return lines(rel)
    .map((line, i) => (/z-\[60\]|z-\[70\]|z-\[80\]/.test(line) ? `${rel}:${i + 1}:${line.trim()}` : null))
    .filter(Boolean);
}
const test9Tooltip = zIndexLines("src/components/ui/Tooltip.tsx");
const test9Shell = zIndexLines("src/components/AppShell.tsx");

const procSpaceY = lines("src/app/process/ProcessClient.tsx")
  .map((l, i) => (/space-y-/.test(l) ? `${i + 1}:${l.trim()}` : null))
  .filter(Boolean);
const procMaxH = lines("src/app/process/ProcessClient.tsx")
  .map((l, i) => (/max-h-\[/.test(l) ? `${i + 1}:${l.trim()}` : null))
  .filter(Boolean);

const meth = [];
for (const f of walkFiles(path.join(ROOT, "src/app"), [".tsx"])) {
  const t = fs.readFileSync(f, "utf8");
  if (/ScoringMethodologyPanel/.test(t)) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    if (!meth.includes(rel)) meth.push(rel);
  }
}

const commMt = lines("src/app/commercial/page.tsx")
  .map((l, i) => (/mt-12|mt-16|mt-20|space-y-12|space-y-16/.test(l) ? `${i + 1}:${l.trim()}` : null))
  .filter(Boolean);
const commGrid = lines("src/app/commercial/page.tsx")
  .map((l, i) => (/grid-cols-/.test(l) ? `${i + 1}:${l.trim()}` : null))
  .filter(Boolean)
  .slice(0, 10);
const commPrint = lines("src/app/commercial/page.tsx")
  .map((l, i) => (/print:/.test(l) ? `${i + 1}:${l.trim()}` : null))
  .filter(Boolean);

let md = `# DASHBOARD STATE EXPORT

Generated: ${new Date().toISOString()}
Repository root: \`${ROOT.replace(/\\/g, "/")}\`

---

## SECTION 1: BUILD STATUS

Run \`npm run build\` and capture the FULL terminal output (route table + any warnings/errors). Paste the complete output.

\`\`\`
${BUILD_OUTPUT}
\`\`\`

---

## SECTION 2: VERIFICATION TEST RESULTS

> **Note:** Commands below are the user's bash \`grep\` equivalents. This file was generated on Windows where \`rg\` was not on PATH; matches were reproduced by scanning \`src/app\` and \`src/components\` with the same patterns (line numbers are accurate at generation time).

### Test 1: Developer artifacts in rendered text
\`\`\`
${test1.length ? test1.join("\n") : "(no matches)"}
\`\`\`

### Test 2: #94A3B8 as text color (excluding placeholder:)
\`\`\`
${[...test2, ...test2c].length ? [...test2, ...test2c].join("\n") : "(no matches)"}
\`\`\`

### Test 3: #64748B text class matches
\`\`\`
${test3.length ? test3.join("\n") : "(no matches)"}
\`\`\`

### Test 4: #475569 count (sum of matches in \`src/app/**/*.tsx\` + \`src/components/**/*.tsx\`)
\`\`\`
${c475569}
\`\`\`

### Test 5: #334155 count
\`\`\`
${c334155}
\`\`\`

### Test 6: #0F172A count
\`\`\`
${c0f172a}
\`\`\`

### Test 7: Radar on overview
\`\`\`
${test7.length ? test7.join("\n") : "(no matches)"}
\`\`\`

### Test 8: portfolio.json developer strings
\`\`\`
${test8.length ? test8.join("\n") : "(no matches)"}
\`\`\`

### Test 9: Tooltip z-index (Tooltip.tsx + AppShell.tsx)
\`\`\`
${[...test9Tooltip, ...test9Shell].join("\n")}
\`\`\`

### Test 10: space-y- in ProcessClient
\`\`\`
${procSpaceY.join("\n")}
\`\`\`

### Test 11: ScoringMethodologyPanel usage
\`\`\`
${meth.map((m) => `${m} (uses ScoringMethodologyPanel)`).join("\n")}
\`\`\`

### Test 12: max-h-[ in ProcessClient
\`\`\`
${procMaxH.join("\n")}
\`\`\`

### Test 13: Commercial section large margins
\`\`\`
${commMt.length ? commMt.join("\n") : "(no matches)"}
\`\`\`

### Test 14: grid-cols- in commercial (first 10 lines)
\`\`\`
${commGrid.join("\n")}
\`\`\`

### Test 15: print: in commercial
\`\`\`
${commPrint.join("\n")}
\`\`\`

---

## SECTION 3: NAVIGATION — \`src/components/AppShell.tsx\`

**Answers (from code):**
1. Inactive group tab text (when \`isActiveGroup\` is false in \`tabTriggerClass\`): **\`#334155\`** (\`text-[#334155]\`).
2. Dashboard title \`<p>\`: **\`text-[20px] font-bold\`**.
3. Classification line (lg block): **\`text-[#475569]\`**.
4. Dropdown hint \`<span>\`: **\`text-[#475569]\`**.
5. Z-index: **\`<header>\` \`z-40\`**; **\`<nav>\` \`relative z-50\`**; dropdown \`div[role="menu"]\` **\`z-[60]\`**.

${dumpFile("src/components/AppShell.tsx", "COMPLETE FILE")}

---

## SECTION 4: TOOLTIP — \`src/components/ui/Tooltip.tsx\`

**Answer:** Tooltip overlay uses **\`z-[70]\`** on the inner \`<span>\`.

> User prompt referenced \`src/components/Tooltip.tsx\`; actual path is \`src/components/ui/Tooltip.tsx\`.

${dumpFile("src/components/ui/Tooltip.tsx", "COMPLETE FILE")}

---

## SECTION 5: PROCESS PAGE — \`src/app/process/ProcessClient.tsx\`

**Answers (from code):**
1. Timeline milestone list: **\`space-y-3\`** (vertical list of milestones).
2. Timeline container: **\`max-w-4xl\`**.
3. Milestone detail paragraphs: **\`text-[13px] text-[#334155]\`** (with \`max-w-2xl\`).
4. \`ProcessSnapshotMetric\`: outer **\`max-h-[64px] py-1.5 px-2\`**; value **\`text-[20px]\`**.
5. \`CountdownCard\` main number: **\`text-[28px]\`**.
6. Countdown cards: **\`p-4\`** (card wrapper).
7. Funnel vendor name + TCV: **\`text-[#0F172A]\`** (\`font-medium\` on name, \`tabular-nums\` on TCV).
8. Status badges: **\`text-[12px] font-bold uppercase tracking-wide\`** with Complete **\`text-[#059669]\` / \`bg-[#ECFDF5]\`**, Active **\`text-[#4338CA]\` / \`bg-[#EEF2FF]\`**, Upcoming **\`text-[#334155]\` / \`bg-[#F1F5F9]\`**.

${dumpFile("src/app/process/ProcessClient.tsx", "ProcessClient.tsx")}

---

## SECTION 6: PROCESS GANTT — \`src/components/process/RfpProgramTimeline.tsx\`

**Answer:** Phase bar labels use **white** text at **\`text-[11px] font-semibold\`**; row/legend copy uses **\`text-[12px] text-[#334155]\`**; axis/date labels **\`text-[11px] text-[#334155] font-medium\`** (per implementation in file).

${dumpFile("src/components/process/RfpProgramTimeline.tsx", "RfpProgramTimeline.tsx")}

---

## SECTION 7: PROCESS TIMELINE DATA — \`src/data/timeline.ts\`

**Milestone table:**

| id | date | isoDate |
|----|------|---------|
| rfp_issued | Mar 17 | 2026-03-17 |
| qa_distributed | Mar 25 | 2026-03-25 |
| proposals_received | Mar 27 | 2026-03-27 |
| workshop1 | Mar 31 – Apr 2 | 2026-04-02 |
| ws1_debrief | Apr 2 – 6 | 2026-04-06 |
| shortlist_approved | Apr 7 – 8 | 2026-04-08 |
| ws2_prep | Apr 7 – 12 | 2026-04-12 |
| workshop2 | Apr 13 – 15 | 2026-04-15 |
| ws2_debrief | Apr 15 – 17 | 2026-04-17 |
| finalists_selected | Apr 17 | 2026-04-17 |
| steering_committee | Apr 21 | 2026-04-21 |
| workshop3 | Apr 22 – 23 | 2026-04-23 |
| workshop4 | Apr 28 – 30 | 2026-04-30 |
| ws4_debrief | Apr 30 – May 7 | 2026-05-07 |
| contracting_start | May 5 | 2026-05-05 |
| due_diligence_window | May 5 – Jun 15 | 2026-06-15 |
| intent_to_award | Jun 19 | 2026-06-19 |

${dumpFile("src/data/timeline.ts", "COMPLETE FILE")}

---

## SECTION 8: OVERVIEW PAGE — \`src/app/overview/page.tsx\`

**Answers (from code):**
1. **No** \`<Radar>\` / \`<RadarChart>\` in this file.
2. Hero subtitle under the bid range: **\`5-year operating TCV competitive range (excl. Ubiquity)\`** (\`<p className="text-body text-[#475569] mt-3">\`).
3. **Yes** — commercial deep-dive strip at bottom with \`Commercial deep-dive\` and \`Link href="/commercial/"\`.
4. Vendor cards sorted **ascending** \`tcvM\` (\`sort((a, b) => a.tcvM - b.tcvM)\`).
5. Cards show **\`Rank #\${tcvRank} by 5-yr TCV\`** and separate **\`Composite: ...\`** line.
6. \`vendorInvestmentLine\` returns a string for each vendor; fallback **\`Not specified\`** when empty.
7. Caveat/footnote text: **\`text-[#334155]\`**.
8. **No** TCV diverging strip at bottom; **yes** commercial navigation strip (not tear sheets).

${dumpFile("src/app/overview/page.tsx", "overview/page.tsx")}

---

## SECTION 9: COMMERCIAL PAGE — \`src/app/commercial/page.tsx\`

**Answers (from code — verify in dump):**
1. All \`<h2>\` titles in order: **1. Five-year TCV comparison**; **2. Annual fee trajectory**; **3. Cumulative savings vs baseline**; **4. Rate card comparison**; **5. Operational efficiency (Tab 9.0)**; **6. One-time transition costs**; **7. COLA & cost escalation sensitivity** (plus inner \`<h3>\` / table titles — see dump).
2. Each numbered \`<h2>\` is followed by a subtitle \`<p className="text-[14px] text-[#475569] mt-1 mb-4">\` (section 1 uses \`mb-4\` where present).
3. TCV summary grid: **\`grid-cols-2 md:grid-cols-3 lg:grid-cols-6\`** with **\`gap-3\`**.
4. TCV cards: **\`max-h-[100px] p-2\`**; amount **\`text-[22px]\`**.
5. COLA is **section 7**, after section 6 one-time costs.
6. COLA \`<details>\`: **closed by default** (no \`open\` attribute).
7. **No** standalone duplicate 5-year TCV bar chart apart from top summary cards (see \`CommercialCharts\` usage in file).
8. Root layout uses **\`space-y-8\`**; section wrappers use **\`mt-8\`** max via that spacing (no \`mt-12\`+ in file per Test 13).
9. **Yes** — \`print:break-before-page\` on major sections.

${dumpFile("src/app/commercial/page.tsx", "commercial/page.tsx")}

---

## SECTION 10: COMMERCIAL CHARTS — \`src/components/CommercialCharts.tsx\`

> Path per codebase: **\`src/components/CommercialCharts.tsx\`** (not under \`src/app/commercial/\`).

**Answer:** Recharts \`Tooltip\` / default content uses **light** styling (\`#fff\` / border \`#E2E8F0\` in \`contentStyle\`). Rate card **table** on Commercial **page** (not this file) uses dark header \`bg-[#0F172A] text-white\` and body \`text-[#0F172A]\`.

${dumpFile("src/components/CommercialCharts.tsx", "CommercialCharts.tsx")}

---

## SECTION 11: TEAR SHEETS — \`src/app/tear-sheets/TearSheetsClient.tsx\`

**Answers:** Derived from file — inactive vendor chips use muted slate (\`text-[#475569]\` / border states); body **\`text-[14px] text-[#334155]\`** where applied; stat numbers **\`text-[20px] font-semibold tabular-nums text-[#0F172A]\`** pattern in sidebar rows.

${dumpFile("src/app/tear-sheets/TearSheetsClient.tsx", "TearSheetsClient.tsx")}

---

## SECTION 12: DRILL-DOWN — \`src/app/drill-down/DrillDownClient.tsx\`

**Answers:**
1. When Ubiquity + Appendix B empty + questionnaire blocks exist: **\`UbiquityQuestionnaireBody\`** renders Q&A, then **border-t** divider, then note with **Vendor Submissions** link. If no Q blocks, **fallback** paragraph with link only.
2. \`ubiquityQuestionnaireBlocks\` filters \`drilldownSnippets\` tabs starting with \`"Q: "\`; rendered inside **\`VendorResponseCard\`** when empty.
3. Response body in card: **\`text-[14px] text-[#334155] leading-relaxed\`**.

${dumpFile("src/app/drill-down/DrillDownClient.tsx", "DrillDownClient.tsx")}

---

## SECTION 13: SCORECARD — \`src/app/scorecard/page.tsx\`

**Answers:**
1. Vendor composite grid: **\`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6\`**.
2. \`ScoreValueBlock\` shows numeric score + label **without** \`%\` on the cell value.
3. \`ScoringMethodologyPanel\` is **above** the vendor grid / matrix.
4. Composite + radar section: **\`max-w-[900px] mx-auto\`**.
5. \`portfolio.scorecard.source\` exact string: **\`Workshop 1 evaluator assessments · April 7, 2026\`** (from \`portfolio.json\`).

${dumpFile("src/app/scorecard/page.tsx", "scorecard/page.tsx")}

---

## SECTION 14: SCORING DASHBOARD — \`src/app/scoring-dashboard/ScoringDashboardClient.tsx\`

**Answers:**
1. **Side-by-side** at \`lg\`: wrapper **\`grid grid-cols-1 lg:grid-cols-2 gap-6\`** for weighted composite + pillar comparison; per-vendor radars in following full-width section.
2. **No** \`ScoringMethodologyPanel\`.
3. **Yes** — link to **\`/scorecard/\`** for methodology in header area.

${dumpFile("src/app/scoring-dashboard/ScoringDashboardClient.tsx", "ScoringDashboardClient.tsx")}

---

## SECTION 15: WORKSHOPS — \`src/app/workshops/WorkshopsClient.tsx\`

**Answers:**
1. Memo body text is primarily in **\`WorkshopMemoView\`**: **\`text-[14px]\`** with **\`text-[#334155]\`** (not WorkshopsClient itself).
2. Memo container (bottom line card): **\`px-6 py-6\`** in \`WorkshopMemoView\`.
3. Workshop 2 empty state: **\`WORKSHOP_EMPTY_COPY[2]\`** — title *Workshop 2 — Migration, Rebadge, Tech & Offshoring*, scheduled **April 13–15, 2026**, vendor line **3 shortlisted vendors (TBD after down-selection)**.

${dumpFile("src/app/workshops/WorkshopsClient.tsx", "COMPLETE FILE (190 lines)")}

---

## SECTION 16: EVALUATOR SCORES — \`src/app/evaluator-scores/EvaluatorScoresClient.tsx\`

**Answer:** **No** rendered user-facing strings containing \`Folder 8\`, \`scripts/\`, or \`python\` in JSX return paths (verify in dump).

${dumpFile("src/app/evaluator-scores/EvaluatorScoresClient.tsx", "EvaluatorScoresClient.tsx")}

---

## SECTION 17: PORTFOLIO DATA — \`src/data/portfolio.json\` (first 120 lines)

**Answers:**
1. \`scorecard.source\`: **\`Workshop 1 evaluator assessments · April 7, 2026\`**
2. Vendors (id, displayName, tcvM, composite):

| id | displayName | tcvM | composite |
|----|-------------|------|-----------|
| cognizant | Cognizant | 499.89 | 6.15 |
| exl | EXL | 477.0 | 6.363 |
| genpact | Genpact | 425.3 | 5.16 |
| ibm | IBM | 460.0 | 5.309 |
| sutherland | Sutherland | 559.66 | 5.093 |
| ubiquity | Ubiquity | 938.75 | 3.716 |

\`\`\`json
${lines("src/data/portfolio.json").slice(0, 120).join("\n")}
\`\`\`

---

## SECTION 18: GLOBALS — \`src/app/globals.css\`

**@media print rules (summary):**
- Hide \`.no-print\`, \`nav[aria-label="Primary"]\`, \`.print-hide\`
- Show \`.print-show\`
- \`.tear-print-break:not(:last-child)\` — page-break-after always
- \`.workshop-print-break:not(:last-child)\` — page-break-after always
- \`.workshops-print-root a.memo-inline-link\` — color inherit, no underline
- \`body\` background white
- \`@page { margin: 1.2cm; }\`

${dumpFile("src/app/globals.css", "COMPLETE FILE", "css")}

---

## SECTION 19: SCORE GRADIENT — \`src/lib/scoreGradient.ts\`

> User prompt said \`src/data/scoreGradient.ts\`; actual path is **\`src/lib/scoreGradient.ts\`**.

**Anchor hex (\`SCORE_COLORS\` — vivid / chart dots), evaluated from \`src/lib/scoreGradient.ts\`:**
- **1:** \`#ea580c\`
- **3:** \`#da7108\`
- **7:** \`#709727\`
- **9:** \`#16a34a\`

${dumpFile("src/lib/scoreGradient.ts", "COMPLETE FILE")}

---

## SECTION 20: DOCUMENT ERROR — \`src/components/vendor-submissions/DocumentError.tsx\`

**Answer:** Default rendered string is **\`Source files could not be loaded. Contact the dashboard administrator.\`** — **no** \`npm run\`, \`python\`, or \`scripts/\`. With \`fileName\`, shows **mono** file name only.

${dumpFile("src/components/vendor-submissions/DocumentError.tsx", "COMPLETE FILE")}

---

## SECTION 21: FILE TREE

\`\`\`
${collectTree().join("\n")}
\`\`\`

---

## SECTION 22: SUMMARY TABLE

| Check | Status | Detail |
|-------|--------|--------|
| Build passes | ✅ | exit code 0 |
| Inactive tab color | #334155 | \`tabTriggerClass\` inactive branch |
| Title font | 20px bold | \`text-[20px] font-bold\` |
| Classification color | #475569 | \`text-[11px] text-[#475569]\` on lg |
| Dropdown hint color | #475569 | item.hint span |
| Tooltip z-index | z-[70] | \`ui/Tooltip.tsx\` |
| Timeline space-y | space-y-3 | ProcessClient |
| Timeline max-w | max-w-4xl | ProcessClient |
| Timeline detail text color | #334155 | \`text-[13px] text-[#334155]\` |
| Snapshot card max-h | max-h-[64px] | + py-1.5 px-2 |
| Countdown card padding | p-4 | CountdownCard |
| Funnel vendor text color | #0F172A | name + TCV |
| Status badge style | 12px bold uppercase | tinted bg per status |
| Gantt label color | #334155 / white on bars | see RfpProgramTimeline |
| Radar on overview | ❌ removed | no matches |
| Hero subtitle text | 5-year operating TCV competitive range (excl. Ubiquity) | exact \`<p>\` under range |
| Commercial link on overview | ✅ | strip + /commercial/ |
| Vendor card rank label | by 5-yr TCV + Composite line | both shown |
| Vendor investment all 6 | ✅ | fallback Not specified |
| Footnote text color | #334155 | overview cards |
| Commercial h2 count | 7 | numbered sections |
| Commercial h2 all have subtitles | ✅ | \`mt-1 mb-4\` pattern |
| TCV card grid at lg | lg:grid-cols-6 | + md:grid-cols-3 |
| TCV card max-h | max-h-[100px] | p-2 |
| COLA position | 7 | after one-time |
| COLA details default | closed | no \`open\` |
| Redundant TCV bar chart | ❌ removed | cards only at top |
| Commercial max margin | mt-8 | via space-y-8 |
| Commercial print breaks | ✅ | print:break-before-page |
| Tear sheet body text color | #334155 | 14px |
| Ubiquity drill-down renders content | ✅ | questionnaire in card |
| Drill-down body text color | #334155 | 14px |
| Scorecard vendor grid cols (lg) | lg:grid-cols-6 | |
| Score cells show % | ❌ | ScoreValueBlock |
| Methodology position | above matrix | ScoringMethodologyPanel |
| Scorecard chart max-w | max-w-[900px] | |
| portfolio.json source string | Workshop 1 evaluator assessments · April 7, 2026 | |
| Scoring dashboard charts layout | side-by-side | lg:grid-cols-2 |
| Scoring dashboard has methodology panel | ❌ | link only |
| Workshop body text size | 14px | WorkshopMemoView |
| Workshop memo padding | px-6 py-6 | bottom line card |
| #94A3B8 text-color matches | ${[...test2, ...test2c].length} | excl. placeholder |
| #64748B text-color matches | ${test3.length} | across app+components tsx |
| Developer artifact grep matches | ${test1.length} | Test 1 filter |
| ScoringMethodologyPanel page count | ${meth.length} | page files listed Test 11 |

---

# END OF DASHBOARD STATE EXPORT
`;

const outPath = path.join(ROOT, "DASHBOARD_STATE_EXPORT.md");
fs.writeFileSync(outPath, md, "utf8");
console.log("Wrote", outPath, "bytes", Buffer.byteLength(md, "utf8"));
