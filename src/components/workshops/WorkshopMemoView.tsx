"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import type { MemoSection, WorkshopMemo } from "@/lib/workshopTypes";
import { MemoRichText } from "./MemoRichText";

function pressureDrillHref(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bai\b|artificial intelligence|machine learning|platform terms|efficiency target/i.test(t)) {
    return "/drill-down/?tab=5.0&sub=ai";
  }
  if (/case study|canadian bank|10-year|deep-dive|reference/i.test(t)) {
    return "/drill-down/?tab=3.0&sub=summary";
  }
  if (/migration|rebadge|offshore|workforce/i.test(t)) {
    return "/drill-down/?tab=7.0&sub=waves";
  }
  return null;
}

function splitPressureLine(line: string): { claim: string; rest: string | null } {
  const arrow = line.match(/^(.*?)(\s*(?:→|->)\s*)([\s\S]+)$/);
  if (arrow) {
    return { claim: arrow[1]!.trim(), rest: arrow[3]!.trim() };
  }
  return { claim: line, rest: null };
}

function SectionBody({
  paragraphs,
  bullets,
  vendorId,
}: {
  paragraphs: string[];
  bullets: string[];
  vendorId: string;
}) {
  return (
    <>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 80)} className="text-[14px] leading-[1.7] text-[#1a1a1a] mt-4 first:mt-0">
          <MemoRichText text={p} vendorId={vendorId} />
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="mt-4 space-y-3 pl-0 list-none">
          {bullets.map((b) => (
            <li key={b.slice(0, 100)} className="text-[14px] leading-[1.7] text-[#1a1a1a] border-l-2 border-[#F1F5F9] pl-4">
              <MemoRichText text={b} vendorId={vendorId} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CapabilityCards({ section, vendorId }: { section: MemoSection; vendorId: string }) {
  const subs = section.subSections ?? [];
  const [openIdx, setOpenIdx] = useState(0);

  useEffect(() => {
    setOpenIdx(0);
  }, [section.title, vendorId]);

  if (!subs.length) {
    return <SectionBody paragraphs={section.paragraphs} bullets={section.bullets} vendorId={vendorId} />;
  }

  return (
    <div className="space-y-3 mt-4">
      {section.paragraphs.map((p) => (
        <p key={p.slice(0, 80)} className="text-[14px] leading-[1.7] text-[#1a1a1a]">
          <MemoRichText text={p} vendorId={vendorId} />
        </p>
      ))}
      {subs.map((sub, i) => {
        const open = openIdx === i;
        return (
          <div
            key={sub.title}
            className="rounded-lg border border-[#E2E8F0] bg-white shadow-subtle overflow-hidden print:border-[#E2E8F0]"
          >
            <button
              type="button"
              onClick={() => setOpenIdx(open ? -1 : i)}
              className="print-hide w-full text-left px-4 py-3 text-[14px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors flex justify-between items-center gap-2"
            >
              <span>{sub.title}</span>
              <span className="text-[#94A3B8] text-caption shrink-0">{open ? "−" : "+"}</span>
            </button>
            <div
              className={`px-4 pb-4 space-y-2 ${open ? "block" : "hidden"} print:block`}
            >
              {sub.bullets.map((line, bi) => {
                const claimM = line.match(/^Claim:\s*(.*)$/i);
                const subM = line.match(/^Substantiation:\s*(.*)$/i);
                const stripe = bi % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]";
                if (claimM) {
                  return (
                    <div
                      key={line.slice(0, 100)}
                      className={`rounded-lg border border-[#E2E8F0] px-3 py-2.5 ${stripe}`}
                    >
                      <p className="text-[14px] leading-[1.7] text-[#1a1a1a]">
                        <span className="font-semibold text-[#0F172A]">Claim:</span>{" "}
                        <MemoRichText text={claimM[1]!} vendorId={vendorId} />
                      </p>
                    </div>
                  );
                }
                if (subM) {
                  return (
                    <div
                      key={line.slice(0, 100)}
                      className={`rounded-lg border border-[#E2E8F0] px-3 py-2.5 ${stripe}`}
                    >
                      <p className="text-[14px] leading-[1.7] text-[#64748B]">
                        <span className="font-semibold text-[#475569]">Substantiation:</span>{" "}
                        <MemoRichText text={subM[1]!} vendorId={vendorId} />
                      </p>
                    </div>
                  );
                }
                return (
                  <div
                    key={line.slice(0, 100)}
                    className={`rounded-lg border border-[#E2E8F0] px-3 py-2.5 ${stripe}`}
                  >
                    <p className="text-[14px] leading-[1.7] text-[#1a1a1a]">
                      <MemoRichText text={line} vendorId={vendorId} />
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {section.bullets.length > 0 && (
        <ul className="mt-4 space-y-3 pl-0 list-none">
          {section.bullets.map((b) => (
            <li key={b.slice(0, 100)} className="text-[14px] leading-[1.7] border-l-2 border-[#F1F5F9] pl-4">
              <MemoRichText text={b} vendorId={vendorId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PressureTestSection({ section, vendorId }: { section: MemoSection; vendorId: string }) {
  const items = section.bullets.length ? section.bullets : section.paragraphs;
  return (
    <ol className="mt-4 space-y-5 pl-0 list-none counter-reset-none">
      {items.map((line, idx) => {
        const { claim, rest } = splitPressureLine(line);
        const drill = pressureDrillHref(line);
        return (
          <li key={line.slice(0, 120)} className="flex gap-3 text-[14px] leading-[1.6] text-[#1a1a1a]">
            <span className="shrink-0 w-6 text-[#94A3B8] font-mono text-[13px] pt-0.5">□</span>
            <div className="min-w-0">
              <span className="font-semibold text-[#0F172A]">{idx + 1}.</span>{" "}
              <strong>{claim}</strong>
              {rest ? (
                <>
                  {" "}
                  <span className="font-normal">→ {rest}</span>
                </>
              ) : null}
              {drill ? (
                <div className="mt-2">
                  <Link href={drill} className="memo-inline-link text-[#6366F1] hover:underline text-[13px]">
                    View in Drill-Down →
                  </Link>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function WorkshopMemoView({
  memo,
  vendorColor,
  scrollRef,
}: {
  memo: WorkshopMemo;
  vendorColor: string;
  scrollRef?: RefObject<HTMLDivElement>;
}) {
  const metaLine = [memo.date, memo.sessionDuration, memo.note?.trim()].filter(Boolean).join("  ·  ");

  return (
    <article
      ref={scrollRef}
      className="workshop-memo-article max-w-[760px] mx-auto w-full pb-16 border-l-4 border-solid pl-6 sm:pl-8"
      style={{ borderLeftColor: vendorColor }}
    >
      <header className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <Link
            href={`/tear-sheets/?vendor=${encodeURIComponent(memo.vendorId)}`}
            className="memo-inline-link text-[28px] font-bold hover:underline print:text-inherit print:no-underline"
            style={{ color: vendorColor }}
          >
            {memo.vendorName.toUpperCase()}
          </Link>
          <p className="text-[14px] text-[#94A3B8] sm:text-right shrink-0">Workshop {memo.workshop} Executive Summary</p>
        </div>
        <div className="mt-4 h-px bg-[#E2E8F0]" />
        <p className="mt-3 text-[13px] text-[#64748B]">{metaLine}</p>
      </header>

      <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-8 py-8 shadow-subtle mb-12">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#94A3B8] font-medium">Bottom line</p>
        <div className="mt-4 text-[17px] leading-[1.75] text-[#0F172A] font-medium">
          <MemoRichText text={memo.bottomLine} vendorId={memo.vendorId} />
        </div>
      </div>

      <div className="space-y-12">
        {memo.sections.map((sec) => {
          const isCapabilities = sec.id === "capabilities" || /capabilit/i.test(sec.title);
          const isPressure = sec.id === "pressure-test" || /pressure/i.test(sec.title);
          const numAccent = sec.number.replace(/^(\d+).*/, "$1") || "•";

          return (
            <section key={sec.id + sec.number} className="workshop-memo-section">
              <h2 className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: vendorColor }}
                >
                  {numAccent}
                </span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#94A3B8] font-semibold leading-relaxed pt-1">
                  {sec.title.toUpperCase()}
                </span>
              </h2>
              {isPressure ? (
                <PressureTestSection section={sec} vendorId={memo.vendorId} />
              ) : isCapabilities ? (
                <CapabilityCards section={sec} vendorId={memo.vendorId} />
              ) : (
                <div className="mt-4">
                  <SectionBody paragraphs={sec.paragraphs} bullets={sec.bullets} vendorId={memo.vendorId} />
                </div>
              )}
              {sec.assessment ? (
                <p className="mt-6 text-[14px] italic text-[#64748B] leading-[1.7]">{sec.assessment}</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}
