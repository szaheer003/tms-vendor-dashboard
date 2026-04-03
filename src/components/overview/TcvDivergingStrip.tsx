"use client";

import { useRouter } from "next/navigation";
import type { PortfolioVendor } from "@/lib/types";
import { Tooltip } from "@/components/ui/Tooltip";

const TEAR_PRESELECT_KEY = "tearSheetPreselectVendor";

export function TcvDivergingStrip({
  vendors,
  baselineFiveYearM,
}: {
  vendors: PortfolioVendor[];
  baselineFiveYearM: number;
}) {
  const router = useRouter();
  const sorted = [...vendors].sort((a, b) => a.tcvM - b.tcvM);
  const max = Math.max(...sorted.map((v) => v.tcvM), baselineFiveYearM);
  const min = Math.min(...sorted.map((v) => v.tcvM));
  const span = max - min || 1;
  const avgTcv = sorted.reduce((s, v) => s + v.tcvM, 0) / sorted.length;

  function goTearSheet(vendorId: string) {
    try {
      sessionStorage.setItem(TEAR_PRESELECT_KEY, vendorId);
    } catch {
      /* ignore */
    }
    router.push("/tear-sheets");
  }

  const baselineLeftPct = Math.min(100, Math.max(0, ((baselineFiveYearM - min) / span) * 85 + 15));

  return (
    <div className="space-y-3">
      <p className="text-caption text-[#94A3B8]">
        Click a bar to open that vendor&apos;s tear sheet. Shaded band: ~${baselineFiveYearM.toFixed(0)}M baseline (mid × 5).
      </p>
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden>
          <div
            className="absolute top-0 bottom-0 w-[3%] min-w-[6px] -translate-x-1/2 bg-[#0F172A]/[0.06]"
            style={{ left: `${baselineLeftPct}%` }}
          />
        </div>
        {sorted.map((v) => {
          const isUbiquity = v.id === "ubiquity";
          const wPct = ((v.tcvM - min) / span) * 85 + 15;
          return (
            <Tooltip
              key={v.id}
              content={
                <span className="max-w-[220px] whitespace-normal text-left block text-[11px]">
                  TCV ${v.tcvM.toFixed(2)}M · Opens tear sheet with this vendor selected
                </span>
              }
              position="top"
            >
              <button
                type="button"
                onClick={() => goTearSheet(v.id)}
                className="relative z-[2] flex w-full items-center gap-3 text-left py-1 transition-fast hover:bg-[#F8FAFC]/80 rounded-sm px-1 group"
              >
                <span className="text-micro uppercase tracking-[0.05em] w-28 shrink-0 truncate font-medium" style={{ color: v.color }}>
                  {v.displayName}
                </span>
                <div className="flex-1 h-8 bg-[#F8FAFC] rounded overflow-hidden relative">
                  <div
                    className={`h-full rounded-sm transition-fast ${isUbiquity ? "border border-dashed border-[#DC2626]/40" : ""}`}
                    style={{
                      width: `${wPct}%`,
                      backgroundColor: isUbiquity ? "#FECACA" : v.color,
                      opacity: isUbiquity ? 0.85 : 0.82,
                    }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-micro font-medium text-[#0F172A] tabular-nums">
                    ${v.tcvM.toFixed(2)}M
                  </span>
                </div>
              </button>
            </Tooltip>
          );
        })}
      </div>
      <div className="relative pt-2">
        <div
          className="h-px bg-[#E2E8F0] rounded"
          style={{
            width: `${baselineLeftPct}%`,
          }}
        />
        <span className="absolute -top-5 left-0 text-micro text-[#94A3B8] whitespace-nowrap">Baseline (mid × 5)</span>
        <ReferenceAvgLine avgTcv={avgTcv} min={min} span={span} />
      </div>
    </div>
  );
}

function ReferenceAvgLine({ avgTcv, min, span }: { avgTcv: number; min: number; span: number }) {
  const w = Math.min(100, Math.max(0, ((avgTcv - min) / span) * 85 + 15));
  return (
    <div className="relative mt-3 h-0.5">
      <div className="h-full bg-ink-faint/50 rounded" style={{ width: `${w}%` }} />
      <span className="absolute -top-5 left-0 text-micro text-ink-faint whitespace-nowrap">Field avg ${avgTcv.toFixed(1)}M</span>
    </div>
  );
}
