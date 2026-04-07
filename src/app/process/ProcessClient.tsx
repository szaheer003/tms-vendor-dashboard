"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  daysLabel,
  daysUntil,
  MILESTONES,
  milestonesChronological,
  nextCountdownMilestones,
  prevMilestoneIso,
  progressToDate,
} from "@/data/timeline";
import { useDataset } from "@/lib/dataset";
import type { Milestone } from "@/lib/workshopTypes";
import { memoHasBody, WORKSHOP1_FUNNEL_VENDOR_IDS, getWorkshop1Memo } from "@/lib/workshopMemos";
import { RfpProgramTimeline } from "@/components/process/RfpProgramTimeline";

const STAGE_TOPIC_SHORT: Record<string, string> = {
  w2: "Migration, Rebadge, Tech & Offshoring",
  w3: "Commercial Alignment & Open Qs",
  w4: "Technology Approach & Migration",
};

type Stage = {
  key: string;
  milestoneId: string;
  shortLabel: string;
  workshopNum: number | null;
  tbdDots: number;
  href: string | null;
  isDownSelect?: boolean;
};

const STAGES: Stage[] = [
  { key: "w1", milestoneId: "workshop1", shortLabel: "1", workshopNum: 1, tbdDots: 0, href: null },
  {
    key: "ds1",
    milestoneId: "shortlist_approved",
    shortLabel: "6→3",
    workshopNum: null,
    tbdDots: 0,
    href: "/scorecard/",
    isDownSelect: true,
  },
  { key: "w2", milestoneId: "workshop2", shortLabel: "2", workshopNum: 2, tbdDots: 3, href: null },
  {
    key: "ds2",
    milestoneId: "finalists_selected",
    shortLabel: "3→2",
    workshopNum: null,
    tbdDots: 0,
    href: "/scorecard/",
    isDownSelect: true,
  },
  { key: "w3", milestoneId: "workshop3", shortLabel: "3", workshopNum: 3, tbdDots: 2, href: null },
  { key: "w4", milestoneId: "workshop4", shortLabel: "4", workshopNum: 4, tbdDots: 2, href: null },
  { key: "aw", milestoneId: "intent_to_award", shortLabel: "Award", workshopNum: null, tbdDots: 1, href: null },
];

const SCORECARD_GATE_IDS = new Set(["shortlist_approved", "finalists_selected"]);

function milestoneById(id: string): Milestone | undefined {
  return MILESTONES.find((m) => m.id === id);
}

function CountdownCard({
  milestone: m,
  progress,
  daysAway,
  isNext,
}: {
  milestone: Milestone;
  progress: number;
  daysAway: number;
  isNext: boolean;
}) {
  const isComplete = m.status === "complete";
  const urgencyColor =
    isComplete ? "#059669" : daysAway <= 3 ? "#DC2626" : daysAway <= 7 ? "#6366F1" : "#64748B";
  const journeyPct = Math.round(progress * 100);
  const barPct = isComplete
    ? 100
    : Math.min(100, Math.max(22, journeyPct + Math.max(0, 18 - Math.min(18, daysAway)) * 3));

  const bodyCopy = m.description ?? m.detail ?? "";

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-shadow max-h-[180px] flex flex-col ${
        isNext ? "shadow-md border-[#E2E8F0] ring-1 ring-[#6366F1]/10" : "shadow-card border-[#E2E8F0]"
      }`}
    >
      <div className="p-4 flex flex-col flex-1 min-h-0">
        <p className="text-[14px] font-semibold text-[#0F172A] leading-snug">{m.label}</p>

        {isComplete ? (
          <p className="mt-2 text-[16px] font-bold text-[#059669]">Complete ✓</p>
        ) : (
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="countdown-number text-[28px] font-bold tabular-nums leading-none"
              style={{ color: urgencyColor }}
            >
              {daysAway}
            </span>
            <span className="text-[14px] font-medium text-[#334155]">{daysAway === 1 ? "day" : "days"}</span>
          </div>
        )}

        <p className="text-[13px] font-medium text-[#334155] mt-1.5 tabular-nums">{m.date}</p>

        {bodyCopy ? <p className="text-[13px] text-[#334155] mt-1 leading-relaxed line-clamp-2">{bodyCopy}</p> : null}

        <div className="mt-auto pt-3 flex items-center gap-3">
          <div className="flex-1 h-[3px] rounded-full bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${barPct}%`, backgroundColor: urgencyColor }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-[#334155] shrink-0 w-10 text-right">{journeyPct}%</span>
        </div>
      </div>
    </div>
  );
}

function ProcessSnapshotMetric({
  accentBar: _accentBar,
  label,
  value,
  sublabel,
  href,
  emphasize,
}: {
  accentBar: string;
  label: string;
  value: string;
  sublabel?: string;
  href?: string;
  emphasize?: boolean;
}) {
  const inner = (
    <div className="relative flex flex-col justify-center max-h-[64px] py-1.5 px-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#475569]">{label}</p>
      <p className="text-[20px] font-bold leading-tight text-[#0F172A] tabular-nums truncate mt-0.5">{value}</p>
      {sublabel ? <p className="text-[11px] mt-0.5 text-[#475569]">{sublabel}</p> : null}
    </div>
  );

  const shell =
    `group relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white px-3 shadow-sm transition-all duration-200 hover:border-[#CBD5E1]` +
    (emphasize ? " ring-1 ring-[#6366F1]/15" : "") +
    (href
      ? " block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1]"
      : "");

  if (href) {
    return (
      <Link href={href} className={shell}>
        {inner}
      </Link>
    );
  }
  return <div className={shell}>{inner}</div>;
}

export function ProcessClient() {
  const router = useRouter();
  const { portfolio } = useDataset();
  const now = new Date();
  const chrono = useMemo(() => milestonesChronological(MILESTONES), []);
  const countdownMs = nextCountdownMilestones(MILESTONES, now, 3);
  const shortlistM = milestoneById("shortlist_approved");
  const dsDays = shortlistM ? daysUntil(shortlistM.isoDate, now) : 0;

  const vendorById = useMemo(() => Object.fromEntries(portfolio.vendors.map((v) => [v.id, v])), [portfolio.vendors]);

  const goWorkshop = (n: number, vendor?: string) => {
    const q = new URLSearchParams({ workshop: String(n) });
    if (vendor) q.set("vendor", vendor);
    router.push(`/workshops/?${q.toString()}`);
  };

  const onVendorDotClick = (e: React.MouseEvent, vendorId: string) => {
    if (e.shiftKey) {
      e.preventDefault();
      try {
        sessionStorage.setItem("tearSheetPreselectVendor", vendorId);
      } catch {
        /* ignore */
      }
      router.push(`/tear-sheets/?vendor=${encodeURIComponent(vendorId)}`);
      return;
    }
    goWorkshop(1, vendorId);
  };

  return (
    <div className="space-y-14 animate-page-in">
      <div className="space-y-3">
        <h1 className="text-h1 text-[#0F172A]">Vendor Selection Process</h1>
        <p className="text-body-lg text-[#475569] max-w-3xl leading-relaxed">
          Six vendors are competing for a 5-year, ~$750M managed services contract covering 2,678 FTE across NA and EMEA. This page
          tracks where we are in the evaluation — from initial proposals through workshops to a single awarded partner.
        </p>
      </div>

      {/* Funnel — primary evaluation path */}
      <section className="space-y-4 pb-2">
        <div>
          <h2 className="text-h2 font-medium text-[#0F172A]">Evaluation funnel</h2>
          <p className="text-caption text-[#475569] mt-2 max-w-3xl leading-relaxed">
            Vendor pool through workshops to award. The full Gantt-style program (administration, memos, contracting, business case)
            is at the bottom of this page with a shared date scale.
          </p>
        </div>

        <div className="relative z-20 flex justify-center pb-2 mb-6">
          <div className="rounded-lg border-2 border-dashed border-[#DC2626] bg-white px-5 py-2.5 text-center shadow-md max-w-lg">
            <p className="text-[13px] font-bold uppercase tracking-widest text-[#DC2626]">We are here</p>
            <p className="text-[12px] text-[#475569] mt-1 leading-relaxed">
              Workshop 1 complete. Next: Decision Committee shortlist <span className="font-medium text-[#0F172A]">Apr 7–8</span>
              . Workshop 2 <span className="font-medium text-[#0F172A]">Apr 13–15</span>.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-card min-h-[320px] overflow-x-auto">
          <div className="relative flex min-h-[280px] min-w-[1080px] items-stretch gap-3 lg:min-w-0">
            {/* Vendor pool */}
            <div className="w-[188px] shrink-0 flex flex-col justify-center rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-4 shadow-sm">
              <div className="space-y-2.5">
                {WORKSHOP1_FUNNEL_VENDOR_IDS.map((vid) => {
                  const v = vendorById[vid];
                  if (!v) return null;
                  const memo = getWorkshop1Memo(vid);
                  const hasMemo = memoHasBody(memo);
                  const statusLine = hasMemo ? "Memo available" : "Memo pending extraction";
                  return (
                    <button
                      key={vid}
                      type="button"
                      title={`${v.displayName} · TCV $${v.tcvM.toFixed(1)}M · ${statusLine} · Click memo · Shift+click tear sheet`}
                      onClick={(e) => onVendorDotClick(e, vid)}
                      className="group flex w-full cursor-pointer items-center gap-2.5 text-left transition-transform hover:scale-[1.02]"
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-2 ring-white transition-transform group-hover:scale-125"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="min-w-0 truncate text-[13px] font-medium text-[#0F172A] group-hover:underline">
                        {v.displayName}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[#0F172A]">${v.tcvM.toFixed(1)}M</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 border-t border-[#E2E8F0] pt-3 text-[10px] font-semibold uppercase tracking-wider text-[#0F172A]">
                Initial Vendor Pool
              </p>
            </div>

            <div className="flex w-8 shrink-0 items-center self-center" aria-hidden>
              <div className="h-[3px] w-full rounded-full bg-[#CBD5E1]" />
            </div>

            {/* Pipeline */}
            <div className="relative min-w-0 flex-1 flex flex-col justify-center py-4">
              <div className="pointer-events-none absolute inset-x-0 top-[calc(50%-4px)] z-0 -translate-y-1/2">
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    background: "linear-gradient(to right, #CBD5E1 0%, #CBD5E1 15%, #E2E8F0 50%, #F1F5F9 85%, #F8FAFC 100%)",
                    clipPath: "polygon(0 0, 100% 20%, 100% 80%, 0 100%)",
                  }}
                />
              </div>

              <div className="relative z-10 flex w-full items-center justify-between px-0.5 min-h-[168px]">
                {STAGES.map((stage) => {
                  const m = milestoneById(stage.milestoneId);
                  const isAward = stage.key === "aw";
                  const isW1 = stage.key === "w1";
                  const isWs = stage.workshopNum != null;
                  const isClickable = Boolean(stage.href || stage.workshopNum != null);
                  const topicShort = STAGE_TOPIC_SHORT[stage.key];
                  const isGate = stage.isDownSelect && m;
                  const gateDays = isGate && m ? daysUntil(m.isoDate, now) : 0;

                  const circleClass =
                    "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-transform ";

                  return (
                    <div key={stage.key} className="relative flex flex-1 flex-col items-center justify-center pb-0">
                      <div className="flex min-h-[22px] w-full flex-col items-center justify-end mb-1">
                        {stage.tbdDots > 0 ? (
                          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#334155]">
                            {stage.tbdDots} TBD
                          </span>
                        ) : (
                          <span className="h-[22px]" aria-hidden />
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1.5">
                        {stage.isDownSelect ? (
                          <button
                            type="button"
                            onClick={() => stage.href && router.push(stage.href)}
                            className={`flex h-12 w-12 rotate-45 cursor-pointer items-center justify-center rounded-lg text-[10px] font-bold shadow-md transition-transform hover:scale-105 ${
                              m?.status === "active"
                                ? "border-2 border-[#6366F1] bg-[#6366F1] text-white"
                                : m?.status === "complete"
                                  ? "border-2 border-[#0F172A] bg-[#0F172A] text-white"
                                  : "border-2 border-[#E2E8F0] bg-[#F8FAFC] text-[#334155]"
                            }`}
                            aria-label={`Open scorecard — ${stage.shortLabel}`}
                          >
                            <span className="-rotate-45 px-0.5 text-center leading-tight">{stage.shortLabel}</span>
                          </button>
                        ) : isAward ? (
                          <div
                            className={`flex h-16 w-16 shrink-0 items-center justify-center text-[36px] leading-none transition-transform ${
                              m?.status === "complete" ? "text-[#059669]" : "text-[#CBD5E1]"
                            }`}
                            aria-hidden={m?.status !== "complete"}
                          >
                            ★
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isClickable}
                            onClick={() => {
                              if (stage.href) router.push(stage.href);
                              else if (stage.workshopNum != null) goWorkshop(stage.workshopNum);
                            }}
                            className={
                              isW1 && m?.status === "complete"
                                ? circleClass +
                                  "cursor-pointer border-[#0F172A] bg-[#0F172A] text-[20px] font-bold text-white shadow-lg hover:scale-105"
                                : isWs && m?.status === "upcoming"
                                  ? circleClass +
                                    "cursor-pointer border-[#E2E8F0] bg-[#F8FAFC] text-[17px] font-semibold text-[#334155] hover:scale-105"
                                  : circleClass +
                                    `border-[#E2E8F0] bg-white text-[18px] font-semibold text-[#334155] ${
                                      isClickable ? "cursor-pointer hover:scale-105" : "cursor-default opacity-90"
                                    }`
                            }
                            aria-label={stage.workshopNum != null ? `Open Workshop ${stage.workshopNum}` : undefined}
                          >
                            {stage.shortLabel}
                          </button>
                        )}

                        <div className="mt-2 max-w-[118px] text-center">
                          {stage.isDownSelect ? (
                            <>
                              <p className="text-[12px] font-semibold text-[#0F172A]">Down-selection</p>
                              <p className="text-[11px] text-[#334155] mt-0.5 tabular-nums">
                                {m?.date} · {gateDays} {gateDays === 1 ? "day" : "days"}
                              </p>
                              <p className="text-[10px] font-medium text-[#6366F1] mt-1 leading-snug">
                                {stage.shortLabel === "6→3" ? "6 vendors → 3 shortlisted" : "3 shortlisted → 2 finalists"}
                              </p>
                            </>
                          ) : isAward ? (
                            <>
                              <p className="text-[12px] font-semibold text-[#0F172A]">Intent to Award</p>
                              {m ? <p className="text-[11px] text-[#334155] mt-0.5">{m.date}</p> : null}
                              {m?.vendorCount != null ? (
                                <p className="text-[10px] text-[#334155] mt-0.5">
                                  {m.vendorCount} vendor{m.vendorCount !== 1 ? "s" : ""}
                                </p>
                              ) : null}
                            </>
                          ) : isW1 ? (
                            <>
                              <p className="text-[12px] font-semibold text-[#0F172A]">Workshop 1</p>
                              {m ? <p className="text-[11px] text-[#334155] mt-0.5">{m.date}</p> : null}
                              <p className="text-[10px] font-medium text-[#059669] mt-1 leading-snug">
                                ✓ 6 vendors presented — memos available
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[12px] font-semibold text-[#0F172A]">Workshop {stage.shortLabel}</p>
                              {topicShort ? (
                                <p className="text-[10px] text-[#334155] mt-0.5 leading-snug">{topicShort}</p>
                              ) : null}
                              {m ? <p className="text-[11px] text-[#334155] mt-0.5 tabular-nums">{m.date}</p> : null}
                              {m?.vendorCount != null ? (
                                <p className="text-[10px] text-[#334155] mt-0.5">
                                  {m.vendorCount} vendor{m.vendorCount !== 1 ? "s" : ""}
                                </p>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program snapshot — compact metrics */}
      <section className="space-y-4" aria-label="Program snapshot">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-h2 font-medium text-[#0F172A]">Program snapshot</h2>
            <p className="text-caption text-[#475569] mt-1 max-w-xl">
              Live counts and the next governance gate. Values track the current RFP data model.
            </p>
          </div>
          <p className="text-[11px] text-[#475569]">Evaluation · 2026</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
            label="Vendors evaluated"
            value="6"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
            label="Workshop 1 memos"
            value="5"
            href="/workshops/?workshop=1"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400"
            label="Competitive bid range"
            value="$425M–$560M"
            sublabel="Excl. Ubiquity · 5-yr TCV"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-[#6366F1] via-[#4F46E5] to-[#4338CA]"
            label="Next decision point"
            value={shortlistM?.date ?? "Apr 7 – 8"}
            sublabel={
              dsDays === 0 ? "Due today" : dsDays === 1 ? "1 day to gate" : `${dsDays} days to gate`
            }
            href="/scorecard/"
            emphasize
          />
        </div>
      </section>

      {/* Countdown cards */}
      <section>
        <h2 className="text-h2 text-[#0F172A] mb-5">Next milestones</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {countdownMs.map((m, i) => {
            const prevIso = prevMilestoneIso(m, chrono);
            const progress = progressToDate(prevIso, m.isoDate, now);
            const dAway = daysUntil(m.isoDate, now);
            return (
              <CountdownCard
                key={m.id}
                milestone={m}
                progress={progress}
                daysAway={dAway}
                isNext={i === 0}
              />
            );
          })}
        </div>
      </section>

      {/* Vertical timeline */}
      <section>
        <h2 className="text-h2 text-[#0F172A] mb-2">Key milestones</h2>
        <p className="text-caption text-[#475569] mb-6 max-w-2xl">
          Decision-focused dates only. For every activity on a calendar grid (Feb–Jun), scroll to the{" "}
          <span className="text-[#0F172A] font-medium">2026 RFP program timeline</span> section below.
        </p>
        <div className="max-w-4xl border-l-2 border-[#E2E8F0] ml-3 pl-8 space-y-3">
          {MILESTONES.map((m) => {
            const isComplete = m.status === "complete";
            const isActive = m.status === "active";
            const dot = isComplete
              ? "bg-[#0F172A] w-3 h-3"
              : isActive
                ? "ring-4 ring-[#6366F1]/30 bg-[#6366F1] w-4 h-4"
                : "border-2 border-[#CBD5E1] bg-white w-3 h-3";
            const rich = m.description ?? m.detail;
            const statusText = daysLabel(m.isoDate, m.status, now);

            return (
              <div
                key={m.id}
                className={`relative rounded-lg ${isActive ? "bg-[#EEF2FF] -mx-4 px-4 py-3 sm:-mx-6 sm:px-6" : ""}`}
              >
                <span className={`absolute -left-[41px] top-2 rounded-full ${dot}`} aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className={`text-body ${isActive ? "font-semibold text-[#0F172A]" : isComplete ? "text-[#334155]" : "text-[#334155]"}`}
                  >
                    <span className="tabular-nums">{m.date}</span> · {m.label}
                  </p>
                  <span
                    className={`text-[12px] font-bold uppercase tracking-wide rounded-md px-2 py-0.5 ${
                      isComplete
                        ? "text-[#059669] bg-[#ECFDF5]"
                        : isActive
                          ? "text-[#4338CA] bg-[#EEF2FF]"
                          : "text-[#334155] bg-[#F1F5F9]"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>
                {rich ? (
                  <p className="text-[13px] text-[#334155] mt-2 leading-relaxed max-w-2xl">{rich}</p>
                ) : null}

                {m.id === "workshop1" && m.vendors && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[12px] font-medium text-[#059669]">
                      6 vendors presented. 5 executive summaries produced.{" "}
                      <Link href="/workshops/?workshop=1" className="text-[#6366F1] font-medium hover:underline">
                        View memos →
                      </Link>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      {m.vendors.map((vid) => {
                        const v = vendorById[vid];
                        if (!v) return null;
                        return (
                          <button
                            key={vid}
                            type="button"
                            onClick={(e) => onVendorDotClick(e, vid)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white py-1 pl-1 pr-2 text-[11px] font-medium text-[#475569] shadow-sm transition-transform hover:scale-105 hover:border-[#CBD5E1]"
                          >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: v.color }} />
                            {v.displayName}
                            <span className="tabular-nums text-[#0F172A]">${v.tcvM.toFixed(1)}M</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {SCORECARD_GATE_IDS.has(m.id) && (
                  <Link href="/scorecard/" className="inline-block mt-2 text-[13px] text-[#6366F1] font-medium hover:underline">
                    Open scorecard →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <RfpProgramTimeline />
    </div>
  );
}
