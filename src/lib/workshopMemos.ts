import type { WorkshopMemo } from "@/lib/workshopTypes";
// Populated by scripts/extract_workshop_memos.py from Folder 6 DOCX (verbatim; do not hand-edit summaries).
import workshop1Json from "@/data/workshop1_memos.json";

const workshop1 = workshop1Json as WorkshopMemo[];

export function getWorkshop1Memos(): WorkshopMemo[] {
  return workshop1;
}

export function getWorkshop1Memo(vendorId: string): WorkshopMemo | undefined {
  return workshop1.find((m) => m.vendorId === vendorId);
}

/** True when JSON has been populated by extraction (non-empty body). */
export function memoHasBody(m: WorkshopMemo | undefined): boolean {
  if (!m) return false;
  const hasBottom = Boolean(m.bottomLine?.trim());
  const hasSections = Array.isArray(m.sections) && m.sections.length > 0;
  return hasBottom && hasSections;
}

export const WORKSHOP1_FUNNEL_VENDOR_IDS = [
  "cognizant",
  "genpact",
  "exl",
  "ibm",
  "sutherland",
  "ubiquity",
] as const;

/** Vendors with Workshop 1 memo tabs / print — same order as funnel (all six when JSON populated). */
export const WORKSHOP1_MEMO_VENDOR_IDS = WORKSHOP1_FUNNEL_VENDOR_IDS;
