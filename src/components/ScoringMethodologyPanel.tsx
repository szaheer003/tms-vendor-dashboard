"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SCORE_BG, SCORE_COLORS, SCORE_LABELS, scoreHeatTextOnRamp } from "@/lib/scoreGradient";

const ROWS: { s: number; t: string }[] = [
  {
    s: 1,
    t: "Fundamental gaps; cannot proceed without major rework to approach, commercials, or risk posture.",
  },
  {
    s: 3,
    t: "Addressable but significant concerns remain — diligence and negotiation required before shortlist.",
  },
  {
    s: 7,
    t: "Meets requirements with minor issues; credible path to contract and delivery.",
  },
  {
    s: 9,
    t: "Exceeds requirements — best-in-class response, differentiated proof, or innovation with impact.",
  },
];

export function ScoringMethodologyPanel({ collapsedDefault = false }: { collapsedDefault?: boolean }) {
  const [open, setOpen] = useState(!collapsedDefault);
  return (
    <Card className="overflow-hidden p-0 shadow-card border-[#F1F5F9]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-h3 text-[#0F172A] hover:bg-[#FAFAFA]"
      >
        Scoring methodology
        <span className="text-caption text-[#475569]">{open ? "Hide" : "View methodology"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-[#F1F5F9] px-5 pb-5 pt-4 text-body text-[#475569]">
          <p>
            Workshop evaluators use a discrete <strong>1 / 3 / 7 / 9</strong> scale on scored questions (Q8–Q12). Intermediate
            values may be recorded for nuance; heatmaps interpolate between the four anchor colors.
          </p>
          <p className="text-caption text-[#475569]">
            Anchor shorthand: <strong>1</strong> = Does not meet threshold (unacceptable risk); <strong>3</strong> = Material gaps;{" "}
            <strong>7</strong> = Strong fit; <strong>9</strong> = Differentiated / exceeds expectations.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full overflow-hidden rounded-lg border border-[#E2E8F0] text-caption">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <th className="border-b border-[#E2E8F0] p-2 text-left">Score</th>
                  <th className="border-b border-[#E2E8F0] p-2 text-left">Label</th>
                  <th className="border-b border-[#E2E8F0] p-2 text-left">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.s} className="border-b border-[#F1F5F9]">
                    <td className="w-20 align-top p-2">
                      <span
                        className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-black/10 px-2 py-0.5 font-semibold tabular-nums"
                        style={{ backgroundColor: SCORE_BG[r.s], color: scoreHeatTextOnRamp(r.s) }}
                      >
                        {r.s}
                      </span>
                    </td>
                    <td className="w-36 align-top p-2 font-semibold text-[#0F172A]" style={{ color: SCORE_COLORS[r.s] }}>
                      {SCORE_LABELS[r.s]}
                    </td>
                    <td className="p-2 align-top">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="mb-2 font-semibold text-[#0F172A]">Pillar weights (composite)</p>
            <ul className="list-disc space-y-1 pl-5 text-caption">
              <li>Commercial Attractiveness — 22.5%</li>
              <li>Operational Excellence &amp; Delivery — 22.5%</li>
              <li>Technology &amp; AI — 22.5%</li>
              <li>Client &amp; Workforce Migration — 22.5%</li>
              <li>Partnership Readiness — 10%</li>
            </ul>
            <p className="mt-3 text-caption">Evaluators: up to <strong>12</strong> Workshop 1 responses per vendor (evaluator workbook exports).</p>
            <p className="mt-2 text-caption">Weighted composite = Σ (pillar average × pillar weight).</p>
          </div>
        </div>
      )}
    </Card>
  );
}

