import type { Milestone } from "@/lib/workshopTypes";

/** Target for entering Workshop 1 evaluator scores (ahead of Apr 8 shortlist decision). */
export const EVALUATOR_SCORES_TARGET_LINE = "EOD Tuesday, April 7, 2026";

export const MILESTONES: Milestone[] = [
  {
    id: "questions",
    label: "RFP Issued to 6 Vendors",
    date: "Mar 17",
    isoDate: "2026-03-17",
    status: "complete",
    detail: "Milestone",
    description: "RFP released to the competing vendor set per program administration.",
  },
  {
    id: "responses",
    label: "Vendor Q&A Responses Distributed",
    date: "Mar 25",
    isoDate: "2026-03-25",
    status: "complete",
    detail: "Milestone",
    description: "Written responses published so all bidders proceed from the same clarified requirements.",
  },
  {
    id: "submission",
    label: "Proposals & SOW Redlines Received",
    date: "Mar 27",
    isoDate: "2026-03-27",
    status: "complete",
    detail: "6 vendors",
    description: "Initial proposals and SOW redlines — baseline commercial and technical packages for evaluation.",
  },
  {
    id: "workshop1",
    label: "Workshop 1",
    date: "Mar 30 – Apr 1",
    isoDate: "2026-04-01",
    status: "complete",
    vendorCount: 6,
    vendors: ["cognizant", "genpact", "exl", "ibm", "sutherland", "ubiquity"],
    detail:
      "90-minute structured sessions — organizational qualifications, proposed commercial framework, and high-level transformation plan.",
    description:
      "Vendors should be prepared for a 90-minute structured session covering their organizational qualifications, proposed commercial framework, and high-level transformation plan. Vendors who progress past down-selection will be invited to Workshop 2.",
  },
  {
    id: "downselect",
    label: "Shortlist Approved (6 → 3)",
    date: "Apr 8",
    isoDate: "2026-04-08",
    status: "active",
    vendorCount: 3,
    detail: "Decision Committee milestone",
    description:
      "Decision Committee approves the shortlist on April 8. Six vendors narrowed to three based on Workshop 1 evaluation and commercial review.",
  },
  {
    id: "workshop2",
    label: "Workshop 2",
    date: "Apr 7 – 9",
    isoDate: "2026-04-09",
    status: "upcoming",
    vendorCount: 3,
    vendors: [],
    detail: "Three-day sessions — 3 shortlisted vendors",
    description:
      "Vendors should come prepared with an initial wave design and a view on how they would approach the migration of TMS's clients.",
  },
  {
    id: "revised",
    label: "Revised Proposals Received",
    date: "Apr 12",
    isoDate: "2026-04-12",
    status: "upcoming",
    detail: "Milestone",
    description: "Revised proposals in — pricing, investment specifics, and updates after Workshop 2.",
  },
  {
    id: "downselect32",
    label: "Finalists Selected (3 → 2)",
    date: "Apr 12",
    isoDate: "2026-04-12",
    status: "upcoming",
    vendorCount: 2,
    detail: "Decision Committee milestone",
    description: "Decision Committee selects two finalists to continue toward Workshop 3.",
  },
  {
    id: "steering",
    label: "Steering Committee",
    date: "Apr 13",
    isoDate: "2026-04-13",
    status: "upcoming",
    detail: "Milestone",
    description: "Steering Committee session with briefing pack and governance alignment.",
  },
  {
    id: "workshop3",
    label: "Workshop 3",
    date: "Apr 14 – 16",
    isoDate: "2026-04-16",
    status: "upcoming",
    vendorCount: 2,
    vendors: [],
    detail: "Sessions & debrief — 2 vendors",
    description:
      "This session will focus on commercial alignment and resolving open questions prior to final proposal submission and refinements.",
  },
  {
    id: "workshop4",
    label: "Workshop 4",
    date: "Apr 28 – May 1",
    isoDate: "2026-05-01",
    status: "upcoming",
    vendorCount: 2,
    vendors: [],
    detail: "Technology debrief — 2 vendors",
    description:
      "Technology migration approach, key risks, delivery ownership, and minimizing transition disruption — aligned to master schedule.",
  },
  {
    id: "award",
    label: "Intent to Award",
    date: "Jun 19",
    isoDate: "2026-06-19",
    status: "upcoming",
    vendorCount: 1,
    vendors: [],
    detail: "Milestone — subject to governance",
    description:
      "Target intent to award. Parallel contracting, due diligence, and business case activities continue through this window per program plan.",
  },
];

/** Workshop funnel stage keys (visual pipeline). */
export const FUNNEL_STAGE_IDS = ["workshop1", "workshop2", "workshop3", "workshop4", "award"] as const;

export type FunnelStageId = (typeof FUNNEL_STAGE_IDS)[number];

export const WORKSHOP_EMPTY_COPY: Record<
  number,
  { title: string; topic: string; dateLine: string; vendorLine: string }
> = {
  2: {
    title: "Workshop 2 — Wave Design & TMS Client Migration",
    topic:
      "Vendors should come prepared with an initial wave design and a view on how they would approach the migration of TMS's clients.",
    dateLine: "Scheduled: April 7–9, 2026",
    vendorLine: "3 shortlisted vendors (TBD after down-selection)",
  },
  3: {
    title: "Workshop 3 — Commercial Alignment & Open Questions",
    topic:
      "This session will focus on commercial alignment and resolving open questions prior to final proposal submission.",
    dateLine: "Scheduled: April 14–16, 2026",
    vendorLine: "2 vendors (TBD)",
  },
  4: {
    title: "Workshop 4 — Final Clarifications & Award Readiness",
    topic: "Final clarifications, commitments, and path to award with two remaining bidders.",
    dateLine: "Scheduled: April 28 – May 1, 2026",
    vendorLine: "2 vendors (TBD)",
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
        "Framing next steps as proposal refinements and negotiations continue into May per the master program timeline.",
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
