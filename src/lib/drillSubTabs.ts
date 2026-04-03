import type { DrillSnippet } from "@/lib/types";

export type DrillSubTabDef = {
  id: string;
  label: string;
  /** Match snippets whose question + response contain any of these (lowercase). Empty => Summary bucket only. */
  keywords: string[];
};

/** Topic sub-tabs per primary RFP section (Issue 2). Summary is handled as comparison table, not keyword filtering. */
export const DRILL_SUB_TABS: Record<string, DrillSubTabDef[]> = {
  "2.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "fs-track", label: "FS Track Record", keywords: ["track record", "financial services experience", "issuer experience", "banking"] },
    { id: "subcontractor", label: "Sub-Contractor Approach", keywords: ["sub-contractor", "subcontractor", "third party", "4th party"] },
    { id: "risk-mitigation", label: "Risk Mitigation", keywords: ["risk mitigation", "mitigate risk", "risk management"] },
    { id: "experience", label: "Experience", keywords: ["years of experience", "experience in", "bpo experience"] },
    { id: "customer-care", label: "Customer Care Experience", keywords: ["customer care", "customer service", "cx ", "contact center"] },
    { id: "back-office", label: "Back Office Experience", keywords: ["back office", "operations support", "processing"] },
    { id: "active-fs", label: "Active FS Clients", keywords: ["active client", "financial services clients", "# of clients", "number of clients"] },
    { id: "countries", label: "Countries & Sites", keywords: ["countries", "sites", "locations", "geograph"] },
    { id: "languages", label: "Languages", keywords: ["language", "multilingual", "linguistic"] },
    { id: "workforce", label: "Workforce Overview", keywords: ["workforce", "headcount", "fte", "employees"] },
    { id: "attrition", label: "Agent Attrition", keywords: ["attrition", "turnover", "retention"] },
    { id: "tenure", label: "Agent Tenure", keywords: ["tenure", "average tenure"] },
    { id: "qualifications", label: "Agent Qualifications", keywords: ["qualification", "certification", "training hours"] },
  ],
  "3.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "cs1", label: "Case Study 1", keywords: ["case study 1", "case study one", "reference 1", "example 1"] },
    { id: "cs2", label: "Case Study 2", keywords: ["case study 2", "case study two", "reference 2"] },
    { id: "cs3", label: "Case Study 3", keywords: ["case study 3", "case study three", "reference 3"] },
    { id: "refs", label: "Client References", keywords: ["reference", "contact", "client name", " testimonial "] },
  ],
  "4.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "delivery", label: "Delivery Model & Locations", keywords: ["delivery model", "locations", "site", "shore"] },
    { id: "rebadge", label: "Rebadge / TUPE Plan", keywords: ["rebadge", "tupe", "transfer"] },
    { id: "sla", label: "SLA Commitments", keywords: ["sla", "service level", "performance standard"] },
    { id: "language-matrix", label: "Language Coverage Matrix", keywords: ["language matrix", "coverage matrix", "language support"] },
    { id: "wfm", label: "WFM & Training Plan", keywords: ["workforce management", "wfm", "training plan", "scheduling"] },
    { id: "mix", label: "Onshore:Offshore Mix", keywords: ["onshore", "offshore", "mix", "ratio"] },
  ],
  "5.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "gov", label: "Governance Commitments", keywords: ["governance", "commit", "cannot commit", "data ownership"] },
    { id: "ai", label: "AI Tools & Impact", keywords: ["artificial intelligence", " ai ", "machine learning", "automation tool"] },
    { id: "migration", label: "Platform Migration Plan", keywords: ["migration plan", "platform migration", "cutover"] },
    { id: "data-exit", label: "Data Portability & Exit", keywords: ["data portability", "exit", "extract", "lock-in"] },
    { id: "architecture", label: "Architecture Overview", keywords: ["architecture", "diagram", "solution design", "technical"] },
  ],
  "7.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "waves", label: "Wave Plan", keywords: ["wave", "phase", "migration wave", "sequenc"] },
    {
      id: "mapping",
      label: "Client Mapping",
      keywords: [
        "client mapping",
        "map each client",
        "mapped to each",
        "client cohort",
        "portfolio of clients",
        "which clients are",
        "assign clients",
      ],
    },
    { id: "raci", label: "RACI Matrix", keywords: ["raci", "responsible", "accountable"] },
    { id: "timeline", label: "Timeline & Sequencing", keywords: ["timeline", "schedule", "milestone", "month"] },
    { id: "risk-reg", label: "Risk Register", keywords: ["risk register", "mitigation plan"] },
    { id: "workforce-tr", label: "Workforce Transition", keywords: ["workforce transition", "change management", "communication plan"] },
  ],
  "8.0": [
    { id: "summary", label: "📊 Summary", keywords: [] },
    { id: "pci", label: "PCI DSS", keywords: ["pci", "card data"] },
    { id: "gdpr", label: "GDPR / DPA", keywords: ["gdpr", "dpa", "data protection"] },
    { id: "certs", label: "Regulatory Certifications", keywords: ["certification", "iso", "soc 2"] },
    { id: "sub-oversight", label: "Sub-Contractor Oversight", keywords: ["subcontractor oversight", "4th party", "vendor oversight"] },
    { id: "penalty", label: "Penalty Framework", keywords: ["penalty", "service credit", "liquidated"] },
  ],
};

export function filterSnippetsForSubTab(snips: DrillSnippet[], sub: DrillSubTabDef): DrillSnippet[] {
  if (sub.id === "summary") return [];
  if (sub.keywords.length === 0) return snips;
  const kws = sub.keywords.map((k) => k.toLowerCase().trim());
  return snips.filter((s) => {
    const blob = `${s.questionText ?? ""} ${s.text}`.toLowerCase();
    return kws.some((k) => blob.includes(k));
  });
}
