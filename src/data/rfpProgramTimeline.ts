/**
 * Full 2026 RFP program timeline (phases, activities, milestones).
 * Single source of truth: TMS_RFP_Project_Timeline.xlsx — used by the Process page Gantt view.
 */

export type RfpProgramRowType = "activity" | "milestone";

export interface RfpProgramPhase {
  id: string;
  title: string;
  /** Left accent + bar fill */
  bar: string;
  /** Subtle row background */
  tint: string;
  /** Phase header background */
  headerBg: string;
}

export interface RfpProgramRow {
  id: string;
  phaseId: string;
  activity: string;
  startIso: string;
  endIso: string;
  type: RfpProgramRowType;
}

/** First / last calendar bounds for horizontal scale (inclusive visualization). */
export const RFP_PROGRAM_RANGE_START = "2026-02-01";
/** Through early July so Jun 19 milestones and late-June bars are not clipped. */
export const RFP_PROGRAM_RANGE_END = "2026-07-01";

export const RFP_PROGRAM_PHASES: RfpProgramPhase[] = [
  {
    id: "rfp_admin",
    title: "RFP administration",
    bar: "#db2777",
    tint: "rgba(219, 39, 119, 0.08)",
    headerBg: "linear-gradient(90deg, #be185d 0%, #db2777 100%)",
  },
  {
    id: "w1_eval",
    title: "Workshop 1 & evaluation",
    bar: "#16a34a",
    tint: "rgba(22, 163, 74, 0.08)",
    headerBg: "linear-gradient(90deg, #15803d 0%, #22c55e 100%)",
  },
  {
    id: "w2_path",
    title: "Workshop 2 & finalist selection",
    bar: "#65a30d",
    tint: "rgba(101, 163, 13, 0.1)",
    headerBg: "linear-gradient(90deg, #4d7c0f 0%, #84cc16 100%)",
  },
  {
    id: "steering_w3w4",
    title: "Steering committee, Workshop 3 & 4",
    bar: "#4f46e5",
    tint: "rgba(79, 70, 229, 0.09)",
    headerBg: "linear-gradient(90deg, #4338ca 0%, #6366f1 100%)",
  },
  {
    id: "contracting",
    title: "Contracting",
    bar: "#9333ea",
    tint: "rgba(147, 51, 234, 0.09)",
    headerBg: "linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)",
  },
  {
    id: "due_diligence",
    title: "Due diligence",
    bar: "#0d9488",
    tint: "rgba(13, 148, 136, 0.09)",
    headerBg: "linear-gradient(90deg, #0f766e 0%, #14b8a6 100%)",
  },
  {
    id: "business",
    title: "Business case (parallel)",
    bar: "#64748b",
    tint: "rgba(100, 116, 139, 0.08)",
    headerBg: "linear-gradient(90deg, #475569 0%, #64748b 100%)",
  },
];

export const RFP_PROGRAM_ROWS: RfpProgramRow[] = [
  // Business case (parallel)
  {
    id: "bc_pre",
    phaseId: "business",
    activity: "Build initial pre-RFP business case",
    startIso: "2026-02-15",
    endIso: "2026-02-27",
    type: "activity",
  },
  {
    id: "bc_interim",
    phaseId: "business",
    activity: "Interim business case (post-RFP)",
    startIso: "2026-03-28",
    endIso: "2026-04-24",
    type: "activity",
  },
  {
    id: "bc_cmb",
    phaseId: "business",
    activity: "Final Business Case submitted for exec approval",
    startIso: "2026-06-19",
    endIso: "2026-06-19",
    type: "milestone",
  },
  // RFP administration
  {
    id: "rfp_roles",
    phaseId: "rfp_admin",
    activity: "Align roles & responsibilities w/ Procurement",
    startIso: "2026-03-02",
    endIso: "2026-03-10",
    type: "activity",
  },
  {
    id: "rfp_draft",
    phaseId: "rfp_admin",
    activity: "Draft RFP document, appendices & SOW",
    startIso: "2026-03-02",
    endIso: "2026-03-14",
    type: "activity",
  },
  {
    id: "rfp_issued",
    phaseId: "rfp_admin",
    activity: "RFP issued to 6 vendors",
    startIso: "2026-03-17",
    endIso: "2026-03-17",
    type: "milestone",
  },
  {
    id: "rfp_qa",
    phaseId: "rfp_admin",
    activity: "Vendor Q&A responses distributed",
    startIso: "2026-03-25",
    endIso: "2026-03-25",
    type: "milestone",
  },
  {
    id: "rfp_props",
    phaseId: "rfp_admin",
    activity: "Proposals & SOW redlines received",
    startIso: "2026-03-27",
    endIso: "2026-03-27",
    type: "milestone",
  },
  {
    id: "rfp_hub",
    phaseId: "rfp_admin",
    activity: "Launch RFP Intelligence Hub",
    startIso: "2026-04-01",
    endIso: "2026-04-08",
    type: "activity",
  },
  // Workshop 1 & evaluation
  {
    id: "w1_prep",
    phaseId: "w1_eval",
    activity: "Prepare evaluation criteria, scoring, pre-workshop memos",
    startIso: "2026-03-28",
    endIso: "2026-03-31",
    type: "activity",
  },
  {
    id: "w1_sessions",
    phaseId: "w1_eval",
    activity: "Conduct Workshop 1 — 6 vendors (3 days)",
    startIso: "2026-03-31",
    endIso: "2026-04-02",
    type: "activity",
  },
  {
    id: "w1_post",
    phaseId: "w1_eval",
    activity: "Post Workshop Debrief, Scoring, Down-Selection Memo",
    startIso: "2026-04-02",
    endIso: "2026-04-06",
    type: "activity",
  },
  {
    id: "w1_shortlist",
    phaseId: "w1_eval",
    activity: "Decision Committee approves shortlist (6 → 3)",
    startIso: "2026-04-07",
    endIso: "2026-04-08",
    type: "milestone",
  },
  // Workshop 2 & finalist selection
  {
    id: "w2_prep",
    phaseId: "w2_path",
    activity: "Prepare evaluation criteria, scoring, pre-workshop memos",
    startIso: "2026-04-07",
    endIso: "2026-04-12",
    type: "activity",
  },
  {
    id: "w2_sessions",
    phaseId: "w2_path",
    activity: "Conduct Workshop 2 — 3 vendors (3 days)",
    startIso: "2026-04-13",
    endIso: "2026-04-15",
    type: "activity",
  },
  {
    id: "w2_post",
    phaseId: "w2_path",
    activity: "Post Workshop Debrief, Scoring, Down-Selection Memo",
    startIso: "2026-04-15",
    endIso: "2026-04-17",
    type: "activity",
  },
  {
    id: "w2_finalists",
    phaseId: "w2_path",
    activity: "Decision Committee selects 2 finalists (3 → 2)",
    startIso: "2026-04-17",
    endIso: "2026-04-17",
    type: "milestone",
  },
  // Steering, W3, W4
  {
    id: "steering",
    phaseId: "steering_w3w4",
    activity: "Steering Committee — approves path to award",
    startIso: "2026-04-21",
    endIso: "2026-04-21",
    type: "milestone",
  },
  {
    id: "w3_prep",
    phaseId: "steering_w3w4",
    activity: "Prepare evaluation criteria, scoring, pre-workshop memos",
    startIso: "2026-04-17",
    endIso: "2026-04-21",
    type: "activity",
  },
  {
    id: "w3_sessions",
    phaseId: "steering_w3w4",
    activity: "Conduct Workshop 3 — 2 vendors (2 days)",
    startIso: "2026-04-22",
    endIso: "2026-04-23",
    type: "activity",
  },
  {
    id: "w3_post",
    phaseId: "steering_w3w4",
    activity: "Post Workshop Debrief, Scoring, Recommendation",
    startIso: "2026-04-23",
    endIso: "2026-04-25",
    type: "activity",
  },
  {
    id: "w4_prep",
    phaseId: "steering_w3w4",
    activity: "Prepare FIS technology approach docs & WS4 memos",
    startIso: "2026-04-21",
    endIso: "2026-04-27",
    type: "activity",
  },
  {
    id: "w4_sessions",
    phaseId: "steering_w3w4",
    activity: "Conduct Workshop 4 — 2 vendors (2 days)",
    startIso: "2026-04-28",
    endIso: "2026-04-30",
    type: "activity",
  },
  {
    id: "w4_post",
    phaseId: "steering_w3w4",
    activity: "Post-WS4 tech scoring, debrief & final proposal refinements",
    startIso: "2026-04-30",
    endIso: "2026-05-07",
    type: "activity",
  },
  // Contracting
  {
    id: "c_workshops",
    phaseId: "contracting",
    activity: "Facilitate negotiation workshops (2 vendors)",
    startIso: "2026-05-05",
    endIso: "2026-05-22",
    type: "activity",
  },
  {
    id: "c_terms",
    phaseId: "contracting",
    activity: "Compile & refine deal terms",
    startIso: "2026-05-05",
    endIso: "2026-06-10",
    type: "activity",
  },
  {
    id: "c_ratify",
    phaseId: "contracting",
    activity: "Vendor ratification — Compliance & InfoSec",
    startIso: "2026-05-05",
    endIso: "2026-06-15",
    type: "activity",
  },
  // Due diligence
  {
    id: "dd_ops",
    phaseId: "due_diligence",
    activity: "Operations & Client SLA Due Diligence",
    startIso: "2026-05-05",
    endIso: "2026-06-15",
    type: "activity",
  },
  {
    id: "dd_tech",
    phaseId: "due_diligence",
    activity: "Technology Due Diligence",
    startIso: "2026-05-05",
    endIso: "2026-06-15",
    type: "activity",
  },
  {
    id: "dd_hr",
    phaseId: "due_diligence",
    activity: "HR & Workforce Due Diligence",
    startIso: "2026-05-05",
    endIso: "2026-06-15",
    type: "activity",
  },
  {
    id: "c_award",
    phaseId: "contracting",
    activity: "Intent to Award",
    startIso: "2026-06-19",
    endIso: "2026-06-19",
    type: "milestone",
  },
];

export function rfpProgramRowsByPhase(phaseId: string): RfpProgramRow[] {
  return RFP_PROGRAM_ROWS.filter((r) => r.phaseId === phaseId);
}

function rangeBounds(): { start: number; end: number; span: number } {
  const start = new Date(`${RFP_PROGRAM_RANGE_START}T00:00:00`).getTime();
  const end = new Date(`${RFP_PROGRAM_RANGE_END}T23:59:59.999`).getTime();
  return { start, end, span: end - start };
}

/** Left % and width % for a bar on the program scale (Feb–Jun 2026). */
export function rfpBarLayout(row: RfpProgramRow): { left: number; width: number } {
  const { start, span } = rangeBounds();
  const t0 = new Date(`${row.startIso}T00:00:00`).getTime();
  const t1 = new Date(`${row.endIso}T23:59:59.999`).getTime();
  const leftRaw = ((t0 - start) / span) * 100;
  const rightRaw = ((t1 - start) / span) * 100;
  const left = Math.max(0, Math.min(100, leftRaw));
  const right = Math.max(left, Math.min(100, rightRaw));
  let width = right - left;
  if (width < 0.45) width = 0.45;
  return { left, width: Math.min(width, 100 - left) };
}

/** Vertical "today" marker; null if outside range. */
export function rfpTodayPct(now: Date): number | null {
  const { start, end, span } = rangeBounds();
  const t = now.getTime();
  if (t < start || t > end) return null;
  return ((t - start) / span) * 100;
}

/** Local calendar date from `YYYY-MM-DD` (avoids UTC off-by-one). */
export function rfpParseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

export function rfpStartOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Row ended before today's local date (end date is strictly in the past). */
export function rfpRowIsPast(row: RfpProgramRow, now: Date): boolean {
  return rfpParseLocalDate(row.endIso) < rfpStartOfLocalDay(now);
}

/** Phase date range fully before today (by latest end in the phase). */
export function rfpPhaseRangeIsPast(endIso: string, now: Date): boolean {
  return rfpParseLocalDate(endIso) < rfpStartOfLocalDay(now);
}

export interface RfpMonthTick {
  label: string;
  pct: number;
}

/** Month boundaries for the ruler — explicit dates so bars are interpretable. */
export function rfpMonthTicks(): RfpMonthTick[] {
  const { start, span } = rangeBounds();
  const year = 2026;
  const ticks: { label: string; t: number }[] = [
    { label: "Feb 1", t: new Date(year, 1, 1).getTime() },
    { label: "Mar 1", t: new Date(year, 2, 1).getTime() },
    { label: "Apr 1", t: new Date(year, 3, 1).getTime() },
    { label: "May 1", t: new Date(year, 4, 1).getTime() },
    { label: "Jun 1", t: new Date(year, 5, 1).getTime() },
    { label: "Jul 1", t: new Date(year, 6, 1).getTime() },
  ];
  return ticks.map(({ label, t }) => ({
    label,
    pct: Math.max(0, Math.min(100, ((t - start) / span) * 100)),
  }));
}

export function formatRfpRowDates(row: RfpProgramRow): string {
  const same = row.startIso === row.endIso;
  const a = formatIsoShort(row.startIso);
  if (same) return a;
  return `${a} – ${formatIsoShort(row.endIso)}`;
}

function formatIsoShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${d}`;
}
