"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import {
  EVALUATORS,
  EVALUATOR_IDS,
  flattenScoredSubs,
  CONFIDENCE_LEVELS,
  QUALITATIVE_QUESTIONS,
  type ConfidenceVotes,
  type ProceedVotes,
  type QualitativeResponses,
  type ScoredMatrix,
  VENDOR_IDS,
} from "@/lib/evaluatorData";
import { scoreBgContinuous, scoreColor, scoreHeatTextOnRamp, scoreLabel } from "@/lib/scoreGradient";
import type { Portfolio, PortfolioVendor } from "@/lib/types";
import { Tooltip } from "@/components/ui/Tooltip";
import { FilterChip } from "@/components/ui/Chip";
import { EVALUATOR_SCORES_TARGET_LINE } from "@/data/timeline";
import bundledEvaluatorJson from "@/data/evaluatorScores.json";
import { mergeEvaluatorScoresPayload, type EvaluatorScoresPayload } from "@/lib/evaluatorScoresMerge";

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdevSample(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const m = mean(nums)!;
  const v = nums.reduce((s, x) => s + (x - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

function avgForCell(scores: ScoredMatrix, vendorId: string, subId: string): number | null {
  const vals = EVALUATOR_IDS.map((eid) => scores[vendorId]?.[eid]?.[subId]).filter(
    (x): x is number => x != null && Number.isFinite(x),
  );
  return mean(vals);
}

function stdevForCell(scores: ScoredMatrix, vendorId: string, subId: string): number | null {
  const vals = EVALUATOR_IDS.map((eid) => scores[vendorId]?.[eid]?.[subId]).filter(
    (x): x is number => x != null && Number.isFinite(x),
  );
  return stdevSample(vals);
}

function weightedComposite(scores: ScoredMatrix, vendorId: string): number | null {
  const rows = flattenScoredSubs();
  const byPillar = new Map<string, { weight: number; vals: number[] }>();
  for (const r of rows) {
    const av = avgForCell(scores, vendorId, r.id);
    if (!byPillar.has(r.pillarKey)) byPillar.set(r.pillarKey, { weight: r.weight, vals: [] });
    if (av != null) byPillar.get(r.pillarKey)!.vals.push(av);
  }
  let totalW = 0;
  let acc = 0;
  for (const { weight, vals } of Array.from(byPillar.values())) {
    if (!vals.length) continue;
    const pm = mean(vals);
    if (pm == null) continue;
    acc += weight * pm;
    totalW += weight;
  }
  if (totalW === 0) return null;
  return acc / totalW;
}

const bundledInit = mergeEvaluatorScoresPayload(bundledEvaluatorJson as EvaluatorScoresPayload);

export function EvaluatorScoresClient({ portfolio }: { portfolio: Portfolio }) {
  const [scores, setScores] = useState(() => bundledInit.scores);
  const [qual, setQual] = useState(() => bundledInit.qualitative);
  const [confidence, setConfidence] = useState(() => bundledInit.confidence);
  const [proceed, setProceed] = useState(() => bundledInit.proceed);
  const [importNote, setImportNote] = useState<string | null>(() => bundledInit.importNote);
  const columnOrder = portfolio.scorecard.columnOrder;
  const [vendorTab, setVendorTab] = useState<string>(columnOrder[0] ?? VENDOR_IDS[0]!);

  const vendors = columnOrder.map((id) => portfolio.vendors.find((v) => v.id === id)!).filter(Boolean) as PortfolioVendor[];
  const flatSubs = useMemo(() => flattenScoredSubs(), []);
  const pillarGroups = useMemo(() => {
    const m = new Map<string, typeof flatSubs>();
    for (const r of flatSubs) {
      if (!m.has(r.pillarLabel)) m.set(r.pillarLabel, []);
      m.get(r.pillarLabel)!.push(r);
    }
    return m;
  }, [flatSubs]);

  const highDiv = useMemo(() => {
    const out: { vendorId: string; subId: string; sd: number }[] = [];
    for (const vid of columnOrder) {
      for (const r of flatSubs) {
        const sd = stdevForCell(scores, vid, r.id);
        if (sd != null && sd > 2) out.push({ vendorId: vid, subId: r.id, sd });
      }
    }
    return out;
  }, [scores, columnOrder, flatSubs]);

  const composites = useMemo(() => {
    return columnOrder.map((id) => ({ id, c: weightedComposite(scores, id) }));
  }, [scores, columnOrder]);

  const anyNumeric = useMemo(() => {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        for (const sub of flatSubs) {
          const x = scores[vid]?.[eid]?.[sub.id];
          if (x != null) return true;
        }
      }
    }
    return false;
  }, [scores, flatSubs]);

  return (
    <div className="space-y-12 animate-page-in">
      <div>
        <h1 className="text-h1 text-[#0F172A]">Evaluator scores</h1>
        <p className="mt-2 max-w-3xl text-body text-[#475569]">
          Workshop 1 evaluator workbook data syncs into this dashboard automatically after import. Qualitative responses (Q3–Q7), numeric matrix (1–9),
          confidence, and proceed votes appear here when present in the active dataset.
        </p>
        {importNote ? (
          <p className="mt-3 text-caption text-[#059669] max-w-3xl border-l-2 border-[#059669] pl-3">{importNote}</p>
        ) : null}
        <p className="text-[13px] text-[#475569] mt-4 max-w-4xl">
          Scoring methodology and scale definitions are on the{" "}
          <Link href="/scorecard/" className="text-[#1E40AF] underline underline-offset-2 font-medium">
            Scorecard
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 print-hide">
        {vendors.map((v) => (
          <span
            key={v.id}
            className="text-micro font-medium"
            style={{ color: v.color }}
          >
            {v.displayName}
          </span>
        ))}
      </div>

      {!anyNumeric && (
        <>
          <div className="text-center py-12 max-w-2xl mx-auto">
            <p className="text-h2 text-[#475569] font-medium leading-snug">Evaluator scores will be populated after Workshop 1</p>
            <p className="text-body text-[#475569] mt-4">{EVALUATOR_SCORES_TARGET_LINE}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-16 max-w-3xl mx-auto">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#475569] mb-4">Pillars &amp; weights</p>
              <ul className="space-y-2 text-body text-[#0F172A]">
                <li>Commercial Attractiveness — 22.5%</li>
                <li>Operational Excellence — 22.5%</li>
                <li>Technology &amp; AI — 22.5%</li>
                <li>Client &amp; Workforce Migration — 22.5%</li>
                <li>Partnership Readiness — 10%</li>
              </ul>
              <p className="text-caption text-[#475569] mt-4">Scale: 1 / 3 / 7 / 9 · Up to 12 evaluator slots per vendor</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#475569] mb-4">Sub-dimensions by pillar</p>
              <div className="space-y-5">
                {Array.from(pillarGroups.entries()).map(([pillarLabel, subs]) => (
                  <div key={pillarLabel}>
                    <p className="text-caption font-medium text-[#0F172A]">{pillarLabel}</p>
                    <ul className="mt-2 space-y-1 text-caption text-[#475569] leading-relaxed">
                      {subs.map((s) => (
                        <li key={s.id}>
                          <span className="font-mono text-[11px] text-[#475569]">{s.id}</span> {s.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {anyNumeric && (
        <>
      <p className="text-body text-[#475569] max-w-4xl pl-4 border-l-2 border-[#E2E8F0]">
        <span className="font-medium text-[#0F172A]">Purpose:</span> Evaluators score demonstrated capability in submissions — not reputation.
        Post-workshop, this view highlights consensus versus divergence ahead of down-select (6 → 3).
      </p>

      {/* B) Heatmap */}
      <section className="space-y-3">
        <h2 className="text-h2 text-[#0F172A]">Scored matrix (Q8–Q12)</h2>
        <p className="text-caption text-[#475569]">
          Rows: 15 sub-dimensions. Columns: vendors. Cell: average of evaluator scores (non-blank responses). Hover for per-evaluator
          breakdown.
        </p>
        <div className="overflow-x-auto rounded-card border border-[#E2E8F0] bg-white shadow-card">
          <table className="w-full min-w-[900px] text-caption">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="sticky left-0 z-20 w-64 border-r border-[#F1F5F9] bg-[#F8FAFC] p-3 text-left font-semibold text-[#475569]">
                  Dimension
                </th>
                {vendors.map((v) => (
                  <th
                    key={v.id}
                    className="min-w-[88px] p-3 text-center font-semibold uppercase tracking-wide"
                    style={{ color: v.color }}
                  >
                    {v.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(pillarGroups.entries()).map(([pillarLabel, subs]) => (
                <Fragment key={pillarLabel}>
                  <tr className="bg-[#EEF2FF]">
                    <td
                      colSpan={vendors.length + 1}
                      className="sticky left-0 z-10 bg-[#EEF2FF] px-3 py-2 text-h3 font-semibold text-[#312E81]"
                    >
                      {pillarLabel}
                    </td>
                  </tr>
                  {subs.map((r) => (
                    <tr key={r.id} className="border-b border-[#F1F5F9] hover:bg-[#FAFAFA]/80">
                      <td className="sticky left-0 z-10 border-r border-[#F1F5F9] bg-white p-3 shadow-[4px_0_12px_-8px_rgba(0,0,0,0.08)]">
                        <span className="font-mono text-micro text-[#475569]">{r.id}</span>
                        <p className="text-body text-[#0F172A]">{r.label}</p>
                      </td>
                      {vendors.map((v) => {
                        const av = avgForCell(scores, v.id, r.id);
                        const pending = av == null;
                        const sd = stdevForCell(scores, v.id, r.id);
                        const tip = EVALUATOR_IDS.map(
                          (eid) => `${EVALUATORS[eid].label}: ${scores[v.id]?.[eid]?.[r.id] ?? "—"}`,
                        ).join("\n");
                        return (
                          <td key={v.id} className="p-2 text-center align-middle">
                            <span
                              title={tip}
                              className="inline-flex min-h-[3rem] min-w-[3.5rem] flex-col items-center justify-center rounded-lg border border-black/5 px-1 py-1 tabular-nums"
                              style={{
                                backgroundColor: pending ? "#F8FAFC" : scoreBgContinuous(av),
                                color: pending ? "#64748B" : scoreHeatTextOnRamp(av!),
                              }}
                            >
                              {pending ? "—" : av!.toFixed(1)}
                              {!pending && (
                                <span className="text-micro font-normal opacity-90">{scoreLabel(av)}</span>
                              )}
                            </span>
                            {sd != null && sd > 2 && (
                              <span className="mt-0.5 block text-micro font-semibold text-amber-700">σ {sd.toFixed(1)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-border bg-surface-sunken px-5 py-4">
          <p className="text-micro uppercase tracking-wider text-ink-faint font-medium mb-3">Divergence strip — where to debate?</p>
          <p className="text-caption text-[#475569] mb-3 max-w-3xl">
            One dot per sub-dimension: green = tight consensus (max σ &lt; 1.5), amber = moderate, red = split (σ &gt; 3) across vendors’ evaluator
            spreads. Gray = insufficient scores.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {flatSubs.map((r) => {
              const sds = columnOrder
                .map((vid) => stdevForCell(scores, vid, r.id))
                .filter((x): x is number => x != null);
              const maxSd = sds.length ? Math.max(...sds) : 0;
              const dotClass =
                !anyNumeric || sds.length === 0
                  ? "bg-ink-faint"
                  : maxSd < 1.5
                    ? "bg-positive"
                    : maxSd <= 3
                      ? "bg-warning"
                      : "bg-negative";
              return (
                <Tooltip
                  key={r.id}
                  content={
                    <span className="max-w-[220px] whitespace-normal text-left block text-micro">
                      {r.id} · {r.label}
                      <br />
                      Max σ across vendors: {sds.length ? maxSd.toFixed(2) : "—"}
                    </span>
                  }
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm cursor-default transition-transform hover:scale-125 ${dotClass}`}
                  />
                </Tooltip>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFBEB] p-3 text-caption text-[#92400E]">
          <strong>Divergence watch:</strong> cells flag σ &gt; 2 across evaluators when scores exist.{" "}
          {!anyNumeric && "No evaluator scores entered yet — section will populate after Workshop 1."}
          {anyNumeric && highDiv.length === 0 && "No high-divergence cells at current data."}
          {highDiv.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {highDiv.slice(0, 12).map((d) => (
                <li key={`${d.vendorId}-${d.subId}`}>
                  {d.vendorId} · {d.subId} (σ {d.sd.toFixed(2)})
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
        </>
      )}

      {/* C) Consensus strip */}
      {anyNumeric && (
      <section className="space-y-3 rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A]">Evaluator consensus view</h2>
        <p className="text-caption text-[#475569]">
          Each row: one dot per evaluator slot (gray = no score). Strong consensus = tight cluster; split = spread ≥ 4 on the 1–9 scale.
        </p>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
          {flatSubs.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-[#F1F5F9] py-2">
              <div className="w-52 shrink-0 text-caption text-[#475569]">
                <span className="font-mono text-micro text-[#475569]">{r.id}</span> {r.label}
              </div>
              {vendors.map((v) => {
                const pts = EVALUATOR_IDS.map((eid) => scores[v.id]?.[eid]?.[r.id] ?? null);
                const filled = pts.filter((x): x is number => x != null);
                const spread = filled.length >= 2 ? Math.max(...filled) - Math.min(...filled) : null;
                return (
                  <div key={v.id} className="flex items-center gap-1" title={`${v.displayName} · ${r.id}`}>
                    {EVALUATOR_IDS.map((eid, i) => {
                      const val = scores[v.id]?.[eid]?.[r.id];
                      const bg = val == null ? "#E2E8F0" : scoreColor(val);
                      return (
                        <span
                          key={eid}
                          className="h-3 w-3 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: bg }}
                          title={`${EVALUATORS[eid].label}: ${val ?? "—"}`}
                        />
                      );
                    })}
                    {spread != null && (
                      <span className={`ml-1 text-micro ${spread >= 4 ? "font-semibold text-red-600" : "text-[#475569]"}`}>
                        Δ{spread}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* D) Qualitative */}
      <section className="space-y-5">
        <div>
          <h2 className="text-h2 font-medium text-[#0F172A]">Qualitative insights</h2>
          <p className="mt-1.5 text-caption text-[#475569] max-w-2xl">
            Q3–Q7 free text per evaluator. Empty cells mean no response was captured for that evaluator and question in the current dataset.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-200/90 pb-3">
          {vendors.map((v) => (
            <FilterChip
              key={v.id}
              label={v.displayName}
              color={v.color}
              selected={vendorTab === v.id}
              pillVariant="solid"
              onClick={() => setVendorTab(v.id)}
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2" key={vendorTab}>
          {(["Q3", "Q4", "Q5", "Q6", "Q7"] as const).map((qk) => {
            const filled = EVALUATOR_IDS.filter((eid) => (qual[vendorTab]?.[eid]?.[qk] ?? "").trim()).length;
            return (
              <div
                key={qk}
                className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-bold text-white">
                    {qk}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13px] font-semibold leading-snug text-slate-900">{QUALITATIVE_QUESTIONS[qk]}</p>
                    <p className="mt-1 text-[11px] tabular-nums text-slate-500">
                      {filled} of {EVALUATOR_IDS.length} evaluators answered
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {EVALUATOR_IDS.map((eid) => {
                    const text = qual[vendorTab]?.[eid]?.[qk] ?? "";
                    const empty = !text.trim();
                    return (
                      <li key={eid} className="flex gap-4 px-4 py-3 transition-colors hover:bg-slate-50/60">
                        <span className="w-[5.5rem] shrink-0 text-[11px] font-medium text-slate-500">{EVALUATORS[eid].label}</span>
                        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                          {empty ? <span className="text-[#475569] italic">No response</span> : text}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* E) Confidence & proceed */}
      {anyNumeric && (
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
          <h3 className="text-h3 text-[#0F172A]">Q13 — Confidence (stacked)</h3>
          <p className="mt-1 text-caption text-[#475569]">Distribution per vendor once evaluators submit.</p>
          {vendors.map((v) => {
            const counts: Record<string, number> = Object.fromEntries(CONFIDENCE_LEVELS.map((l) => [l, 0]));
            for (const eid of EVALUATOR_IDS) {
              const c = confidence[v.id]?.[eid];
              if (c && c in counts) counts[c] = (counts[c] ?? 0) + 1;
            }
            const total = CONFIDENCE_LEVELS.reduce((s, l) => s + (counts[l] ?? 0), 0);
            const confColors: Record<string, string> = {
              "Very confident": "#059669",
              "Somewhat confident": "#34D399",
              "Somewhat not confident": "#FBBF24",
              "Very not confident": "#DC2626",
            };
            return (
              <div key={v.id} className="mt-4">
                <p className="text-caption font-semibold" style={{ color: v.color }}>
                  {v.displayName}
                </p>
                <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                  {total === 0 ? (
                    <div className="h-full w-full bg-[#E2E8F0]" title="No confidence votes" />
                  ) : (
                    CONFIDENCE_LEVELS.map((level) => {
                      const pct = ((counts[level] ?? 0) / total) * 100;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={level}
                          className="h-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: confColors[level] ?? "#94A3B8" }}
                          title={`${level}: ${counts[level]}`}
                        />
                      );
                    })
                  )}
                </div>
                <p className="text-micro text-[#475569] mt-1">{total ? `${total} responses` : "—"}</p>
              </div>
            );
          })}
        </div>
        <div className="rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
          <h3 className="text-h3 text-[#0F172A]">Q14 — Proceed votes</h3>
          <p className="mt-1 text-caption text-[#475569]">Yes / No counts per vendor after Workshop 1.</p>
          <ul className="mt-4 space-y-2 text-body text-[#475569]">
            {vendors.map((v) => {
              let yes = 0;
              let no = 0;
              for (const eid of EVALUATOR_IDS) {
                const p = proceed[v.id]?.[eid];
                if (p === true) yes += 1;
                if (p === false) no += 1;
              }
              return (
                <li key={v.id} className="flex justify-between border-b border-[#F1F5F9] py-2">
                  <span style={{ color: v.color }} className="font-semibold">
                    {v.displayName}
                  </span>
                  <span className="tabular-nums text-[#475569]">
                    <span className="text-[#059669] font-medium">Yes {yes}</span>
                    {" · "}
                    <span className="text-[#B91C1C] font-medium">No {no}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      )}

      {/* F) Weighted composite */}
      {anyNumeric && (
      <section className="rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A]">Weighted composite</h2>
        <p className="mt-1 text-caption text-[#475569]">
          Σ (pillar weight × average sub-score). Partnership 10%; Commercial, Operational, Technology, and Migration each 22.5%.
        </p>
        <div className="mt-4 space-y-3">
          {[...composites]
            .sort((a, b) => (b.c ?? -1) - (a.c ?? -1))
            .map(({ id, c }) => {
              const v = vendors.find((x) => x.id === id);
              const maxC = Math.max(9, ...composites.map((x) => x.c ?? 0));
              const w = c != null ? Math.round((c / maxC) * 100) : 0;
              return (
                <div key={id}>
                  <div className="flex justify-between text-caption">
                    <span className="font-semibold" style={{ color: v?.color }}>
                      {v?.displayName ?? id}
                    </span>
                    <span className="tabular-nums text-[#475569]">{c == null ? "—" : c.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: c == null ? "4%" : `${w}%`,
                        backgroundColor: v?.color ?? "#64748B",
                        opacity: c == null ? 0.25 : 0.85,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </section>
      )}
    </div>
  );
}
