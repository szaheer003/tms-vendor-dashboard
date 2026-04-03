"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrintButton } from "@/components/PrintButton";
import { WorkshopMemoView } from "@/components/workshops/WorkshopMemoView";
import { WorkshopPreparationView } from "@/components/workshops/WorkshopPreparationView";
import { MILESTONES, WORKSHOP_AGENDA, WORKSHOP_EMPTY_COPY } from "@/data/timeline";
import { useDataset } from "@/lib/dataset";
import type { PortfolioVendor } from "@/lib/types";
import {
  getWorkshop1Memos,
  memoHasBody,
  WORKSHOP1_FUNNEL_VENDOR_IDS,
  WORKSHOP1_MEMO_VENDOR_IDS,
} from "@/lib/workshopMemos";

const W_IDS = [1, 2, 3, 4] as const;

function syncUrl(router: ReturnType<typeof useRouter>, workshop: number, vendor: string | null) {
  const q = new URLSearchParams();
  q.set("workshop", String(workshop));
  if (vendor) q.set("vendor", vendor);
  router.replace(`/workshops/?${q.toString()}`, { scroll: false });
}

export function WorkshopsClient() {
  const { portfolio } = useDataset();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workshop1Memos = useMemo(() => getWorkshop1Memos(), []);
  const memoById = useMemo(() => Object.fromEntries(workshop1Memos.map((m) => [m.vendorId, m])), [workshop1Memos]);

  const [workshop, setWorkshop] = useState(1);
  const [vendorId, setVendorId] = useState<string>(WORKSHOP1_MEMO_VENDOR_IDS[0]!);
  const memoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = parseInt(searchParams.get("workshop") || "1", 10);
    const v = searchParams.get("vendor");
    if (w >= 1 && w <= 4) setWorkshop(w);
    if (v && portfolio.vendors.some((x) => x.id === v)) {
      setVendorId(v);
    }
  }, [searchParams, portfolio.vendors]);

  useEffect(() => {
    memoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [vendorId, workshop]);

  const onSelectWorkshop = useCallback(
    (w: number) => {
      setWorkshop(w);
      if (w === 1) {
        const memoVendors = WORKSHOP1_MEMO_VENDOR_IDS as readonly string[];
        const nextV = memoVendors.includes(vendorId) ? vendorId : WORKSHOP1_MEMO_VENDOR_IDS[0]!;
        setVendorId(nextV);
        syncUrl(router, w, nextV);
      } else {
        syncUrl(router, w, null);
      }
    },
    [router, vendorId],
  );

  const onSelectVendor = useCallback(
    (id: string) => {
      setVendorId(id);
      syncUrl(router, workshop, id);
    },
    [router, workshop],
  );

  const vendorMap = useMemo(
    () => Object.fromEntries(portfolio.vendors.map((v) => [v.id, v])),
    [portfolio.vendors],
  );

  const emptyCopy = workshop !== 1 ? WORKSHOP_EMPTY_COPY[workshop as 2 | 3 | 4] : null;

  const workshopIsoDate = useMemo(() => {
    if (workshop === 2) return MILESTONES.find((x) => x.id === "workshop2")!.isoDate;
    if (workshop === 3) return MILESTONES.find((x) => x.id === "workshop3")!.isoDate;
    if (workshop === 4) return MILESTONES.find((x) => x.id === "workshop4")!.isoDate;
    return "";
  }, [workshop]);

  return (
    <div className="workshops-print-root space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4 print-hide">
        <div>
          <h1 className="text-h1 text-[#0F172A]">Workshops</h1>
          <p className="text-body text-[#64748B] mt-2 max-w-3xl">
            Executive summaries from stakeholder workshops — structured for reading, not PDF embeds. Use the print control for
            one memo per page.
          </p>
        </div>
        <PrintButton />
      </div>

      <nav
        className="print-hide flex flex-wrap gap-x-8 gap-y-2 border-b border-[#F1F5F9]"
        aria-label="Workshop selection"
      >
        {W_IDS.map((w) => {
          const on = workshop === w;
          return (
            <button
              key={w}
              type="button"
              onClick={() => onSelectWorkshop(w)}
              className={`border-b-2 pb-3 text-body -mb-px transition-colors ${
                on ? "font-medium border-[#0F172A] text-[#0F172A]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              Workshop {w}
            </button>
          );
        })}
      </nav>

      {emptyCopy ? (
        <WorkshopPreparationView
          workshopNum={workshop as 2 | 3 | 4}
          isoDate={workshopIsoDate}
          emptyCopy={emptyCopy}
          agendaItems={WORKSHOP_AGENDA[workshop as 2 | 3 | 4]}
        />
      ) : (
        <>
          <div className="print-hide flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#F1F5F9] pb-4">
            <span className="text-micro text-[#94A3B8] uppercase tracking-wide w-full sm:w-auto">Vendors</span>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {WORKSHOP1_FUNNEL_VENDOR_IDS.map((id) => {
                const pv = vendorMap[id] as PortfolioVendor | undefined;
                if (!pv) return null;
                const on = vendorId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectVendor(id)}
                    className={`pb-1 text-body border-b-2 -mb-px transition-colors ${
                      on ? "font-medium border-current" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                    }`}
                    style={on ? { color: pv.color } : undefined}
                  >
                    {pv.displayName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="print-hide">
            {!memoHasBody(memoById[vendorId]) ? (
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-8 max-w-2xl">
                <p className="text-body text-[#64748B] leading-relaxed">
                  Workshop 1 memo text is loaded from <code className="text-[13px] bg-white px-1 rounded">src/data/workshop1_memos.json</code>.
                  Add one combined Workshop 1 <code className="text-[13px] bg-white px-1 rounded">.docx</code> or multiple vendor{" "}
                  <code className="text-[13px] bg-white px-1 rounded">.docx</code> files under{" "}
                  <code className="text-[13px] bg-white px-1 rounded">Folder 6</code>, then run{" "}
                  <code className="text-[13px] bg-white px-1 rounded">python scripts/extract_workshop_memos.py</code> to populate verbatim content.
                </p>
              </div>
            ) : (
              <WorkshopMemoView
                memo={memoById[vendorId]!}
                vendorColor={(vendorMap[vendorId] as PortfolioVendor).color}
                scrollRef={memoRef}
              />
            )}
          </div>

          {/* Print: one vendor memo per page (Workshop 1 vendors with body only) */}
          <div className="hidden print:block space-y-0">
            {WORKSHOP1_MEMO_VENDOR_IDS.map((id) => {
              const m = memoById[id];
              if (!memoHasBody(m)) return null;
              const pv = vendorMap[id] as PortfolioVendor;
              return (
                <div key={id} className="workshop-print-break py-8 first:pt-0">
                  <WorkshopMemoView memo={m!} vendorColor={pv.color} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
