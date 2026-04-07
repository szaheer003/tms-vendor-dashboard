import type { Milestone } from "@/lib/workshopTypes";

/** Evaluator scores ahead of the Apr 7–8 Decision Committee shortlist window. */
export const EVALUATOR_SCORES_TARGET_LINE = "EOD Sunday, April 6, 2026";

export const MILESTONES: Milestone[] = [
  {
    id: "rfp_issued",
    label: "RFP Issued to 6 Vendors",
    date: "Mar 17",
    isoDate: "2026-03-17",
    status: "complete",
    detail: "RFP released to the competing vendor set per program administration.",
  },
  {
    id: "qa_distributed",
    label: "Vendor Q&A Responses Distributed",
    date: "Mar 25",
    isoDate: "2026-03-25",
    status: "complete",
    detail: "Responses to vendor questions compiled and distributed to all 6 vendors.",
  },
  {
    id: "proposals_received",
    label: "Proposals & SOW Redlines Received",
    date: "Mar 27",
    isoDate: "2026-03-27",
    status: "complete",
    detail:
      "Initial proposals and SOW redlines — baseline commercial and technical packages for evaluation.",
  },
  {
    id: "workshop1",
    label: "Workshop 1 — Vendor Credentials & Commercial",
    date: "Mar 31 – Apr 2",
    isoDate: "2026-04-02",
    status: "complete",
    vendorCount: 6,
    vendors: ["cognizant", "genpact", "exl", "ibm", "sutherland", "ubiquity"],
    detail:
      "90-minute structured sessions covering organizational qualifications, proposed commercial framework, and high-level transformation plan. 6 vendors presented.",
  },
  {
    id: "ws1_debrief",
    label: "Post-WS1 Debrief, Scoring & Down-Selection Memo",
    date: "Apr 2 – 6",
    isoDate: "2026-04-06",
    status: "complete",
    detail:
      "Evaluator scoring, debrief synthesis, and down-selection recommendation published on RFP Intelligence Hub.",
  },
  {
    id: "shortlist_approved",
    label: "Decision Committee Approves Shortlist (6 → 3)",
    date: "Apr 7 – 8",
    isoDate: "2026-04-08",
    status: "active",
    vendorCount: 3,
    detail:
      "Decision Committee reviews evaluator scores and workshop memos. Shortlist notification sent to vendors.",
  },
  {
    id: "ws2_prep",
    label: "Workshop 2 Preparation",
    date: "Apr 7 – 12",
    isoDate: "2026-04-12",
    status: "upcoming",
    detail: "Prepare evaluation criteria, scoring mechanism, and pre-workshop memos for shortlisted vendors.",
  },
  {
    id: "workshop2",
    label: "Workshop 2 — Migration, Rebadge, Tech & Offshoring",
    date: "Apr 13 – 15",
    isoDate: "2026-04-15",
    status: "upcoming",
    vendorCount: 3,
    detail:
      "3-hour structured sessions. Focus: client migration wave design, rebadge mechanics, technology approach, and offshore delivery model.",
  },
  {
    id: "ws2_debrief",
    label: "Post-WS2 Debrief & Scoring",
    date: "Apr 15 – 17",
    isoDate: "2026-04-17",
    status: "upcoming",
    detail: "Post-workshop debrief, scoring, and down-selection memo published on RFP Intelligence Hub.",
  },
  {
    id: "finalists_selected",
    label: "Decision Committee Selects 2 Finalists (3 → 2)",
    date: "Apr 17",
    isoDate: "2026-04-17",
    status: "upcoming",
    vendorCount: 2,
    detail: "Decision Committee narrows shortlist to 2 finalists for final workshops and contracting.",
  },
  {
    id: "steering_committee",
    label: "Steering Committee — Approves Path to Award",
    date: "Apr 21",
    isoDate: "2026-04-21",
    status: "upcoming",
    detail: "Steering Committee reviews evaluation progress and approves the path to vendor award.",
  },
  {
    id: "workshop3",
    label: "Workshop 3 — Commercial Alignment & Open Questions",
    date: "Apr 22 – 23",
    isoDate: "2026-04-23",
    status: "upcoming",
    vendorCount: 2,
    detail: "3-hour sessions focused on commercial alignment and resolving open questions prior to final proposal.",
  },
  {
    id: "workshop4",
    label: "Workshop 4 — Technology Approach & Migration",
    date: "Apr 28 – 30",
    isoDate: "2026-04-30",
    status: "upcoming",
    vendorCount: 2,
    detail:
      "Technology migration approach, key risks and dependencies, delivery ownership, and minimizing transition disruption.",
  },
  {
    id: "ws4_debrief",
    label: "Post-WS4 Scoring & Final Refinements",
    date: "Apr 30 – May 7",
    isoDate: "2026-05-07",
    status: "upcoming",
    detail: "Post-WS4 technology scoring, debrief, and final proposal refinements with 2 finalists.",
  },
  {
    id: "contracting_start",
    label: "Contracting Begins",
    date: "May 5",
    isoDate: "2026-05-05",
    status: "upcoming",
    detail:
      "Negotiation workshops (2 vendors), deal terms compilation, and vendor ratification (Compliance & InfoSec).",
  },
  {
    id: "due_diligence_window",
    label: "Due Diligence (Ops / Technology / HR)",
    date: "May 5 – Jun 15",
    isoDate: "2026-06-15",
    status: "upcoming",
    detail:
      "Parallel due diligence across Operations & client SLA, Technology, and HR / workforce — aligned with contracting through mid-June.",
  },
  {
    id: "intent_to_award",
    label: "Intent to Award",
    date: "Jun 19",
    isoDate: "2026-06-19",
    status: "upcoming",
    vendorCount: 1,
    detail: "Vendor selection announced. Final Business Case submitted for executive approval.",
  },
];

/** Workshop funnel stage keys (visual pipeline). */
export const FUNNEL_STAGE_IDS = [
  "workshop1",
  "workshop2",
  "workshop3",
  "workshop4",
  "intent_to_award",
] as const;

export type FunnelStageId = (typeof FUNNEL_STAGE_IDS)[number];

export const WORKSHOP_EMPTY_COPY: Record<
  2 | 3 | 4,
  { title: string; topic: string; dateLine: string; vendorLine: string }
> = {
  2: {
    title: "Workshop 2 — Migration, Rebadge, Tech & Offshoring",
    topic:
      "Client migration wave design, rebadge mechanics, technology approach, and offshore delivery model — focus on how shortlisted vendors operationalize transition and shore mix.",
    dateLine: "Scheduled: April 13–15, 2026",
    vendorLine: "3 shortlisted vendors (TBD after down-selection)",
  },
  3: {
    title: "Workshop 3 — Commercial Alignment & Open Questions",
    topic: "Commercial alignment and resolving open questions prior to final proposal submission.",
    dateLine: "Scheduled: April 22–23, 2026",
    vendorLine: "2 finalist vendors",
  },
  4: {
    title: "Workshop 4 — Technology Approach & Migration",
    topic:
      "Technology migration approach, key risks and dependencies, delivery ownership, and approaches to minimizing disruption during transition.",
    dateLine: "Scheduled: April 28–30, 2026",
    vendorLine: "2 finalist vendors",
  },
};

/** Agenda bullets for Workshops 2–4 preparation views. */
export const WORKSHOP_AGENDA: Record<number, { title: string; description: string }[]> = {
  2: [
    {
      title: "Initial wave design",
      description: "How the vendor sequences transition waves, milestones, and geographic or client-group rollout.",
    },
    {
      title: "Migration of TMS's clients",
      description: "Approach to migrating TMS clients — staffing, governance, sequencing, and key dependencies.",
    },
    {
      title: "Rebadge and workforce mechanics",
      description: "TUPE, Works Council, WARN considerations, retention, and Day-1 readiness where relevant.",
    },
    {
      title: "Technology and delivery enablers",
      description: "Platforms, tooling, and operating model that support the proposed migration path.",
    },
  ],
  3: [
    {
      title: "Commercial alignment",
      description: "Narrowing pricing gaps, normalization, and binding commitment mechanisms.",
    },
    {
      title: "Open question resolution",
      description: "Addressing risks, gaps, and pressure-test items from prior workshops.",
    },
    {
      title: "Path to refinements",
      description:
        "Framing next steps as proposal refinements and negotiations continue per the master program timeline.",
    },
  ],
  4: [
    {
      title: "Technology migration plan",
      description: "Detailed platform migration sequence, cutover strategy, and rollback procedures.",
    },
    {
      title: "Key risks & dependencies",
      description: "FIS prerequisites, shared responsibilities, and risk ownership matrix.",
    },
    {
      title: "Delivery ownership",
      description: "Who owns what post-go-live: SLA accountability, escalation paths, governance model.",
    },
    {
      title: "Minimizing disruption",
      description: "Client experience protection during transition, dual-run commitments, and hypercare plans.",
    },
  ],
};

/** Stable ordering when two milestones share the same calendar end date. */
const MILESTONE_SORT_INDEX = new Map(MILESTONES.map((m, i) => [m.id, i]));

export function milestonesChronological(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => {
    const ta = new Date(a.isoDate).getTime();
    const tb = new Date(b.isoDate).getTime();
    if (ta !== tb) return ta - tb;
    return (MILESTONE_SORT_INDEX.get(a.id) ?? 999) - (MILESTONE_SORT_INDEX.get(b.id) ?? 999);
  });
}

export function prevMilestoneIso(target: Milestone, orderedChrono: Milestone[]): string | null {
  const idx = orderedChrono.findIndex((m) => m.id === target.id);
  if (idx <= 0) return null;
  return orderedChrono[idx - 1]!.isoDate;
}

export function progressToDate(prevIso: string | null, targetIso: string, now: Date): number {
  if (!prevIso) return 0;
  const start = new Date(prevIso).setHours(0, 0, 0, 0);
  const end = new Date(targetIso).setHours(23, 59, 59, 999);
  const t = now.getTime();
  if (t >= end) return 1;
  if (t <= start) return 0;
  return (t - start) / (end - start);
}

export function daysUntil(isoDate: string, now: Date): number {
  const end = new Date(isoDate);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function daysLabel(isoDate: string, status: Milestone["status"], now: Date): string {
  if (status === "complete") return "Complete ✓";
  const d = daysUntil(isoDate, now);
  if (d === 0) return "Due today";
  if (d === 1) return "1 day away";
  return `${d} days away`;
}

export function nextCountdownMilestones(milestones: Milestone[], now: Date, limit = 3): Milestone[] {
  const open = milestones.filter((m) => m.status === "active" || m.status === "upcoming");
  const sorted = milestonesChronological(open);
  return sorted.slice(0, limit);
}
