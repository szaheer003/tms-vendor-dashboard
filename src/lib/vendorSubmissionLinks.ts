import type { SourcePreviewMeta } from "./sourceTypes";

export function parseRowFromLocation(location: string): number | undefined {
  const rowWord = location.match(/Row\s+(\d+)/i);
  if (rowWord) return parseInt(rowWord[1], 10);
  const cell = location.match(/Cell\s+[A-Za-z]+\s*(\d+)/i);
  if (cell) return parseInt(cell[1], 10);
  return undefined;
}

/** Excel cell ref e.g. `G12`, `AA3` → 1-based row index. */
export function parseRowFromCellRef(ref: string): number | undefined {
  const m = String(ref).trim().match(/[A-Za-z]+(\d+)$/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return n >= 1 ? n : undefined;
}

/** Drill blocks may use `Q: SheetName` — spreadsheet viewer expects the real sheet name. */
export function normalizedWorkbookSheetName(tab: string): string {
  const t = (tab ?? "").trim();
  if (t.startsWith("Q: ")) return t.slice(3).trim();
  return t;
}

/** Open Appendix B (or questionnaire) workbook at a sheet/row in Vendor Submissions. */
export function workbookSubmissionHref(vendorId: string, sheetTab: string, row?: number): string {
  const tab = normalizedWorkbookSheetName(sheetTab);
  const params = new URLSearchParams();
  params.set("vendor", vendorId);
  params.set("type", "workbook");
  if (tab) params.set("tab", tab);
  if (row != null && row >= 1) params.set("row", String(row));
  return `/vendor-submissions/?${params.toString()}`;
}

export function parsePageFromProposalPage(page: string): number | undefined {
  const m = page.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

export function buildVendorSubmissionHref(meta: SourcePreviewMeta, vendorId?: string): string | null {
  if (!vendorId) return null;
  if (meta.kind === "workbook") {
    const row = parseRowFromLocation(meta.location);
    const params = new URLSearchParams();
    params.set("vendor", vendorId);
    params.set("type", "workbook");
    params.set("tab", normalizedWorkbookSheetName(meta.tab));
    if (row != null) params.set("row", String(row));
    return `/vendor-submissions/?${params.toString()}`;
  }
  if (meta.kind === "proposal") {
    const page = parsePageFromProposalPage(meta.page);
    const params = new URLSearchParams();
    params.set("vendor", vendorId);
    const slot = meta.submissionDoc ?? "proposal";
    params.set("type", slot);
    if (page != null && page >= 1) params.set("page", String(page));
    if (meta.proposalPart != null && meta.proposalPart >= 0) params.set("part", String(meta.proposalPart));
    if (slot === "supplemental" && meta.supplementalIndex != null && meta.supplementalIndex >= 0) {
      params.set("sup", String(meta.supplementalIndex));
    }
    const q = meta.searchQuery?.trim() ?? "";
    if (q.length >= 3) params.set("find", q.slice(0, 400));
    return `/vendor-submissions/?${params.toString()}`;
  }
  return null;
}

export function matchSheetTab(tabQuery: string | null, names: string[]): number {
  if (!tabQuery || names.length === 0) return 0;
  const q = decodeURIComponent(tabQuery).trim().toLowerCase();
  const exact = names.findIndex((n) => n.toLowerCase() === q);
  if (exact >= 0) return exact;
  const prefix = names.findIndex((n) => {
    const nl = n.toLowerCase();
    return nl.startsWith(q) || q.length >= 3 && nl.includes(q.slice(0, 4));
  });
  if (prefix >= 0) return prefix;
  const loose = names.findIndex((n) => n.toLowerCase().includes(q));
  return loose >= 0 ? loose : 0;
}
