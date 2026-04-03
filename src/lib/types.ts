import type { SourcePreviewMeta } from "./sourceTypes";

export type YearValue = { year: number; valueM: number | null };

export type Pricing = {
  totalAnnualCostRow: number;
  quarterlyUnit: string;
  years: YearValue[];
  tcvM: number;
  y6M: number | null;
  y7M: number | null;
  tcv7M: number | null;
  provenance?: Record<string, SourcePreviewMeta & Record<string, unknown>>;
};

export type RateRow = {
  label: string;
  row?: number;
  onshore: string;
  nearshore: string;
  offshore: string;
  emeaOnshore: string;
  sourcePreview?: SourcePreviewMeta;
};

export type OneTimeLine = {
  label: string;
  row: number;
  sumQuarterlyUsd: number | null;
  sourcePreview?: SourcePreviewMeta;
};

export type DrillSnippet = {
  ref: string;
  text: string;
  /** RFP / template question text (muted in UI); vendor answer is `text`. */
  questionText?: string;
  snapshot?: unknown;
  sourcePreview?: SourcePreviewMeta;
  /** Optional deep link to proposal PDF, SOW redline, or supplemental (hover + open in Vendor Submissions). */
  linkedDocumentPreview?: SourcePreviewMeta;
};

export type ColaAssumptions = {
  us: string;
  ca: string;
  ph: string;
  uk: string;
  nl: string;
  de: string;
  treatment: string;
  summary: string;
  ibmColaNote?: string;
};

export type VendorRecord = {
  id: string;
  displayName: string;
  color: string;
  workbookPath: string;
  pricing: Pricing;
  rateCard: RateRow[];
  colaAssumptions?: ColaAssumptions;
  efficiency: {
    headers?: string[];
    rows?: {
      geography: string;
      cells: Record<string, string>;
      cellProvenance?: Record<string, SourcePreviewMeta>;
    }[];
    tableSnapshot?: unknown;
    sourcePreview?: SourcePreviewMeta;
  };
  governance: { commit: number; partial: number; cannotCommit: number };
  /** Tab 5.0 line items when extracted (preferred over synthetic governance lists). */
  governanceItems?: { status: "commit" | "partial" | "cannot"; label: string }[];
  oneTimeLines: OneTimeLine[];
  migrationNotes: string;
  flags: string[];
  evaluationBriefText: string;
  adminTabs: { tab: string; status: string }[];
  sources: Record<string, string>;
  drilldownSnippets: { tab: string; missing: boolean; snippets: DrillSnippet[] }[];
};

export type PortfolioVendor = {
  id: string;
  displayName: string;
  color: string;
  tcvM: number;
  /** Null until Workshop 1 scoring */
  composite: number | null;
};

export type ScoreDimension = {
  id: string;
  pillar: string;
  label: string;
  scores: Record<string, number | null>;
};

export type Portfolio = {
  title: string;
  subtitle: string;
  classification: string;
  footer: string;
  extractionTimestamp?: string;
  /** ISO timestamp of last dashboard data assembly (may match extraction). */
  dashboardBuildTimestamp?: string;
  baselineAnnualM: { low: number; high: number; mid: number };
  synergyTargetM: number;
  vendors: PortfolioVendor[];
  scorecard: {
    source: string;
    columnOrder: string[];
    dimensions: ScoreDimension[];
    composite: Record<string, number | null>;
  };
  radar: {
    fieldAverage: Record<string, number>;
    vendors: { vendorId: string; pillars: Record<string, number> }[];
  };
};
