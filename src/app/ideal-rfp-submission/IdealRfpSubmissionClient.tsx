"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import pack from "@/data/idealRfpSubmission.json";

type LogicCheck = { if: string; then: string };
type Subsection = {
  id: string;
  title: string;
  intro: string;
  signals: string[];
  logicChecks: LogicCheck[];
  redFlags: string[];
  evidenceRead: string[];
  evidenceCreative: string[];
  gutCheckQuestions: string[];
  layout?: "standard" | "holistic";
};

type Criterion = {
  id: string;
  num: number;
  title: string;
  subsections: Subsection[];
};

type IdealPack = {
  meta: {
    documentTitle: string;
    subtitle: string;
    sectionNote: string;
    purpose: string;
    howToUse: string;
  };
  sourceDocx?: string;
  criteria: Criterion[];
};

const DATA = pack as IdealPack;

const CRITERION_SHORT: Record<string, string> = {
  "commercial-attractiveness": "Commercial",
  "operational-excellence": "Operational",
  "technology-ai": "Technology",
  "client-workforce-migration": "Migration",
  "partnership-readiness": "Partnership",
};

function subsectionTabLabel(s: Subsection): string {
  if (s.title.length <= 28) return s.title;
  const m: Record<string, string> = {
    overview: "Overview",
    "what-fis-expects": "Expectations",
    "what-fis-encourages": "Encouraged",
    "gut-check": "Gut-check",
    "p-l-assumptions": "P&L",
    "commercial-structure": "Structure",
    investments: "Investments",
    "language-locations": "Languages",
    offshoring: "Offshore",
    regulatory: "Regulatory",
    "technology-ai": "Tech & AI",
    "client-migration-timing-sequencing": "Client timing",
    "workforce-rebadge": "Rebadge",
  };
  return m[s.id] ?? s.title.slice(0, 26) + "…";
}

/** Stacked if/then for narrow column (three-column layout). */
function CompactLogicCheck({ item }: { item: LogicCheck }) {
  return (
    <div className="rounded-lg border border-[#C7D2FE]/90 bg-white p-3 shadow-sm space-y-2">
      <p className="text-[12px] leading-relaxed text-[#1E293B]">
        <span className="font-semibold text-[#312E81]">If </span>
        {item.if}
      </p>
      <p className="text-[12px] leading-relaxed text-[#1E293B]">
        <span className="font-semibold text-[#5B21B6]">Then </span>
        {item.then}
      </p>
    </div>
  );
}

function SignalCard({ text, i }: { text: string; i: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#BBF7D0]/60 bg-gradient-to-r from-[#F0FDF4] to-white p-4 pl-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-[#059669] to-[#10B981]"
        aria-hidden
      />
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#059669]/10 text-[12px] font-bold text-[#047857]">
          {i + 1}
        </span>
        <p className="text-[13px] leading-relaxed text-[#14532D] pt-0.5">{text}</p>
      </div>
    </div>
  );
}

function RedFlagCard({ text }: { text: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#FECACA] bg-gradient-to-br from-[#FEF2F2] to-white p-4 pl-6 shadow-sm">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#DC2626] to-[#F87171]" aria-hidden />
      <div className="flex gap-3">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#DC2626] text-[12px] font-bold text-white"
          aria-hidden
        >
          !
        </span>
        <p className="text-[13px] leading-relaxed text-[#7F1D1D]">{text}</p>
      </div>
    </div>
  );
}

function EvidenceTile({ text, tone }: { text: string; tone: "slate" | "violet" }) {
  const border = tone === "violet" ? "border-[#DDD6FE]/80" : "border-[#E2E8F0]";
  const bg = tone === "violet" ? "from-[#FAF5FF] to-white" : "from-[#F8FAFC] to-white";
  return (
    <div className={`rounded-lg border ${border} bg-gradient-to-br ${bg} p-3 shadow-sm`}>
      <p className="text-[13px] leading-relaxed text-[#334155]">{text}</p>
    </div>
  );
}

export function IdealRfpSubmissionClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramCrit = searchParams.get("criterion");
  const paramSub = searchParams.get("subsection");

  const criteria = DATA.criteria;
  const defaultCrit = criteria[0]!;
  const [critId, setCritId] = useState(defaultCrit.id);
  const [subId, setSubId] = useState(defaultCrit.subsections[0]!.id);

  useEffect(() => {
    const c = paramCrit ? criteria.find((x) => x.id === paramCrit) : undefined;
    if (c) {
      setCritId(c.id);
      const s = paramSub ? c.subsections.find((x) => x.id === paramSub) : undefined;
      setSubId(s?.id ?? c.subsections[0]!.id);
    }
  }, [paramCrit, paramSub, criteria]);

  const setCriterion = useCallback(
    (id: string) => {
      const c = criteria.find((x) => x.id === id);
      if (!c) return;
      setCritId(id);
      const firstSub = c.subsections[0]!.id;
      setSubId(firstSub);
      const q = new URLSearchParams(searchParams.toString());
      q.set("criterion", id);
      q.set("subsection", firstSub);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [criteria, pathname, router, searchParams],
  );

  const setSubsection = useCallback(
    (id: string) => {
      setSubId(id);
      const q = new URLSearchParams(searchParams.toString());
      q.set("criterion", critId);
      q.set("subsection", id);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [critId, pathname, router, searchParams],
  );

  const criterion = useMemo(() => criteria.find((c) => c.id === critId) ?? defaultCrit, [criteria, critId, defaultCrit]);
  const subsection = useMemo(
    () => criterion.subsections.find((s) => s.id === subId) ?? criterion.subsections[0]!,
    [criterion, subId],
  );

  const isHolistic = subsection.layout === "holistic";
  const showInnerNav = criterion.subsections.length > 1;
  const META = DATA.meta;

  return (
    <div className="space-y-10 pb-8">
      <header className="ideal-rfp-hero relative overflow-hidden rounded-2xl border border-[#1E293B]/10 bg-[#0F172A] px-6 py-10 sm:px-10 sm:py-12 text-white shadow-xl">
        <div className="absolute inset-0 opacity-[0.35] ideal-rfp-hero-grid" aria-hidden />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#6366F1]/25 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#059669]/20 blur-3xl" aria-hidden />
        <div className="relative max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#CBD5E1]">{META.documentTitle}</p>
          <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight text-white leading-tight">
            The Ideal RFP Submission
          </h1>
          <p className="mt-2 text-[15px] text-[#CBD5E1] font-medium">{META.subtitle}</p>
          <p className="mt-1 text-[12px] text-[#475569]">{META.sectionNote}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-[#E2E8F0] max-w-3xl border-l-2 border-[#6366F1] pl-5">
            {META.purpose}
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[#CBD5E1] max-w-3xl">{META.howToUse}</p>
        </div>
      </header>

      {/* Evaluation criteria (5 pillars) */}
      <nav
        className="sticky top-[56px] z-30 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-16 lg:px-16 py-3 bg-[#F8FAFC]/95 backdrop-blur-md border-y border-[#E2E8F0]"
        aria-label="Evaluation criteria"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#475569] mb-2">Evaluation criteria</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {criteria.map((c) => {
            const on = c.id === criterion.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCriterion(c.id)}
                className={`shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-left text-[13px] transition-all border ${
                  on
                    ? "bg-[#0F172A] text-white border-[#0F172A] shadow-md scale-[1.02]"
                    : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#0F172A]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                    on ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#475569]"
                  }`}
                >
                  {c.num}
                </span>
                <span className="font-medium whitespace-nowrap">{CRITERION_SHORT[c.id] ?? c.title}</span>
              </button>
            );
          })}
        </div>

        {showInnerNav ? (
          <>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#475569]">Within this criterion</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-1">
              {criterion.subsections.map((s) => {
                const on = s.id === subsection.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubsection(s.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-all ${
                      on
                        ? "bg-[#6366F1] text-white border-[#6366F1]"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#CBD5E1]"
                    }`}
                  >
                    {subsectionTabLabel(s)}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <p className="mt-2 text-[12px] text-[#475569] hidden sm:block truncate" title={subsection.title}>
          <span className="font-semibold text-[#475569]">
            {criterion.num}.{" "}
            {subsection.title === criterion.title
              ? criterion.title
              : `${criterion.title} — ${subsection.title}`}
          </span>
        </p>
      </nav>

      <article className="rounded-2xl border border-[#E2E8F0] bg-white shadow-card overflow-hidden">
        <div className="border-b border-[#F1F5F9] bg-gradient-to-r from-[#F8FAFC] to-white px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6366F1] mb-1">{criterion.title}</p>
          <h2 className="text-[22px] sm:text-[26px] font-bold text-[#0F172A] leading-tight">{subsection.title}</h2>
          {subsection.intro ? (
            <p className="mt-3 text-[15px] leading-relaxed text-[#475569] max-w-4xl">{subsection.intro}</p>
          ) : null}
        </div>

        <div className="px-6 py-8 sm:px-8 space-y-12">
          {!isHolistic && (
            <section aria-label="Evaluator checklist columns">
              <p className="text-[14px] text-[#475569] mb-6 max-w-4xl leading-relaxed">
                Scan all three lenses together:{" "}
                <span className="font-semibold text-[#047857]">green — positive signals</span>,{" "}
                <span className="font-semibold text-[#4338CA]">blue — conditional logic</span>,{" "}
                <span className="font-semibold text-[#B91C1C]">red — warning patterns</span>.
              </p>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Column 1 — Signals */}
                <div className="rounded-xl border-2 border-[#86EFAC]/90 bg-gradient-to-b from-[#F0FDF4] to-white p-4 shadow-sm flex flex-col min-h-[200px]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#BBF7D0]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669] text-white text-[14px] font-bold shrink-0">
                      ✓
                    </span>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#047857]">Signals</h3>
                      <p className="text-[12px] text-[#475569] mt-0.5 leading-snug">What “good” looks like</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {subsection.signals.length === 0 ? (
                      <p className="text-[13px] text-[#475569] italic">No signal items for this subsection.</p>
                    ) : (
                      subsection.signals.map((t, i) => <SignalCard key={i} text={t} i={i} />)
                    )}
                  </div>
                </div>

                {/* Column 2 — Logic checks */}
                <div className="rounded-xl border-2 border-[#A5B4FC]/90 bg-gradient-to-b from-[#EEF2FF] to-white p-4 shadow-sm flex flex-col min-h-[200px]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#C7D2FE]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F46E5] text-white text-[15px] font-bold shrink-0">
                      →
                    </span>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4338CA]">Logic checks</h3>
                      <p className="text-[12px] text-[#475569] mt-0.5 leading-snug">If / then gates</p>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    {subsection.logicChecks.length === 0 ? (
                      <p className="text-[13px] text-[#475569] italic">No logic checks for this subsection.</p>
                    ) : (
                      subsection.logicChecks.map((item, i) => <CompactLogicCheck key={i} item={item} />)
                    )}
                  </div>
                </div>

                {/* Column 3 — Red flags */}
                <div className="rounded-xl border-2 border-[#FCA5A5]/90 bg-gradient-to-b from-[#FEF2F2] to-white p-4 shadow-sm flex flex-col min-h-[200px]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#FECACA]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DC2626] text-white text-[16px] font-bold leading-none shrink-0">
                      ⚠
                    </span>
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B91C1C]">Red flags</h3>
                      <p className="text-[12px] text-[#475569] mt-0.5 leading-snug">Gaps &amp; boilerplate risk</p>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {subsection.redFlags.length === 0 ? (
                      <p className="text-[13px] text-[#475569] italic">No red-flag items listed.</p>
                    ) : (
                      subsection.redFlags.map((t, i) => <RedFlagCard key={i} text={t} />)
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {isHolistic && (
            <div className="space-y-10">
              {subsection.evidenceRead.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                    {subsection.title === "What FIS is Expecting" ? subsection.title : "Evidence the vendor read the materials"}
                    <span className="h-px flex-1 bg-[#E2E8F0]" />
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subsection.evidenceRead.map((t, i) => (
                      <EvidenceTile key={i} text={t} tone="slate" />
                    ))}
                  </div>
                </section>
              )}
              {subsection.evidenceCreative.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#6D28D9] mb-4 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[#E9D5FF]" />
                    {subsection.title === "What FIS is Encouraging Vendors to Do"
                      ? subsection.title
                      : "Creative or differentiated thinking"}
                    <span className="h-px flex-1 bg-[#E9D5FF]" />
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subsection.evidenceCreative.map((t, i) => (
                      <EvidenceTile key={i} text={t} tone="violet" />
                    ))}
                  </div>
                </section>
              )}
              {subsection.gutCheckQuestions.length > 0 && (
                <section>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#B45309] mb-6 text-center">
                    Final evaluator gut-check
                  </h3>
                  <div className="relative rounded-2xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] via-white to-[#FFF7ED] p-6 sm:p-8">
                    <div
                      className="pointer-events-none absolute right-4 top-4 text-[120px] font-serif leading-none text-[#F59E0B]/[0.07] select-none"
                      aria-hidden
                    >
                      ?
                    </div>
                    <ul className="relative space-y-5">
                      {subsection.gutCheckQuestions.map((q, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#D97706] text-[13px] font-bold text-[#B45309]">
                            {i + 1}
                          </span>
                          <p className="text-[15px] leading-relaxed text-[#78350F] font-medium pt-0.5">{q}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </article>

      <p className="text-center text-[12px] text-[#475569] max-w-2xl mx-auto leading-relaxed">
        Internal evaluator lens — not a scoring rubric. Content reflects the program submission-quality checklist; ask your dashboard owner if an update is needed.
      </p>
    </div>
  );
}
