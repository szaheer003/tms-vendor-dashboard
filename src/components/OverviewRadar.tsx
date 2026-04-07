"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { Portfolio } from "@/lib/types";
import { EVALUATOR_SCORES_TARGET_LINE } from "@/data/timeline";

const PILLAR_LABELS: Record<string, string> = {
  commercial: "Commercial",
  operations: "Operations",
  technology: "Technology",
  migration: "Migration",
  partnership: "Partnership",
};

export function OverviewRadar({
  portfolio,
  scoresPending,
}: {
  portfolio: Portfolio;
  /** When true, show placeholder instead of vendor polygons */
  scoresPending?: boolean;
}) {
  const inferredPending =
    scoresPending ?? portfolio.scorecard.dimensions[0]?.scores[portfolio.scorecard.columnOrder[0] ?? "cognizant"] == null;
  if (inferredPending) {
    return (
      <div className="py-16 px-8 text-center max-w-xl mx-auto">
        <p className="text-body text-[#475569] leading-relaxed">Composite scoring available after Workshop 1.</p>
        <p className="text-caption text-[#475569] mt-3">
          Evaluator sessions populate pillar means; radar activates when scores land (target {EVALUATOR_SCORES_TARGET_LINE}).
        </p>
      </div>
    );
  }
  const order = portfolio.scorecard.columnOrder;
  const keys = ["commercial", "operations", "technology", "migration", "partnership"];
  const rows = keys.map((k) => {
    const row: Record<string, string | number> = { pillar: PILLAR_LABELS[k] };
    portfolio.radar.vendors.forEach((rv) => {
      const name = portfolio.vendors.find((v) => v.id === rv.vendorId)?.displayName ?? rv.vendorId;
      row[name] = rv.pillars[k] ?? 0;
    });
    row.field = portfolio.radar.fieldAverage[k] ?? 0;
    return row;
  });

  const vendorNames = order.map((id) => portfolio.vendors.find((v) => v.id === id)?.displayName ?? id);

  const colors = order.map((id) => portfolio.vendors.find((v) => v.id === id)?.color ?? "#64748b");

  return (
    <div className="h-[min(300px,70vw)] w-full max-w-[300px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} cx="50%" cy="52%" outerRadius="68%">
          <PolarGrid stroke="#CBD5E1" strokeOpacity={0.45} />
          <PolarAngleAxis dataKey="pillar" tick={{ fill: "#64748B", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fill: "#64748B", fontSize: 10 }} />
          <Radar name="Field avg" dataKey="field" stroke="#64748B" fill="#64748B" fillOpacity={0.22} strokeWidth={2} />
          {vendorNames.map((nm, i) => (
            <Radar
              key={nm}
              name={nm}
              dataKey={nm}
              stroke={colors[i]}
              fill={colors[i]}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
