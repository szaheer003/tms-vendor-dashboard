/**
 * Single-file stakeholder HTML: inlined data, file:// safe, no fetch().
 * Run: node scripts/build-stakeholder-review.mjs
 * Output: TMS_RFP_Intelligence_Center_Review.html (repo root)
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DATA = join(ROOT, "src", "data");

const SUB_TO_PILLAR = {
  "1.1": "commercial",
  "1.2": "commercial",
  "1.3": "commercial",
  "2.1": "operations",
  "2.2": "operations",
  "2.3": "operations",
  "3.1": "technology",
  "3.2": "technology",
  "3.3": "technology",
  "4.1": "migration",
  "4.2": "migration",
  "4.3": "migration",
  "5.1": "partnership",
  "5.2": "partnership",
  "5.3": "partnership",
};

const WEIGHTS = {
  commercial: 0.225,
  operations: 0.225,
  technology: 0.225,
  migration: 0.225,
  partnership: 0.1,
};

const EVALUATOR_IDS = Array.from({ length: 12 }, (_, i) => `ev${i + 1}`);
const VENDOR_IDS = ["cognizant", "genpact", "exl", "ibm", "sutherland", "ubiquity"];

const FLAT_SCORED_SUBS = [
  { pillarKey: "Q12", pillarLabel: "Commercial Attractiveness", weight: 0.225, id: "1.1", label: "Synergy alignment" },
  { pillarKey: "Q12", pillarLabel: "Commercial Attractiveness", weight: 0.225, id: "1.2", label: "Efficiency assumptions & certainty" },
  { pillarKey: "Q12", pillarLabel: "Commercial Attractiveness", weight: 0.225, id: "1.3", label: "Investments, transparency & savings protection" },
  { pillarKey: "Q9", pillarLabel: "Operational Excellence", weight: 0.225, id: "2.1", label: "SLA commitment level" },
  { pillarKey: "Q9", pillarLabel: "Operational Excellence", weight: 0.225, id: "2.2", label: "Language, coverage & compliance" },
  { pillarKey: "Q9", pillarLabel: "Operational Excellence", weight: 0.225, id: "2.3", label: "Delivery model credibility" },
  { pillarKey: "Q10", pillarLabel: "Technology & AI", weight: 0.225, id: "3.1", label: "Tech governance compliance" },
  { pillarKey: "Q10", pillarLabel: "Technology & AI", weight: 0.225, id: "3.2", label: "Migration plan specificity" },
  { pillarKey: "Q10", pillarLabel: "Technology & AI", weight: 0.225, id: "3.3", label: "AI overlay innovation & impact" },
  { pillarKey: "Q11", pillarLabel: "Client & Workforce Migration", weight: 0.225, id: "4.1", label: "Wave composition & constraint compliance" },
  { pillarKey: "Q11", pillarLabel: "Client & Workforce Migration", weight: 0.225, id: "4.2", label: "Sequencing, speed & revenue pace" },
  { pillarKey: "Q11", pillarLabel: "Client & Workforce Migration", weight: 0.225, id: "4.3", label: "Workforce transition safeguards" },
  { pillarKey: "Q8", pillarLabel: "Partnership Readiness", weight: 0.1, id: "5.1", label: "Reference & case study alignment" },
  { pillarKey: "Q8", pillarLabel: "Partnership Readiness", weight: 0.1, id: "5.2", label: "Operational depth & geographic reach" },
  { pillarKey: "Q8", pillarLabel: "Partnership Readiness", weight: 0.1, id: "5.3", label: "Contracting posture" },
];

function readJson(rel) {
  const p = join(SRC_DATA, rel);
  if (!existsSync(p)) throw new Error(`Missing ${p}`);
  return JSON.parse(readFileSync(p, "utf8"));
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function patchPortfolioFromEvaluatorScores(portfolio, ev) {
  if (!ev || typeof ev.scores !== "object" || !ev.scores) return;
  const sm = ev.scores;
  const sc = portfolio.scorecard || {};
  let colOrder = Array.isArray(sc.columnOrder) ? [...sc.columnOrder] : [];
  if (!colOrder.length) colOrder = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"];
  const nSlots = Number(ev.evaluatorSlotCount || 12) || 12;
  const dims = sc.dimensions || [];
  const dimAvgs = {};

  for (const d of dims) {
    const sid = d.id;
    if (!sid || typeof sid !== "string") continue;
    dimAvgs[sid] = {};
    for (const vid of colOrder) {
      const vals = [];
      for (let i = 0; i < nSlots; i++) {
        const ekey = `ev${i + 1}`;
        const row = (sm[vid] || {})[ekey] || {};
        const x = row[sid];
        if (x != null && typeof x === "number" && Number.isFinite(x)) vals.push(x);
      }
      dimAvgs[sid][vid] = vals.length ? Math.round(mean(vals) * 1000) / 1000 : null;
    }
    d.scores = Object.fromEntries(colOrder.map((vid) => [vid, dimAvgs[sid][vid]]));
  }

  const pillarAvgs = {};
  for (const pk of Object.keys(WEIGHTS)) pillarAvgs[pk] = {};
  for (const vid of colOrder) {
    for (const pk of Object.keys(WEIGHTS)) {
      const subs = Object.entries(SUB_TO_PILLAR)
        .filter(([, p]) => p === pk)
        .map(([s]) => s);
      const nums = subs.map((s) => dimAvgs[s]?.[vid]).filter((x) => x != null && Number.isFinite(x));
      pillarAvgs[pk][vid] = nums.length ? Math.round(mean(nums) * 1000) / 1000 : null;
    }
  }

  const composite = {};
  for (const vid of colOrder) {
    let acc = 0;
    let tw = 0;
    for (const [pk, w] of Object.entries(WEIGHTS)) {
      const pav = pillarAvgs[pk][vid];
      if (pav != null) {
        acc += w * pav;
        tw += w;
      }
    }
    composite[vid] = tw > 0 ? Math.round((acc / tw) * 1000) / 1000 : null;
  }

  portfolio.scorecard = sc;
  portfolio.scorecard.composite = composite;
  if (ev.source) {
    let src = String(ev.source);
    if (ev.importedAt) src += ` · Imported ${String(ev.importedAt).slice(0, 10)}.`;
    portfolio.scorecard.source = src;
  }

  for (const v of portfolio.vendors || []) {
    const vid = v.id;
    if (typeof vid === "string" && vid in composite) v.composite = composite[vid];
  }

  function scaleRadar(x) {
    if (x == null) return 0;
    return Math.max(0, Math.min(10, ((Number(x) - 1) / 8) * 10));
  }

  const fieldSum = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0]));
  const fieldN = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0]));
  for (const vid of colOrder) {
    for (const pk of Object.keys(WEIGHTS)) {
      const pv = pillarAvgs[pk][vid];
      if (pv != null) {
        fieldSum[pk] += scaleRadar(pv);
        fieldN[pk] += 1;
      }
    }
  }
  portfolio.radar = portfolio.radar || {};
  portfolio.radar.fieldAverage = Object.fromEntries(
    Object.keys(WEIGHTS).map((k) => [k, fieldN[k] ? Math.round((fieldSum[k] / fieldN[k]) * 1000) / 1000 : 0]),
  );
  for (const rv of portfolio.radar.vendors || []) {
    const vid = rv.vendorId;
    if (typeof vid !== "string") continue;
    rv.pillars = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, scaleRadar(pillarAvgs[k][vid])]));
  }
}

function emptyScores() {
  const m = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) {
      m[vid][eid] = {};
      for (const sub of FLAT_SCORED_SUBS) m[vid][eid][sub.id] = null;
    }
  }
  return m;
}

function emptyQualitative() {
  const m = {};
  const qs = ["Q3", "Q4", "Q5", "Q6", "Q7"];
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) {
      m[vid][eid] = {};
      for (const q of qs) m[vid][eid][q] = "";
    }
  }
  return m;
}

function emptyConfidence() {
  const m = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) m[vid][eid] = null;
  }
  return m;
}

function emptyProceed() {
  const m = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) m[vid][eid] = null;
  }
  return m;
}

function mergeEvaluatorScoresPayload(raw) {
  const scores = emptyScores();
  const qualitative = emptyQualitative();
  const confidence = emptyConfidence();
  const proceed = emptyProceed();

  if (raw?.scores) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const patch = raw.scores[vid]?.[eid];
        if (patch) Object.assign(scores[vid][eid], patch);
      }
    }
  }
  if (raw?.qualitative) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const patch = raw.qualitative[vid]?.[eid];
        if (patch) Object.assign(qualitative[vid][eid], patch);
      }
    }
  }
  if (raw?.confidence) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const v = raw.confidence[vid]?.[eid];
        if (v !== undefined) confidence[vid][eid] = v;
      }
    }
  }
  if (raw?.proceed) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const v = raw.proceed[vid]?.[eid];
        if (v !== undefined) proceed[vid][eid] = v;
      }
    }
  }

  const importNote = [raw?.source, raw?.importedAt ? `Imported ${String(raw.importedAt).slice(0, 10)}` : null]
    .filter(Boolean)
    .join(" · ");

  return { scores, qualitative, confidence, proceed, importNote: importNote || null };
}

function scriptSafeJson(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

async function loadTsModules() {
  const timelineUrl = pathToFileURL(join(ROOT, "src/data/timeline.ts")).href;
  const rfpUrl = pathToFileURL(join(ROOT, "src/data/rfpProgramTimeline.ts")).href;
  const drillUrl = pathToFileURL(join(ROOT, "src/lib/drillSubTabs.ts")).href;
  const tearUrl = pathToFileURL(join(ROOT, "src/lib/tearSheets.ts")).href;

  const [timeline, rfp, drill, tear] = await Promise.all([
    import(timelineUrl),
    import(rfpUrl),
    import(drillUrl),
    import(tearUrl),
  ]);

  return {
    MILESTONES: timeline.MILESTONES,
    WORKSHOP_EMPTY_COPY: timeline.WORKSHOP_EMPTY_COPY,
    WORKSHOP_AGENDA: timeline.WORKSHOP_AGENDA,
    EVALUATOR_SCORES_TARGET_LINE: timeline.EVALUATOR_SCORES_TARGET_LINE,
    RFP_PROGRAM_PHASES: rfp.RFP_PROGRAM_PHASES,
    RFP_PROGRAM_ROWS: rfp.RFP_PROGRAM_ROWS,
    RFP_PROGRAM_RANGE_START: rfp.RFP_PROGRAM_RANGE_START,
    RFP_PROGRAM_RANGE_END: rfp.RFP_PROGRAM_RANGE_END,
    DRILL_SUB_TABS: drill.DRILL_SUB_TABS,
    TEAR_SHEETS: tear.TEAR_SHEETS,
  };
}

function milestonesChronological(milestones) {
  const order = new Map(milestones.map((m, i) => [m.id, i]));
  return [...milestones].sort((a, b) => {
    const ta = new Date(a.isoDate).getTime();
    const tb = new Date(b.isoDate).getTime();
    if (ta !== tb) return ta - tb;
    return (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999);
  });
}

function daysUntil(isoDate, now) {
  const end = new Date(isoDate);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function nextCountdownMilestones(milestones, now, limit) {
  const open = milestones.filter((m) => m.status === "active" || m.status === "upcoming");
  return milestonesChronological(open).slice(0, limit);
}

/** Precompute countdown card helpers for runtime (fixed build date = export time). */
function buildTimelineHelpers(milestones) {
  const now = new Date();
  const chrono = milestonesChronological(milestones);
  const countdown = nextCountdownMilestones(milestones, now, 3);
  const shortlist = milestones.find((m) => m.id === "shortlist_approved");
  return {
    builtAtIso: now.toISOString(),
    countdownMilestoneIds: countdown.map((m) => m.id),
    shortlistDaysRemaining: shortlist ? daysUntil(shortlist.isoDate, now) : null,
    milestonesChronoIds: chrono.map((m) => m.id),
  };
}

async function main() {
  const portfolio = readJson("portfolio.json");
  let evaluatorRaw = null;
  try {
    evaluatorRaw = readJson("evaluatorScores.json");
  } catch {
    evaluatorRaw = null;
  }
  patchPortfolioFromEvaluatorScores(portfolio, evaluatorRaw);

  const vendors = {};
  for (const row of portfolio.vendors || []) {
    const vid = row.id;
    if (!vid) continue;
    vendors[vid] = readJson(`vendor_${vid}.json`);
  }

  const manifest = readJson("vendor-files-manifest.json");
  let workshop1Memos = null;
  let idealRfp = null;
  try {
    workshop1Memos = readJson("workshop1_memos.json");
  } catch {
    workshop1Memos = null;
  }
  try {
    idealRfp = readJson("idealRfpSubmission.json");
  } catch {
    idealRfp = null;
  }

  const ts = await loadTsModules();
  const evalMerged = mergeEvaluatorScoresPayload(evaluatorRaw);

  const data = {
    portfolio,
    vendors,
    manifest,
    evaluatorScoresRaw: evaluatorRaw,
    evalMerged,
    workshop1Memos,
    idealRfpSubmission: idealRfp,
    milestones: ts.MILESTONES,
    workshopEmptyCopy: ts.WORKSHOP_EMPTY_COPY,
    workshopAgenda: ts.WORKSHOP_AGENDA,
    evaluatorScoresTargetLine: ts.EVALUATOR_SCORES_TARGET_LINE,
    rfpProgram: {
      phases: ts.RFP_PROGRAM_PHASES,
      rows: ts.RFP_PROGRAM_ROWS,
      rangeStart: ts.RFP_PROGRAM_RANGE_START,
      rangeEnd: ts.RFP_PROGRAM_RANGE_END,
    },
    drillSubTabs: ts.DRILL_SUB_TABS,
    tearSheets: ts.TEAR_SHEETS,
    flatScoredSubs: FLAT_SCORED_SUBS,
    timelineHelpers: buildTimelineHelpers(ts.MILESTONES),
  };

  const runtimePath = join(__dirname, "stakeholder-review-runtime.js");
  const runtimeJs = readFileSync(runtimePath, "utf8");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TMS RFP Intelligence Center — FIS × Total Issuing Solutions</title>
  <style>
    /* No-JS: all sections scroll; nav hidden. SPA: single section + dropdown nav. */
    .spa-mode .degrade-toc { display: none !important; }
    .spa-mode .page-section { display: none !important; }
    .spa-mode .page-section.is-active { display: block !important; }
    .spa-mode .hdr-nav-wrap { display: flex !important; }
    .hdr-nav-wrap { display: none; }
    .page-section { display: block; margin-bottom: 48px; }
    :root {
      --color-primary: #0F172A;
      --color-secondary: #475569;
      --color-tertiary: #64748B;
      --color-border: #E2E8F0;
      --color-surface: #F8FAFC;
      --color-white: #FFFFFF;
      --vendor-cognizant: #1E3A5F;
      --vendor-exl: #EA580C;
      --vendor-genpact: #059669;
      --vendor-ibm: #1E40AF;
      --vendor-sutherland: #4B5563;
      --vendor-ubiquity: #DC2626;
      --score-1: #dc2626;
      --score-3: #e4620a;
      --score-7: #579433;
      --score-9: #14532d;
      --shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
      --shadow-card: 0 4px 12px rgba(15,23,42,0.08);
      --b: #E2E8F0;
      --t: #0F172A;
      --m: #475569;
      --s: #64748B;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      background: #FFFFFF;
      color: #334155;
      min-width: 320px;
    }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    .app-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #fff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .app-header-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 20px 0;
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding-bottom: 10px;
    }
    .brand-title { font-size: 20px; font-weight: 700; color: var(--color-primary); margin: 0; }
    .brand-right { font-size: 11px; color: var(--color-secondary); text-align: right; max-width: 280px; line-height: 1.4; }
    .hdr-nav-wrap {
      border-top: 1px solid #F1F5F9;
      padding: 6px 0 0;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px 20px;
    }
    .nav-group { position: relative; }
    .nav-group-trigger {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 8px 4px 12px;
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
    }
    .nav-group-trigger:hover { color: var(--color-primary); }
    .nav-group-trigger.open, .nav-group-trigger.active-parent {
      color: var(--color-primary);
      font-weight: 600;
      border-bottom-color: var(--color-primary);
    }
    .nav-single {
      display: inline-block;
      padding: 8px 4px 12px;
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .nav-single:hover { color: var(--color-primary); }
    .nav-single.is-active {
      color: var(--color-primary);
      font-weight: 600;
      border-bottom-color: var(--color-primary);
    }
    .nav-dd {
      display: none;
      position: absolute;
      left: 0;
      top: 100%;
      margin-top: 4px;
      min-width: 280px;
      max-width: min(520px, calc(100vw - 2rem));
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(15,23,42,0.12);
      padding: 8px 0;
      z-index: 120;
    }
    .nav-dd.open { display: block; }
    .nav-dd-section-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-secondary);
      padding: 8px 16px 4px;
      margin: 0;
    }
    .nav-dd a {
      display: block;
      padding: 10px 16px 10px 19px;
      font-size: 13px;
      color: var(--color-primary);
      text-decoration: none;
      border-left: 3px solid transparent;
    }
    .nav-dd a:hover { background: var(--color-surface); }
    .nav-dd a.is-active { background: #F1F5F9; border-left-color: var(--color-primary); font-weight: 600; }
    .nav-dd-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 8px;
      padding: 0 8px 8px;
    }
    @media (max-width: 640px) {
      .nav-dd-grid { grid-template-columns: 1fr; }
    }
    main { max-width: 1280px; margin: 0 auto; padding: 28px 20px 56px; }
    h1.p-title { font-size: 26px; font-weight: 600; color: var(--color-primary); margin: 0 0 8px; }
    .p-sub { color: var(--color-secondary); max-width: 52rem; margin: 0 0 20px; font-size: 14px; }
    .card {
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 18px;
      box-shadow: var(--shadow-card);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; }
    .pill {
      border-radius: 999px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--b);
      cursor: pointer;
      background: #fff;
    }
    .meta { font-size: 11px; color: var(--color-secondary); margin-top: 6px; }
    table.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.data-table th, table.data-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #F1F5F9;
      text-align: center;
    }
    table.data-table th:first-child, table.data-table td:first-child { text-align: left; }
    table.data-table thead th { background: var(--color-surface); font-weight: 600; color: var(--m); }
    .heat {
      border-radius: 8px;
      font-weight: 600;
      padding: 6px 10px;
      display: inline-block;
      min-width: 2.5rem;
      font-variant-numeric: tabular-nums;
    }
    .ev-blank {
      height: 36px;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      background: var(--color-surface);
      margin: 0 auto;
      max-width: 88px;
    }
    .warn {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 14px 16px;
      border-radius: 10px;
      margin-bottom: 18px;
      font-size: 14px;
    }
    .bar-track {
      height: 10px;
      background: #F1F5F9;
      border-radius: 6px;
      overflow: hidden;
      flex: 1;
    }
    .bar-fill { height: 100%; border-radius: 6px; }
    .gantt-wrap { overflow-x: auto; margin-top: 12px; }
    .gantt-row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 12px; }
    .gantt-label { width: 200px; flex-shrink: 0; color: var(--m); }
    .gantt-track {
      flex: 1;
      min-width: 400px;
      height: 18px;
      background: #F8FAFC;
      border-radius: 4px;
      position: relative;
      border: 1px solid var(--b);
    }
    .gantt-bar {
      position: absolute;
      top: 2px;
      height: 14px;
      border-radius: 3px;
      opacity: 0.92;
    }
    .funnel-stage {
      border: 1px solid var(--b);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .funnel-stage.we-here { box-shadow: 0 0 0 2px #6366f1; }
    .countdown-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; }
    @media (max-width: 900px) { .countdown-grid { grid-template-columns: 1fr; } }
    .line-chart-row { display: flex; align-items: flex-end; gap: 4px; height: 140px; margin-top: 12px; }
    .line-bar {
      flex: 1;
      min-width: 0;
      border-radius: 4px 4px 0 0;
      position: relative;
    }
    .details-block summary { cursor: pointer; font-weight: 600; color: var(--color-primary); padding: 8px 0; }
    footer.app-footer {
      text-align: center;
      font-size: 12px;
      color: var(--color-secondary);
      padding: 28px 20px;
      border-top: 1px solid var(--color-border);
      line-height: 1.65;
      background: #fff;
    }
    .degrade-toc {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px 20px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--b);
      font-size: 13px;
    }
    .degrade-toc a { color: #1E40AF; margin-right: 12px; }
    @media print {
      nav, .no-print, .nav-dd, .hdr-nav-wrap, .degrade-toc, #degrade-layout { display: none !important; }
      .spa-mode .page-section, .page-section { display: block !important; page-break-inside: avoid; }
      body { font-size: 11pt; }
      .print-break { page-break-before: always; }
      .app-header { position: static; }
    }
  </style>
</head>
<body>
  <noscript>
    <div class="warn" style="margin:16px">JavaScript is required for tab navigation. Enable JavaScript to use the full dashboard.</div>
  </noscript>
  <nav class="degrade-toc no-print" aria-label="Section links (no-JS fallback)">
    <strong style="color:var(--color-primary)">All sections</strong> —
    <a href="#process">Timeline &amp; process</a>
    <a href="#overview">Overview</a>
    <a href="#workshops">Workshops</a>
    <a href="#tear-sheets">Tear sheets</a>
    <a href="#commercial">Commercial</a>
    <a href="#drill-down">Drill-down</a>
    <a href="#scorecard">Scorecard</a>
    <a href="#scoring-dashboard">Scoring dashboard</a>
    <a href="#evaluator-scores">Evaluator scores</a>
    <a href="#feedback">Feedback</a>
    <a href="#ideal-rfp-submission">Ideal RFP</a>
    <a href="#vendor-submissions">Vendor submissions</a>
    <a href="#admin">Admin</a>
    <a href="#provide-feedback">Your feedback</a>
  </nav>
  <header class="app-header">
    <div class="app-header-inner">
      <div class="header-row">
        <p class="brand-title">TMS RFP Intelligence Center</p>
        <p class="brand-right">FIS × Total Issuing Solutions · Confidential · April 2026</p>
      </div>
      <div class="hdr-nav-wrap" id="hdr-nav"></div>
    </div>
  </header>
  <main id="main-panels">
    <section class="page-section" id="section-process" data-hash="process" aria-label="Timeline and process"><div class="section-mount"></div></section>
    <section class="page-section" id="section-overview" data-hash="overview" aria-label="Overview"><div class="section-mount"></div></section>
    <section class="page-section" id="section-workshops" data-hash="workshops" aria-label="Workshops"><div class="section-mount"></div></section>
    <section class="page-section" id="section-tear-sheets" data-hash="tear-sheets" aria-label="Tear sheets"><div class="section-mount"></div></section>
    <section class="page-section" id="section-commercial" data-hash="commercial" aria-label="Commercial"><div class="section-mount"></div></section>
    <section class="page-section" id="section-drill-down" data-hash="drill-down" aria-label="Drill-down"><div class="section-mount"></div></section>
    <section class="page-section" id="section-scorecard" data-hash="scorecard" aria-label="Scorecard"><div class="section-mount"></div></section>
    <section class="page-section" id="section-scoring-dashboard" data-hash="scoring-dashboard" aria-label="Scoring dashboard"><div class="section-mount"></div></section>
    <section class="page-section" id="section-evaluator-scores" data-hash="evaluator-scores" aria-label="Evaluator scores"><div class="section-mount"></div></section>
    <section class="page-section" id="section-feedback" data-hash="feedback" aria-label="Feedback"><div class="section-mount"></div></section>
    <section class="page-section" id="section-ideal-rfp-submission" data-hash="ideal-rfp-submission" aria-label="Ideal RFP submission"><div class="section-mount"></div></section>
    <section class="page-section" id="section-vendor-submissions" data-hash="vendor-submissions" aria-label="Vendor submissions"><div class="section-mount"></div></section>
    <section class="page-section" id="section-admin" data-hash="admin" aria-label="Admin checklist"><div class="section-mount"></div></section>
    <section class="page-section" id="section-provide-feedback" data-hash="provide-feedback" aria-label="Your feedback"><div class="section-mount"></div></section>
  </main>
  <footer class="app-footer">
    © 2026 FIS and/or its subsidiaries. All Rights Reserved. FIS confidential and proprietary information.<br>
    Data as of March 27, 2026 vendor submissions. Workshop 1 evaluator scores imported April 7, 2026.
  </footer>
  <script>window.__REVIEW_DATA__=${scriptSafeJson(data)};</script>
  <script>
  (function(){
    var el=document.getElementById('degrade-layout');
    if(el) el.parentNode.removeChild(el);
    document.body.classList.add('spa-mode');
  })();
  </script>
  <script>
${runtimeJs}
  </script>
</body>
</html>`;

  const outPath = join(ROOT, "TMS_RFP_Intelligence_Center_Review.html");
  writeFileSync(outPath, html, "utf8");
  const kb = Math.round((html.length / 1024) * 10) / 10;
  console.log(`Wrote ${outPath} (${kb} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
