"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
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
  w2: "Wave Design & Migration",
  w3: "Commercial Alignment",
  w4: "Technology & Dependencies",
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
  { key: "ds", milestoneId: "downselect", shortLabel: "6→3", workshopNum: null, tbdDots: 0, href: "/scorecard/", isDownSelect: true },
  { key: "w2", milestoneId: "workshop2", shortLabel: "2", workshopNum: 2, tbdDots: 3, href: null },
  { key: "w3", milestoneId: "workshop3", shortLabel: "3", workshopNum: 3, tbdDots: 2, href: null },
  { key: "w4", milestoneId: "workshop4", shortLabel: "4", workshopNum: 4, tbdDots: 2, href: null },
  { key: "aw", milestoneId: "award", shortLabel: "Award", workshopNum: null, tbdDots: 1, href: null },
];

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
    isComplete ? "#059669" : daysAway <= 3 ? "#DC2626" : daysAway <= 7 ? "#6366F1" : "#94A3B8";
  const urgencyBg =
    isComplete ? "#F0FDF4" : daysAway <= 3 ? "#FEF2F2" : daysAway <= 7 ? "#EEF2FF" : "#F8FAFC";
  const journeyPct = Math.round(progress * 100);
  const barPct = isComplete
    ? 100
    : Math.min(100, Math.max(22, journeyPct + Math.max(0, 18 - Math.min(18, daysAway)) * 3));

  const bodyCopy = m.description ?? m.detail ?? "";

  return (
    <div
      className={`rounded-xl border bg-white overflow-hidden transition-shadow ${
        isNext ? "shadow-md border-[#E2E8F0] ring-1 ring-[#6366F1]/10" : "shadow-card border-[#F1F5F9]"
      }`}
    >
      <div className="h-1" style={{ backgroundColor: urgencyColor }} />
      <div className="p-6" style={{ backgroundColor: isComplete ? urgencyBg : undefined }}>
        <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color: urgencyColor }}>
          {m.label}
        </p>

        {isComplete ? (
          <p className="mt-6 text-[22px] font-bold text-[#059669]">Complete ✓</p>
        ) : (
          <div className="mt-4 flex items-baseline gap-3">
            <span
              className="countdown-number text-[48px] font-bold tabular-nums leading-none"
              style={{ color: urgencyColor }}
            >
              {daysAway}
            </span>
            <span className="text-[16px] font-medium text-[#64748B]">{daysAway === 1 ? "day" : "days"}</span>
          </div>
        )}

        <p className="text-[15px] font-medium text-[#0F172A] mt-3">{m.date}</p>

        {bodyCopy ? <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">{bodyCopy}</p> : null}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${barPct}%`, backgroundColor: urgencyColor }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-[#94A3B8] shrink-0">{journeyPct}%</span>
        </div>
      </div>
    </div>
  );
}

function IconVendors() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMemo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconRange() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-7" />
    </svg>
  );
}

function IconDecision() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function ProcessSnapshotMetric({
  accentBar,
  iconBg,
  icon,
  label,
  value,
  sublabel,
  href,
  emphasize,
}: {
  accentBar: string;
  iconBg: string;
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  href?: string;
  emphasize?: boolean;
}) {
  const inner = (
    <>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${accentBar}`} aria-hidden />
      <div className="relative flex flex-col gap-4 pt-1">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.04] shadow-sm ${iconBg}`}
        >
          <span className="text-[#0F172A] opacity-[0.88]">{icon}</span>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
          <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold leading-[1.1] tracking-tight text-[#0F172A] tabular-nums">
            {value}
          </p>
          {sublabel ? (
            <p
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${
                emphasize
                  ? "bg-[#EEF2FF] text-[#4338CA] ring-1 ring-[#6366F1]/20"
                  : "bg-[#F1F5F9] text-[#475569]"
              }`}
            >
              {sublabel}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  const shell =
    `group relative overflow-hidden rounded-2xl border border-[#E8EEF4] bg-gradient-to-b from-white to-[#FAFBFC] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_-6px_rgba(15,23,42,0.09)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D4DCE6] hover:shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14)]` +
    (emphasize ? " ring-1 ring-[#6366F1]/20" : "") +
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
  const downselectM = milestoneById("downselect");
  const dsDays = downselectM ? daysUntil(downselectM.isoDate, now) : 0;

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
          <p className="text-caption text-[#64748B] mt-2 max-w-3xl leading-relaxed">
            Vendor pool through workshops to award. The full Gantt-style program (administration, memos, contracting, business case)
            is at the bottom of this page with a shared date scale.
          </p>
        </div>
        <div className="rounded-xl border border-[#F1F5F9] bg-white p-6 sm:p-8 shadow-card min-h-[360px] overflow-x-auto">
          <div className="relative flex min-h-[300px] min-w-[960px] items-center gap-3 lg:min-w-0">
            {/* Vendor pool */}
            <div className="w-[188px] shrink-0 self-center rounded-xl border border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] to-white p-4 shadow-sm">
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
                      <span className="min-w-0 truncate text-[13px] font-medium group-hover:underline" style={{ color: v.color }}>
                        {v.displayName}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[#94A3B8]">${v.tcvM.toFixed(1)}M</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 border-t border-[#E2E8F0] pt-3 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Initial Vendor Pool
              </p>
            </div>

            <div className="flex w-8 shrink-0 items-center self-center" aria-hidden>
              <div className="h-[3px] w-full rounded-full bg-[#CBD5E1]" />
            </div>

            {/* Pipeline */}
            <div className="relative min-w-0 flex-1 self-stretch py-10">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2">
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    background: "linear-gradient(to right, #CBD5E1 0%, #CBD5E1 15%, #E2E8F0 50%, #F1F5F9 85%, #F8FAFC 100%)",
                    clipPath: "polygon(0 0, 100% 20%, 100% 80%, 0 100%)",
                  }}
                />
              </div>

              <div className="relative z-10 flex h-full w-full items-center px-0.5">
                {STAGES.map((stage, idx) => {
                  const m = milestoneById(stage.milestoneId);
                  const isAward = stage.key === "aw";
                  const isW1 = stage.key === "w1";
                  const isUpcomingWs = stage.key === "w2" || stage.key === "w3" || stage.key === "w4";
                  const isClickable = Boolean(stage.href || stage.workshopNum != null);
                  const topicShort = STAGE_TOPIC_SHORT[stage.key];
                  const dsDaysLocal = m?.id === "downselect" ? daysUntil(m.isoDate, now) : 0;

                  return (
                    <div key={stage.key} className="relative flex flex-1 flex-col items-center justify-center">
                      {idx === 0 && (
                        <div className="absolute -top-6 right-0 z-30 flex translate-x-1/2 flex-col items-center sm:-top-8">
                          <div className="rounded-lg border-2 border-dashed border-[#DC2626] bg-white px-5 py-3 text-center shadow-lg">
                            <p className="text-[14px] font-bold uppercase tracking-widest text-[#DC2626]">We Are Here</p>
                            <p className="text-[11px] text-[#64748B] mt-1 max-w-[220px] text-center leading-relaxed">
                              Workshop 1 complete. Shortlist decision Apr 8 · Workshop 2 Apr 7–9 (overlapping window).
                            </p>
                          </div>
                          <div
                            className="mx-auto mt-1 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#DC2626]"
                            aria-hidden
                          />
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-1.5">
                        {stage.tbdDots > 0 && (
                          <div className="mb-1 flex items-center gap-1">
                            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#64748B]">
                              {stage.tbdDots} TBD
                            </span>
                          </div>
                        )}

                        {stage.isDownSelect ? (
                          <button
                            type="button"
                            onClick={() => stage.href && router.push(stage.href)}
                            className={`flex h-12 w-12 rotate-45 cursor-pointer items-center justify-center rounded-lg text-[11px] font-bold shadow-md transition-transform hover:scale-105 ${
                              m?.status === "active"
                                ? "border-2 border-[#6366F1] bg-[#6366F1] text-white active-gate"
                                : m?.status === "complete"
                                  ? "border-2 border-[#0F172A] bg-[#0F172A] text-white"
                                  : "border-2 border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]"
                            }`}
                            aria-label="Open scorecard — down-selection"
                          >
                            <span className="-rotate-45 px-0.5 text-center leading-tight">6→3</span>
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
                                ? `flex h-[72px] w-[72px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#0F172A] bg-[#0F172A] text-[24px] font-bold text-white shadow-lg transition-transform hover:scale-105`
                                : isUpcomingWs && m?.status === "upcoming"
                                  ? `flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#E2E8F0] bg-[#F8FAFC] text-[17px] font-semibold text-[#94A3B8] shadow-sm transition-transform hover:scale-105`
                                  : `flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#E2E8F0] bg-white text-[18px] font-semibold text-[#94A3B8] shadow-sm transition-transform ${
                                      isClickable ? "cursor-pointer hover:scale-105" : "cursor-default opacity-90"
                                    }`
                            }
                            aria-label={stage.workshopNum != null ? `Open Workshop ${stage.workshopNum}` : undefined}
                          >
                            {stage.shortLabel}
                          </button>
                        )}

                        <div className="mt-2 max-w-[130px] text-center">
                          {stage.isDownSelect ? (
                            <>
                              <p className="text-[13px] font-semibold text-[#0F172A]">Down-selection</p>
                              <p className="text-[12px] text-[#64748B] mt-0.5">
                                {m?.date} · {dsDaysLocal} {dsDaysLocal === 1 ? "day" : "days"}
                              </p>
                              <p className="text-[11px] font-medium text-[#6366F1] mt-1 leading-snug">6 vendors → 3 shortlisted</p>
                            </>
                          ) : isAward ? (
                            <>
                              <p className="text-[13px] font-semibold text-[#475569]">Award</p>
                              {m ? <p className="text-[12px] text-[#94A3B8] mt-0.5">{m.date}</p> : null}
                              {m?.vendorCount != null ? (
                                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                                  {m.vendorCount} vendor{m.vendorCount !== 1 ? "s" : ""}
                                </p>
                              ) : null}
                            </>
                          ) : isW1 ? (
                            <>
                              <p className="text-[13px] font-semibold text-[#0F172A]">Workshop 1</p>
                              {m ? <p className="text-[12px] text-[#64748B] mt-0.5">{m.date}</p> : null}
                              <p className="text-[11px] font-medium text-[#059669] mt-1 leading-snug">
                                ✓ 6 vendors presented — memos available
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[13px] font-semibold text-[#475569]">Workshop {stage.shortLabel}</p>
                              {topicShort ? <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{topicShort}</p> : null}
                              {m ? <p className="text-[12px] text-[#94A3B8] mt-0.5">{m.date}</p> : null}
                              {m?.vendorCount != null ? (
                                <p className="text-[11px] text-[#94A3B8] mt-0.5">
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

      {/* Program snapshot — styled metrics */}
      <section className="space-y-5" aria-label="Program snapshot">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-h2 font-medium text-[#0F172A]">Program snapshot</h2>
            <p className="text-caption text-[#64748B] mt-1 max-w-xl">
              Live counts and the next governance gate. Values track the current RFP data model.
            </p>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#94A3B8]">Evaluation · 2026</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
            iconBg="bg-gradient-to-br from-emerald-50 to-teal-50"
            icon={<IconVendors />}
            label="Vendors evaluated"
            value="6"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
            iconBg="bg-gradient-to-br from-indigo-50 to-violet-50"
            icon={<IconMemo />}
            label="Workshop 1 memos"
            value="5"
            href="/workshops/?workshop=1"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400"
            iconBg="bg-gradient-to-br from-amber-50 to-orange-50"
            icon={<IconRange />}
            label="Competitive bid range"
            value="$425–560M"
            sublabel="Excl. Ubiquity · 5-yr TCV"
          />
          <ProcessSnapshotMetric
            accentBar="bg-gradient-to-r from-[#6366F1] via-[#4F46E5] to-[#4338CA]"
            iconBg="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]"
            icon={<IconDecision />}
            label="Next decision point"
            value={downselectM?.date ?? "—"}
            sublabel={
              dsDays === 0
                ? "Due today"
                : dsDays === 1
                  ? "1 day to gate"
                  : `${dsDays} days to gate`
            }
            href="/scorecard/"
            emphasize
          />
        </div>
      </section>

      {/* Countdown cards */}
      <section>
        <h2 className="text-h2 text-[#0F172A] mb-6">Next milestones</h2>
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

      {/* Vertical timeline — compact milestones; full program chart above */}
      <section>
        <h2 className="text-h2 text-[#0F172A] mb-2">Key milestones</h2>
        <p className="text-caption text-[#94A3B8] mb-8 max-w-2xl">
          Decision-focused dates only. For every activity on a calendar grid (Feb–Jun), scroll to the{" "}
          <span className="text-[#64748B]">2026 RFP program timeline</span> section below.
        </p>
        <div className="max-w-3xl border-l-2 border-[#E2E8F0] ml-3 pl-8 space-y-10">
          {MILESTONES.map((m) => {
            const isComplete = m.status === "complete";
            const isActive = m.status === "active";
            const dot = isComplete
              ? "bg-[#0F172A] w-3 h-3"
              : isActive
                ? "ring-4 ring-[#6366F1]/30 bg-[#6366F1] w-4 h-4"
                : "border-2 border-[#CBD5E1] bg-white w-3 h-3";
            const rich = m.description ?? m.detail;

            return (
              <div
                key={m.id}
                className={`relative rounded-lg ${isActive ? "bg-[#EEF2FF] -mx-4 px-4 py-4 sm:-mx-6 sm:px-6" : ""}`}
              >
                <span className={`absolute -left-[41px] top-2 rounded-full ${dot}`} aria-hidden />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className={`text-body ${isActive ? "font-semibold text-[#0F172A]" : isComplete ? "text-[#64748B]" : "text-[#94A3B8]"}`}
                  >
                    <span className="tabular-nums">{m.date}</span> · {m.label}
                  </p>
                  <span className={`text-caption ${isComplete ? "text-[#059669]" : "text-[#94A3B8]"}`}>
                    {daysLabel(m.isoDate, m.status, now)}
                  </span>
                </div>
                {rich ? <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">{rich}</p> : null}

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
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(m.id === "downselect" || m.id === "downselect32") && (
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
