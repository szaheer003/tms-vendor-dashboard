"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bestInClass, ScoreValueBlock } from "@/components/ScoreCell";
import { OverviewRadar } from "@/components/OverviewRadar";
import { ScoringMethodologyPanel } from "@/components/ScoringMethodologyPanel";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ScorecardSourcePreview } from "@/lib/sourceTypes";
import { DIMENSION_QUESTIONS } from "@/lib/dimensionQuestions";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { useDataset } from "@/lib/dataset";
import { EVALUATOR_IDS, EVALUATORS } from "@/lib/evaluatorData";
import type { ScoreDimension } from "@/lib/types";
import { SCORE_COLORS, SCORE_LABELS } from "@/lib/scoreGradient";
import evaluatorScoresBundled from "@/data/evaluatorScores.json";

function scorecardCellMeta(
  dimensionLabel: string,
  value: number | null | undefined,
  sourceLine: string,
  extractionTimestamp: string | undefined,
): ScorecardSourcePreview {
  const pending = value == null || !Number.isFinite(value);
  return {
    kind: "scorecard",
    sourceFile: "Workshop 1 evaluator exports",
    location: dimensionLabel,
    valueLabel: pending ? "—" : Number(value).toFixed(2),
    note: pending
      ? "No score in current import."
      : `${sourceLine.slice(0, 200)} · Average across evaluator responses.`,
    extractionTimestamp,
  };
}

function sortDimsForVendor(dims: ScoreDimension[], pillar: string, sortVendorId: string | null): ScoreDimension[] {
  const list = dims.filter((d) => d.pillar === pillar);
  if (!sortVendorId) return list;
  return [...list].sort((a, b) => {
    const sa = a.scores[sortVendorId];
    const sb = b.scores[sortVendorId];
    const na = typeof sa === "number" && Number.isFinite(sa) ? sa : -Infinity;
    const nb = typeof sb === "number" && Number.isFinite(sb) ? sb : -Infinity;
    return nb - na;
  });
}

export default function ScorecardPage() {
  const { portfolio } = useDataset();
  const ext = portfolio.extractionTimestamp;
  const order = portfolio.scorecard.columnOrder;
  const dims = portfolio.scorecard.dimensions;
  const vendors = order.map((id) => portfolio.vendors.find((v) => v.id === id)!);
  const pillars = Array.from(new Set(dims.map((d) => d.pillar)));

  const [collapsedPillars, setCollapsedPillars] = useState<Set<string>>(() => new Set());
  const [sortVendorId, setSortVendorId] = useState<string | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ dimensionId: string; vendorId: string } | null>(null);
  const evaluatorMatrix = useMemo(() => {
    const d = evaluatorScoresBundled as { scores?: Record<string, Record<string, Record<string, number | null>>> };
    return d?.scores ?? null;
  }, []);

  const panelDim = panel ? dims.find((d) => d.id === panel.dimensionId) : null;
  const panelVendor = panel ? vendors.find((v) => v.id === panel.vendorId) : null;
  const scoreSrc = portfolio.scorecard.source;

  const pillarBlocks = useMemo(() => {
    return pillars.map((pillar) => ({
      pillar,
      dims: sortDimsForVendor(dims, pillar, sortVendorId),
    }));
  }, [dims, pillars, sortVendorId]);

  function togglePillar(p: string) {
    setCollapsedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  const radarPending = portfolio.scorecard.dimensions[0]?.scores[order[0] ?? "cognizant"] == null;
  const compositeBarData = useMemo(
    () =>
      [...vendors]
        .sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1))
        .map((v) => ({
          name: v.displayName.slice(0, 12),
          full: v.displayName,
          composite: v.composite ?? 0,
          color: v.color,
        })),
    [vendors],
  );

  return (
    <div className="space-y-10 relative">
      <div>
        <h1 className="text-h1 text-ink">Ranking matrix</h1>
        <p className="text-body text-ink-secondary mt-2 max-w-4xl">
          Fifteen dimensions across six vendors. Weighted composite uses Partnership 10% and Commercial, Operational, Technology, and Migration each 22.5%. Click a cell for evaluator-level breakdown.
        </p>
      </div>

      <p className="text-caption text-[#475569] max-w-3xl pl-4 border-l-2 border-[#E2E8F0]">{scoreSrc}</p>

      <ScoringMethodologyPanel />

      <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#475569] mb-2">Score scale (1–9 — rubric anchors)</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {([1, 3, 7, 9] as const).map((k) => (
            <div key={k} className="flex items-center gap-2 text-[12px] text-[#475569]">
              <span className="h-3 w-3 rounded-sm shrink-0 ring-1 ring-black/10" style={{ backgroundColor: SCORE_COLORS[k] }} />
              <span className="font-mono tabular-nums font-semibold text-[#0F172A]">{k}</span>
              <span>— {SCORE_LABELS[k]}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#475569] mt-2">
          Legend: 1 = Does Not Meet, 3 = Partially Meets, 7 = Meets, 9 = Exceeds (Strong). “Strong” in memos maps to these rubric anchors.
        </p>
      </div>

      <section className="pb-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...vendors]
            .sort((a, b) => (b.composite ?? -999) - (a.composite ?? -999))
            .map((v, idx) => (
              <div
                key={v.id}
                className="bg-white p-3 shadow-card text-center border border-[#E2E8F0] rounded-xl max-h-[120px] overflow-hidden flex flex-col"
                style={{ borderTopWidth: 3, borderTopColor: v.color }}
              >
                <p className="text-[13px] font-bold leading-tight truncate" style={{ color: v.color }}>
                  {v.displayName}
                </p>
                <div className="mt-1 flex justify-center shrink-0">
                  <ProvenanceTrigger meta={scorecardCellMeta("Weighted composite", v.composite, scoreSrc, ext)}>
                    <span className="text-[22px] font-bold text-[#0F172A] tabular-nums leading-none">
                      {v.composite != null && Number.isFinite(v.composite) ? v.composite.toFixed(2) : "—"}
                    </span>
                  </ProvenanceTrigger>
                </div>
                <p className="text-[11px] text-[#475569] mt-1 leading-tight">
                  #{idx + 1} · {v.composite == null ? "pending" : "composite"}
                </p>
                <VendorCaveatStrip vendorId={v.id} context="scorecard" />
              </div>
            ))}
        </div>
      </section>

      {!radarPending ? (
        <section className="max-w-[900px] mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-2 min-w-0">
            <h2 className="text-h3 font-semibold text-[#0F172A]">Composite comparison</h2>
            <p className="text-caption text-[#475569]">Weighted composite by vendor (1–9 scale).</p>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compositeBarData} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal vertical={false} />
                  <XAxis type="number" domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11, fill: "#334155" }} interval={0} />
                  <RTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as (typeof compositeBarData)[0];
                      if (!row) return null;
                      return (
                        <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] shadow-md">
                          <p className="font-semibold text-[#0F172A]">{row.full}</p>
                          <p className="tabular-nums text-[#475569]">{row.composite.toFixed(2)} · composite</p>
                        </div>
                      );
                    }}
                    wrapperStyle={{ zIndex: 70 }}
                  />
                  <Bar dataKey="composite" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {compositeBarData.map((e) => (
                      <Cell key={e.full} fill={e.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[300px]">
              <h2 className="text-h3 font-semibold text-[#0F172A] text-center mb-2">Pillar radar</h2>
              <p className="text-caption text-[#475569] text-center mb-2">Field average vs vendors</p>
              <OverviewRadar portfolio={portfolio} scoresPending={false} />
            </div>
          </div>
        </section>
      ) : null}

      <div className="overflow-x-auto bg-white shadow-card border border-[#E2E8F0]">
        <table className="min-w-[1100px] w-full text-[13px]">
          <thead className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="sticky left-0 z-30 bg-[#F8FAFC] text-left p-2 font-medium text-[#475569] w-[280px] border-r border-[#E2E8F0] align-bottom">
                Dimension
              </th>
              {vendors.map((v) => (
                <th
                  key={v.id}
                  className={`p-1 text-center font-medium min-w-[48px] max-w-[56px] h-36 cursor-pointer transition-fast border-b-2 align-bottom ${
                    sortVendorId === v.id ? "border-[#0F172A] bg-white" : "border-transparent hover:bg-white/80"
                  } ${hoverCol === v.id ? "bg-white/90" : ""}`}
                  onMouseEnter={() => setHoverCol(v.id)}
                  onMouseLeave={() => setHoverCol(null)}
                  onClick={() => setSortVendorId((cur) => (cur === v.id ? null : v.id))}
                  title="Click to sort by this vendor (high → low)"
                >
                  <span
                    className="inline-block text-[11px] font-medium uppercase tracking-[0.06em] leading-tight max-h-32"
                    style={{
                      color: v.color,
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {v.displayName}
                  </span>
                  {sortVendorId === v.id && <span className="block text-[10px] font-normal normal-case text-[#475569] mt-1">↓</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pillarBlocks.map(({ pillar, dims: pillarDims }) => {
              const collapsed = collapsedPillars.has(pillar);
              const pctMatch = pillar.match(/\(([\d.]+%)\)\s*$/);
              const pillarLabelOnly = pctMatch ? pillar.slice(0, pctMatch.index).trim() : pillar;
              return (
                <Fragment key={pillar}>
                  <tr className="bg-[#FAFAFA] border-l-2 border-l-[#CBD5E1]">
                    <td
                      colSpan={vendors.length + 1}
                      className="sticky left-0 z-10 bg-[#FAFAFA] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[#475569] cursor-pointer hover:bg-[#F8FAFC] transition-fast border-y border-[#E2E8F0]"
                      onClick={() => togglePillar(pillar)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          togglePillar(pillar);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="inline-block w-4 text-[#475569]">{collapsed ? "▸" : "▾"}</span>
                      {pillarLabelOnly}
                      {pctMatch ? (
                        <span className="ml-2 tabular-nums text-[#475569] font-semibold normal-case">({pctMatch[1]})</span>
                      ) : null}
                    </td>
                  </tr>
                  {!collapsed &&
                    pillarDims.map((d) => {
                      const bic = bestInClass(d.scores, order);
                      const rowHot = hoverRow === d.id;
                      return (
                        <tr
                          key={d.id}
                          className={`border-b border-[#E2E8F0] transition-fast font-mono ${
                            rowHot ? "bg-[#F8FAFC]" : "hover:bg-[#FAFAFA]"
                          }`}
                          onMouseEnter={() => setHoverRow(d.id)}
                          onMouseLeave={() => setHoverRow(null)}
                        >
                          <td className="sticky left-0 z-10 bg-white p-2 align-top border-r border-[#E2E8F0] shadow-[2px_0_8px_-4px_rgba(0,0,0,0.06)]">
                            <p className="font-medium text-[#0F172A] text-caption">{d.label}</p>
                            <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">{DIMENSION_QUESTIONS[d.id] ?? ""}</p>
                          </td>
                          {order.map((id) => {
                            const sc = d.scores[id];
                            const isBest = bic.has(id);
                            const meta = scorecardCellMeta(d.label, sc, scoreSrc, ext);
                            const pending = sc == null || !Number.isFinite(sc);
                            const colHot = hoverCol === id;
                            return (
                              <td
                                key={id}
                                className={`py-2 px-3 min-h-[2.5rem] text-center align-middle transition-fast ${colHot ? "bg-[#F8FAFC]" : ""}`}
                                onMouseEnter={() => setHoverCol(id)}
                                onMouseLeave={() => setHoverCol(null)}
                              >
                                <Tooltip
                                  content={
                                    <span className="max-w-[240px] whitespace-normal text-left block text-[11px]">
                                      {pending
                                        ? "Score not available for this cell"
                                        : `Score ${Number(sc).toFixed(Number.isInteger(sc as number) ? 0 : 1)} · ${d.label}`}
                                    </span>
                                  }
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className={`inline-flex justify-center cursor-pointer ${
                                      isBest && !pending ? "ring-1 ring-[#059669] ring-offset-1 rounded-sm" : ""
                                    }`}
                                    onClick={() => setPanel({ dimensionId: d.id, vendorId: id })}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setPanel({ dimensionId: d.id, vendorId: id });
                                      }
                                    }}
                                  >
                                    <ProvenanceTrigger meta={meta} vendorId={id}>
                                      <ScoreValueBlock value={pending ? null : sc} />
                                    </ProvenanceTrigger>
                                  </div>
                                </Tooltip>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
            <tr className="bg-[#FAFAFA] border-t border-[#E2E8F0]">
              <td className="sticky left-0 z-10 bg-[#FAFAFA] p-2 font-medium text-caption text-[#0F172A]">
                Weighted composite
              </td>
              {order.map((id) => {
                const wc = portfolio.scorecard.composite[id];
                const wPending = wc == null || !Number.isFinite(wc);
                return (
                  <td key={id} className="py-2 px-3 text-center align-middle">
                    <ProvenanceTrigger meta={scorecardCellMeta("Weighted composite", wc, scoreSrc, ext)}>
                      <ScoreValueBlock value={wPending ? null : wc} />
                    </ProvenanceTrigger>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {panel && panelDim && panelVendor && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/20 animate-fade-in print-hide"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          />
          <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-border bg-surface-raised shadow-modal flex flex-col animate-slide-up print-hide">
            <div className="px-6 py-4 border-b border-border-subtle flex items-start justify-between gap-3">
              <div>
                <p className="text-micro font-semibold uppercase tracking-wide text-[#475569]">Cell detail</p>
                <p className="text-h3 font-semibold text-ink mt-1" style={{ color: panelVendor.color }}>
                  {panelVendor.displayName}
                </p>
                <p className="text-body text-ink-secondary mt-2">{panelDim.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="text-caption font-medium text-[#0F172A] px-2 py-1 rounded-btn border border-transparent hover:border-[#E2E8F0] transition-fast"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-body text-ink-secondary">
              <p className="text-caption text-[#475569]">{DIMENSION_QUESTIONS[panelDim.id] ?? ""}</p>
              <div className="rounded-btn border border-border bg-surface-sunken p-4">
                <p className="text-micro uppercase tracking-wider text-ink-faint font-medium mb-2">Evaluator inputs</p>
                {evaluatorMatrix && panel ? (
                  <ul className="space-y-2 text-caption text-ink-secondary">
                    {EVALUATOR_IDS.map((eid) => {
                      const v = evaluatorMatrix[panel.vendorId]?.[eid]?.[panel.dimensionId];
                      const pending = v == null || !Number.isFinite(v);
                      return (
                        <li key={eid} className="flex justify-between gap-2 border-b border-border-subtle pb-1">
                          <span className="text-[#475569]">{EVALUATORS[eid]?.label ?? eid}</span>
                          <span className="tabular-nums font-medium text-ink">{pending ? "—" : Number(v).toFixed(1)}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-body">Loading evaluator breakdown…</p>
                )}
              </div>
              <Link
                href="/drill-down"
                className="inline-flex text-caption font-medium text-[#0F172A] border-b border-[#E2E8F0] hover:border-[#0F172A] transition-fast"
              >
                View in drill-down →
              </Link>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
