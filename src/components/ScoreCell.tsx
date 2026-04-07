import type { CSSProperties } from "react";
import { scoreBgContinuous, scoreHeatTextOnRamp, scoreLabel } from "@/lib/scoreGradient";

/** Tailwind-friendly cell style for scorecard / matrix cells (1/3/7/9 scale). */
export function scoreHeatStyle(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "bg-slate-100 text-slate-500 border border-slate-200";
  return "border border-black/10";
}

export function scoreHeatInlineStyle(v: number | null | undefined): CSSProperties | undefined {
  if (v == null || Number.isNaN(v)) return { backgroundColor: "#F8FAFC", color: "#64748B" };
  return {
    backgroundColor: scoreBgContinuous(v),
    color: scoreHeatTextOnRamp(v),
    borderColor: "rgba(15,23,42,0.14)",
  };
}

export function ScoreValueBlock({ value }: { value: number | null | undefined }) {
  const pending = value == null || !Number.isFinite(value);
  if (pending) {
    return <span className="inline-flex min-w-[2.5rem] justify-center tabular-nums text-[#475569] font-normal">—</span>;
  }
  return (
    <span
      className="inline-flex min-w-[4.5rem] flex-col items-center justify-center rounded-lg border px-2 py-2 tabular-nums font-semibold shadow-sm"
      style={scoreHeatInlineStyle(value)}
    >
      {Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}
      <span className="text-micro font-normal normal-case opacity-90">{scoreLabel(value)}</span>
    </span>
  );
}

export function bestInClass(
  scores: Record<string, number | null | undefined>,
  ids: string[],
): Set<string> {
  const vals = ids.map((id) => scores[id]).filter((x): x is number => x != null && Number.isFinite(x));
  if (!vals.length) return new Set();
  const max = Math.max(...vals);
  const s = new Set<string>();
  ids.forEach((id) => {
    const v = scores[id];
    if (v != null && v === max) s.add(id);
  });
  return s;
}
