/**
 * Full 2026 RFP program timeline (phases, activities, milestones).
 * Aligned to stakeholder master schedule; used by the Process page Gantt view.
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
export const RFP_PROGRAM_RANGE_END = "2026-06-30";

/** Narrative order: core RFP path first; business case last as parallel track. */
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
    id: "w2_revised",
    title: "Workshop 2 & revised proposals",
    bar: "#65a30d",
    tint: "rgba(101, 163, 13, 0.1)",
    headerBg: "linear-gradient(90deg, #4d7c0f 0%, #84cc16 100%)",
  },
  {
    id: "steering_w3",
    title: "Steering committee & Workshop 3",
    bar: "#4f46e5",
    tint: "rgba(79, 70, 229, 0.09)",
    headerBg: "linear-gradient(90deg, #4338ca 0%, #6366f1 100%)",
  },
  {
    id: "w4_final",
    title: "Workshop 4 & final proposals",
    bar: "#0284c7",
    tint: "rgba(2, 132, 199, 0.09)",
    headerBg: "linear-gradient(90deg, #0369a1 0%, #0ea5e9 100%)",
  },
  {
    id: "contracting",
    title: "Contracting & due diligence",
    bar: "#9333ea",
    tint: "rgba(147, 51, 234, 0.09)",
    headerBg: "linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)",
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
  // Business case
  {
    id: "bc_pre",
    phaseId: "business",
    activity: "Build initial pre-RFP business case",
    startIso: "2026-02-15",
    endIso: "2026-02-27",
    type: "activity",
  },
  {
    id: "bc_refresh",
    phaseId: "business",
    activity: "Refresh proforma with vendor proposal inputs",
    startIso: "2026-03-28",
    endIso: "2026-04-10",
    type: "activity",
  },
  {
    id: "bc_align",
    phaseId: "business",
    activity: "Align business case with revised & final proposals",
    startIso: "2026-04-22",
    endIso: "2026-05-01",
    type: "activity",
  },
  {
    id: "bc_cmb",
    phaseId: "business",
    activity: "Final business case for CMB approval",
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
    activity: "Proposals & SOW redlines received (6 vendors)",
    startIso: "2026-03-27",
    endIso: "2026-03-27",
    type: "milestone",
  },
  // Workshop 1 & evaluation
  {
    id: "w1_criteria",
    phaseId: "w1_eval",
    activity: "Prepare evaluation criteria & scoring forms",
    startIso: "2026-03-27",
    endIso: "2026-03-29",
    type: "activity",
  },
  {
    id: "w1_sessions",
    phaseId: "w1_eval",
    activity: "Workshop 1 sessions — 6 vendors (3 days)",
    startIso: "2026-03-30",
    endIso: "2026-04-01",
    type: "activity",
  },
  {
    id: "w1_memos",
    phaseId: "w1_eval",
    activity: "Executive summary memos per vendor",
    startIso: "2026-03-30",
    endIso: "2026-04-03",
    type: "activity",
  },
  {
    id: "w1_ds_memo",
    phaseId: "w1_eval",
    activity: "Prepare down-selection recommendation memo",
    startIso: "2026-04-04",
    endIso: "2026-04-07",
    type: "activity",
  },
  {
    id: "w1_shortlist",
    phaseId: "w1_eval",
    activity: "Decision Committee approves shortlist (6 → 3)",
    startIso: "2026-04-08",
    endIso: "2026-04-08",
    type: "milestone",
  },
  // Workshop 2 & revised
  {
    id: "w2_share",
    phaseId: "w2_revised",
    activity: "Share WS2 agenda & vendor memos",
    startIso: "2026-04-04",
    endIso: "2026-04-06",
    type: "activity",
  },
  {
    id: "w2_sessions",
    phaseId: "w2_revised",
    activity: "Workshop 2 sessions — 3 vendors (3 days)",
    startIso: "2026-04-07",
    endIso: "2026-04-09",
    type: "activity",
  },
  {
    id: "w2_debrief",
    phaseId: "w2_revised",
    activity: "Post-WS2 debrief, scoring & evaluation",
    startIso: "2026-04-10",
    endIso: "2026-04-11",
    type: "activity",
  },
  {
    id: "w2_revised",
    phaseId: "w2_revised",
    activity: "Revised proposals received",
    startIso: "2026-04-12",
    endIso: "2026-04-12",
    type: "milestone",
  },
  {
    id: "w2_analyze",
    phaseId: "w2_revised",
    activity: "Analyze proposals, update comparisons & 3 → 2 memo",
    startIso: "2026-04-12",
    endIso: "2026-04-12",
    type: "activity",
  },
  // Steering & W3
  {
    id: "s3_ds",
    phaseId: "steering_w3",
    activity: "Decision Committee selects 2 finalists (3 → 2)",
    startIso: "2026-04-12",
    endIso: "2026-04-12",
    type: "milestone",
  },
  {
    id: "s3_pack",
    phaseId: "steering_w3",
    activity: "Prepare Steering Committee briefing pack",
    startIso: "2026-04-11",
    endIso: "2026-04-13",
    type: "activity",
  },
  {
    id: "s3_meeting",
    phaseId: "steering_w3",
    activity: "Steering Committee meeting",
    startIso: "2026-04-13",
    endIso: "2026-04-13",
    type: "milestone",
  },
  {
    id: "s3_ws3_prep",
    phaseId: "steering_w3",
    activity: "Prepare WS3 agenda & commercial gap analysis",
    startIso: "2026-04-11",
    endIso: "2026-04-14",
    type: "activity",
  },
  {
    id: "s3_sessions",
    phaseId: "steering_w3",
    activity: "Workshop 3 sessions & debrief — 2 vendors",
    startIso: "2026-04-14",
    endIso: "2026-04-16",
    type: "activity",
  },
  // W4 & final proposals
  {
    id: "w4_fis_tech",
    phaseId: "w4_final",
    activity: "Prepare FIS technology approach documentation",
    startIso: "2026-04-17",
    endIso: "2026-04-27",
    type: "activity",
  },
  {
    id: "w4_share",
    phaseId: "w4_final",
    activity: "Share WS4 agenda & vendor memos",
    startIso: "2026-04-24",
    endIso: "2026-04-27",
    type: "activity",
  },
  {
    id: "w4_sessions",
    phaseId: "w4_final",
    activity: "Workshop 4 sessions & tech debrief — 2 vendors",
    startIso: "2026-04-28",
    endIso: "2026-05-01",
    type: "activity",
  },
  {
    id: "w4_negotiate",
    phaseId: "w4_final",
    activity: "Initiate proposal refinements / negotiations",
    startIso: "2026-04-17",
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
    activity: "Compile & refine deal terms w/ FIS stakeholders",
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
    { label: "Jun 30", t: new Date(year, 5, 30, 12, 0, 0).getTime() },
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
