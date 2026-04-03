"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDataset } from "@/lib/dataset";
import { EVALUATOR_IDS, flattenScoredSubs, QUALITATIVE_QUESTIONS, VENDOR_IDS } from "@/lib/evaluatorData";
import { scoreBgContinuous, scoreHeatTextOnRamp } from "@/lib/scoreGradient";
import { ScoringMethodologyPanel } from "@/components/ScoringMethodologyPanel";
import type { PortfolioVendor } from "@/lib/types";

/** Pillar comparison chart: one hue per pillar (not per vendor) for readable grouped bars. */
const PILLAR_SERIES: { dataKey: string; name: string; fill: string }[] = [
  { dataKey: "Commercial", name: "Commercial", fill: "#475569" },
  { dataKey: "Operational", name: "Operational", fill: "#0d9488" },
  { dataKey: "Technology", name: "Technology", fill: "#6366f1" },
  { dataKey: "Migration", name: "Migration", fill: "#d97706" },
  { dataKey: "Partnership", name: "Partnership", fill: "#db2777" },
];

type RadarPillarKey = "commercial" | "operations" | "technology" | "migration" | "partnership";

const RADAR_AXES: { key: RadarPillarKey; short: string; full: string }[] = [
  { key: "commercial", short: "Com.", full: "Commercial" },
  { key: "operations", short: "Ops.", full: "Operational" },
  { key: "technology", short: "Tech.", full: "Technology" },
  { key: "migration", short: "Mig.", full: "Migration" },
  { key: "partnership", short: "Part.", full: "Partnership" },
];

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

function themeCounts(
  qualitative: Record<string, Record<string, Record<string, string>>> | undefined,
  vendorId: string,
): { term: string; count: number }[] {
  const freq = new Map<string, number>();
  if (!qualitative?.[vendorId]) return [];
  for (const eid of EVALUATOR_IDS) {
    const row = qualitative[vendorId][eid];
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
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));
}

type EvalPayload = {
  scores?: Record<string, Record<string, Record<string, number | null>>>;
  qualitative?: Record<string, Record<string, Record<string, string>>>;
  source?: string;
  importedAt?: string;
};

export function ScoringDashboardClient() {
  const { portfolio } = useDataset();
  const [raw, setRaw] = useState<EvalPayload | null>(null);

  useEffect(() => {
    fetch("/data/evaluatorScores.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setRaw)
      .catch(() => setRaw(null));
  }, []);

  const order = portfolio.scorecard.columnOrder;
  const vendors = order.map((id) => portfolio.vendors.find((v) => v.id === id)!).filter(Boolean) as PortfolioVendor[];

  const compositeData = useMemo(
    () =>
      vendors.map((v) => ({
        name: v.displayName,
        id: v.id,
        composite: v.composite ?? null,
        color: v.color,
      })),
    [vendors],
  );

  const compositeSorted = useMemo(
    () => [...compositeData].sort((a, b) => (b.composite ?? -1) - (a.composite ?? -1)),
    [compositeData],
  );

  /** One row per vendor; horizontal grouped bars by pillar (easier to read than 6 bars × 5 pillars on X). */
  const pillarComparisonByVendor = useMemo(() => {
    return vendors.map((v) => {
      const pv = portfolio.radar.vendors.find((x) => x.vendorId === v.id)?.pillars;
      return {
        name: v.displayName,
        Commercial: pv?.commercial ?? 0,
        Operational: pv?.operations ?? 0,
        Technology: pv?.technology ?? 0,
        Migration: pv?.migration ?? 0,
        Partnership: pv?.partnership ?? 0,
      };
    });
  }, [vendors, portfolio.radar.vendors]);

  const flatSubs = useMemo(() => flattenScoredSubs(), []);
  const heatRows = useMemo(() => {
    if (!raw?.scores) return [];
    return flatSubs.map((sub) => {
      const row: Record<string, string | number | null> = { id: sub.id, label: sub.label };
      for (const v of vendors) {
        const vals = EVALUATOR_IDS.map((e) => raw.scores?.[v.id]?.[e]?.[sub.id]).filter(
          (x): x is number => x != null && Number.isFinite(x),
        );
        const m = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        row[v.id] = m;
      }
      return row;
    });
  }, [raw?.scores, flatSubs, vendors]);

  const [qualVendor, setQualVendor] = useState(order[0] ?? "cognizant");
  const themes = useMemo(() => themeCounts(raw?.qualitative, qualVendor), [raw?.qualitative, qualVendor]);

  return (
    <div className="space-y-12 animate-page-in">
      <header>
        <h1 className="text-h1 text-[#0F172A]">Scoring dashboard</h1>
        <p className="mt-2 max-w-4xl text-body text-[#64748B] leading-relaxed">
          Consolidated view of Workshop 1 evaluator data from Folder 8. Composite includes all five pillars (Partnership 10%; others 22.5% each). Refresh imports with{" "}
          <code className="text-[13px] bg-[#F1F5F9] px-1 rounded">python scripts/import_folder8_scores.py</code> after adding new xlsx files.
        </p>
        {raw?.source ? (
          <p className="mt-3 text-caption text-[#059669] border-l-2 border-[#059669] pl-3 max-w-3xl">{raw.source}</p>
        ) : null}
      </header>

      {/* Leaderboard */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A] mb-1">Weighted composite ranking</h2>
        <p className="text-caption text-[#94A3B8] mb-6">
          Scale is raw 1–9 evaluator composite (not the 0–10 radar mapping). All five pillars count: Commercial, Operational, Technology, Migration (22.5% each) and Partnership (10%).
        </p>
        <div className="h-[300px] w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compositeSorted} layout="vertical" margin={{ left: 4, right: 28, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12, fill: "#334155" }} interval={0} />
              <RTooltip
                formatter={(v: number) => [v != null ? v.toFixed(2) : "—", "Weighted composite"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
              />
              <Bar dataKey="composite" radius={[0, 6, 6, 0]} name="Composite">
                {compositeSorted.map((e, i) => (
                  <Cell key={e.id ?? i} fill={e.color} fillOpacity={e.composite == null ? 0.25 : 0.92} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Pillar comparison — horizontal bars: one row per vendor, pillars as series */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A] mb-1">Pillar comparison</h2>
        <p className="text-caption text-[#94A3B8] mb-4 max-w-3xl">
          Same 0–10 radar scale as the overview (mapped from 1–9 averages). One row per vendor; bar colors represent pillars. All five pillars are included in the weighted composite above.
        </p>
        <div className="h-[400px] w-full min-h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pillarComparisonByVendor}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
              barCategoryGap="12%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal vertical={false} />
              <XAxis type="number" domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12, fill: "#334155" }} interval={0} />
              <RTooltip
                cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                formatter={(v: number) => (v != null ? v.toFixed(2) : "—")}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="square" iconSize={10} />
              {PILLAR_SERIES.map((s) => (
                <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.fill} maxBarSize={18} radius={[0, 3, 3, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Mini radars — five pillars, compact axis labels */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vendors.map((v) => {
          const pv = portfolio.radar.vendors.find((x) => x.vendorId === v.id)?.pillars;
          const data = RADAR_AXES.map(({ key, short, full }) => ({
            axis: short,
            full,
            value: pv?.[key] ?? 0,
          }));
          return (
            <div key={v.id} className="rounded-xl border border-[#F1F5F9] bg-white p-4 shadow-sm">
              <p className="text-caption font-semibold mb-2" style={{ color: v.color }}>
                {v.displayName}
              </p>
              <div className="h-[230px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data} cx="50%" cy="52%" outerRadius="68%">
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#64748B" }} />
                    <Radar dataKey="value" stroke={v.color} fill={v.color} fillOpacity={0.22} strokeWidth={1.5} />
                    <RTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0];
                        const row = item?.payload as { full?: string; value?: number };
                        const val = item?.value;
                        return (
                          <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] shadow-md">
                            <p className="font-semibold text-[#0F172A]">{row?.full ?? "—"}</p>
                            <p className="tabular-nums text-[#64748B]">
                              {typeof val === "number" ? val.toFixed(2) : "—"} / 10
                            </p>
                          </div>
                        );
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-[20px] font-bold tabular-nums text-[#0F172A] mt-1">
                {v.composite != null ? v.composite.toFixed(2) : "—"}
                <span className="text-micro font-normal text-[#94A3B8] ml-1">composite (1–9)</span>
              </p>
            </div>
          );
        })}
      </section>

      {/* Sub-dimension heat strip */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-card overflow-x-auto">
        <h2 className="text-h2 text-[#0F172A] mb-4">Sub-dimension heatmap (evaluator average)</h2>
        <table className="min-w-[800px] w-full text-[12px]">
          <thead>
            <tr className="border-b border-[#E2E8F0]">
              <th className="text-left p-2 text-[#64748B]">Dim</th>
              {vendors.map((v) => (
                <th key={v.id} className="p-2 text-center font-medium" style={{ color: v.color }}>
                  {v.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatRows.map((row) => (
              <tr key={String(row.id)} className="border-b border-[#F8FAFC]">
                <td className="p-2 text-[#334155]">
                  <span className="font-mono text-[10px] text-[#94A3B8]">{row.id}</span> {String(row.label)}
                </td>
                {vendors.map((v) => {
                  const val = row[v.id] as number | null;
                  const pending = val == null || !Number.isFinite(val);
                  return (
                    <td key={v.id} className="p-1 text-center">
                      <span
                        className="inline-block min-w-[2.5rem] rounded-md px-1 py-1 font-semibold tabular-nums"
                        style={{
                          backgroundColor: pending ? "#F8FAFC" : scoreBgContinuous(val!),
                          color: pending ? "#94A3B8" : scoreHeatTextOnRamp(val!),
                        }}
                      >
                        {pending ? "—" : val!.toFixed(1)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Qualitative themes */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-card">
        <h2 className="text-h2 text-[#0F172A] mb-2">Qualitative signal — recurring themes</h2>
        <p className="text-caption text-[#94A3B8] mb-4 max-w-3xl">
          Automated token frequency across all evaluator free-text (Q3–Q7) for the selected vendor. Use for interview prep — not a substitute for reading full responses on the Evaluator Scores tab.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {VENDOR_IDS.filter((id) => order.includes(id)).map((id) => {
            const v = vendors.find((x) => x.id === id);
            if (!v) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setQualVendor(id)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-medium border transition-colors ${
                  qualVendor === id ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                }`}
                style={qualVendor === id ? {} : { borderColor: v.color + "55", color: v.color }}
              >
                {v.displayName}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          {themes.length === 0 ? (
            <p className="text-caption text-[#94A3B8]">No qualitative text loaded.</p>
          ) : (
            themes.map((t) => (
              <div
                key={t.term}
                className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2"
                title={`${t.count} mentions`}
              >
                <span className="font-semibold text-[#0F172A]">{t.term}</span>
                <span className="ml-2 text-[11px] tabular-nums text-[#64748B]">×{t.count}</span>
              </div>
            ))
          )}
        </div>
        <ul className="mt-6 space-y-2 text-caption text-[#64748B]">
          {(Object.keys(QUALITATIVE_QUESTIONS) as (keyof typeof QUALITATIVE_QUESTIONS)[])
            .filter((k) => k.startsWith("Q"))
            .slice(2)
            .map((k) => (
              <li key={k}>
                <strong className="text-[#475569]">{k}</strong> — {QUALITATIVE_QUESTIONS[k]}
              </li>
            ))}
        </ul>
      </section>

      <ScoringMethodologyPanel collapsedDefault />
    </div>
  );
}
