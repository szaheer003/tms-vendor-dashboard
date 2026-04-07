import type { Portfolio, VendorRecord } from "./types";
import { patchPortfolioFromEvaluatorScores, type EvaluatorScoresPatchInput } from "./patchPortfolioFromEvaluatorScores";

import portfolioJson from "@/data/portfolio.json";
import evaluatorScoresJson from "@/data/evaluatorScores.json";
import scorecardJson from "@/data/scorecard.json";
import vendorCognizant from "@/data/vendor_cognizant.json";
import vendorExl from "@/data/vendor_exl.json";
import vendorGenpact from "@/data/vendor_genpact.json";
import vendorIbm from "@/data/vendor_ibm.json";
import vendorSutherland from "@/data/vendor_sutherland.json";
import vendorUbiquity from "@/data/vendor_ubiquity.json";

/** @deprecated Use build-time bundle only; kept for any code that referenced the old path. */
export const DASHBOARD_DATA_BASE = "/data";

const VENDOR_BY_ID: Record<string, VendorRecord> = {
  cognizant: vendorCognizant as VendorRecord,
  exl: vendorExl as VendorRecord,
  genpact: vendorGenpact as VendorRecord,
  ibm: vendorIbm as VendorRecord,
  sutherland: vendorSutherland as VendorRecord,
  ubiquity: vendorUbiquity as VendorRecord,
};

export type DashboardDataset = {
  portfolio: Portfolio;
  vendorMap: Record<string, VendorRecord>;
};

/**
 * Builds the dashboard dataset from JSON bundled at compile time (works with file:// and static hosts).
 */
export function buildDashboardDataset(): DashboardDataset {
  const portfolio = structuredClone(portfolioJson) as Portfolio;
  portfolio.scorecard = structuredClone(scorecardJson) as Portfolio["scorecard"];

  try {
    patchPortfolioFromEvaluatorScores(portfolio, evaluatorScoresJson as EvaluatorScoresPatchInput);
  } catch {
    /* ignore malformed evaluator JSON */
  }

  const vendorMap: Record<string, VendorRecord> = {};
  for (const v of portfolio.vendors) {
    const rec = VENDOR_BY_ID[v.id];
    if (!rec) throw new Error(`Missing bundled vendor JSON for id "${v.id}"`);
    vendorMap[v.id] = structuredClone(rec);
  }

  return { portfolio, vendorMap };
}
