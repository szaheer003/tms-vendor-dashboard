/** Up to 12 Workshop 1 evaluator slots (Folder 8 xlsx rows). */
export const EVALUATOR_SLOT_COUNT = 12;

export const EVALUATOR_IDS = Array.from({ length: EVALUATOR_SLOT_COUNT }, (_, i) => `ev${i + 1}`) as readonly string[];

export type EvaluatorId = (typeof EVALUATOR_IDS)[number];

export const EVALUATORS: Record<string, { label: string; role: string }> = Object.fromEntries(
  EVALUATOR_IDS.map((id, i) => [id, { label: `Evaluator ${i + 1}`, role: "W1" }]),
);

export const VENDOR_IDS = ["cognizant", "genpact", "exl", "ibm", "sutherland", "ubiquity"] as const;
export type VendorId = (typeof VENDOR_IDS)[number];

/**
 * Pillar weights for weighted composite (must sum to 1).
 * Partnership 10%; Commercial, Operational, Technology, Migration each 22.5%.
 */
export const SCORED_PILLARS = {
  Q12: {
    label: "Commercial Attractiveness",
    weight: 0.225,
    subs: [
      { id: "1.1", label: "Synergy alignment" },
      { id: "1.2", label: "Efficiency assumptions & certainty" },
      { id: "1.3", label: "Investments, transparency & savings protection" },
    ],
  },
  Q9: {
    label: "Operational Excellence",
    weight: 0.225,
    subs: [
      { id: "2.1", label: "SLA commitment level" },
      { id: "2.2", label: "Language, coverage & compliance" },
      { id: "2.3", label: "Delivery model credibility" },
    ],
  },
  Q10: {
    label: "Technology & AI",
    weight: 0.225,
    subs: [
      { id: "3.1", label: "Tech governance compliance" },
      { id: "3.2", label: "Migration plan specificity" },
      { id: "3.3", label: "AI overlay innovation & impact" },
    ],
  },
  Q11: {
    label: "Client & Workforce Migration",
    weight: 0.225,
    subs: [
      { id: "4.1", label: "Wave composition & constraint compliance" },
      { id: "4.2", label: "Sequencing, speed & revenue pace" },
      { id: "4.3", label: "Workforce transition safeguards" },
    ],
  },
  Q8: {
    label: "Partnership Readiness",
    weight: 0.1,
    subs: [
      { id: "5.1", label: "Reference & case study alignment" },
      { id: "5.2", label: "Operational depth & geographic reach" },
      { id: "5.3", label: "Contracting posture" },
    ],
  },
} as const;

export const QUALITATIVE_QUESTIONS = {
  Q1: "Name",
  Q2: "Email",
  Q3: "What did you like most about this vendor's submission?",
  Q4: "What would need to be true for this vendor's approach to work?",
  Q5: "What is the biggest risk with this vendor?",
  Q6: "What questions would you want to drill into in the next workshop?",
  Q7: "Is there anything this vendor demonstrated that all vendors should emulate?",
} as const;

export const CONFIDENCE_LEVELS = [
  "Very confident",
  "Somewhat confident",
  "Somewhat not confident",
  "Very not confident",
] as const;

export type ScoredMatrix = Record<string, Record<string, Record<string, number | null>>>;
export type QualitativeResponses = Record<string, Record<string, Record<string, string>>>;
export type ConfidenceVotes = Record<string, Record<string, string | null>>;
export type ProceedVotes = Record<string, Record<string, boolean | null>>;

export function emptyScores(): ScoredMatrix {
  const m: ScoredMatrix = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) {
      m[vid]![eid] = {};
      for (const pillar of Object.values(SCORED_PILLARS)) {
        for (const sub of pillar.subs) {
          m[vid]![eid]![sub.id] = null;
        }
      }
    }
  }
  return m;
}

export function emptyQualitative(): QualitativeResponses {
  const m: QualitativeResponses = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) {
      m[vid]![eid] = {};
      for (const q of ["Q3", "Q4", "Q5", "Q6", "Q7"] as const) {
        m[vid]![eid]![q] = "";
      }
    }
  }
  return m;
}

export function emptyConfidence(): ConfidenceVotes {
  const m: ConfidenceVotes = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) m[vid]![eid] = null;
  }
  return m;
}

export function emptyProceed(): ProceedVotes {
  const m: ProceedVotes = {};
  for (const vid of VENDOR_IDS) {
    m[vid] = {};
    for (const eid of EVALUATOR_IDS) m[vid]![eid] = null;
  }
  return m;
}

export function flattenScoredSubs(): { pillarKey: string; pillarLabel: string; weight: number; id: string; label: string }[] {
  const out: { pillarKey: string; pillarLabel: string; weight: number; id: string; label: string }[] = [];
  for (const [pk, p] of Object.entries(SCORED_PILLARS)) {
    for (const sub of p.subs) {
      out.push({ pillarKey: pk, pillarLabel: p.label, weight: p.weight, id: sub.id, label: sub.label });
    }
  }
  return out;
}
