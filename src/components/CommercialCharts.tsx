"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Portfolio, VendorRecord } from "@/lib/types";
import { StandardChartTooltip, formatChartM1, formatChartM } from "@/components/charts/ChartPrimitives";

const HEAT_COLS = ["onshore", "nearshore", "offshore", "emeaOnshore"] as const;
type HeatCol = (typeof HEAT_COLS)[number];

export type CommercialHighlightProps = {
  /** When set, non-matching series render at reduced opacity. */
  highlightVendorId?: string | null;
  /** Toggle vendor focus (pass null to clear). */
  onVendorToggle?: (vendorId: string | null) => void;
};

function dimOpacity(highlightVendorId: string | null | undefined, vendorId: string) {
  if (!highlightVendorId) return 1;
  return highlightVendorId === vendorId ? 1 : 0.15;
}

function parseHourlyUsd(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (t.includes("declin") || t.includes("fixed price") || t.includes("n/a") || t.includes("provided in narrative")) return null;
  const m = t.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*hr|\/hr)/);
  if (m) {
    const n = parseFloat(m[1]!.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 && n < 500 ? n : null;
  }
  const plain = t.replace(/,/g, "").match(/^\s*\$?\s*(\d+(?:\.\d+)?)\s*$/);
  if (plain) {
    const n = parseFloat(plain[1]!);
    return Number.isFinite(n) && n >= 8 && n <= 220 ? n : null;
  }
  return null;
}

/** Continuous thermal: low $/hr (better) → #F0FDF4, high → #FEF2F2 */
function heatColor(n: number | null, minV: number, maxV: number): string {
  if (n == null) return "#F8FAFC";
  if (maxV <= minV) return "#F0FDF4";
  const t = (n - minV) / (maxV - minV);
  const r = Math.round(lerp(240, 254, t));
  const g = Math.round(lerp(253, 242, t));
  const b = Math.round(lerp(244, 242, t));
  return `rgb(${r},${g},${b})`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Rate grid heatmap: lower $/hr = greener; missing/declined = neutral. */
export function RateCardHeatmap({ vendors, highlightVendorId }: { vendors: VendorRecord[] } & CommercialHighlightProps) {
  const tierLabels = Array.from(new Set(vendors.flatMap((v) => v.rateCard.map((r) => r.label)))).slice(0, 12);
  const nums: number[] = [];
  for (const v of vendors) {
    if (v.id === "ibm") continue;
    for (const r of v.rateCard) {
      for (const c of HEAT_COLS) {
        const x = parseHourlyUsd(r[c]);
        if (x != null) nums.push(x);
      }
    }
  }
  const minV = nums.length ? Math.min(...nums) : 0;
  const maxV = nums.length ? Math.max(...nums) : 1;

  function cell(v: VendorRecord, tier: string, col: HeatCol) {
    const row = v.rateCard.find((x) => x.label === tier);
    const raw = row?.[col]?.trim() ?? "";
    if (v.id === "ibm") {
      return { text: "Declined — fixed-price model", bg: "#EEF2FF", fg: "#3730A3" };
    }
    if (!raw)
      return {
        text: "—",
        bg: "repeating-linear-gradient(45deg,#F8FAFC,#F8FAFC 4px,#F1F5F9 4px,#F1F5F9 8px)",
        fg: "#64748B",
      };
    const n = parseHourlyUsd(raw);
    if (n == null) {
      const short = raw.length > 28 ? `${raw.slice(0, 25)}…` : raw;
      return { text: short, bg: "#F8FAFC", fg: "#64748B" };
    }
    return { text: `$${n.toFixed(2)}/hr`, bg: heatColor(n, minV, maxV), fg: "#0F172A" };
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] w-full border-collapse text-caption">
        <thead>
          <tr className="border-b border-[#F1F5F9] bg-surface-sunken">
            <th className="p-2 text-left font-semibold text-ink-secondary">Tier</th>
            {vendors.map((v) => (
              <th
                key={v.id}
                colSpan={4}
                className="p-2 text-center font-medium transition-opacity duration-150"
                style={{ color: v.color, opacity: dimOpacity(highlightVendorId, v.id) }}
              >
                {v.displayName}
              </th>
            ))}
          </tr>
          <tr className="border-b border-[#F1F5F9] text-micro text-[#475569]">
            <th className="p-1" />
            {vendors.map((v) =>
              HEAT_COLS.map((c) => (
                <th
                  key={`${v.id}-${c}`}
                  className="p-1 text-center font-normal w-[72px] transition-opacity duration-150"
                  style={{ opacity: dimOpacity(highlightVendorId, v.id) }}
                >
                  {c === "onshore" ? "On" : c === "nearshore" ? "Near" : c === "offshore" ? "Off" : "EMEA"}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {tierLabels.map((tier) => (
            <tr key={tier}>
              <td className="p-2 text-[#475569] max-w-[200px]">{tier}</td>
              {vendors.flatMap((v) =>
                HEAT_COLS.map((col) => {
                  const { text, bg, fg } = cell(v, tier, col);
                  const isGrad = typeof bg === "string" && bg.includes("gradient");
                  return (
                    <td
                      key={`${v.id}-${tier}-${col}`}
                      className="p-1.5 text-center tabular-nums font-medium transition-opacity duration-150 cursor-default"
                      style={{
                        ...(isGrad ? { background: bg } : { backgroundColor: bg }),
                        color: fg,
                        opacity: dimOpacity(highlightVendorId, v.id),
                      }}
                      title={`${v.displayName} · ${tier}`}
                    >
                      {text}
                    </td>
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnnualFeeChart({
  vendors,
  baselineMid,
  baselineAnnualLow,
  highlightVendorId,
  onVendorToggle,
}: {
  vendors: VendorRecord[];
  baselineMid: number;
  baselineAnnualLow?: number;
} & CommercialHighlightProps) {
  const years = [1, 2, 3, 4, 5];
  const data = years.map((yr) => {
    const row: Record<string, number | string | undefined> = { year: `Y${yr}` };
    vendors.forEach((v) => {
      const val = v.pricing.years[yr - 1]?.valueM;
      row[v.displayName] = val != null ? val : undefined;
    });
    return row;
  });

  const toggle = (vid: string) => {
    onVendorToggle?.(highlightVendorId === vid ? null : vid);
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#64748B" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748B" }}
            tickMargin={8}
            label={{ value: "$M / yr", angle: -90, position: "insideLeft", fill: "#64748B", fontSize: 10 }}
          />
          <Tooltip content={<StandardChartTooltip valueFormatter={formatChartM1} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => <span className="text-caption text-ink-secondary">{value}</span>}
            onClick={(e) => {
              const v = vendors.find((x) => x.displayName === e.value);
              if (v && onVendorToggle) toggle(v.id);
            }}
            style={{ cursor: onVendorToggle ? "pointer" : "default" }}
          />
          {baselineAnnualLow != null && baselineMid != null && (
            <ReferenceArea
              y1={baselineAnnualLow}
              y2={baselineMid}
              fill="#0F172A"
              fillOpacity={0.05}
              label={{ value: "Baseline band (low–mid)", fill: "#64748B", fontSize: 10, position: "insideTopRight" }}
            />
          )}
          {baselineAnnualLow != null && (
            <ReferenceLine
              y={baselineAnnualLow}
              stroke="#64748B"
              strokeDasharray="6 4"
              label={{
                value: "FIS baseline low ~$144M/yr",
                fill: "#64748B",
                fontSize: 10,
                position: "insideBottomRight",
              }}
            />
          )}
          <ReferenceLine
            y={baselineMid}
            stroke="#0F172A"
            strokeDasharray="4 4"
            strokeOpacity={0.35}
            label={{ value: `Mid ~${baselineMid}M/yr`, fill: "#0F172A", fontSize: 10, position: "top" }}
          />
          {vendors.map((v) => (
            <Line
              key={v.id}
              type="monotone"
              dataKey={v.displayName}
              stroke={v.color}
              strokeWidth={highlightVendorId === v.id ? 2.25 : 1.5}
              strokeOpacity={dimOpacity(highlightVendorId, v.id)}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 1, fill: v.color }}
              connectNulls
              onClick={() => onVendorToggle && toggle(v.id)}
              style={{ cursor: onVendorToggle ? "pointer" : undefined }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeSavingsChart({
  vendors,
  baselineAnnual,
  synergyAnnualM = 40,
  highlightVendorId,
  onVendorToggle,
}: {
  vendors: VendorRecord[];
  baselineAnnual: number;
  synergyAnnualM?: number;
} & CommercialHighlightProps) {
  const years = [1, 2, 3, 4, 5];
  const data = years.map((yr) => {
    const row: Record<string, number | string | undefined> = { year: `Y${yr}` };
    vendors.forEach((v) => {
      let spent = 0;
      for (let j = 0; j < yr; j++) spent += v.pricing.years[j]?.valueM ?? 0;
      const baselineCum = baselineAnnual * yr;
      row[v.displayName] = baselineCum - spent;
    });
    return row;
  });

  const toggle = (vid: string) => {
    onVendorToggle?.(highlightVendorId === vid ? null : vid);
  };

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#64748B" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748B" }}
            label={{
              value: "$M cumulative vs baseline",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
              fill: "#64748B",
            }}
          />
          <ReferenceLine y={0} stroke="#0F172A" strokeWidth={1} />
          <ReferenceLine
            y={synergyAnnualM * 3}
            stroke="#059669"
            strokeDasharray="5 5"
            strokeOpacity={0.85}
            label={{
              value: `$${synergyAnnualM}M/yr × 3y proxy`,
              fill: "#047857",
              fontSize: 10,
              position: "insideTopLeft",
            }}
          />
          <ReferenceLine
            y={synergyAnnualM * 5}
            stroke="#0F172A"
            strokeDasharray="4 4"
            strokeOpacity={0.45}
            label={{
              value: `5y envelope @ $${synergyAnnualM}M/yr`,
              fill: "#64748B",
              fontSize: 10,
              position: "insideBottomRight",
            }}
          />
          <Tooltip content={<StandardChartTooltip valueFormatter={formatChartM1} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            onClick={(e) => {
              const v = vendors.find((x) => x.displayName === e.value);
              if (v && onVendorToggle) toggle(v.id);
            }}
            style={{ cursor: onVendorToggle ? "pointer" : "default" }}
          />
          {vendors.map((v) => (
            <Line
              key={v.id}
              type="monotone"
              dataKey={v.displayName}
              stroke={v.color}
              strokeWidth={highlightVendorId === v.id ? 2.25 : 1.5}
              strokeOpacity={dimOpacity(highlightVendorId, v.id)}
              dot={false}
              activeDot={{ r: 4, fill: v.color }}
              connectNulls
              onClick={() => onVendorToggle && toggle(v.id)}
              style={{ cursor: onVendorToggle ? "pointer" : undefined }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const ONE_TIME_CATEGORIES = [
  "Training",
  "Dual-run",
  "Technology / migration",
  "Professional services",
  "Facilities / setup",
  "Investment / other",
] as const;

function categorizeOneTimeLabel(label: string): (typeof ONE_TIME_CATEGORIES)[number] {
  const l = label.toLowerCase();
  if (l.includes("train")) return "Training";
  if (l.includes("dual")) return "Dual-run";
  if (l.includes("invest") || l.includes("credit")) return "Investment / other";
  if (l.includes("prof") && l.includes("serv")) return "Professional services";
  if (l.includes("transition") || l.includes("setup") || l.includes("rebadg") || l.includes("facilit"))
    return "Facilities / setup";
  if (l.includes("tech") || l.includes("migrat") || l.includes("overlay") || l.includes("install"))
    return "Technology / migration";
  return "Investment / other";
}

/** Grouped bars: category on X, one series per vendor ($M from summed quarterly one-time rows). */
export function OneTimeCostsByCategoryChart({
  vendors,
  highlightVendorId,
  onVendorToggle,
}: { vendors: VendorRecord[] } & CommercialHighlightProps) {
  const data = ONE_TIME_CATEGORIES.map((cat) => {
    const row: Record<string, string | number> = { category: cat };
    vendors.forEach((v) => {
      let sumM = 0;
      for (const o of v.oneTimeLines ?? []) {
        if (categorizeOneTimeLabel(o.label) !== cat) continue;
        if (o.sumQuarterlyUsd != null && Number.isFinite(o.sumQuarterlyUsd)) sumM += o.sumQuarterlyUsd / 1e6;
      }
      row[v.id] = Math.round(sumM * 100) / 100;
    });
    return row;
  }).filter((row) => vendors.some((v) => (row[v.id] as number) > 0));

  if (!data.length) {
    return <p className="text-caption text-[#475569]">No categorized one-time rows to chart.</p>;
  }

  const averages: Record<string, number> = {};
  for (const v of vendors) {
    const vals = data.map((row) => row[v.id] as number).filter((n) => n > 0);
    averages[v.id] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const toggle = (vid: string) => {
    onVendorToggle?.(highlightVendorId === vid ? null : vid);
  };

  return (
    <div className="h-[440px] w-full min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fill: "#64748B" }}
            interval={0}
            angle={-22}
            textAnchor="end"
            height={72}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748B" }}
            label={{
              value: "$M (row sums)",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
              fill: "#64748B",
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-[6px] bg-[#0F172A] px-3 py-2 shadow-lg max-w-xs text-[11px] text-white">
                  <p className="font-medium text-white/90 mb-1">{label}</p>
                  {payload.map((p) => {
                    const vid = String(p.dataKey);
                    const v = vendors.find((x) => x.id === vid);
                    const avg = averages[vid] ?? 0;
                    const val = Number(p.value);
                    const note =
                      avg > 0 && Number.isFinite(val)
                        ? val > avg * 1.15
                          ? "Above category avg"
                          : val < avg * 0.85
                            ? "Below category avg"
                            : "Near category avg"
                        : "";
                    return (
                      <div key={vid} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-white/70">{p.name}:</span>
                          <span className="font-medium tabular-nums text-white">{formatChartM(p.value)}</span>
                        </div>
                        {note && <span className="text-white/50 pl-4">{note}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            onClick={(e) => {
              const v = vendors.find((x) => x.id === e.dataKey);
              if (v && onVendorToggle) toggle(v.id);
            }}
            style={{ cursor: onVendorToggle ? "pointer" : "default" }}
          />
          {vendors.map((v) => (
            <Bar
              key={v.id}
              dataKey={v.id}
              name={v.displayName}
              fill={v.color}
              fillOpacity={dimOpacity(highlightVendorId, v.id)}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              onClick={() => onVendorToggle && toggle(v.id)}
              style={{ cursor: onVendorToggle ? "pointer" : undefined }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TcvBarSorted({
  portfolio,
  highlightVendorId,
  onVendorToggle,
}: {
  portfolio: Portfolio;
} & CommercialHighlightProps) {
  const sorted = [...portfolio.vendors].sort((a, b) => a.tcvM - b.tcvM);
  const max = Math.max(...sorted.map((v) => v.tcvM));
  const avg = sorted.reduce((s, v) => s + v.tcvM, 0) / sorted.length;
  const toggle = (vid: string) => {
    onVendorToggle?.(highlightVendorId === vid ? null : vid);
  };
  return (
    <div className="space-y-3">
      <p className="text-micro text-[#475569]">
        Field avg: <span className="tabular-nums font-semibold text-ink-secondary">${avg.toFixed(1)}M</span>
      </p>
      {sorted.map((v) => {
        const isUbiquity = v.id === "ubiquity";
        const op = dimOpacity(highlightVendorId, v.id);
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onVendorToggle && toggle(v.id)}
            className="w-full text-left rounded-btn border border-transparent hover:border-border-strong hover:bg-surface-sunken/80 px-2 py-1.5 transition-all duration-150"
            style={{ opacity: op }}
          >
            <div className="flex justify-between text-micro mb-1">
              <span className="font-semibold" style={{ color: v.color }}>
                {v.displayName}
              </span>
              <span className="tabular-nums text-ink-secondary font-medium">${v.tcvM.toFixed(2)}M</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${(v.tcvM / max) * 100}%`, backgroundColor: v.color }}
              />
            </div>
            {isUbiquity && (
              <span className="inline-block mt-1 text-micro font-medium text-negative bg-red-50 border border-red-200 rounded-chip px-2 py-0.5 ring-1 ring-red-100/80">
                Above baseline
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
