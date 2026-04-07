"use client";

import Link from "next/link";
import { Sparkline } from "@/components/Sparkline";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SourcePreviewMeta } from "@/lib/sourceTypes";
import { daysUntil, MILESTONES } from "@/data/timeline";
import { useDataset, getVendor } from "@/lib/dataset";
import type { PortfolioVendor, VendorRecord } from "@/lib/types";

const VERDICT: Record<string, string> = {
  cognizant: "Deepest domain credentials; reconcile $25M story vs workbook & 100%* certainty.",
  genpact: "Lowest TCV, 7yr lock-in, certainty uncommitted (TBD) in Tab 9.0.",
  exl: "Aggressive India model; excludes severance + CCaaS — adjust TCO before comparing.",
  ibm: "Non-binding, blank efficiency, strongest governance posture on rubric.",
  sutherland: "Real TCV in 6.0; most granular migration; certainty % lowest in field.",
  ubiquity: "Above baseline — not a cost reduction proposal; workbook mostly 6.0 only.",
};

function qualifierNote(id: string) {
  if (id === "ibm") return <span className="text-micro text-[#D97706]">Non-binding</span>;
  if (id === "ubiquity") return <span className="text-micro text-[#DC2626]">Above baseline</span>;
  return null;
}

function vendorInvestmentLine(id: string, d: VendorRecord | undefined): string {
  const manual: Record<string, string> = {
    cognizant: "~$25M (proposal claim; reconcile vs workbook one-time)",
    genpact: "$23.3M",
    exl: "−$19.25M net credit (investment offset)",
    ibm: "~$11.3M (separate from operating TCV)",
    sutherland: d?.oneTimeLines?.length
      ? `$${(d.oneTimeLines.reduce((s, o) => s + (o.sumQuarterlyUsd ?? 0), 0) / 1e6).toFixed(2)}M (workbook one-time)`
      : "See Vendor Submissions",
    ubiquity: "$2M transition + $3M exclusivity (per proposal narrative)",
  };
  if (manual[id]) return manual[id]!;
  if (!d?.oneTimeLines?.length) return "Not specified";
  const sumUsd = d.oneTimeLines.reduce((s, o) => s + (o.sumQuarterlyUsd ?? 0), 0);
  if (sumUsd <= 0) return "Not specified";
  const s = `$${(sumUsd / 1e6).toFixed(2)}M (one-time, workbook)`;
  return s.trim() || "Not specified";
}

function tcvRankIndex(
  vendors: { id: string; tcvM: number }[],
  id: string,
): number {
  const sorted = [...vendors].sort((a, b) => a.tcvM - b.tcvM);
  return sorted.findIndex((v) => v.id === id) + 1;
}

export default function OverviewPage() {
  const { portfolio, vendorMap } = useDataset();
  const competitive = portfolio.vendors.filter((v) => v.id !== "ubiquity");
  const compMin = competitive.reduce((a, b) => (a.tcvM <= b.tcvM ? a : b));
  const compMax = competitive.reduce((a, b) => (a.tcvM >= b.tcvM ? a : b));
  const byTcv: PortfolioVendor[] = [...portfolio.vendors].sort((a, b) => a.tcvM - b.tcvM);
  const minV = byTcv[0]!;
  const maxV = byTcv[byTcv.length - 1]!;
  const tcvSpan = maxV.tcvM - minV.tcvM;
  const baseline5 = portfolio.baselineAnnualM.mid * 5;
  const shortlistM = MILESTONES.find((m) => m.id === "shortlist_approved");
  const downDays = shortlistM ? daysUntil(shortlistM.isoDate, new Date()) : 0;

  return (
    <div className="space-y-12 lg:space-y-16">
      <section className="text-center space-y-8 pt-2">
        <Tooltip
          content={
            <span className="max-w-[280px] whitespace-normal text-left block text-[11px]">
              {portfolio.vendors
                .filter((x) => x.id !== "ubiquity")
                .sort((a, b) => a.tcvM - b.tcvM)
                .map((v) => (
                  <span key={v.id} className="block tabular-nums">
                    {v.displayName}: ${v.tcvM.toFixed(2)}M
                  </span>
                ))}
            </span>
          }
        >
          <div className="cursor-default">
            <p className="text-display font-bold text-[#0F172A] tabular-nums tracking-tight">
              ${compMin.tcvM.toFixed(0)}M — ${compMax.tcvM.toFixed(0)}M
            </p>
            <p className="text-body text-[#475569] mt-3">5-year operating TCV competitive range (excl. Ubiquity)</p>
          </div>
        </Tooltip>

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-center max-w-4xl mx-auto">
          <div>
            <p className="text-[18px] font-medium text-[#0F172A] tabular-nums">${baseline5.toFixed(1)}M</p>
            <p className="text-[11px] text-[#475569] mt-1">5-yr baseline (mid × 5)</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#0F172A] tabular-nums">${portfolio.synergyTargetM}M/yr</p>
            <p className="text-[11px] text-[#475569] mt-1">Synergy target</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#0F172A] tabular-nums">6</p>
            <p className="text-[11px] text-[#475569] mt-1">Vendors</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#0F172A]">{shortlistM?.date ?? "Apr 7 – 8"}</p>
            <p className="text-[11px] text-[#475569] mt-1">Shortlist window</p>
          </div>
        </div>

        <p className="text-caption text-[#475569] max-w-2xl mx-auto">
          Operating TCV and Y1–Y3 from Tab 6.0. Cards below rank by ascending TCV (lowest = #1). Hover ● for provenance.
          {shortlistM ? (
            <>
              {" "}
              Workshop 1 complete · Down-selection {shortlistM.date} ({downDays} {downDays === 1 ? "day" : "days"} to end of window) —{" "}
              <Link href="/process/" className="text-[#0F172A] font-medium underline underline-offset-2 hover:text-[#334155]">
                View Process
              </Link>
            </>
          ) : null}
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {byTcv.map((pv) => {
          const d = getVendor(vendorMap, pv.id);
          const y = d?.pricing.years ?? [];
          const vals = y.map((x) => x.valueM);
          const provTcv = d?.pricing?.provenance?.tcvM as SourcePreviewMeta | undefined;
          const compVal = pv.composite;
          const provComp: SourcePreviewMeta = {
            kind: "scorecard",
            sourceFile: "Workshop 1 evaluator exports",
            location: "Weighted composite (1–9)",
            valueLabel: compVal != null && Number.isFinite(compVal) ? compVal.toFixed(2) : "—",
            note:
              compVal != null
                ? "Average across evaluator rubric; weighted by pillar per methodology."
                : "Composite will appear when evaluator scores are loaded.",
            extractionTimestamp: portfolio.extractionTimestamp,
          };
          const rankTcv = tcvRankIndex(portfolio.vendors, pv.id);
          const compDisplay =
            compVal != null && Number.isFinite(compVal) ? compVal.toFixed(2) : "—";

          return (
            <article
              key={pv.id}
              className="flex flex-col bg-white shadow-card border border-[#E2E8F0] p-6 pl-5 transition-fast hover:shadow-raised min-h-[320px]"
              style={{ borderLeftWidth: 2, borderLeftColor: pv.color }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-h3 font-medium uppercase tracking-[0.04em]" style={{ color: pv.color }}>
                    {pv.displayName}
                  </p>
                  <p className="text-micro text-[#334155] mt-2">Rank #{rankTcv} by 5-yr TCV</p>
                  <p className="text-micro text-[#334155] mt-1">Composite: {compDisplay}</p>
                </div>
                <div className="text-right">
                  <ProvenanceTrigger meta={provComp}>
                    <span className="text-h2 text-[#0F172A] tabular-nums font-medium">
                      {compVal != null && Number.isFinite(compVal) ? compVal.toFixed(2) : "—"}
                    </span>
                  </ProvenanceTrigger>
                  <p className="text-micro text-[#475569] mt-1">Composite</p>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <ProvenanceTrigger meta={provTcv} vendorId={pv.id}>
                    <span className="text-h1 font-bold text-[#0F172A] tabular-nums">${pv.tcvM.toFixed(1)}M</span>
                  </ProvenanceTrigger>
                  {qualifierNote(pv.id)}
                </div>
                <Sparkline values={vals} color={pv.color} />
              </div>
              <p className="text-micro text-[#475569] mt-2">5-year operating TCV</p>
              {(pv.id === "genpact" || pv.id === "ubiquity") && (
                <p className="text-[12px] text-[#334155] mt-1 italic">
                  {pv.id === "genpact"
                    ? "5-yr comparable operating TCV shown; vendor proposed a 7-year term — validate in contracting."
                    : "Trajectory priced over 5 years in model; confirm term and ramp vs 7-year ask in submissions."}
                </p>
              )}
              <p className="text-[13px] text-[#334155] mt-2">
                <span className="text-[#475569]">Vendor investment:</span>{" "}
                <span className="font-medium text-[#0F172A]">{vendorInvestmentLine(pv.id, d)}</span>
              </p>

              <p className="text-[13px] tabular-nums text-[#475569] mt-5 pt-5 border-t border-[#E2E8F0] flex flex-wrap gap-x-3 gap-y-1">
                {([0, 1, 2] as const).map((i) => {
                  const yp = d?.pricing.years[i];
                  const ym = yp?.valueM;
                  const pk = i === 0 ? "year1" : i === 1 ? "year2" : "year3";
                  const provY = d?.pricing?.provenance?.[pk] as SourcePreviewMeta | undefined;
                  return (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[#CBD5E1]">·</span>}
                      <span className="text-[#475569]">Y{i + 1}</span>{" "}
                      <ProvenanceTrigger meta={provY ?? provTcv} vendorId={pv.id}>
                        <span className="font-medium tabular-nums text-[#0F172A]">
                          {ym != null ? `$${Number(ym).toFixed(1)}M` : "—"}
                        </span>
                      </ProvenanceTrigger>
                    </span>
                  );
                })}
              </p>

              <div className="mt-auto pt-5 border-t border-[#E2E8F0]">
                <VendorCaveatStrip vendorId={pv.id} context="overview" />
                <p className="text-caption text-[#334155] mt-3 italic leading-relaxed">{VERDICT[pv.id]}</p>
              </div>
            </article>
          );
        })}
      </section>

      <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
        <p className="text-[14px] text-[#334155]">
          Detailed scoring breakdown available on the{" "}
          <Link href="/scorecard/" className="text-[#1E40AF] underline underline-offset-2 font-medium">
            Scorecard
          </Link>{" "}
          and{" "}
          <Link href="/scoring-dashboard/" className="text-[#1E40AF] underline underline-offset-2 font-medium">
            Scoring Dashboard
          </Link>
          .
        </p>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-1 gap-12">
        <div className="space-y-6">
          <h2 className="text-h2 font-medium text-[#0F172A] leading-snug">
            {minV.displayName} leads at ${minV.tcvM.toFixed(0)}M — TBD certainty means the floor isn&apos;t locked
          </h2>
          <p className="text-caption text-[#475569]">
            Lowest {minV.displayName} (${minV.tcvM.toFixed(1)}M) · Highest {maxV.displayName} (${maxV.tcvM.toFixed(1)}M) · Spread $
            {tcvSpan.toFixed(0)}M
          </p>
          <p className="text-[13px] text-[#334155] leading-relaxed pl-4 border-l-2 border-[#E2E8F0]">
            The ${tcvSpan.toFixed(0)}M spread between {minV.displayName} (${minV.tcvM.toFixed(1)}M) and {maxV.displayName} ($
            {maxV.tcvM.toFixed(1)}M) reflects different transformation postures: competitive bids cluster with offshore/AI efficiency, while
            Ubiquity&apos;s trajectory prices continuity without assumed FTE reduction — synergy must come from labor arbitrage and automation, not
            ops tweaks alone.{" "}
            <Link href="/commercial/" className="font-medium text-[#0F172A] underline underline-offset-2 hover:text-[#334155]">
              Full commercial comparison →
            </Link>
          </p>
        </div>
        <ul className="space-y-4 text-body text-[#0F172A]">
          {[
            "IBM operating TCV uses Row 119 only; do not net investment lines (~$11.3M) into operating TCV.",
            "Genpact’s lowest headline TCV sits beside TBD certainty — workshop must separate modeled savings from contractual certainty.",
            "EXL and others exclude items (severance, CCaaS) that change loaded comparisons; see Commercial.",
            "Ubiquity’s curve rises Y1–Y5 with no efficiency overlay — treat as continuity economics, not synergy.",
          ].map((t) => (
            <li key={t} className="pl-4 border-l-2 border-[#E2E8F0] text-caption text-[#334155] leading-relaxed">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div>
          <p className="text-[15px] font-semibold text-[#0F172A]">Commercial deep-dive</p>
          <p className="text-[13px] text-[#475569]">TCV comparison, annual trajectory, rate cards, COLA analysis</p>
        </div>
        <Link
          href="/commercial/"
          className="shrink-0 rounded-lg bg-[#0F172A] px-5 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-[#1E293B] transition-colors"
        >
          View Commercial →
        </Link>
      </div>
    </div>
  );
}
