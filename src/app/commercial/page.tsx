"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AnnualFeeChart,
  CumulativeSavingsChart,
  OneTimeCostsByCategoryChart,
  RateCardHeatmap,
} from "@/components/CommercialCharts";
import { InterpretationPanel } from "@/components/InterpretationPanel";
import { PrintButton } from "@/components/PrintButton";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { Chip } from "@/components/ui/Chip";
import type { SourcePreviewMeta } from "@/lib/sourceTypes";
import { allVendors, useDataset } from "@/lib/dataset";
import type { Portfolio, VendorRecord } from "@/lib/types";

function fmtUsdM(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${(n / 1e6).toFixed(2)}M`;
}

/** Normalize workbook rate cells: hourly $ with 2 decimals, or return note-style text. */
function formatRateCell(raw: string): { display: string; isNote: boolean } {
  const t = raw.trim();
  if (!t) return { display: "Declined", isNote: true };
  const lower = t.toLowerCase();
  if (
    lower.includes("declin") ||
    lower.includes("fixed price") ||
    lower.includes("managed service") ||
    (lower.includes("provided") && lower.includes("narrative"))
  ) {
    return { display: t, isNote: true };
  }
  const cleaned = t.replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  if (!Number.isNaN(n) && n > 0 && n < 50000) {
    return { display: `$${n.toFixed(2)}/hr`, isNote: false };
  }
  return { display: t, isNote: true };
}

function certaintySnippet(v: VendorRecord): string {
  const eff = v.efficiency;
  if (!eff?.rows?.length) return "—";
  const headers = eff.headers ?? [];
  const certH = headers.find((h) => h.toLowerCase().includes("certainty")) ?? headers[headers.length - 1];
  const us = eff.rows.find((r) => r.geography.toLowerCase().includes("us")) ?? eff.rows[0];
  return us?.cells?.[certH]?.trim() || "—";
}

function laborSnippet(v: VendorRecord): string {
  const eff = v.efficiency;
  if (!eff?.rows?.length) return "—";
  const headers = eff.headers ?? [];
  const arbH = headers.find((h) => h.toLowerCase().includes("arbitrage")) ?? "";
  const us = eff.rows.find((r) => r.geography.toLowerCase().includes("us")) ?? eff.rows[0];
  return arbH ? us?.cells?.[arbH] || "—" : "—";
}

const EFF_HASH =
  "bg-[repeating-linear-gradient(45deg,#e2e8f0_0,#e2e8f0_1px,transparent_1px,transparent_6px)] bg-slate-50";

/** Parse first signed percentage from a Tab 9.0 cell (e.g. "29%", "-29.5 %"). */
function parseEfficiencyPercent(raw: string): number | null {
  const t = (raw || "").trim().toLowerCase();
  if (!t || t === "—") return null;
  if (t.includes("tbd") || t.includes("n/a") || t.includes("vendor to provide")) return null;
  const m = t.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function fisTargetPctForEffHeader(h: string): number | null {
  const x = h.toLowerCase();
  if (x.includes("arbitrage") || (x.includes("labor") && x.includes("mix"))) return 34;
  if (x.includes("digit")) return 7.8;
  if (x.includes("productiv")) return 3.0;
  return null;
}

function efficiencyCellTint(val: string, header: string): string {
  const tgt = fisTargetPctForEffHeader(header);
  if (tgt == null) return "";
  const p = parseEfficiencyPercent(val);
  if (p == null) return `${EFF_HASH} text-[#475569]`;
  if (p < 0) return "bg-red-50 text-red-700";
  if (p >= tgt) return "bg-emerald-50 text-emerald-900";
  return "bg-amber-50 text-amber-900";
}

function effTreatment(v: VendorRecord): { opacity: string; pattern: string; badge: string } {
  const c = certaintySnippet(v).toLowerCase();
  if (c === "—" || !v.efficiency?.rows?.length) return { opacity: "opacity-40", pattern: "", badge: "Not submitted" };
  if (c.includes("tbd")) return { opacity: "opacity-25", pattern: "bg-[repeating-linear-gradient(90deg,#94a3b8_0,#94a3b8_2px,transparent_2px,transparent_5px)]", badge: "TBD" };
  if (c.includes("100%") || c === "yes")
    return { opacity: "opacity-100", pattern: "", badge: "Stated commitment" };
  return { opacity: "opacity-60", pattern: "", badge: "Partial / numeric" };
}

function vendorBadges(id: string): { label: string; color: string }[] {
  const out: { label: string; color: string }[] = [];
  if (id === "ibm") out.push({ label: "Non-binding", color: "#D97706" });
  if (id === "genpact") out.push({ label: "7yr minimum", color: "#4338CA" });
  if (id === "exl") out.push({ label: "Excl. severance / CCaaS", color: "#EA580C" });
  if (id === "ubiquity") out.push({ label: "Above baseline", color: "#DC2626" });
  return out;
}

function competitiveTcvs(vendors: VendorRecord[]) {
  const xs = vendors.filter((v) => v.id !== "ubiquity").map((v) => v.pricing.tcvM ?? 0);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

/** Directional incremental $M if IBM operating TCV escalated at constant r per year (illustrative). */
function ibmColaStress(portfolio: Portfolio, r: number): number {
  const ibm = portfolio.vendors.find((x) => x.id === "ibm");
  if (!ibm) return 0;
  return ibm.tcvM * (Math.pow(1 + r, 5) - 1);
}

function CommercialPageInner() {
  const searchParams = useSearchParams();
  const { portfolio, vendorMap } = useDataset();
  const vendors = allVendors(portfolio, vendorMap);
  const mid = portfolio.baselineAnnualM.mid;
  const low = portfolio.baselineAnnualM.low;
  const [highlightVendorId, setHighlightVendorId] = useState<string | null>(null);
  const highlighted = highlightVendorId ? portfolio.vendors.find((x) => x.id === highlightVendorId) : null;

  useEffect(() => {
    const v = searchParams.get("vendor");
    if (v && portfolio.vendors.some((x) => x.id === v)) {
      setHighlightVendorId(v);
    }
  }, [searchParams, portfolio.vendors]);

  const chartHighlight = {
    highlightVendorId,
    onVendorToggle: setHighlightVendorId,
  };

  const efficiencyRefHeaders = useMemo(() => {
    const v = vendors.find((x) => (x.efficiency?.headers ?? []).length);
    return (v?.efficiency?.headers ?? []).filter((h) => fisTargetPctForEffHeader(h) != null);
  }, [vendors]);

  return (
    <div className="space-y-8 commercial-print relative">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-[#0F172A]">Commercial</h1>
          <p className="text-body text-[#475569] mt-2 max-w-3xl">
            Vendors converge by Y3 — Genpact steepest decline; Ubiquity rises with no efficiency overlay. Each ● opens source preview with workbook mini-grid.
          </p>
          <p className="text-caption text-[#475569] mt-1">
            Headline TCV mixes fixed-fee and rate-card mechanics — normalize COLA, exclusions, and scope before comparing vendors.
          </p>
        </div>
        <PrintButton />
      </div>

      {highlighted && (
        <div className="print-hide fixed top-20 right-6 z-40 flex items-center gap-2 rounded-chip border border-border bg-white px-4 py-2 shadow-popover animate-scale-in">
          <span className="text-caption font-semibold text-ink">
            Viewing: <span style={{ color: highlighted.color }}>{highlighted.displayName}</span>
          </span>
          <button
            type="button"
            onClick={() => setHighlightVendorId(null)}
            className="text-caption font-semibold text-accent hover:text-ink transition-colors px-1"
            aria-label="Clear vendor highlight"
          >
            ✕
          </button>
        </div>
      )}

      <section className="print-hide print:break-before-page space-y-4">
        <div className="overflow-x-auto py-2">
        <h2 className="text-[18px] font-bold text-[#0F172A]">
          1. Five-year TCV comparison
        </h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4 max-w-3xl">
          Who offers the lowest total cost of ownership over the contract term on a comparable 5-year operating basis?
        </p>
        <h3 className="text-h2 text-[#0F172A] mt-4">
          Genpact leads at ${[...portfolio.vendors].sort((a, b) => a.tcvM - b.tcvM)[0]?.tcvM.toFixed(0)}M — but TBD certainty means the floor
          isn&apos;t locked
        </h3>
        <p className="text-caption text-[#475569] mt-1 mb-6">Certainty and structural badges — normalize COLA and exclusions before comparing.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-2">
          {[...portfolio.vendors]
            .sort((a, b) => a.tcvM - b.tcvM)
            .map((pv) => {
              const prov = getVendorProvenance(pv.id, portfolio, vendorMap);
              return (
                <div
                  key={pv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setHighlightVendorId((cur) => (cur === pv.id ? null : pv.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setHighlightVendorId((cur) => (cur === pv.id ? null : pv.id));
                    }
                  }}
                  className={`min-w-0 rounded-card bg-white p-2 shadow-subtle cursor-pointer transition-all duration-150 card-interactive max-h-[100px] overflow-hidden ${
                    highlightVendorId === pv.id ? "ring-2 ring-accent ring-offset-2" : ""
                  }`}
                  style={{ borderTopWidth: 3, borderTopColor: pv.color }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: pv.color }}>
                    {pv.displayName}
                  </p>
                  <ProvenanceTrigger meta={prov} vendorId={pv.id}>
                    <span className="text-[22px] font-bold text-[#0F172A] tabular-nums block mt-1 leading-tight max-h-[32px]">${pv.tcvM.toFixed(1)}M</span>
                  </ProvenanceTrigger>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {vendorBadges(pv.id).map((b) => (
                      <Chip key={b.label} label={b.label} color={b.color} size="sm" />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
        <InterpretationPanel>
          <p>
            The competitive range is roughly ${competitiveTcvs(vendors).min.toFixed(0)}–${competitiveTcvs(vendors).max.toFixed(0)}M on a 5-year operating
            basis — material savings vs baseline — but headline TCV is not apples-to-apples until COLA mechanics, exclusions (EXL), and non-binding
            posture (IBM) are normalized in Workshop 1. Ubiquity near ${portfolio.vendors.find((x) => x.id === "ubiquity")?.tcvM.toFixed(0)}M is a
            continuity anchor, not a synergy bid. See{" "}
            <Link href="/workshops/?workshop=1" className="text-[#0F172A] font-medium underline underline-offset-2 hover:text-[#334155]">
              Workshop 1 memos
            </Link>{" "}
            for how vendors defended these numbers in session.
          </p>
        </InterpretationPanel>
        </div>
      </section>

      <section className="print:break-before-page space-y-4">
        <div className="space-y-4">
        <h2 className="text-[18px] font-bold text-[#0F172A]">2. Annual fee trajectory</h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4">How do fees change year-over-year — and what does that imply for run-rate?</p>
        <h3 className="text-h2 text-[#0F172A] mt-2">
          High Y1 fees (Sutherland, Ubiquity) front-load transition; IBM&apos;s low Y1 bills partial scope — FIS still funds the rest
        </h3>
        <p className="text-caption text-[#475569]">Dashed grey: ~$144M/yr lower bound; dark: mid-case ~${mid}M/yr.</p>
        <AnnualFeeChart vendors={vendors} baselineMid={mid} baselineAnnualLow={low} {...chartHighlight} />
        <InterpretationPanel>
          <p>
            Vendors with high Year-1 cash (Sutherland, Ubiquity) are absorbing transition or retaining high-cost staffing. IBM&apos;s low Year-1
            reflects partial managed-services scope — not full run-rate savings. The discipline question is Year 3 run-rate: which trajectory stays
            below ~$110M/yr while still hitting the ${portfolio.synergyTargetM}M/yr FY28 synergy envelope.
          </p>
        </InterpretationPanel>
        </div>
      </section>

      <section className="print:break-before-page space-y-4">
        <div className="space-y-4">
        <h2 className="text-[18px] font-bold text-[#0F172A]">3. Cumulative savings vs baseline</h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4">Which trajectories approach the ${portfolio.synergyTargetM}M/yr synergy envelope?</p>
        <h3 className="text-h2 text-[#0F172A] mt-2">
          Cumulative savings vs baseline — who approaches the ${portfolio.synergyTargetM}M/yr FY28 test?
        </h3>
        <p className="text-caption text-[#475569]">Positive = cumulative spend below mid baseline through that year (workbook fees). Green dashed: 3-year proxy at target run-rate.</p>
        <CumulativeSavingsChart
          vendors={vendors}
          baselineAnnual={mid}
          synergyAnnualM={portfolio.synergyTargetM}
          {...chartHighlight}
        />
        <InterpretationPanel>
          <p>
            FIS needs roughly ${portfolio.synergyTargetM}M/year by FY28 to close the integration case. Genpact and Cognizant bend cumulative savings
            faster than peers on this view; Sutherland starts underwater on cumulative cash because of a heavy Year 1. IBM&apos;s early &quot;savings&quot; are
            partly a scope artifact — validate in workshop before treating as efficiency. Ubiquity remains negative vs baseline — expected for a
            continuity curve.
          </p>
        </InterpretationPanel>
        </div>
      </section>

      <section className="print:break-before-page grid grid-cols-1 gap-8">
        <div className="space-y-4">
          <h2 className="text-[18px] font-bold text-[#0F172A]">4. Rate card comparison</h2>
          <p className="text-[14px] text-[#475569] mt-1 mb-4">
            Lower rates indicate competitive pricing. Blank cells = vendor declined to provide.
          </p>
          <h3 className="text-[16px] font-semibold text-[#0F172A]">
            Rate card comparison — Tier 1 Customer Service, onshore &amp; offshore ($/hr)
          </h3>
          <h3 className="text-h2 text-[#0F172A] mt-3">
            EXL&apos;s India rate (~$11.95/hr) is far below field — onshore blanks block hybrid queue modeling
          </h3>
          <p className="text-caption text-[#475569]">Sample rows per vendor; IBM typically declines granular 6.1 lines.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#0F172A] text-white text-[12px] font-semibold">
                  <th className="px-3 py-2 text-left rounded-tl-lg">Tier / row</th>
                  <th className="px-3 py-2 text-left">Onshore</th>
                  <th className="px-3 py-2 text-left rounded-tr-lg">Offshore</th>
                </tr>
              </thead>
              <tbody>
                {vendors.flatMap((v) =>
                  v.rateCard.slice(0, 4).map((r) => {
                    const on = formatRateCell(r.onshore || "");
                    const off = formatRateCell(r.offshore || "");
                    return (
                      <tr key={`${v.id}-${r.label}`} className="border-b border-[#F1F5F9] even:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-semibold text-[13px] text-[#0F172A]" style={{ color: v.color }}>
                          {v.displayName}: {r.label}
                        </td>
                        <td className={`py-2 px-3 text-[13px] ${on.isNote ? "text-[#DC2626] italic text-[12px]" : "text-[#0F172A]"}`}>
                          <ProvenanceTrigger meta={r.sourcePreview as SourcePreviewMeta} vendorId={v.id}>
                            <span>{on.display}</span>
                          </ProvenanceTrigger>
                        </td>
                        <td className={`py-2 px-3 text-[13px] ${off.isNote ? "text-[#DC2626] italic text-[12px]" : "text-[#0F172A]"}`}>
                          <ProvenanceTrigger meta={r.sourcePreview as SourcePreviewMeta} vendorId={v.id}>
                            <span>{off.display}</span>
                          </ProvenanceTrigger>
                        </td>
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 border-l-2 border-[#E2E8F0] bg-[#F8FAFC] pl-4 pr-4 py-3 text-body text-[#475569]">
            Rate comparison context: the spread between lowest offshore tiles (e.g. India CS near $12/hr where quoted) and premium onshore fraud
            or specialty rows (often $50+/hr) encodes delivery model choices — India-first vs US-retained specialists — not spreadsheet noise. IBM
            often declines granular rate lines; treat narrative pricing as a different instrument than unit rates.
          </div>
          <h3 className="text-h2 text-[#0F172A] mt-8">
            IBM declined granular 6.1 rates — the heatmap shows where EXL onshore gaps block hybrid queue TCO
          </h3>
          <p className="text-caption text-[#475569] mb-4">
            Greener = lower quoted $/hr where numeric; gray = blank or narrative; IBM shows Declined (fixed-price model).
          </p>
          <RateCardHeatmap vendors={vendors} {...chartHighlight} />
          <InterpretationPanel>
            <p>
              Where onshore cells are empty (notably EXL), FIS cannot model blended-shore economics without follow-up. Offshore concentration explains
              headline TCV compression — workshop validation should tie each tier to contractual runbooks and surge rules, not spreadsheet aesthetics alone.
            </p>
          </InterpretationPanel>
        </div>
      </section>

      <section className="print:break-before-page space-y-4">
        <div className="space-y-4">
        <h2 className="text-[18px] font-bold text-[#0F172A]">5. Operational efficiency (Tab 9.0)</h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4">
          Transformation levers vendors modeled in Tab 9.0 — read each percentage beside certainty language before treating savings as bankable.
        </p>
        <h3 className="text-h2 text-[#0F172A] mt-3">
          Tab 9.0 efficiency grid — hover ● for source preview where available
        </h3>
        <p className="text-caption text-[#475569]">Per-cell previews attach where populated in the workbook extract.</p>
        <div className="overflow-x-auto space-y-8">
          {vendors.map((v) => {
            const rows = v.efficiency?.rows ?? [];
            const headers = v.efficiency?.headers ?? [];
            if (!rows.length) {
              return (
                <div key={v.id}>
                  <p className="text-h3 mb-2" style={{ color: v.color }}>
                    {v.displayName}
                  </p>
                  <p className="text-caption text-[#475569]">No Tab 9.0 grid extracted.</p>
                </div>
              );
            }
            return (
              <div key={v.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-h3" style={{ color: v.color }}>
                    {v.displayName}
                  </p>
                  <VendorCaveatStrip vendorId={v.id} context="commercial" />
                </div>
                <table className="min-w-[640px] w-full border-collapse text-caption">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="p-2 text-left font-semibold text-[#475569]">Geo</th>
                      {headers.map((h) => (
                        <th key={h} className="p-2 text-left font-semibold text-[#475569]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.geography} className="border-b border-[#F1F5F9]">
                        <td className="p-2 font-medium text-[#0F172A]">{row.geography}</td>
                        {headers.map((h) => {
                          const val = row.cells[h] ?? "";
                          const prov = row.cellProvenance?.[h] as SourcePreviewMeta | undefined;
                          const tint = efficiencyCellTint(val, h);
                          return (
                            <td key={h} className={`p-2 align-top ${tint || "text-[#0F172A]"}`}>
                              <ProvenanceTrigger meta={prov ?? (v.efficiency?.sourcePreview as SourcePreviewMeta)} vendorId={v.id}>
                                <span className="tabular-nums">{val || "—"}</span>
                              </ProvenanceTrigger>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        {efficiencyRefHeaders.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] p-4 text-caption text-[#475569]">
            <p className="font-semibold text-[#0F172A] mb-2">FIS planning targets (reference — Tab 9.0 comparison)</p>
            <table className="min-w-[480px] w-full border-collapse">
              <thead>
                <tr className="text-left text-micro text-[#475569]">
                  <th className="p-2">Row</th>
                  {efficiencyRefHeaders.map((h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[#E2E8F0]">
                  <td className="p-2 font-medium text-[#0F172A]">FIS target</td>
                  {efficiencyRefHeaders.map((h) => (
                    <td key={h} className="p-2 tabular-nums font-semibold text-[#059669]">
                      {fisTargetPctForEffHeader(h)}%
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-micro text-[#475569]">
              Labor arbitrage 34% (28:72 on:off) · Digitization 7.8% · Productivity 3.0%. Cell tint: green ≥ target, amber below but positive, red
              negative, hashed TBD/blank.
            </p>
          </div>
        ) : null}
        <InterpretationPanel>
          <p>
            This table separates modeled labor-arb / productivity from certainty language. Where certainty is TBD or numeric (&lt;100%), treat savings as
            negotiation space until contract text matches the model. IBM&apos;s sparse grid pushes diligence to non-binding proposal language.
          </p>
        </InterpretationPanel>
        <h3 className="text-h2 text-[#0F172A] mt-6">
          Three vendors claim 30%+ modeled savings — certainty language separates bankable from aspirational
        </h3>
        <p className="text-caption text-[#475569]">TBD = hatched treatment; solid = stated commitment language in Tab 9.0.</p>
        <div className="space-y-4">
          {vendors.map((v) => {
            const tr = effTreatment(v);
            const effPv = v.efficiency?.sourcePreview as SourcePreviewMeta | undefined;
            return (
              <div key={v.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-h3 uppercase tracking-[0.05em]" style={{ color: v.color }}>
                    {v.displayName}
                  </span>
                  <span className="text-micro px-2 py-0.5 rounded-badge bg-[#F1F5F9] text-[#475569]">{tr.badge}</span>
                </div>
                <VendorCaveatStrip vendorId={v.id} context="commercial" />
                <ProvenanceTrigger meta={effPv} vendorId={v.id}>
                  <div className={`h-10 rounded-lg overflow-hidden flex ${tr.opacity} ${tr.pattern} bg-[#E2E8F0]`}>
                    <div className="h-full flex-1 bg-[#0F172A]/10 border-r border-[#F1F5F9] flex items-center px-2 text-caption text-[#0F172A] truncate">
                      Arb: {laborSnippet(v)}
                    </div>
                    <div className="h-full flex-1 bg-[#CBD5E1]/60 flex items-center px-2 text-caption text-[#0F172A] truncate">
                      Certainty: {certaintySnippet(v)}
                    </div>
                  </div>
                </ProvenanceTrigger>
              </div>
            );
          })}
        </div>
        <div className="mt-6 border-l-2 border-[#E2E8F0] bg-[#F8FAFC] pl-4 pr-4 py-3 text-body text-[#475569]">
          Efficiency claims need to be read beside certainty language in Tab 9.0. Where certainty is TBD, modeled labor-arb and productivity
          percentages describe ambition, not enforceable commitment — the workshop should trace each lever to contract text. IBM&apos;s blank grid
          pushes proof to proposal language until populated.
        </div>
        <InterpretationPanel>
          <p>
            The horizontal bars encode Tab 9.0 labor-arb vs certainty language at a glance — use them to prioritize follow-up questions in workshop,
            not as final scoring inputs.
          </p>
        </InterpretationPanel>
        </div>
      </section>

      <section className="print:break-before-page space-y-4">
        <div className="space-y-4">
        <h2 className="text-[18px] font-bold text-[#0F172A]">6. One-time transition costs</h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4">
          Upfront transition and investment cash (workbook Section 6.4, summed quarters) — use to stress-test Year-1 funding alongside operating TCV.
        </p>
        <h3 className="text-h2 text-[#0F172A] mt-3">
          Ubiquity shows no extracted one-time lines — peers cluster training, dual-run, and tech migration in transition cash
        </h3>
        <p className="text-caption text-[#475569]">
          Rows mapped heuristically from 6.4 labels (training, dual-run, tech/migration, professional services, setup/rebadging, investment/other).
        </p>
        <OneTimeCostsByCategoryChart vendors={vendors} {...chartHighlight} />
        <InterpretationPanel>
          <p>
            Genpact&apos;s gross one-time stack is large before vendor credits; EXL&apos;s training and dual-run lines dominate Y1 cash needs. Ubiquity at
            $0 on this view reflects extraction gaps or true continuity pricing — confirm in Vendor Submissions. Use the line-item list below for row-level
            provenance.
          </p>
        </InterpretationPanel>
        <h3 className="text-[17px] font-semibold text-[#0F172A] mb-4 mt-8">Line items (Section 6.4, summed quarters)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-card border border-[#F1F5F9] p-4">
              <p className="font-semibold text-h3 mb-2" style={{ color: v.color }}>
                {v.displayName}
              </p>
              {v.oneTimeLines.length === 0 ? (
                <p className="text-caption text-[#475569] italic">No labeled one-time rows extracted.</p>
              ) : (
                <ul className="text-body space-y-2 text-[#0F172A]">
                  {v.oneTimeLines.map((o) => (
                    <li key={o.label}>
                      <ProvenanceTrigger meta={o.sourcePreview as SourcePreviewMeta} vendorId={v.id}>
                        <span>
                          {o.label} (row {o.row}): {fmtUsdM(o.sumQuarterlyUsd)}
                        </span>
                      </ProvenanceTrigger>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        </div>
      </section>

      <section className="print:break-before-page space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-subtle">
        <h2 className="text-[18px] font-bold text-[#0F172A]">7. COLA &amp; cost escalation sensitivity</h2>
        <p className="text-[14px] text-[#475569] mt-1 mb-4">
          Long-term cost risk if inflation or indexation clauses apply — illustrative math only; normalize with legal and procurement before decisions.
        </p>
        <details className="mt-0 group rounded-lg border border-[#E2E8F0] bg-white p-4">
          <summary className="cursor-pointer text-[15px] font-semibold text-[#0F172A] list-none flex items-center justify-between">
            <span>IBM COLA sensitivity (illustrative)</span>
            <span className="text-caption text-[#475569] group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="mt-3 space-y-3 text-body text-[#475569]">
            <p>
              <span className="font-semibold text-[#0F172A]">IBM COLA stress:</span> IBM states 0% COLA pending mutual agreement — the $
              {portfolio.vendors.find((x) => x.id === "ibm")?.tcvM.toFixed(1)}M headline is a <strong>floor</strong>. Illustrative compound on
              operating TCV: +3%/yr ≈ <strong>${ibmColaStress(portfolio, 0.03).toFixed(0)}M</strong> over 5 years; +5%/yr ≈{" "}
              <strong>${ibmColaStress(portfolio, 0.05).toFixed(0)}M</strong>.
            </p>
            <p className="text-caption text-[#475569]">Scenario math is directional only — not legal or contractual guidance.</p>
          </div>
        </details>
      </section>

      <section className="print:break-before-page grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vendors.map((v) => (
          <div
            key={v.id}
            className="space-y-3 rounded-lg border border-[#F1F5F9] bg-white p-6 shadow-card"
          >
            <p className="text-h3 uppercase tracking-[0.05em]" style={{ color: v.color }}>
              {v.displayName}
            </p>
            <ul className="text-caption text-[#475569] space-y-2">
              <li>
                <span className="text-[#475569]">TCV (5-yr): </span>
                <ProvenanceTrigger meta={v.pricing?.provenance?.tcvM as SourcePreviewMeta} vendorId={v.id}>
                  <span className="font-semibold text-[#0F172A]">${v.pricing.tcvM.toFixed(1)}M</span>
                </ProvenanceTrigger>
              </li>
              <li>
                <span className="text-[#475569]">Certainty (US&CA): </span>
                {certaintySnippet(v)}
              </li>
              <li>
                <span className="text-[#475569]">Governance (auto-count): </span>
                {v.governance.commit ?? 0}C / {v.governance.partial ?? 0}P / {v.governance.cannotCommit ?? 0}X
              </li>
            </ul>
          </div>
        ))}
      </section>

      <section>
        <div className="rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-6 text-body text-[#92400E] space-y-2 shadow-subtle">
        <p>
          <span className="font-semibold">IBM:</span> Non-binding language — ${portfolio.vendors.find((x) => x.id === "ibm")?.tcvM}M operating floor until COLA and binding terms close.
        </p>
        <p>
          <span className="font-semibold">Ubiquity:</span> Above-baseline economics; rising fee trajectory.
        </p>
        <p>
          <span className="font-semibold">EXL:</span> Severance and CCaaS excluded; loaded TCO higher than headline TCV.
        </p>
        </div>
      </section>
    </div>
  );
}

export default function CommercialPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#475569]">Loading commercial…</div>}>
      <CommercialPageInner />
    </Suspense>
  );
}

function getVendorProvenance(
  id: string,
  portfolio: Portfolio,
  vendorMap: Record<string, VendorRecord>,
): SourcePreviewMeta | undefined {
  const v = allVendors(portfolio, vendorMap).find((x) => x.id === id);
  return v?.pricing?.provenance?.tcvM as SourcePreviewMeta | undefined;
}
