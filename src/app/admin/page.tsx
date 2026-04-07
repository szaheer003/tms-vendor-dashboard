"use client";

import { useCallback, useEffect, useState } from "react";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { Tooltip } from "@/components/ui/Tooltip";
import type { WorkbookSourcePreview, AnalystSourcePreview } from "@/lib/sourceTypes";
import { allVendors, useDataset } from "@/lib/dataset";
import type { VendorRecord } from "@/lib/types";

const EXTRA_CHECKS: { id: string; label: string; test: (v: VendorRecord) => "ok" | "partial" | "missing" }[] = [
  {
    id: "tcv",
    label: "6.0 Total Annual Cost row populated",
    test: (v) => (v.pricing.tcvM > 0 ? "ok" : "missing"),
  },
  {
    id: "rates",
    label: "6.1 Rate grid has non-empty cells",
    test: (v) => {
      const any = v.rateCard.some((r) => [r.onshore, r.offshore, r.nearshore, r.emeaOnshore].some((x) => x && x !== "0"));
      return any ? "ok" : v.id === "ibm" ? "missing" : "partial";
    },
  },
  {
    id: "eff",
    label: "9.0 Efficiency assumptions",
    test: (v) => {
      if (!v.efficiency?.rows?.length) return "missing";
      const nonempty = v.efficiency.rows.some((r) => Object.values(r.cells).some(Boolean));
      return nonempty ? "ok" : "partial";
    },
  },
  {
    id: "gov",
    label: "5.0 Governance counts parsable",
    test: (v) => {
      const t = (v.governance?.commit ?? 0) + (v.governance?.partial ?? 0) + (v.governance?.cannotCommit ?? 0);
      return t > 0 ? "ok" : "missing";
    },
  },
];

function basename(p: string) {
  return p.split(/[/\\]/).pop() ?? p;
}

function tabMeta(v: VendorRecord, tab: string, st: string, extractionTimestamp: string | undefined): WorkbookSourcePreview {
  const ok = st === "ok";
  const partial = st === "partial";
  const label = ok ? "Complete" : partial ? "Partial" : "Pending";
  return {
    kind: "workbook",
    sourceFile: basename(v.workbookPath),
    tab,
    location: "Admin scan — sheet index",
    valueLabel: label,
    calculation: "Tab present in workbook + coarse density check",
    verified: ok,
    snapshot: null,
    extractionTimestamp,
  };
}

function drillTabStatus(v: VendorRecord, tabMatch: string): "ok" | "partial" | "missing" {
  const b = v.drilldownSnippets?.find((x) => x.tab.includes(tabMatch) || x.tab === tabMatch);
  if (!b || b.missing) return "missing";
  const n = b.snippets?.length ?? 0;
  if (n >= 4) return "ok";
  if (n >= 1) return "partial";
  return "missing";
}

const DETAILED_SUBMISSION: { label: string; test: (v: VendorRecord) => "ok" | "partial" | "missing" }[] = [
  { label: "2.0 — Industry experience content", test: (v) => drillTabStatus(v, "2.0") },
  { label: "3.0 — Case studies / references signal", test: (v) => drillTabStatus(v, "3.0") },
  { label: "4.0 — Workforce & delivery", test: (v) => drillTabStatus(v, "4.0") },
  { label: "5.0 — Technology / governance / AI", test: (v) => drillTabStatus(v, "5.0") },
  { label: "6.0 — Pricing & rate card rows", test: (v) => (v.rateCard?.length >= 3 && v.pricing.tcvM > 0 ? "ok" : v.pricing.tcvM > 0 ? "partial" : "missing") },
  { label: "7.0 — Client migration narrative", test: (v) => (v.migrationNotes && v.migrationNotes !== "—" ? "ok" : drillTabStatus(v, "7.0")) },
  { label: "8.0 — Regulatory compliance", test: (v) => drillTabStatus(v, "8.0") },
  { label: "9.0 — Efficiency grid populated", test: (v) => EXTRA_CHECKS.find((x) => x.id === "eff")!.test(v) },
  { label: "Appendix C — SOW path on file", test: (_v) => "partial" },
  { label: "Supporting — financials / insurance (analyst)", test: (_v) => "partial" },
];

function extraMeta(v: VendorRecord, check: { id: string; label: string }, st: "ok" | "partial" | "missing"): AnalystSourcePreview {
  const label = st === "ok" ? "Pass" : st === "partial" ? "Partial" : "Fail";
  return {
    kind: "analyst",
    valueLabel: label,
    note: `${check.label} · ${v.displayName} · file ${basename(v.workbookPath)} · heuristic status: ${st}.`,
  };
}

function statusLabel(st: "ok" | "partial" | "missing") {
  if (st === "ok") return "Complete";
  if (st === "partial") return "Partial";
  return "Missing";
}

function StatusDot({ st }: { st: "ok" | "partial" | "missing" }) {
  const label = statusLabel(st);
  const bg = st === "ok" ? "#059669" : st === "partial" ? "#D97706" : "#DC2626";
  return (
    <Tooltip content={label}>
      <span
        className="inline-block size-2 shrink-0 rounded-full cursor-default"
        style={{ backgroundColor: bg }}
        aria-label={label}
      />
    </Tooltip>
  );
}

const LS_RFP = "tms-admin-rfp-readiness-v1";
const LS_CHECKLIST_CELLS = "tms-admin-checklist-cell-v1";

type CellSt = "ok" | "partial" | "missing";

function effectiveChecklist(overrides: Record<string, CellSt>, key: string, computed: CellSt): CellSt {
  return overrides[key] ?? computed;
}

const RFP_READINESS_ROWS: { id: string; label: string; test: (v: VendorRecord) => "ok" | "partial" | "missing" }[] = [
  {
    id: "workbook",
    label: "Workbook submitted (2.0–5.0, 6.0–6.1, 7.0, 8.0, 9.0)",
    test: (v) => {
      const n = (v.adminTabs ?? []).filter((t) => t.status === "complete").length;
      return n >= 8 ? "ok" : n >= 5 ? "partial" : "missing";
    },
  },
  {
    id: "proposal",
    label: "Proposal PDF (analyst: received / page count)",
    test: () => "partial",
  },
  {
    id: "sow",
    label: "SOW redline (analyst: received / reviewed)",
    test: () => "partial",
  },
  {
    id: "rates",
    label: "Rate card complete (tiers + EMEA signal)",
    test: (v) => EXTRA_CHECKS.find((x) => x.id === "rates")!.test(v),
  },
  {
    id: "eff",
    label: "Efficiency tab (9.0) populated + certainty stated",
    test: (v) => EXTRA_CHECKS.find((x) => x.id === "eff")!.test(v),
  },
  {
    id: "migrate",
    label: "Migration plan (waves / timeline / RACI signal)",
    test: (v) => (v.migrationNotes && v.migrationNotes !== "—" && v.migrationNotes.length > 80 ? "ok" : "partial"),
  },
  {
    id: "gov",
    label: "Governance (5.0) counts parsable",
    test: (v) => EXTRA_CHECKS.find((x) => x.id === "gov")!.test(v),
  },
  {
    id: "onetime",
    label: "One-time costs itemized",
    test: (v) => (v.oneTimeLines?.length ? "ok" : v.id === "ubiquity" ? "partial" : "partial"),
  },
  {
    id: "cola",
    label: "COLA by geography stated",
    test: (v) => (v.colaAssumptions?.summary || v.id === "ibm" ? "ok" : "partial"),
  },
];

function CompletionDonut({ pct, color }: { pct: number; color: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="shrink-0 mx-auto">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#F1F5F9" strokeWidth="6" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

export default function AdminPage() {
  const { portfolio, vendorMap } = useDataset();
  const vendors = allVendors(portfolio, vendorMap);
  const ext = portfolio.extractionTimestamp;
  const [rfpReviews, setRfpReviews] = useState<Record<string, Record<string, { initials: string; iso: string }>>>({});
  const [cellOverrides, setCellOverrides] = useState<Record<string, CellSt>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RFP);
      if (raw) setRfpReviews(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CHECKLIST_CELLS);
      if (raw) setCellOverrides(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const setCellOverride = useCallback((key: string, value: "" | CellSt) => {
    setCellOverrides((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      try {
        localStorage.setItem(LS_CHECKLIST_CELLS, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const markRfpReviewed = useCallback((vendorId: string, rowId: string, initials: string) => {
    const ini = initials.trim().toUpperCase().slice(0, 4);
    if (!ini) return;
    setRfpReviews((prev) => {
      const next = {
        ...prev,
        [vendorId]: { ...prev[vendorId], [rowId]: { initials: ini, iso: new Date().toISOString() } },
      };
      try {
        localStorage.setItem(LS_RFP, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const tabRows: { label: string; tab: string; cells: Record<string, "ok" | "partial" | "missing"> }[] = [];
  for (const t of vendors[0]?.adminTabs ?? []) {
    tabRows.push({
      tab: t.tab,
      label: `Tab: ${t.tab}`,
      cells: Object.fromEntries(
        vendors.map((v) => {
          const st = v.adminTabs.find((x) => x.tab === t.tab)?.status ?? "missing";
          const norm =
            st === "complete" ? "ok" : st === "partial" ? "partial" : ("missing" as const);
          return [v.id, norm];
        }),
      ),
    });
  }

  const extraRows = EXTRA_CHECKS.map((ex) => ({
    label: ex.label,
    check: ex,
    cells: Object.fromEntries(vendors.map((v) => [v.id, ex.test(v)])),
  }));

  const detailRows = DETAILED_SUBMISSION.map((ex, idx) => ({
    rowKey: `detail-${idx}`,
    label: ex.label,
    cells: Object.fromEntries(vendors.map((v) => [v.id, ex.test(v)])),
  }));

  const pct = (v: VendorRecord) => {
    const rows = [
      ...tabRows.map((r) => effectiveChecklist(cellOverrides, `tab:${r.tab}:${v.id}`, r.cells[v.id])),
      ...extraRows.map((r) => effectiveChecklist(cellOverrides, `extra:${r.check.id}:${v.id}`, r.cells[v.id])),
      ...detailRows.map((r) => effectiveChecklist(cellOverrides, `${r.rowKey}:${v.id}`, r.cells[v.id])),
    ];
    let ok = 0;
    let total = 0;
    for (const s of rows) {
      total += 1;
      if (s === "ok") ok += 1;
      if (s === "partial") ok += 0.5;
    }
    return total ? Math.round((ok / total) * 100) : 0;
  };

  const counts = (v: VendorRecord) => {
    const rows = [
      ...tabRows.map((r) => effectiveChecklist(cellOverrides, `tab:${r.tab}:${v.id}`, r.cells[v.id])),
      ...extraRows.map((r) => effectiveChecklist(cellOverrides, `extra:${r.check.id}:${v.id}`, r.cells[v.id])),
      ...detailRows.map((r) => effectiveChecklist(cellOverrides, `${r.rowKey}:${v.id}`, r.cells[v.id])),
    ];
      let ok = 0,
      partial = 0,
      missing = 0;
    for (const s of rows) {
      if (s === "ok") ok++;
      else if (s === "partial") partial++;
      else missing++;
    }
    return { ok, partial, missing };
  };

  return (
    <div className="space-y-8 animate-page-in">
      <div>
        <h1 className="text-h1 text-[#0F172A]">Admin checklist</h1>
        <p className="text-body text-[#475569] mt-2 max-w-3xl">
          Workbook tab coverage, derived validation, and coarse section-level signals from extracted drill/migration text. Hover status dots for
          labels; click for source preview. Partial (amber) signals thin content — Ubiquity omits most standard tabs by design.
        </p>
        <VendorCaveatStrip vendorId="ubiquity" context="admin" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#F1F5F9] bg-white shadow-card">
        <table className="min-w-[900px] w-full text-body">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="text-left p-3 font-medium text-[#475569] w-[320px] sticky left-0 bg-[#F8FAFC] z-10">
                Requirement
              </th>
              {vendors.map((v) => (
                <th key={v.id} className="p-3 text-center font-medium text-h3" style={{ color: v.color }}>
                  {v.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#F8FAFC]">
              <td
                colSpan={vendors.length + 1}
                className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#475569] sticky left-0 bg-[#F8FAFC]"
              >
                Workbook tabs
              </td>
            </tr>
            {tabRows.map((r) => (
              <tr
                key={r.label}
                className="group border-b border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F1F5F9]/85"
              >
                <td className="p-3 text-[#0F172A] sticky left-0 z-10 bg-white group-hover:bg-[#F1F5F9]/85 transition-colors">
                  {r.label}
                </td>
                {vendors.map((v) => {
                  const st = r.cells[v.id];
                  const ck = `tab:${r.tab}:${v.id}`;
                  const eff = effectiveChecklist(cellOverrides, ck, st);
                  const overridden = cellOverrides[ck] != null;
                  return (
                    <td key={v.id} className="p-3 text-center align-middle group-hover:bg-[#F1F5F9]/85 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <Tooltip
                          content={
                            overridden ? "Overridden by analyst (saved in this browser only)" : "Override extracted heuristic below"
                          }
                        >
                          <span className="inline-flex justify-center">
                            <ProvenanceTrigger meta={tabMeta(v, r.tab, eff, ext)} vendorId={v.id}>
                              <StatusDot st={eff} />
                            </ProvenanceTrigger>
                          </span>
                        </Tooltip>
                        <select
                          aria-label={`Override status ${r.label} ${v.displayName}`}
                          className="max-w-[5.5rem] rounded border border-[#E2E8F0] bg-white px-0.5 py-0.5 text-micro text-[#475569]"
                          value={cellOverrides[ck] ?? ""}
                          onChange={(e) => setCellOverride(ck, (e.target.value || "") as "" | CellSt)}
                        >
                          <option value="">Auto</option>
                          <option value="ok">✓ OK</option>
                          <option value="partial">◐ Partial</option>
                          <option value="missing">✗ Missing</option>
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-[#F8FAFC]">
              <td
                colSpan={vendors.length + 1}
                className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#475569] sticky left-0 bg-[#F8FAFC]"
              >
                Derived checks
              </td>
            </tr>
            {extraRows.map((r) => (
              <tr
                key={r.label}
                className="group border-b border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F1F5F9]/85"
              >
                <td className="p-3 text-[#0F172A] sticky left-0 z-10 bg-white group-hover:bg-[#F1F5F9]/85 transition-colors">
                  {r.label}
                </td>
                {vendors.map((v) => {
                  const st = r.cells[v.id];
                  const ck = `extra:${r.check.id}:${v.id}`;
                  const eff = effectiveChecklist(cellOverrides, ck, st);
                  const overridden = cellOverrides[ck] != null;
                  return (
                    <td key={v.id} className="p-3 text-center align-middle group-hover:bg-[#F1F5F9]/85 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <Tooltip
                          content={
                            overridden ? "Overridden by analyst (saved in this browser only)" : "Override extracted heuristic below"
                          }
                        >
                          <span className="inline-flex justify-center">
                            <ProvenanceTrigger meta={extraMeta(v, r.check, eff)}>
                              <StatusDot st={eff} />
                            </ProvenanceTrigger>
                          </span>
                        </Tooltip>
                        <select
                          aria-label={`Override status ${r.label} ${v.displayName}`}
                          className="max-w-[5.5rem] rounded border border-[#E2E8F0] bg-white px-0.5 py-0.5 text-micro text-[#475569]"
                          value={cellOverrides[ck] ?? ""}
                          onChange={(e) => setCellOverride(ck, (e.target.value || "") as "" | CellSt)}
                        >
                          <option value="">Auto</option>
                          <option value="ok">✓ OK</option>
                          <option value="partial">◐ Partial</option>
                          <option value="missing">✗ Missing</option>
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-[#F8FAFC]">
              <td
                colSpan={vendors.length + 1}
                className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#475569] sticky left-0 bg-[#F8FAFC]"
              >
                Detailed submission requirements (heuristic)
              </td>
            </tr>
            {detailRows.map((r) => (
              <tr
                key={r.label}
                className="group border-b border-[#F1F5F9] transition-colors duration-150 hover:bg-[#F1F5F9]/85"
              >
                <td className="p-3 text-[#0F172A] sticky left-0 z-10 bg-white group-hover:bg-[#F1F5F9]/85 transition-colors text-caption">
                  {r.label}
                </td>
                {vendors.map((v) => {
                  const st = r.cells[v.id];
                  const ck = `${r.rowKey}:${v.id}`;
                  const eff = effectiveChecklist(cellOverrides, ck, st);
                  const overridden = cellOverrides[ck] != null;
                  return (
                    <td key={v.id} className="p-3 text-center align-middle group-hover:bg-[#F1F5F9]/85 transition-colors">
                      <div className="flex flex-col items-center gap-1">
                        <Tooltip
                          content={
                            overridden ? "Overridden by analyst (saved in this browser only)" : "Override extracted heuristic below"
                          }
                        >
                          <span className="inline-flex justify-center">
                            <ProvenanceTrigger meta={extraMeta(v, { id: "detail", label: r.label }, eff)}>
                              <StatusDot st={eff} />
                            </ProvenanceTrigger>
                          </span>
                        </Tooltip>
                        <select
                          aria-label={`Override status ${r.label} ${v.displayName}`}
                          className="max-w-[5.5rem] rounded border border-[#E2E8F0] bg-white px-0.5 py-0.5 text-micro text-[#475569]"
                          value={cellOverrides[ck] ?? ""}
                          onChange={(e) => setCellOverride(ck, (e.target.value || "") as "" | CellSt)}
                        >
                          <option value="">Auto</option>
                          <option value="ok">✓ OK</option>
                          <option value="partial">◐ Partial</option>
                          <option value="missing">✗ Missing</option>
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-[#E2E8F0] group">
              <td className="p-4 font-semibold text-[#0F172A] sticky left-0 bg-[#E2E8F0] z-10">Completion (approx.)</td>
              {vendors.map((v) => {
                const p = pct(v);
                return (
                  <td key={v.id} className="p-4 text-center align-middle">
                    <p className="text-h2 text-[#0F172A] tabular-nums">{p}%</p>
                    <CompletionDonut pct={p} color={v.color} />
                    {(() => {
                      const { ok, partial, missing } = counts(v);
                      return (
                        <p className="text-caption text-[#475569] mt-2">
                          <span className="text-[#059669]">{ok}✓</span>{" "}
                          <span className="text-[#D97706]">{partial}◐</span>{" "}
                          <span className="text-[#DC2626]">{missing}✗</span>
                        </p>
                      );
                    })()}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[#F1F5F9] bg-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A]">RFP readiness (granular)</h2>
        <p className="text-caption text-[#475569] mt-1 mb-4">
          Heuristic status per vendor. Enter initials and blur a cell to record analyst review (stored in this browser only).
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-body">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="sticky left-0 z-10 bg-[#F8FAFC] p-3 text-left font-medium text-[#475569]">Category</th>
                {vendors.map((v) => (
                  <th key={v.id} className="p-3 text-center text-h3" style={{ color: v.color }}>
                    {v.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RFP_READINESS_ROWS.map((row) => (
                <tr key={row.id} className="group border-b border-[#F1F5F9] transition-colors hover:bg-[#F1F5F9]/85">
                  <td className="sticky left-0 z-10 bg-white p-3 text-caption text-[#0F172A] group-hover:bg-[#F1F5F9]/85 transition-colors">
                    {row.label}
                  </td>
                  {vendors.map((v) => {
                    const st = row.test(v);
                    const rev = rfpReviews[v.id]?.[row.id];
                    return (
                      <td key={v.id} className="p-2 align-top text-center group-hover:bg-[#F1F5F9]/85 transition-colors">
                        <div className="flex flex-col items-center gap-1">
                          <StatusDot st={st} />
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="—"
                            defaultValue={rev?.initials ?? ""}
                            className="w-14 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1 py-0.5 text-center text-micro uppercase"
                            aria-label={`Review initials for ${v.displayName} ${row.label}`}
                            onBlur={(e) => markRfpReviewed(v.id, row.id, e.target.value)}
                          />
                          {rev && (
                            <span className="text-micro text-[#059669]">
                              {rev.initials} · {new Date(rev.iso).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
