"use client";

import Link from "next/link";
import { OverviewRadar } from "@/components/OverviewRadar";
import { Sparkline } from "@/components/Sparkline";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { TcvDivergingStrip } from "@/components/overview/TcvDivergingStrip";
import { Tooltip } from "@/components/ui/Tooltip";
import type { SourcePreviewMeta } from "@/lib/sourceTypes";
import { daysUntil, EVALUATOR_SCORES_TARGET_LINE, MILESTONES } from "@/data/timeline";
import { useDataset, vendorsByComposite, getVendor } from "@/lib/dataset";

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

export default function OverviewPage() {
  const { portfolio, vendorMap } = useDataset();
  const ranked = vendorsByComposite(portfolio);
  const baseline5 = portfolio.baselineAnnualM.mid * 5;
  const competitive = portfolio.vendors.filter((v) => v.id !== "ubiquity");
  const compMin = competitive.reduce((a, b) => (a.tcvM <= b.tcvM ? a : b));
  const compMax = competitive.reduce((a, b) => (a.tcvM >= b.tcvM ? a : b));
  const minV = ranked.reduce((a, b) => (a.tcvM <= b.tcvM ? a : b));
  const maxV = ranked.reduce((a, b) => (a.tcvM >= b.tcvM ? a : b));
  const tcvSpan = maxV.tcvM - minV.tcvM;
  const downM = MILESTONES.find((m) => m.id === "downselect");
  const downDays = downM ? daysUntil(downM.isoDate, new Date()) : 0;
  const firstVendorCol = portfolio.scorecard.columnOrder[0] ?? "cognizant";
  const radarScoresPending = portfolio.scorecard.dimensions[0]?.scores[firstVendorCol] == null;

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
              ${compMin.tcvM.toFixed(0)} — ${compMax.tcvM.toFixed(0)}M
            </p>
            <p className="text-body text-[#64748B] mt-3">5-year competitive range (excl. Ubiquity)</p>
          </div>
        </Tooltip>

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-center max-w-4xl mx-auto">
          <div>
            <p className="text-[18px] font-medium text-[#0F172A] tabular-nums">${baseline5.toFixed(1)}M</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">5-yr baseline (mid × 5)</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#059669] tabular-nums">${portfolio.synergyTargetM}M/yr</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">Synergy target</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#0F172A] tabular-nums">6</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">Vendors</p>
          </div>
          <div>
            <p className="text-[18px] font-medium text-[#0F172A]">{downM?.date ?? "Apr 8"}</p>
            <p className="text-[11px] text-[#94A3B8] mt-1">Shortlist target</p>
          </div>
        </div>

        <p className="text-caption text-[#94A3B8] max-w-2xl mx-auto">
          Operating TCV and Y1–Y3 from Tab 6.0. Ranking below is by TCV until composite scores land. Hover ● for provenance.
          {downM ? (
            <>
              {" "}
              Workshop 1 complete · Down-selection {downM.date} ({downDays} {downDays === 1 ? "day" : "days"}) —{" "}
              <Link href="/process/" className="text-[#0F172A] font-medium underline underline-offset-2 hover:text-[#334155]">
                View Process
              </Link>
            </>
          ) : null}
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {ranked.map((pv, idx) => {
          const d = getVendor(vendorMap, pv.id);
          const y = d?.pricing.years ?? [];
          const vals = y.map((x) => x.valueM);
          const provTcv = d?.pricing?.provenance?.tcvM as SourcePreviewMeta | undefined;
          const provComp: SourcePreviewMeta = {
            kind: "scorecard",
            sourceFile: "Pending — Workshop 1",
            location: "Weighted composite score",
            valueLabel: "—",
            note: "Scores will be entered after evaluator sessions; matrix intentionally blank.",
            extractionTimestamp: portfolio.extractionTimestamp,
          };

          return (
            <article
              key={pv.id}
              className="bg-white shadow-card border border-[#F1F5F9] p-6 pl-5 transition-fast hover:shadow-raised"
              style={{ borderLeftWidth: 2, borderLeftColor: pv.color }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-h3 font-medium uppercase tracking-[0.04em]" style={{ color: pv.color }}>
                    {pv.displayName}
                  </p>
                  <p className="text-micro text-[#94A3B8] mt-2">Rank #{idx + 1} by TCV</p>
                </div>
                <div className="text-right">
                  <ProvenanceTrigger meta={provComp}>
                    <span className="text-h2 text-[#CBD5E1] tabular-nums font-medium">—</span>
                  </ProvenanceTrigger>
                  <p className="text-micro text-[#94A3B8] mt-1">Composite</p>
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
              <p className="text-micro text-[#94A3B8] mt-2">5-year operating TCV</p>
              <VendorCaveatStrip vendorId={pv.id} context="overview" />

              <p className="text-caption text-[#64748B] mt-5 pt-5 border-t border-[#F1F5F9] flex flex-wrap gap-x-3 gap-y-1">
                {([0, 1, 2] as const).map((i) => {
                  const yp = d?.pricing.years[i];
                  const ym = yp?.valueM;
                  const pk = i === 0 ? "year1" : i === 1 ? "year2" : "year3";
                  const provY = d?.pricing?.provenance?.[pk] as SourcePreviewMeta | undefined;
                  return (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[#CBD5E1]">·</span>}
                      <span className="text-micro text-[#94A3B8]">Y{i + 1}</span>{" "}
                      <ProvenanceTrigger meta={provY ?? provTcv} vendorId={pv.id}>
                        <span className="font-medium tabular-nums text-[#0F172A]">
                          {ym != null ? `$${Number(ym).toFixed(1)}M` : "—"}
                        </span>
                      </ProvenanceTrigger>
                    </span>
                  );
                })}
              </p>

              <p className="text-caption text-[#64748B] mt-5 italic leading-relaxed">{VERDICT[pv.id]}</p>
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-h2 font-medium text-[#0F172A]">Pillar positioning</h2>
          <p className="text-caption text-[#94A3B8] mt-2">
            Mean scores by pillar when Workshop 1 data is available (scores target {EVALUATOR_SCORES_TARGET_LINE}).
          </p>
        </div>
        {radarScoresPending ? (
          <p className="text-caption text-[#94A3B8]">Composite scoring pending Workshop 1 evaluations</p>
        ) : (
          <OverviewRadar portfolio={portfolio} scoresPending={false} />
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-12 xl:gap-16">
        <div className="xl:col-span-3 space-y-6">
          <h2 className="text-h2 font-medium text-[#0F172A] leading-snug">
            Genpact leads at ${minV.tcvM.toFixed(0)}M — TBD certainty means the floor isn&apos;t locked
          </h2>
          <p className="text-caption text-[#94A3B8]">
            Lowest {minV.displayName} (${minV.tcvM.toFixed(1)}M) · Highest {maxV.displayName} (${maxV.tcvM.toFixed(1)}M)
          </p>
          <TcvDivergingStrip vendors={portfolio.vendors} baselineFiveYearM={baseline5} />
          <p className="text-[13px] text-[#64748B] leading-relaxed pl-4 border-l-2 border-[#E2E8F0]">
            The ${tcvSpan.toFixed(0)}M spread between {minV.displayName} (${minV.tcvM.toFixed(1)}M) and {maxV.displayName} (${maxV.tcvM.toFixed(1)}M) reflects
            different transformation postures: competitive bids cluster with offshore/AI efficiency, while Ubiquity&apos;s trajectory prices continuity
            without assumed FTE reduction — synergy must come from labor arbitrage and automation, not ops tweaks alone.
          </p>
        </div>
        <ul className="xl:col-span-2 space-y-4 text-body text-[#0F172A]">
          {[
            "IBM operating TCV uses Row 119 only; do not net investment lines (~$11.3M) into operating TCV.",
            "Genpact’s lowest headline TCV sits beside TBD certainty — workshop must separate modeled savings from contractual certainty.",
            "EXL and others exclude items (severance, CCaaS) that change loaded comparisons; see Commercial.",
            "Ubiquity’s curve rises Y1–Y5 with no efficiency overlay — treat as continuity economics, not synergy.",
          ].map((t) => (
            <li key={t} className="pl-4 border-l-2 border-[#F1F5F9] text-caption text-[#64748B] leading-relaxed">
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
