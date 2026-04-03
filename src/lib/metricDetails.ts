/** Click-through detail for summary metrics — governance from extraction when available. */

import type { VendorRecord } from "./types";

export type GovernanceLine = { status: "commit" | "partial" | "cannot"; label: string };

const COGNIZANT_TEMPLATE_LABELS: string[] = [
  "FIS data ownership",
  "No proprietary formats",
  "Full data extraction on exit",
  "Client retains telephony/IVR",
  "12-month coexistence environment",
  "Fund tech debt remediation",
  "Quantified AI projections (contractual)",
  "Open APIs / no lock-in",
  "AI governance documentation",
  "AI overlays via API (no core migration)",
  "Full coexistence architecture plan",
  "AI pre-approval by FIS governance",
];

export const GOVERNANCE_BY_VENDOR: Record<string, GovernanceLine[]> = {
  cognizant: [
    { status: "commit", label: "FIS data ownership" },
    { status: "commit", label: "No proprietary formats" },
    { status: "commit", label: "Full data extraction on exit" },
    { status: "commit", label: "Client retains telephony/IVR" },
    { status: "partial", label: "12-month coexistence environment" },
    { status: "partial", label: "Fund tech debt remediation" },
    { status: "partial", label: "Quantified AI projections (contractual)" },
    { status: "cannot", label: "Open APIs / no lock-in" },
    { status: "cannot", label: "AI governance documentation" },
    { status: "cannot", label: "AI overlays via API (no core migration)" },
    { status: "cannot", label: "Full coexistence architecture plan" },
    { status: "cannot", label: "AI pre-approval by FIS governance" },
  ],
};

function synthesizeFromCounts(v: VendorRecord): GovernanceLine[] | null {
  const g = v.governance;
  const c = g?.commit ?? 0;
  const p = g?.partial ?? 0;
  const x = g?.cannotCommit ?? 0;
  if (c + p + x === 0) return null;
  const labels = [...COGNIZANT_TEMPLATE_LABELS];
  const out: GovernanceLine[] = [];
  let i = 0;
  const take = (n: number, st: GovernanceLine["status"]) => {
    for (let k = 0; k < n && i < labels.length; k++) {
      out.push({ status: st, label: labels[i]! });
      i++;
    }
  };
  take(c, "commit");
  take(p, "partial");
  take(x, "cannot");
  while (out.length < 12 && i < labels.length) {
    out.push({ status: "cannot", label: labels[i]! });
    i++;
  }
  return out.length ? out : null;
}

export function governanceItemsForVendor(v: VendorRecord): GovernanceLine[] | null {
  if (v.governanceItems?.length) return v.governanceItems;
  const manual = GOVERNANCE_BY_VENDOR[v.id];
  if (manual?.length) return manual;
  return synthesizeFromCounts(v);
}
