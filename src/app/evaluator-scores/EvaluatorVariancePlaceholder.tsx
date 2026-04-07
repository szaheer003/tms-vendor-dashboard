"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PLACEHOLDER_VARIANCE = [
  { dim: "D1", spread: 0 },
  { dim: "D4", spread: 0 },
  { dim: "D7", spread: 0 },
  { dim: "D10", spread: 0 },
  { dim: "D13", spread: 0 },
];

export function EvaluatorVariancePlaceholder() {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={PLACEHOLDER_VARIANCE} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" strokeOpacity={0.35} />
          <XAxis dataKey="dim" tick={{ fontSize: 11, fill: "#64748B" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748B" }}
            label={{ value: "Score spread", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748B" }}
          />
          <Tooltip formatter={() => "—"} labelFormatter={(l) => `Dimension ${l}`} />
          <Bar dataKey="spread" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
