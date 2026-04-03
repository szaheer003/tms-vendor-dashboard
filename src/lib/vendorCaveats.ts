/** Persistent diligence callouts (Issue 6). Keys = vendor id. */

export type CaveatContext = "overview" | "commercial" | "tear" | "admin" | "drill" | "scorecard";

export const VENDOR_CAVEATS: Record<string, Partial<Record<CaveatContext, string[]>>> = {
  cognizant: {
    scorecard: [
      "Certainty marked 100%* — asterisk conditions are not disclosed in the workbook.",
    ],
    overview: [
      "Certainty marked 100%* — asterisk conditions are not disclosed in the workbook. Workshop must clarify what conditions, if any, reduce this below 100%.",
      "Proposal claims ~$25M total investment; workbook one-time lines sum to ~$5.2M. Reconciliation needed before treating either figure as confirmed.",
    ],
    commercial: [
      "Certainty marked 100%* — workshop must clarify asterisk conditions.",
      "Proposal ~$25M investment vs ~$5.2M workbook one-time sum — reconcile before confirming one-time economics.",
    ],
    tear: [
      "Certainty 100%* — undisclosed conditions in workbook.",
      "Investment narrative vs workbook one-time lines needs reconciliation.",
    ],
  },
  genpact: {
    scorecard: ["TBD certainty — modeled savings may exceed contractual commitments.", "7-year term vs 5-year RFP scope."],
    overview: [
      "Certainty is TBD for all geographies. The 68% productivity commitment and $425M TCV are not yet contractually backed.",
      "Minimum 7-year contract term vs 5-year RFP scope. Pricing assumes full 7-year duration.",
      "COLA is exclusive — annual escalation is charged on top of quoted rates; headline TCV excludes COLA compounding.",
    ],
    commercial: [
      "TBD certainty on Tab 9.0 — modeled savings may exceed enforceable commitments.",
      "7-year minimum term; 5-year economics may differ materially.",
      "COLA exclusive — headline TCV excludes compounding escalation.",
    ],
    tear: [
      "TBD certainty vs lowest headline TCV — separate modeled from contractual.",
      "7-year term and exclusive COLA affect comparability.",
    ],
  },
  exl: {
    scorecard: ["TCV excludes severance, CCaaS — loaded TCO higher than headline.", "EMEA labor arb negative — savings hinge on AI."],
    overview: [
      "Headline TCV excludes severance (FIS-borne), CCaaS, and exclusive COLA — gross up before comparing to bundled vendors.",
      "EXL uses $841M as-is baseline vs FIS ~$750.6M; savings claims are not directly comparable without normalization.",
      "EMEA labor arbitrage is negative; EMEA savings depend heavily on high AI assumptions.",
    ],
    commercial: [
      "TCV exclusions (severance, CCaaS, COLA) raise loaded TCO.",
      "EMEA negative labor arb — savings hinge on AI/digital overlay.",
    ],
    tear: [
      "~$841M baseline vs FIS ~$750.6M — normalize before comparing savings.",
      "EMEA model may cost more than current state absent AI efficiency.",
    ],
  },
  ibm: {
    scorecard: ["Non-binding proposal — TCV is a floor until terms bind.", "0% COLA pending agreement."],
    overview: [
      "Proposal is explicitly non-binding; ~$460M TCV is a preliminary estimate, not a contractual price.",
      "COLA 0% pending mutual agreement — industry-standard COLA (3–5%) implies ~$510–530M real TCV.",
      "Tab 9.0 efficiency is largely blank — no submitted offshore mix, labor arb, or certainty grid.",
    ],
    commercial: [
      "Non-binding proposal language — TCV is a floor until terms bind.",
      "0% COLA note — real TCV higher if standard escalation applies.",
      "Blank Tab 9.0 — efficiency story not in workbook.",
    ],
    tear: [
      "Non-binding until SOW closes.",
      "COLA and blank efficiency require workshop hardening.",
    ],
  },
  sutherland: {
    scorecard: ["~39.7% certainty — lowest explicit contractual backing in field on Tab 9.0."],
    overview: [
      "Certainty ~39.7% is lowest in field; a large share of modeled savings is not contractually backed.",
    ],
    commercial: ["Lowest certainty % — stress-test modeled vs committed savings."],
    tear: [
      "Previous dashboard versions incorrectly implied rate-card-only; Tab 6.0 rows 115–121 contain full financial summary (~$559.7M) — corrected.",
      "Lowest certainty among detailed Tab 9.0 submissions.",
    ],
  },
  ubiquity: {
    scorecard: ["Above-baseline continuity pricing — not a synergy bid."],
    overview: [
      "$938.8M is continuity pricing (current headcount × rates × COLA), not a synergy bid — costs rise YoY; ~$188M above FIS 5-yr baseline.",
    ],
    commercial: [
      "Continuity economics — not comparable to transformation bids; costs increase annually.",
    ],
    tear: ["Continuity reference, not cost reduction."],
    admin: [
      "Standard Appendix B tabs 2.0–5.0, 7.0–9.0 largely absent — structured scoring across most dimensions is not possible.",
    ],
    drill: [
      "Structured drill-down tabs missing — responses pulled from questionnaire where available.",
    ],
  },
};

export function caveatsFor(vendorId: string, ctx: CaveatContext): string[] {
  const row = VENDOR_CAVEATS[vendorId];
  if (!row) return [];
  return row[ctx] ?? [];
}
