"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Portfolio } from "@/lib/types";

const LABELS: Record<string, string> = {
  commercial: "Commercial",
  operations: "Operations",
  technology: "Technology",
  migration: "Migration",
  partnership: "Partnership",
};

export function VendorPillarRadar({
  portfolio,
  vendorId,
  color,
}: {
  portfolio: Portfolio;
  vendorId: string;
  color: string;
}) {
  const scoresPending = portfolio.scorecard.dimensions[0]?.scores[vendorId] == null;
  if (scoresPending) {
    return (
      <div className="h-[280px] flex items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-caption text-[#475569] text-center px-4">
        Scores pending — radar will populate after Workshop 1.
      </div>
    );
  }
  const rv = portfolio.radar.vendors.find((x) => x.vendorId === vendorId);
  const field = portfolio.radar.fieldAverage;
  if (!rv) return null;
  const data = Object.keys(LABELS).map((k) => ({
    p: LABELS[k],
    vendor: rv.pillars[k] ?? 0,
    field: field[k] ?? 0,
  }));
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="52%" outerRadius="72%">
          <PolarGrid stroke="#CBD5E1" />
          <PolarAngleAxis dataKey="p" tick={{ fill: "#64748B", fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fontSize: 9, fill: "#64748B" }} />
          <Radar
            name="Field avg"
            dataKey="field"
            stroke="#CBD5E1"
            fill="#CBD5E1"
            fillOpacity={0.08}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <Radar name="Vendor" dataKey="vendor" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
