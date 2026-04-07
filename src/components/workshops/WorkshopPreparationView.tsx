"use client";

import Link from "next/link";
import { daysUntil } from "@/data/timeline";

export type WorkshopEmptyCopy = {
  title: string;
  topic: string;
  dateLine: string;
  vendorLine: string;
};

export function WorkshopPreparationView({
  workshopNum,
  isoDate,
  emptyCopy,
  agendaItems,
}: {
  workshopNum: 2 | 3 | 4;
  isoDate: string;
  emptyCopy: WorkshopEmptyCopy;
  agendaItems: { title: string; description: string }[];
}) {
  const now = new Date();
  const d = daysUntil(isoDate, now);

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-8 print-hide">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F1F5F9] text-[13px] text-[#475569]">
          <span className="w-2 h-2 rounded-full bg-[#6366F1]" aria-hidden />
          Scheduled · {emptyCopy.dateLine.replace(/^Scheduled:\s*/i, "")}
        </div>
        <h2 className="text-[32px] font-bold text-[#0F172A] leading-tight">{emptyCopy.title}</h2>
        <p className="text-body-lg text-[#475569] max-w-xl mx-auto leading-relaxed">{emptyCopy.topic}</p>
      </div>

      <div className="text-center">
        <p className="countdown-number text-[64px] font-bold text-[#6366F1] tabular-nums leading-none">{d}</p>
        <p className="text-[14px] text-[#334155] mt-2">days until session</p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-card">
        <h3 className="text-[14px] uppercase tracking-widest text-[#475569] font-medium mb-6">What to expect</h3>
        <div className="space-y-5">
          {agendaItems.map((item, i) => (
            <div key={item.title} className="flex gap-4">
              <span className="text-[20px] font-bold text-[#475569] tabular-nums w-8 shrink-0">{i + 1}</span>
              <div>
                <p className="text-[15px] font-medium text-[#0F172A]">{item.title}</p>
                <p className="text-[13px] text-[#475569] mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-card">
        <h3 className="text-[14px] uppercase tracking-widest text-[#475569] font-medium mb-6">Vendor status</h3>
        <p className="text-body text-[#475569] leading-relaxed">{emptyCopy.vendorLine}</p>
        {workshopNum === 2 && (
          <p className="text-[13px] text-[#6366F1] mt-3 leading-relaxed">
            Shortlist window Apr 7–8 (Decision Committee). Workshop 2 runs Apr 13–15; complete evaluator scoring before the gate.
            <Link href="/scorecard/" className="ml-2 underline underline-offset-2 font-medium">
              View scorecard →
            </Link>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-8">
        <h3 className="text-[14px] uppercase tracking-widest text-[#475569] font-medium mb-4">Prepare for this workshop</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/commercial/"
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0] hover:shadow-sm transition-shadow text-[14px] text-[#0F172A]"
          >
            <span aria-hidden>📊</span>
            Review commercial comparison
          </Link>
          <Link
            href="/tear-sheets/"
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0] hover:shadow-sm transition-shadow text-[14px] text-[#0F172A]"
          >
            <span aria-hidden>📋</span>
            Read vendor tear sheets
          </Link>
          <Link
            href="/drill-down/"
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0] hover:shadow-sm transition-shadow text-[14px] text-[#0F172A]"
          >
            <span aria-hidden>🔍</span>
            Explore drill-down responses
          </Link>
          <Link
            href="/workshops/?workshop=1"
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E2E8F0] hover:shadow-sm transition-shadow text-[14px] text-[#0F172A]"
          >
            <span aria-hidden>📝</span>
            Revisit Workshop 1 memos
          </Link>
        </div>
      </div>

      <p className="text-center text-[13px] text-[#475569] leading-relaxed">
        Executive summaries will appear here automatically once sessions conclude and memos are published.
      </p>
    </div>
  );
}
