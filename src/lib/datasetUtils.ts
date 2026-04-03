import type { Portfolio, PortfolioVendor, VendorRecord } from "./types";

export function allVendors(portfolio: Portfolio, vendorMap: Record<string, VendorRecord>): VendorRecord[] {
  return portfolio.vendors.map((pv) => vendorMap[pv.id]).filter((x): x is VendorRecord => Boolean(x));
}

export function getVendor(vendorMap: Record<string, VendorRecord>, id: string): VendorRecord | undefined {
  return vendorMap[id];
}

/** Sort for overview cards: composite when present, else ascending TCV. */
export function vendorsByComposite(portfolio: Portfolio): PortfolioVendor[] {
  return [...portfolio.vendors].sort((a, b) => {
    if (a.composite != null && b.composite != null) return b.composite - a.composite;
    if (a.composite != null) return -1;
    if (b.composite != null) return 1;
    return a.tcvM - b.tcvM;
  });
}

const META_KINDS = new Set(["workbook", "proposal", "scorecard", "analyst"]);

/** Count provenance meta objects (`kind` = workbook | proposal | scorecard | analyst) in vendor JSON. */
export function countSourcePreviewLeaves(obj: unknown): number {
  if (obj == null || typeof obj !== "object") return 0;
  if (Array.isArray(obj)) return obj.reduce<number>((n, x) => n + countSourcePreviewLeaves(x), 0);
  const o = obj as Record<string, unknown>;
  if (typeof o.kind === "string" && META_KINDS.has(o.kind)) {
    return 1;
  }
  return Object.values(o).reduce<number>((n, v) => n + countSourcePreviewLeaves(v), 0);
}
