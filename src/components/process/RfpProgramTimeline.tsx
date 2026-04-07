"use client";

import { useMemo } from "react";
import {
  RFP_PROGRAM_PHASES,
  formatRfpRowDates,
  rfpBarLayout,
  rfpMonthTicks,
  rfpPhaseRangeIsPast,
  rfpProgramRowsByPhase,
  rfpRowIsPast,
  rfpTodayPct,
  type RfpMonthTick,
  type RfpProgramRow,
} from "@/data/rfpProgramTimeline";

function phaseSpan(phaseId: string): { startIso: string; endIso: string } | null {
  const rows = rfpProgramRowsByPhase(phaseId);
  if (!rows.length) return null;
  const starts = rows.map((r) => r.startIso).sort();
  const ends = rows.map((r) => r.endIso).sort();
  return { startIso: starts[0]!, endIso: ends[ends.length - 1]! };
}

/** Vertical grid + optional today marker (shared scale). */
function MonthGrid({ ticks, todayPct, subtle }: { ticks: RfpMonthTick[]; todayPct: number | null; subtle?: boolean }) {
  return (
    <>
      {ticks.map((tick, i) => (
        <div
          key={i}
          className={`absolute top-0 bottom-0 w-px pointer-events-none ${subtle ? "bg-slate-200/70" : "bg-slate-200/80"}`}
          style={{ left: `${tick.pct}%` }}
          aria-hidden
        />
      ))}
      {todayPct != null ? (
        <div
          className="absolute top-0 bottom-0 w-px bg-sky-600 z-[2] pointer-events-none"
          style={{ left: `${todayPct}%`, boxShadow: "0 0 0 3px rgba(2, 132, 199, 0.12)" }}
          aria-hidden
        />
      ) : null}
    </>
  );
}

/** One ruler used at the top of the table only. */
function TimelineScale({ ticks, todayPct }: { ticks: RfpMonthTick[]; todayPct: number | null }) {
  return (
    <div className="relative h-8 w-full">
      <MonthGrid ticks={ticks} todayPct={todayPct} />
      {ticks.map((tick, i) => (
        <span
          key={i}
          className="absolute bottom-0 z-[1] text-[11px] font-medium tabular-nums text-[#334155] -translate-x-1/2 select-none"
          style={{ left: `${tick.pct}%` }}
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
}

function ActivityBar({
  row,
  phaseColor,
  ticks,
  todayPct,
  isPast,
}: {
  row: RfpProgramRow;
  phaseColor: string;
  ticks: RfpMonthTick[];
  todayPct: number | null;
  isPast: boolean;
}) {
  const { left, width } = rfpBarLayout(row);
  const isMilestone = row.type === "milestone";

  return (
    <div
      className={`relative h-6 w-full rounded-md bg-slate-100/80 ring-1 ring-inset ring-slate-200/80 overflow-hidden transition-opacity ${
        isPast ? "opacity-50" : ""
      }`}
    >
      <MonthGrid ticks={ticks} todayPct={todayPct} subtle />
      <div
        className={`absolute top-1/2 z-[3] h-[14px] -translate-y-1/2 rounded-sm ${
          isMilestone ? "ring-1 ring-rose-700/25" : ""
        }`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: isMilestone ? "#be123c" : phaseColor,
          opacity: isMilestone ? 1 : 0.85,
          minWidth: isMilestone ? 8 : 4,
        }}
        title={`${row.activity} · ${formatRfpRowDates(row)}`}
      />
    </div>
  );
}

function ActivityRow({
  row,
  phaseColor,
  ticks,
  todayPct,
  now,
}: {
  row: RfpProgramRow;
  phaseColor: string;
  ticks: RfpMonthTick[];
  todayPct: number | null;
  now: Date;
}) {
  const isMilestone = row.type === "milestone";
  const isPast = rfpRowIsPast(row, now);

  return (
    <div className={`flex border-b border-slate-100 last:border-b-0 ${isPast ? "bg-slate-50/50" : ""}`}>
      <div
        className={`w-[min(100%,240px)] sm:w-60 shrink-0 border-r border-slate-100 px-3 py-0.5 ${
          isMilestone
            ? isPast
              ? "border-l-[3px] border-l-slate-300 bg-slate-100/40 pl-[13px]"
              : "border-l-[3px] border-l-rose-600 bg-rose-50/40 pl-[13px]"
            : isPast
              ? "bg-slate-50/60"
              : "bg-white"
        }`}
      >
        <p
          className={`text-[12px] leading-snug text-[#334155] ${
            isPast ? (isMilestone ? "font-semibold" : "font-medium") : isMilestone ? "font-semibold text-rose-950" : "font-medium"
          }`}
        >
          {row.activity}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[11px] tabular-nums text-[#334155] font-medium">
            {formatRfpRowDates(row)}
          </span>
          {isMilestone ? (
            <span
              className={`text-[10px] font-medium uppercase tracking-wider ${
                isPast ? "text-slate-500" : "text-rose-700/90"
              }`}
            >
              Milestone
            </span>
          ) : null}
        </div>
      </div>
      <div className={`min-w-[280px] flex-1 px-2 py-0.5 flex items-center ${isPast ? "bg-slate-50/50" : "bg-white"}`}>
        <ActivityBar row={row} phaseColor={phaseColor} ticks={ticks} todayPct={todayPct} isPast={isPast} />
      </div>
    </div>
  );
}

export function RfpProgramTimeline() {
  const now = useMemo(() => new Date(), []);
  const ticks = useMemo(() => rfpMonthTicks(), []);
  const todayPct = useMemo(() => rfpTodayPct(now), [now]);

  return (
    <section className="space-y-6" aria-labelledby="rfp-program-timeline-heading">
      <header className="max-w-2xl space-y-3">
        <h2 id="rfp-program-timeline-heading" className="text-[1.65rem] font-semibold tracking-tight text-slate-900">
          2026 RFP program timeline
        </h2>
        <p className="text-[12px] leading-relaxed text-[#334155]">
          One shared scale from <span className="tabular-nums text-slate-700">Feb 1</span> through{" "}
          <span className="tabular-nums text-slate-700">Jul 1, 2026</span>. Each row is a work item; bar length is calendar time.
        </p>
        <ul className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-slate-500">
          <li className="flex items-center gap-2">
            <span className="h-2 w-7 rounded-sm bg-slate-400/90" aria-hidden />
            Activity
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-7 rounded-sm bg-rose-700" aria-hidden />
            Milestone
          </li>
          {todayPct != null ? (
            <li className="flex items-center gap-2">
              <span className="h-3 w-0.5 rounded-full bg-sky-600" aria-hidden />
              Today
            </li>
          ) : null}
        </ul>
      </header>

      <div className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden max-h-[min(65vh,760px)] flex flex-col">
        <div className="overflow-auto flex-1 min-h-0 overscroll-contain [scrollbar-gutter:stable]">
          <div className="min-w-[640px]">
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-slate-50/95 shadow-[0_2px_10px_rgba(15,23,42,0.06)] supports-[backdrop-filter]:backdrop-blur-sm">
              <div className="w-[min(100%,240px)] sm:w-60 shrink-0 border-r border-slate-200 px-4 py-3 flex items-end bg-slate-50/95">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  Phase &amp; activity
                </span>
              </div>
              <div className="min-w-[280px] flex-1 px-4 py-3 bg-slate-50/95">
                <TimelineScale ticks={ticks} todayPct={todayPct} />
              </div>
            </div>

            {RFP_PROGRAM_PHASES.map((phase) => {
              const rows = rfpProgramRowsByPhase(phase.id);
              if (!rows.length) return null;
              const span = phaseSpan(phase.id);
              const spanText = span
                ? formatRfpRowDates({
                    id: `meta-${phase.id}`,
                    phaseId: phase.id,
                    activity: "",
                    startIso: span.startIso,
                    endIso: span.endIso,
                    type: span.startIso === span.endIso ? "milestone" : "activity",
                  })
                : null;
              const phasePast = span ? rfpPhaseRangeIsPast(span.endIso, now) : false;

              return (
                <div key={phase.id} className="border-b border-slate-200 last:border-b-0">
                  <div
                    className={`flex items-center gap-2.5 border-b border-slate-200/80 px-4 py-2.5 ${
                      phasePast ? "bg-slate-100/60" : "bg-slate-50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white shadow-sm ${phasePast ? "opacity-50" : ""}`}
                      style={{ backgroundColor: phase.bar }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <p
                        className={`text-[13px] font-semibold leading-tight ${
                          phasePast ? "text-slate-500" : "text-slate-900"
                        }`}
                      >
                        {phase.title}
                      </p>
                      {spanText ? (
                        <span className={`text-[11px] tabular-nums font-medium text-[#334155] ${phasePast ? "opacity-80" : ""}`}>
                          · {spanText}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {rows.map((row) => (
                    <ActivityRow
                      key={row.id}
                      row={row}
                      phaseColor={phase.bar}
                      ticks={ticks}
                      todayPct={todayPct}
                      now={now}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
