"use client";

import type { ReactNode } from "react";
import type { TooltipProps } from "recharts";

export function formatChartM(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}M`;
}

export function formatChartM1(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(1)}M`;
}

/** Dark tooltip on light charts — high contrast. */
export function StandardChartTooltip({
  active,
  payload,
  label,
  valueFormatter = formatChartM1,
}: TooltipProps<number, string> & { valueFormatter?: (v: unknown) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] bg-[#0F172A] px-3 py-2 shadow-lg max-w-xs text-[11px] leading-snug text-white">
      <p className="font-medium text-white/90 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-medium tabular-nums text-white">{valueFormatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartSection({
  title,
  subtitle,
  interpretation,
  children,
}: {
  title: string;
  subtitle?: string;
  interpretation?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-[16px] font-medium text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-[13px] text-[#475569] mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="py-1">{children}</div>
      {interpretation && (
        <p className="text-[13px] text-[#475569] leading-relaxed pl-4 border-l-2 border-[#E2E8F0]">{interpretation}</p>
      )}
    </section>
  );
}
