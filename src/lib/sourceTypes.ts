export type GridSnapshot = {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  rows: { r: number; c: number; col: string; value: string; highlight: boolean }[][];
};

export type WorkbookSourcePreview = {
  kind: "workbook";
  sourceFile: string;
  tab: string;
  location: string;
  valueLabel: string;
  calculation: string;
  extractionTimestamp?: string;
  verified?: boolean;
  snapshot?: GridSnapshot | null;
};

export type ProposalSourcePreview = {
  kind: "proposal";
  sourceFile: string;
  page: string;
  section: string;
  excerpt: string;
  highlightPhrase?: string;
  vendorClaimNote?: string;
  extractionTimestamp?: string;
  /** Which file in Vendor Submissions to open (default proposal). */
  submissionDoc?: "proposal" | "sow" | "supplemental";
  /** EXL multi-part proposal (0-based), passed as URL `part`. */
  proposalPart?: number;
  /** Index in supplemental[] when submissionDoc is supplemental. */
  supplementalIndex?: number;
  /** Plain-text needle for in-viewer search (PDF / Word). */
  searchQuery?: string;
};

export type ScorecardSourcePreview = {
  kind: "scorecard";
  sourceFile: string;
  location: string;
  valueLabel?: string;
  note: string;
  extractionTimestamp?: string;
};

export type AnalystSourcePreview = {
  kind: "analyst";
  valueLabel: string;
  note: string;
};

export type SourcePreviewMeta =
  | WorkbookSourcePreview
  | ProposalSourcePreview
  | ScorecardSourcePreview
  | AnalystSourcePreview;
