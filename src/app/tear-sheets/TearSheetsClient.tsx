"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { VendorPillarRadar } from "@/components/VendorPillarRadar";
import { PrintButton } from "@/components/PrintButton";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import type { Portfolio, VendorRecord } from "@/lib/types";
import type { TearBlock } from "@/lib/tearSheets";
import type { SourcePreviewMeta } from "@/lib/sourceTypes";
import { ExpandableMetric } from "@/components/ExpandableMetric";
import { governanceItemsForVendor } from "@/lib/metricDetails";
import { EVALUATOR_SCORES_TARGET_LINE } from "@/data/timeline";

function completenessPct(vendorId: string, portfolio: Portfolio): number {
  const dims = portfolio.scorecard.dimensions;
  if (!dims.length) return 0;
  let n = 0;
  for (const d of dims) {
    const s = d.scores[vendorId];
    if (typeof s === "number" && Number.isFinite(s)) n++;
  }
  return Math.round((n / dims.length) * 100);
}

function lowestRateLabel(v: VendorRecord): string {
  const candidates: number[] = [];
  for (const r of v.rateCard) {
    for (const cell of [r.onshore, r.nearshore, r.offshore, r.emeaOnshore]) {
      if (!cell) continue;
      const t = cell.trim();
      if (!t || /^0(\.0+)?$/i.test(t)) continue;
      const lower = t.toLowerCase();
      if (
        lower.includes("declin") ||
        lower.includes("fixed price") ||
        lower.includes("n/a") ||
        lower.includes("provided in narrative")
      ) {
        continue;
      }
      for (const m of Array.from(lower.matchAll(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*hr|\/hr)/g))) {
        const x = parseFloat((m[1] ?? "").replace(/,/g, ""));
        if (!Number.isNaN(x) && x > 0) candidates.push(x);
      }
      const plain = t.replace(/,/g, "").match(/^\s*\$?\s*(\d+(?:\.\d+)?)\s*$/);
      if (plain) {
        const x = parseFloat(plain[1] ?? "");
        if (!Number.isNaN(x) && x >= 8 && x <= 220) candidates.push(x);
      }
    }
  }
  if (!candidates.length) return "—";
  return `$${Math.min(...candidates).toFixed(2)}/hr`;
}

function certaintyLine(v: VendorRecord): string {
  const eff = v.efficiency;
  if (!eff?.rows?.length) return "—";
  const headers = eff.headers ?? [];
  const certH = headers.find((h) => h.toLowerCase().includes("certainty")) ?? headers[headers.length - 1];
  const us = eff.rows.find((r) => r.geography.toLowerCase().includes("us")) ?? eff.rows[0];
  return us?.cells?.[certH]?.trim() || "—";
}

function colaLine(v: VendorRecord): string {
  const c = v.colaAssumptions;
  if (c?.summary) {
    if (v.id === "ibm" && c.ibmColaNote)
      return `0% — ${c.ibmColaNote.length > 90 ? `${c.ibmColaNote.slice(0, 90)}…` : c.ibmColaNote}`;
    return c.summary;
  }
  if (v.id === "ibm") return "0% (pending mutual agreement)";
  if (v.id === "genpact") return "3–5% (by geo)";
  return "—";
}

function contractYears(v: VendorRecord): string {
  if (v.id === "genpact") return "7 years (min.)";
  return "5 years";
}

function waveCount(v: VendorRecord): string {
  const m = v.migrationNotes?.match(/(\d+)\s*waves?/i);
  return m ? m[1] : v.migrationNotes?.toLowerCase().includes("wave") ? "See memo" : "—";
}

function GovernanceDetailList({ v }: { v: VendorRecord }) {
  const items = governanceItemsForVendor(v);
  if (!items?.length) {
    return <p className="text-caption text-[#94A3B8]">No line-item breakdown available.</p>;
  }
  const icon = (s: string) => (s === "commit" ? "✓" : s === "partial" ? "◐" : "✗");
  return (
    <ul className="space-y-2 text-caption text-[#64748B]">
      {items.map((it) => (
        <li key={it.label.slice(0, 120)} className="flex gap-2">
          <span className="w-5 shrink-0 font-mono">{icon(it.status)}</span>
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

function RateCardMini({ v }: { v: VendorRecord }) {
  return (
    <div className="max-h-64 overflow-y-auto text-micro">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[#94A3B8]">
            <th className="py-1 pr-2 font-medium">Tier</th>
            <th className="py-1 font-medium">On</th>
            <th className="py-1 font-medium">Off</th>
            <th className="py-1 font-medium">EMEA</th>
          </tr>
        </thead>
        <tbody>
          {v.rateCard.slice(0, 8).map((r) => (
            <tr key={r.label} className="border-t border-[#F1F5F9]">
              <td className="py-1 pr-2 text-[#0F172A]">{r.label}</td>
              <td className="py-1 tabular-nums">{r.onshore || "—"}</td>
              <td className="py-1 tabular-nums">{r.offshore || "—"}</td>
              <td className="py-1 tabular-nums">{r.emeaOnshore || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemoBody({
  v,
  ts,
  portfolio,
}: {
  v: VendorRecord;
  ts: TearBlock;
  portfolio: Portfolio;
}) {
  const pv = portfolio.vendors.find((x) => x.id === v.id)!;
  const tcvProv = v.pricing?.provenance?.tcvM as SourcePreviewMeta | undefined;
  const y1Prov = v.pricing?.provenance?.year1 as SourcePreviewMeta | undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
      <div className="lg:col-span-8 max-w-[760px] space-y-10">
        <header className="border-b border-[#F1F5F9] pb-6">
          <h2 className="text-h2 text-[#0F172A] tracking-tight">{v.displayName}</h2>
          <p className="text-micro text-[#94A3B8] mt-2">TMS RFP Intelligence Center — vendor memo</p>
        </header>

        <div className="flex flex-col gap-6 rounded-lg bg-[#F8FAFC] p-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="min-w-0 flex-1 text-[16px] leading-[1.7] text-[#0F172A]">{ts.bottomLine}</p>
          <div className="shrink-0 text-right sm:pl-6">
            <ProvenanceTrigger meta={tcvProv} vendorId={v.id}>
              <span className="text-h1 tabular-nums text-[#0F172A] block leading-none">${pv.tcvM.toFixed(2)}M</span>
            </ProvenanceTrigger>
            <p className="text-micro mt-2 text-[#94A3B8]">5-yr operating TCV</p>
          </div>
        </div>

        <SectionBullets title="Underlying assumptions" items={ts.assumptions} />
        <SectionBullets title="Strengths & differentiators" items={ts.strengths} />
        <SectionBullets title="Key risks & concerns" items={ts.risks} />
        <SectionNumbered title="Key questions to pressure-test" items={ts.workshopQuestions} />
        <SectionBullets title="Go-forward implications" items={ts.goForward} />
      </div>

      <aside className="lg:col-span-4 space-y-0 divide-y divide-[#F1F5F9] lg:sticky lg:top-24 lg:self-start">
        <div className="pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8]">Quick stats</p>
          <dl className="mt-4 space-y-0">
            <QuickRow
              label="TCV"
              value={
                <ProvenanceTrigger meta={tcvProv} vendorId={v.id}>
                  <span className="tabular-nums">${pv.tcvM.toFixed(2)}M</span>
                </ProvenanceTrigger>
              }
            />
            <QuickRow
              label="Year 1 cost"
              value={
                <ProvenanceTrigger meta={y1Prov} vendorId={v.id}>
                  <span className="tabular-nums">${v.pricing.years[0]?.valueM?.toFixed(2) ?? "—"}M</span>
                </ProvenanceTrigger>
              }
            />
            <QuickRow label="Certainty" value={<span>{certaintyLine(v)}</span>} />
            <div className="border-t border-[#F1F5F9] pt-5">
              <ExpandableMetric
                label="Governance (Tab 5.0) — line items"
                value={`${v.governance.commit ?? 0}/${
                  (v.governance.commit ?? 0) + (v.governance.partial ?? 0) + (v.governance.cannotCommit ?? 0)
                } Commit`}
                detail={<GovernanceDetailList v={v} />}
              />
            </div>
            <div className="border-t border-[#F1F5F9] pt-5">
              <ExpandableMetric
                label="Migration waves (Tab 7.0 notes)"
                value={waveCount(v)}
                detail={<p className="whitespace-pre-wrap text-body-lg tracking-[-0.01em] text-[#0F172A]">{v.migrationNotes || "—"}</p>}
              />
            </div>
            <div className="border-t border-[#F1F5F9] pt-5">
              <ExpandableMetric
                label="Rate card snapshot (lowest quoted / tier sample)"
                value={lowestRateLabel(v)}
                detail={<RateCardMini v={v} />}
              />
            </div>
            <div className="border-t border-[#F1F5F9] pt-5">
              <ExpandableMetric
                label="COLA assumptions (workbook summary)"
                value={colaLine(v)}
                detail={
                  <dl className="space-y-2 text-caption text-[#64748B]">
                    {v.colaAssumptions ? (
                      <>
                        <div>
                          <dt className="text-micro text-[#94A3B8]">US</dt>
                          <dd>{v.colaAssumptions.us || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-micro text-[#94A3B8]">UK / NL / DE</dt>
                          <dd>
                            {v.colaAssumptions.uk || "—"} · {v.colaAssumptions.nl || "—"} · {v.colaAssumptions.de || "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-micro text-[#94A3B8]">Treatment</dt>
                          <dd>{v.colaAssumptions.treatment || v.colaAssumptions.summary || "—"}</dd>
                        </div>
                      </>
                    ) : (
                      <p>—</p>
                    )}
                  </dl>
                }
              />
            </div>
            <QuickRow label="Contract term" value={contractYears(v)} />
          </dl>
          <div className="mt-6">
            <VendorCaveatStrip vendorId={v.id} context="tear" />
          </div>
          <div className="mt-4">
            <Link
              href={`/workshops/?workshop=1&vendor=${encodeURIComponent(v.id)}`}
              className="text-caption text-[#0F172A] font-medium underline underline-offset-2 hover:text-[#334155]"
            >
              Workshop 1 memo →
            </Link>
          </div>
        </div>

        <div className="py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]">Position vs field average</p>
          <div className="mx-auto mt-4 h-[280px] w-full max-w-[280px]">
            <VendorPillarRadar portfolio={portfolio} vendorId={v.id} color={v.color} />
          </div>
        </div>

        <div className="py-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]">Data completeness</p>
          <p className="mt-2 text-[20px] font-medium tabular-nums text-[#0F172A]">{completenessPct(v.id, portfolio)}%</p>
          <p className="mt-2 text-micro text-[#94A3B8] leading-relaxed">
            Scorecard cells pend Workshop 1 — 0% until evaluator scores are entered (target {EVALUATOR_SCORES_TARGET_LINE}).
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${completenessPct(v.id, portfolio)}%`, backgroundColor: v.color }}
            />
          </div>
        </div>

        {v.flags.length > 0 && (
          <div className="border-t border-[#F1F5F9] py-6 text-caption text-[#92400E] space-y-2">
            <p className="text-micro font-medium uppercase tracking-[0.08em] text-[#94A3B8]">Extraction flags</p>
            {v.flags.map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

export function TearSheetsClient({
  vendors,
  portfolio,
  tearSheets,
  vendorFromUrl,
}: {
  vendors: VendorRecord[];
  portfolio: Portfolio;
  tearSheets: Record<string, TearBlock>;
  vendorFromUrl?: string | null;
}) {
  const [activeId, setActiveId] = useState(vendors[0]?.id ?? "cognizant");

  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("tearSheetPreselectVendor");
      if (pre && vendors.some((x) => x.id === pre)) {
        setActiveId(pre);
        sessionStorage.removeItem("tearSheetPreselectVendor");
        return;
      }
    } catch {
      /* ignore */
    }
    if (vendorFromUrl && vendors.some((x) => x.id === vendorFromUrl)) {
      setActiveId(vendorFromUrl);
    }
  }, [vendors, vendorFromUrl]);

  const active = vendors.find((x) => x.id === activeId) ?? vendors[0];
  const ts = active ? tearSheets[active.id] : null;

  return (
    <div className="space-y-12 tear-print-root">
      <div className="flex flex-wrap items-start justify-between gap-4 print-hide">
        <div>
          <h1 className="text-h1 text-[#0F172A]">Tear sheets</h1>
          <p className="text-body text-[#64748B] mt-2 max-w-3xl">
            Structured synthesis for board-ready review. Numeric TCV and timing trace to workbook extraction; narrative is
            analyst-authored. Select a vendor to view the memo.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="print-hide space-y-10">
        <nav className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b border-[#F1F5F9]" aria-label="Vendor memos">
          {vendors.map((v) => {
            const on = v.id === activeId;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveId(v.id)}
                className={`border-b-2 pb-3 text-body transition-colors duration-[120ms] -mb-px ${
                  on ? "font-medium border-current" : "border-transparent text-[#94A3B8]"
                }`}
                style={on ? { color: v.color } : undefined}
              >
                {v.displayName}
              </button>
            );
          })}
        </nav>

        {active && ts && (
          <div
            className="animate-page-in border-l-2 pl-6 transition-opacity duration-200 sm:pl-8"
            style={{ borderLeftColor: active.color }}
          >
            <MemoBody v={active} ts={ts} portfolio={portfolio} />
          </div>
        )}
      </div>

      {/* Print: all vendors, page breaks between */}
      <div className="hidden print:block space-y-0">
        {vendors.map((v) => {
          const t = tearSheets[v.id];
          if (!t) return null;
          return (
            <article key={v.id} className="tear-print-break px-0 py-8 first:pt-0">
              <MemoBody v={v} ts={t} portfolio={portfolio} />
            </article>
          );
        })}
      </div>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-4 first:pt-0">
      <dt className="text-[11px] text-[#94A3B8]">{label}</dt>
      <dd className="mt-1 text-[20px] font-medium tabular-nums text-[#0F172A]">{value}</dd>
    </div>
  );
}

function SectionBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8]">{title}</h3>
      <ul className="mt-4 list-none space-y-4 pl-0">
        {items.map((x) => (
          <li key={x} className="border-l-2 border-[#F1F5F9] pl-4 text-body-lg tracking-[-0.01em] text-[#0F172A]">
            {x}
            <span className="mt-2 block text-micro text-[#94A3B8]">
              Source: analyst memo · cross-check Commercial &amp; Drill-Down
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionNumbered({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#94A3B8]">{title}</h3>
      <ol className="mt-4 list-decimal space-y-4 pl-5 text-body-lg tracking-[-0.01em] text-[#0F172A] marker:text-[#94A3B8]">
        {items.map((x) => (
          <li key={x} className="pl-1">
            {x}
          </li>
        ))}
      </ol>
    </section>
  );
}
