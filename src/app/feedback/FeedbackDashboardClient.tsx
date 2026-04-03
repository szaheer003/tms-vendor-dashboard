"use client";

import { useEffect, useMemo, useState } from "react";
import { PrintButton } from "@/components/PrintButton";
import { FilterChip } from "@/components/ui/Chip";
import {
  CONFIDENCE_LEVELS,
  EVALUATOR_IDS,
  EVALUATORS,
  QUALITATIVE_QUESTIONS,
  type ConfidenceVotes,
  type ProceedVotes,
  type QualitativeResponses,
  VENDOR_IDS,
} from "@/lib/evaluatorData";
import type { PortfolioVendor } from "@/lib/types";
import bundledEvaluatorJson from "@/data/evaluatorScores.json";

const Q_KEYS = ["Q3", "Q4", "Q5", "Q6", "Q7"] as const;
type QKey = (typeof Q_KEYS)[number];

const STOP = new Set(
  "the a an and or to of in for on at by from with as is are was were be been being it this that these those our their we you your they them not no yes".split(
    " ",
  ),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function themeCounts(qual: QualitativeResponses | undefined, vendorId: string): { term: string; count: number }[] {
  const freq = new Map<string, number>();
  if (!qual?.[vendorId]) return [];
  for (const eid of EVALUATOR_IDS) {
    const row = qual[vendorId][eid];
    if (!row) continue;
    for (const t of Object.values(row)) {
      if (!t || typeof t !== "string") continue;
      for (const w of tokenize(t)) {
        freq.set(w, (freq.get(w) ?? 0) + 1);
      }
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([term, count]) => ({ term, count }));
}

function countQualitative(qual: QualitativeResponses | undefined): {
  total: number;
  byVendor: Record<string, number>;
  activeEvaluators: number;
} {
  const byVendor: Record<string, number> = {};
  const evalHas = new Set<string>();
  let total = 0;
  if (!qual) return { total: 0, byVendor, activeEvaluators: 0 };
  for (const vid of VENDOR_IDS) {
    byVendor[vid] = 0;
    if (!qual[vid]) continue;
    for (const eid of EVALUATOR_IDS) {
      const row = qual[vid][eid];
      if (!row) continue;
      for (const qk of Q_KEYS) {
        const t = (row[qk] ?? "").trim();
        if (t) {
          total += 1;
          byVendor[vid] = (byVendor[vid] ?? 0) + 1;
          evalHas.add(eid);
        }
      }
    }
  }
  return { total, byVendor, activeEvaluators: evalHas.size };
}

type Payload = {
  source?: string;
  importedAt?: string;
  qualitative?: QualitativeResponses;
  confidence?: ConfidenceVotes;
  proceed?: ProceedVotes;
};

export function FeedbackDashboardClient({ portfolioVendors, columnOrder }: { portfolioVendors: PortfolioVendor[]; columnOrder: string[] }) {
  const vendors = useMemo(
    () => columnOrder.map((id) => portfolioVendors.find((v) => v.id === id)!).filter(Boolean) as PortfolioVendor[],
    [portfolioVendors, columnOrder],
  );

  const [raw, setRaw] = useState<Payload | null>(null);
  const [mode, setMode] = useState<"vendor" | "question">("vendor");
  const [vendorTab, setVendorTab] = useState<string>(columnOrder[0] ?? "cognizant");
  const [questionTab, setQuestionTab] = useState<QKey>("Q3");

  useEffect(() => {
    fetch("/data/evaluatorScores.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRaw)
      .catch(() => setRaw(null));
  }, []);

  const qual = raw?.qualitative;
  const stats = useMemo(() => countQualitative(qual), [qual]);
  const themes = useMemo(() => themeCounts(qual, vendorTab), [qual, vendorTab]);

  const topVendorByVolume = useMemo(() => {
    let best: string | null = null;
    let n = 0;
    for (const v of vendors) {
      const c = stats.byVendor[v.id] ?? 0;
      if (c > n) {
        n = c;
        best = v.id;
      }
    }
    return best && n > 0 ? vendors.find((x) => x.id === best)?.displayName ?? best : null;
  }, [vendors, stats.byVendor]);

  return (
    <div className="space-y-10 animate-page-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h1 text-[#0F172A]">Feedback dashboard</h1>
          <p className="mt-2 max-w-3xl text-body text-[#64748B] leading-relaxed">
            Workshop 1 free-text and sentiment signals from Folder 8 imports: qualitative prompts (Q3–Q7), confidence (Q13), and proceed
            votes (Q14). Use this view for debriefs and follow-ups; scored rubric detail stays on{" "}
            <a href="/evaluator-scores/" className="text-[#2563EB] hover:underline">
              Evaluator scores
            </a>
            .
          </p>
          {raw?.source ? (
            <p className="mt-3 text-caption text-[#059669] border-l-2 border-[#059669] pl-3 max-w-3xl">{raw.source}</p>
          ) : null}
        </div>
        <PrintButton label="Print feedback" />
      </header>

      {/* KPI strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-micro font-medium uppercase tracking-wider text-[#94A3B8]">Qualitative responses</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#0F172A]">{stats.total}</p>
          <p className="mt-1 text-caption text-[#64748B]">Non-empty Q3–Q7 cells (vendor × evaluator)</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-micro font-medium uppercase tracking-wider text-[#94A3B8]">Vendors with text</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#0F172A]">
            {vendors.filter((v) => (stats.byVendor[v.id] ?? 0) > 0).length}
          </p>
          <p className="mt-1 text-caption text-[#64748B]">Of {vendors.length} in scorecard order</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-micro font-medium uppercase tracking-wider text-[#94A3B8]">Evaluator slots used</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[#0F172A]">{stats.activeEvaluators}</p>
          <p className="mt-1 text-caption text-[#64748B]">Slots with at least one Q3–Q7 answer</p>
        </div>
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-micro font-medium uppercase tracking-wider text-[#94A3B8]">Most commentary</p>
          <p className="mt-1 text-lg font-semibold text-[#0F172A]">{topVendorByVolume ?? "—"}</p>
          <p className="mt-1 text-caption text-[#64748B]">By count of filled Q3–Q7 cells</p>
        </div>
      </section>

      {/* Lens toggle */}
      <div className="flex flex-wrap items-center gap-3 print-hide">
        <span className="text-micro font-medium uppercase tracking-wider text-[#94A3B8]">View</span>
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setMode("vendor")}
            className={`rounded-md px-4 py-2 text-caption font-medium transition-colors ${
              mode === "vendor" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            By vendor
          </button>
          <button
            type="button"
            onClick={() => setMode("question")}
            className={`rounded-md px-4 py-2 text-caption font-medium transition-colors ${
              mode === "question" ? "bg-white text-[#0F172A] shadow-sm" : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            By question
          </button>
        </div>
      </div>

      {stats.total === 0 && (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
          <p className="text-h3 text-[#64748B] font-medium">No qualitative feedback loaded yet</p>
          <p className="mt-2 text-caption text-[#94A3B8] max-w-lg mx-auto">
            After Workshop 1, import Folder 8 xlsx files with{" "}
            <code className="text-[11px] bg-white px-1 rounded border border-[#E2E8F0]">python scripts/import_folder8_scores.py</code> — the same
            run populates <code className="text-[11px] bg-white px-1 rounded border border-[#E2E8F0]">evaluatorScores.json</code>.
          </p>
        </div>
      )}

      {mode === "vendor" && stats.total > 0 && (
        <section className="space-y-4">
          <h2 className="text-h2 text-[#0F172A]">Responses by vendor</h2>
          <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] pb-3 print-hide">
            {vendors.map((v) => (
              <FilterChip
                key={v.id}
                label={`${v.displayName} (${stats.byVendor[v.id] ?? 0})`}
                color={v.color}
                selected={vendorTab === v.id}
                pillVariant="solid"
                onClick={() => setVendorTab(v.id)}
              />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Q_KEYS.map((qk, qi) => (
              <div key={qk} className="space-y-2" style={{ animationDelay: `${qi * 40}ms` }}>
                <p className="text-micro font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {qk} — {QUALITATIVE_QUESTIONS[qk]}
                </p>
                {EVALUATOR_IDS.map((eid) => {
                  const text = qual?.[vendorTab]?.[eid]?.[qk] ?? "";
                  const empty = !text.trim();
                  return (
                    <div key={eid} className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-sm">
                      <p className="text-micro font-semibold text-[#64748B]">
                        {EVALUATORS[eid].label} · {EVALUATORS[eid].role}
                      </p>
                      <p className="mt-1 text-body text-[#0F172A] whitespace-pre-wrap">
                        {empty ? <span className="text-slate-400 italic">No response</span> : text}
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === "question" && stats.total > 0 && (
        <section className="space-y-4">
          <h2 className="text-h2 text-[#0F172A]">Compare vendors by question</h2>
          <div className="flex flex-wrap gap-2 print-hide">
            {Q_KEYS.map((qk) => (
              <button
                key={qk}
                type="button"
                onClick={() => setQuestionTab(qk)}
                className={`rounded-full border px-4 py-2 text-caption font-medium transition-colors ${
                  questionTab === qk
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
                }`}
              >
                {qk}
              </button>
            ))}
          </div>
          <p className="text-caption text-[#64748B] max-w-3xl">{QUALITATIVE_QUESTIONS[questionTab]}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vendors.map((v) => {
              const filled = EVALUATOR_IDS.map((eid) => {
                const t = (qual?.[v.id]?.[eid]?.[questionTab] ?? "").trim();
                return t ? { eid, t } : null;
              }).filter((x): x is { eid: string; t: string } => x != null);
              return (
                <div key={v.id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="text-caption font-bold" style={{ color: v.color }}>
                    {v.displayName}
                  </p>
                  <p className="text-micro text-[#94A3B8] mt-0.5">{filled.length} response{filled.length === 1 ? "" : "s"}</p>
                  <ul className="mt-3 space-y-3">
                    {filled.length === 0 ? (
                      <li className="text-caption text-[#94A3B8]">No responses for this question.</li>
                    ) : (
                      filled.map(({ eid, t }) => (
                        <li key={eid} className="text-body text-[#0F172A] border-t border-[#F1F5F9] pt-3 first:border-0 first:pt-0">
                          <span className="text-micro font-semibold text-[#64748B] block mb-1">{EVALUATORS[eid].label}</span>
                          <span className="whitespace-pre-wrap">{t}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stats.total > 0 && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-6 shadow-card">
          <h2 className="text-h2 text-[#0F172A] mb-1">Recurring themes (token frequency)</h2>
          <p className="text-caption text-[#94A3B8] mb-4 max-w-3xl">
            Automated word counts across Q3–Q7 for the selected vendor — useful for interview prep, not a substitute for reading full text.
          </p>
          <div className="flex flex-wrap gap-2 mb-4 print-hide">
            {vendors.map((v) => (
              <FilterChip
                key={v.id}
                label={v.displayName}
                color={v.color}
                selected={vendorTab === v.id}
                pillVariant="soft"
                onClick={() => setVendorTab(v.id)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {themes.length === 0 ? (
              <p className="text-caption text-[#94A3B8]">No tokens for this vendor.</p>
            ) : (
              themes.map((t) => (
                <span
                  key={t.term}
                  className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-caption text-[#0F172A] shadow-sm"
                  title={`${t.count} mentions`}
                >
                  <span className="font-semibold">{t.term}</span>
                  <span className="ml-2 text-micro tabular-nums text-[#64748B]">×{t.count}</span>
                </span>
              ))
            )}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
          <h3 className="text-h3 text-[#0F172A]">Q13 — Confidence</h3>
          <p className="mt-1 text-caption text-[#94A3B8]">Stacked distribution per vendor.</p>
          {vendors.map((v) => {
            const counts: Record<string, number> = Object.fromEntries(CONFIDENCE_LEVELS.map((l) => [l, 0]));
            for (const eid of EVALUATOR_IDS) {
              const c = raw?.confidence?.[v.id]?.[eid];
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
                <p className="text-micro text-[#94A3B8] mt-1">{total ? `${total} responses` : "—"}</p>
              </div>
            );
          })}
        </div>
        <div className="rounded-card border border-[#E2E8F0] bg-white p-6 shadow-card">
          <h3 className="text-h3 text-[#0F172A]">Q14 — Proceed</h3>
          <p className="mt-1 text-caption text-[#94A3B8]">Yes / No counts per vendor.</p>
          <ul className="mt-4 space-y-2 text-body text-[#64748B]">
            {vendors.map((v) => {
              let yes = 0;
              let no = 0;
              for (const eid of EVALUATOR_IDS) {
                const p = raw?.proceed?.[v.id]?.[eid];
                if (p === true) yes += 1;
                if (p === false) no += 1;
              }
              return (
                <li key={v.id} className="flex justify-between border-b border-[#F1F5F9] py-2">
                  <span style={{ color: v.color }} className="font-semibold">
                    {v.displayName}
                  </span>
                  <span className="tabular-nums text-[#64748B]">
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
    </div>
  );
}
