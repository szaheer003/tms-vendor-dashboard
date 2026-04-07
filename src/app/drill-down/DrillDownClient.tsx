"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProvenanceTrigger } from "@/components/source/ProvenanceTrigger";
import { VendorCaveatStrip } from "@/components/VendorCaveatStrip";
import { MetricDetailModal } from "@/components/MetricDetailModal";
import { comparisonTableForSubTab } from "@/lib/drillComparisonExtract";
import { DRILL_SUB_TABS, filterSnippetsForSubTab } from "@/lib/drillSubTabs";
import { governanceItemsForVendor } from "@/lib/metricDetails";
import { parseCaseStudyText, type ParsedCaseStudy } from "@/lib/caseStudyParse";
import type { SourcePreviewMeta } from "@/lib/sourceTypes";
import type { DrillSnippet, Portfolio, VendorRecord } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/Chip";
import { DrillAnswerBody, NarrativeBody } from "@/lib/formatNarrativeText";
import { buildVendorSubmissionHref, parseRowFromCellRef, workbookSubmissionHref } from "@/lib/vendorSubmissionLinks";

/** Workbook tab ids (2.0–8.0) preserved for snippet matching; `label` = evaluation-themed names for the UI. */
const PRIMARY = [
  { id: "2.0", full: "2.0  Industry Experience", label: "Partnership · Industry" },
  { id: "3.0", full: "3.0  Relevant Experience", label: "Partnership · References" },
  { id: "4.0", full: "4.0  Workforce & Delivery", label: "Operational" },
  { id: "5.0", full: "5.0  Technology Solution", label: "Technology" },
  { id: "7.0", full: "7.0  Client Migration", label: "Client & workforce migration" },
  { id: "8.0", full: "8.0  Regulatory Compliance", label: "Regulatory" },
];

const MIGRATION_SHEET_TAB = "7.0  Client Migration";

function SubmissionDeepLink({
  href,
  children,
  className,
}: {
  href: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  if (!href) return null;
  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex items-center gap-1 text-caption font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
      }
    >
      {children}
    </Link>
  );
}

function drillSnippetSourceHrefs(
  v: VendorRecord,
  s: DrillSnippet,
  blockTab: string | undefined,
  fallbackSheetTab: string,
): { workbookHref: string | null; proposalHref: string | null } {
  const wbMeta =
    s.sourcePreview?.kind === "workbook" ? buildVendorSubmissionHref(s.sourcePreview, v.id) : null;
  const sheet = (blockTab || fallbackSheetTab).trim();
  const row = parseRowFromCellRef(s.ref);
  const wbFallback = sheet ? workbookSubmissionHref(v.id, sheet, row) : null;
  const workbookHref = wbMeta ?? wbFallback;
  let proposalHref: string | null = null;
  if (s.linkedDocumentPreview?.kind === "proposal") {
    proposalHref = buildVendorSubmissionHref(s.linkedDocumentPreview, v.id);
  }
  return { workbookHref, proposalHref };
}

function blockForTab(v: VendorRecord, tabId: string) {
  const full = PRIMARY.find((p) => p.id === tabId)?.full ?? "";
  const hit = v.drilldownSnippets?.find((b) => b.tab === full);
  if (hit) return hit;
  return v.drilldownSnippets?.find((b) => b.tab.includes(tabId) && !b.tab.startsWith("Q: ")) ?? null;
}

function ubiquityQuestionnaireBlocks(v: VendorRecord) {
  return (v.drilldownSnippets ?? []).filter((b) => b.tab.startsWith("Q: "));
}

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

type SummaryRow = { id: string; label: string; fmt: (v: VendorRecord, tabId: string) => string | number; numeric: boolean };

function summaryRows(tabId: string, portfolio: Portfolio): SummaryRow[] {
  return [
    {
      id: "composite",
      label: "Weighted composite",
      numeric: true,
      fmt: (v) => {
        const pv = portfolio.vendors.find((x) => x.id === v.id);
        return pv?.composite ?? "—";
      },
    },
    {
      id: "tcv",
      label: "5-yr TCV ($M)",
      numeric: true,
      fmt: (v) => v.pricing.tcvM,
    },
    {
      id: "y1",
      label: "Year 1 fee ($M)",
      numeric: true,
      fmt: (v) => (v.pricing.years[0]?.valueM != null ? v.pricing.years[0]!.valueM! : "—"),
    },
    {
      id: "gov",
      label: "Governance — Commit count",
      numeric: true,
      fmt: (v) => v.governance.commit ?? 0,
    },
    {
      id: "snips",
      label: "Extracted response rows (this tab / topic)",
      numeric: true,
      fmt: () => "—",
    },
    {
      id: "words",
      label: "Words captured (this tab / topic)",
      numeric: true,
      fmt: () => "—",
    },
  ];
}

export function DrillDownClient({ vendors, portfolio }: { vendors: VendorRecord[]; portfolio: Portfolio }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(PRIMARY[0].id);
  const subTabs = DRILL_SUB_TABS[tab] ?? DRILL_SUB_TABS["2.0"]!;
  const [subId, setSubId] = useState(subTabs[0]!.id);
  const [layout, setLayout] = useState<"compare" | "deep">("compare");
  const [deepVid, setDeepVid] = useState(vendors[0]?.id ?? "");
  const [govModal, setGovModal] = useState<{ vendorId: string; name: string } | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab");
    const s = searchParams.get("sub");
    if (t && PRIMARY.some((p) => p.id === t)) {
      setTab(t);
      const subs = DRILL_SUB_TABS[t] ?? DRILL_SUB_TABS["2.0"]!;
      if (s && subs.some((x) => x.id === s)) {
        setSubId(s);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const subs = DRILL_SUB_TABS[tab] ?? DRILL_SUB_TABS["2.0"]!;
    if (!subs.some((x) => x.id === subId)) {
      setSubId(subs[0]!.id);
    }
  }, [tab, subId]);

  const activeSub = useMemo(() => subTabs.find((s) => s.id === subId) ?? subTabs[0]!, [subTabs, subId]);
  const sheetTabFull = PRIMARY.find((p) => p.id === tab)?.full ?? "";

  const blocks = useMemo(() => vendors.map((v) => ({ vendor: v, block: blockForTab(v, tab) })), [vendors, tab]);

  const filteredBlocks = useMemo(() => {
    return blocks.map(({ vendor: v, block }) => {
      const snips = block?.snippets ?? [];
      const filtered = filterSnippetsForSubTab(snips as DrillSnippet[], activeSub);
      return { vendor: v, block, snippets: filtered };
    });
  }, [blocks, activeSub]);

  const maxWords = useMemo(() => {
    let m = 0;
    for (const { snippets } of filteredBlocks) {
      const w = snippets.reduce((acc, s) => acc + wordCount(s.text), 0);
      m = Math.max(m, w);
    }
    return m || 1;
  }, [filteredBlocks]);

  const rows = useMemo(() => {
    const base = summaryRows(tab, portfolio);
    return base.map((r) => {
      if (r.id === "snips") {
        return {
          ...r,
          fmt: (v: VendorRecord) => {
            const fb = filteredBlocks.find((x) => x.vendor.id === v.id);
            return fb?.snippets.length ?? 0;
          },
        };
      }
      if (r.id === "words") {
        return {
          ...r,
          fmt: (v: VendorRecord) => {
            const fb = filteredBlocks.find((x) => x.vendor.id === v.id);
            if (!fb?.snippets.length) return 0;
            return fb.snippets.reduce((acc, s) => acc + wordCount(s.text), 0);
          },
        };
      }
      return r;
    });
  }, [tab, portfolio, filteredBlocks]);

  const deepVendor = vendors.find((x) => x.id === deepVid) ?? vendors[0];
  const deepSnippets = filteredBlocks.find((x) => x.vendor.id === deepVendor?.id)?.snippets ?? [];

  const snippetsByVendor = useMemo(() => {
    const m: Record<string, DrillSnippet[]> = {};
    for (const { vendor, snippets } of filteredBlocks) {
      m[vendor.id] = snippets;
    }
    return m;
  }, [filteredBlocks]);

  const comparisonRows = useMemo(
    () =>
      activeSub.id === "summary"
        ? null
        : comparisonTableForSubTab(tab, activeSub.id, vendors, snippetsByVendor),
    [tab, activeSub.id, vendors, snippetsByVendor],
  );

  return (
    <div className="space-y-6">
      {vendors.some((v) => v.id === "ubiquity") && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-[#78350F]">
          <strong className="font-semibold text-[#92400E] block mb-1">Ubiquity — no standard Appendix B workbook</strong>
          Ubiquity did not submit the standard Appendix B template. Tabs 2.0–9.0 are not in scope for this vendor. Use the Vendor RFP Questionnaire
          excerpts when Ubiquity is selected — do not expect Appendix B drill-down rows to populate for Ubiquity.
        </div>
      )}

      <div className="flex flex-wrap gap-x-1 gap-y-1 border-b border-[#E2E8F0] pb-3">
        {PRIMARY.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.full}
            onClick={() => setTab(p.id)}
            className={`px-3 py-2 text-left text-[13px] font-medium leading-snug transition-fast border-b-2 -mb-px ${
              tab === p.id
                ? "text-[#0F172A] border-[#0F172A] bg-transparent"
                : "text-[#475569] border-transparent hover:text-[#0F172A]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {subTabs.map((s) => (
          <FilterChip
            key={s.id}
            label={s.label}
            color="#0F172A"
            selected={subId === s.id}
            monochrome
            className="shrink-0"
            onClick={() => setSubId(s.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-caption text-[#475569]">View:</span>
        <div className="inline-flex rounded-full bg-[#E2E8F0] p-0.5">
          <button
            type="button"
            onClick={() => setLayout("compare")}
            className={`rounded-full px-3 py-1.5 text-caption font-medium transition-fast ${layout === "compare" ? "bg-[#0F172A] text-white" : "text-[#475569]"}`}
          >
            Side-by-side
          </button>
          <button
            type="button"
            onClick={() => setLayout("deep")}
            className={`rounded-full px-3 py-1.5 text-caption font-medium transition-fast ${layout === "deep" ? "bg-[#0F172A] text-white" : "text-[#475569]"}`}
          >
            Single vendor
          </button>
        </div>
        {layout === "deep" && (
          <select
            value={deepVid}
            onChange={(e) => setDeepVid(e.target.value)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-caption text-[#0F172A]"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-caption text-[#475569]">
        Each excerpt links to the underlying Appendix B workbook (or matched proposal/SOW) in{" "}
        <Link href="/vendor-submissions/" className="font-medium text-[#475569] hover:underline">
          Vendor Submissions
        </Link>
        . Use <span className="font-medium text-[#475569]">Workbook →</span> / <span className="font-medium text-[#475569]">Proposal →</span>{" "}
        next to a response, or hover ● for cell preview. Comparison metrics are directional, not audited.
      </p>

      {comparisonRows && comparisonRows.length > 0 && (
        <Card
          className="overflow-x-auto animate-page-in p-0"
          aria-label="Cross-vendor comparison"
        >
          <div className="border-b border-[#F1F5F9] bg-[#FAFAFA] px-4 py-3">
            <h3 className="text-h3 text-[#0F172A]">Comparison table</h3>
            <p className="text-caption text-[#475569] mt-1">
              Automated extraction from this topic&apos;s response snippets. Open each vendor&apos;s workbook tab from the column
              headers; full text and per-cell links are below.
            </p>
          </div>
          <table className="min-w-[720px] w-full text-body">
            <thead>
              <tr className="bg-[#F8FAFC] text-caption text-[#475569]">
                <th className="text-left p-3 font-medium sticky left-0 bg-[#F8FAFC] z-10 border-b border-[#F1F5F9]">Metric</th>
                {vendors.map((v) => (
                  <th
                    key={v.id}
                    className="p-3 text-center font-semibold border-b border-[#F1F5F9] whitespace-nowrap align-bottom"
                    style={{ color: v.color }}
                  >
                    <span className="block">{v.displayName}</span>
                    <SubmissionDeepLink
                      href={sheetTabFull ? workbookSubmissionHref(v.id, sheetTabFull, 1) : null}
                      className="mt-1 block text-center text-[11px] font-normal text-[#2563EB] hover:underline"
                    >
                      Workbook tab →
                    </SubmissionDeepLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.id} className="border-b border-[#F1F5F9]">
                  <td className="p-3 text-[#475569] sticky left-0 bg-white z-10 align-top max-w-[220px]">{row.label}</td>
                  {vendors.map((v) => {
                    const c = row.cells[v.id];
                    return (
                      <td key={v.id} className="p-3 text-center align-top text-[#0F172A] tabular-nums">
                        {c ? (
                          <>
                            <span className="font-semibold">{c.value}</span>
                            {c.note && <span className="block text-micro text-[#475569] mt-0.5 whitespace-pre-wrap">{c.note}</span>}
                          </>
                        ) : (
                          <span className="text-[#475569]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeSub.id === "summary" && (
        <Card className="overflow-x-auto animate-page-in p-0">
          <table className="min-w-[720px] w-full text-body">
            <thead>
              <tr className="bg-[#F8FAFC] text-caption text-[#475569]">
                <th className="text-left p-3 font-medium sticky left-0 bg-[#F8FAFC] z-10 border-b border-[#F1F5F9]">Metric</th>
                {vendors.map((v) => (
                  <th key={v.id} className="p-3 text-right font-semibold border-b border-[#F1F5F9] whitespace-nowrap" style={{ color: v.color }}>
                    <span className="block">{v.displayName}</span>
                    <SubmissionDeepLink
                      href={sheetTabFull ? workbookSubmissionHref(v.id, sheetTabFull, 1) : null}
                      className="mt-1 block text-right text-[11px] font-normal text-[#2563EB] hover:underline"
                    >
                      Workbook tab →
                    </SubmissionDeepLink>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const nums = vendors.map((v) => {
                  const raw = r.fmt(v, tab);
                  return typeof raw === "number" && Number.isFinite(raw) ? raw : NaN;
                });
                const max = r.numeric ? Math.max(...nums.filter((n) => Number.isFinite(n)), 0) || 1 : 1;
                return (
                  <tr key={r.id} className="border-b border-[#F1F5F9]">
                    <td className="p-3 text-[#475569] sticky left-0 bg-white z-10">
                      {r.label}
                      {r.id === "gov" && (
                        <span className="block text-micro text-[#475569] mt-1">Click commit count for line-item modal (where curated).</span>
                      )}
                    </td>
                    {vendors.map((v, i) => {
                      const raw = r.fmt(v, tab);
                      const n = nums[i];
                      let display: string;
                      if (raw === "—") display = "—";
                      else if (typeof raw === "number" && Number.isFinite(raw)) {
                        if (r.id === "composite" && portfolio.vendors.find((x) => x.id === v.id)?.composite == null) display = "—";
                        else if (r.id === "composite") display = raw.toFixed(2);
                        else if (r.id === "tcv" || r.id === "y1") display = raw.toFixed(2);
                        else display = String(Math.round(raw));
                      } else display = "—";
                      const pct = r.numeric && Number.isFinite(n) && max > 0 ? Math.min(100, (Math.abs(n) / max) * 100) : 0;
                      const canOpenGov = r.id === "gov" && governanceItemsForVendor(v);
                      const showWideBar = r.numeric && Number.isFinite(n) && r.id !== "composite" && r.id !== "words";
                      return (
                        <td key={v.id} className="p-3 text-right tabular-nums text-[#0F172A] relative align-top">
                          {showWideBar && (
                            <span
                              className="absolute inset-y-0 right-0 left-auto w-full pointer-events-none opacity-[0.08]"
                              style={{
                                background: `linear-gradient(to left, ${v.color} ${pct}%, transparent ${pct}%)`,
                              }}
                            />
                          )}
                          <div className="relative inline-flex min-w-[3.5rem] flex-col items-end">
                            {canOpenGov ? (
                              <button
                                type="button"
                                onClick={() => setGovModal({ vendorId: v.id, name: v.displayName })}
                                className="text-[#0F172A] hover:underline font-medium"
                              >
                                {display}
                              </button>
                            ) : (
                              <span>{display}</span>
                            )}
                            {r.id === "words" && Number.isFinite(n) && max > 0 && (
                              <div
                                className="mt-2 h-1 w-20 max-w-full shrink-0 overflow-hidden rounded-full bg-[#F1F5F9]"
                                title={`${Math.round(n)} words · ${Math.round(pct)}% of max this tab`}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-200"
                                  style={{ width: `${pct}%`, backgroundColor: v.color }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {activeSub.id !== "summary" && layout === "compare" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBlocks.map(({ vendor: v, block, snippets }) => (
            <VendorResponseCard
              key={v.id}
              v={v}
              block={block}
              snippets={snippets}
              maxWords={maxWords}
              caseStudyStyle={tab === "3.0"}
              sheetTabFull={sheetTabFull}
            />
          ))}
        </div>
      )}

      {activeSub.id !== "summary" && layout === "deep" && deepVendor && (
        <>
          <VendorResponseCard
            v={deepVendor}
            block={blockForTab(deepVendor, tab)}
            snippets={deepSnippets}
            maxWords={maxWords}
            caseStudyStyle={tab === "3.0"}
            sheetTabFull={sheetTabFull}
            fullWidth
          />
        </>
      )}

      <Card className="p-6">
        <h3 className="text-h3 text-[#0F172A]">Migration notes (Tab 7.0 extracts)</h3>
        <p className="text-caption text-[#475569] mt-1">
          Structured pull from Client Migration tab per vendor workbook. Open the live sheet to compare against this narrative.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-card bg-[#FAFAFA] border border-[#F1F5F9] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-h3 uppercase tracking-[0.05em]" style={{ color: v.color }}>
                  {v.displayName}
                </p>
                <SubmissionDeepLink href={workbookSubmissionHref(v.id, MIGRATION_SHEET_TAB, 1)}>
                  Open Tab 7.0 in workbook →
                </SubmissionDeepLink>
              </div>
              <VendorCaveatStrip vendorId={v.id} context="drill" />
              <div className="mt-2 max-w-prose">
                <NarrativeBody text={v.migrationNotes || "—"} stripMigrationPreamble />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <MetricDetailModal
        open={govModal != null}
        title={govModal ? `${govModal.name} — Technology governance commitments (Tab 5.0)` : ""}
        onClose={() => setGovModal(null)}
      >
        {govModal && (
          <GovernanceModalBody
            vendor={vendors.find((x) => x.id === govModal.vendorId) ?? vendors[0]!}
            onClose={() => setGovModal(null)}
          />
        )}
      </MetricDetailModal>
    </div>
  );
}

function linkedSubmissionLabel(meta: SourcePreviewMeta): string {
  if (meta.kind !== "proposal") return "Submitted document";
  const s = meta.submissionDoc ?? "proposal";
  if (s === "sow") return "SOW redline";
  if (s === "supplemental") return "Supplemental";
  return "Proposal (PDF)";
}

function LinkedDocumentProvenance({ meta, vendorId }: { meta: SourcePreviewMeta; vendorId: string }) {
  if (meta.kind !== "proposal") return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-micro text-[#475569]">Also sourced in</span>
      <ProvenanceTrigger meta={meta} vendorId={vendorId}>
        <span className="text-micro font-medium text-[#475569] border-b border-dotted border-[#CBD5E1] cursor-pointer transition-colors duration-[120ms] hover:text-[#0F172A]">
          {linkedSubmissionLabel(meta)}
        </span>
      </ProvenanceTrigger>
    </div>
  );
}

function GovernanceModalBody({ vendor, onClose }: { vendor: VendorRecord; onClose: () => void }) {
  const items = governanceItemsForVendor(vendor);
  if (!items) {
    return (
      <p>
        Line-item breakdown not yet curated for this vendor in the dashboard. Open{" "}
        <button type="button" className="text-[#0F172A] hover:underline font-medium" onClick={onClose}>
          Tab 5.0
        </button>{" "}
        in Vendor Submissions for primary source.
      </p>
    );
  }
  const icon = (s: string) => (s === "commit" ? "✓" : s === "partial" ? "◐" : "✗");
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.label} className="flex gap-2">
          <span className="font-mono text-caption w-6">{icon(it.status)}</span>
          <span>
            <span className="capitalize font-medium text-[#0F172A]">{it.status}</span>
            <span className="text-[#475569]"> — {it.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function CaseStudyExpandableCard({
  v,
  blockTab,
  fallbackSheetTab,
  snippet,
  parsed,
  rawAnswer,
}: {
  v: VendorRecord;
  blockTab: string;
  fallbackSheetTab: string;
  snippet: DrillSnippet;
  parsed: ParsedCaseStudy;
  rawAnswer: string;
}) {
  const [exp, setExp] = useState(false);
  const { workbookHref, proposalHref } = drillSnippetSourceHrefs(v, snippet, blockTab, fallbackSheetTab);
  return (
    <li className="overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm transition-shadow duration-150 hover:shadow-md">
      <button
        type="button"
        onClick={() => setExp(!exp)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors duration-150 hover:bg-[#FAFAFA]"
        aria-expanded={exp}
      >
        <div className="min-w-0">
          <ProvenanceTrigger meta={snippet.sourcePreview as SourcePreviewMeta} vendorId={v.id}>
            <span className="text-micro font-mono text-[#475569]">
              {blockTab} · {snippet.ref}
            </span>
          </ProvenanceTrigger>
          {snippet.linkedDocumentPreview && (
            <LinkedDocumentProvenance meta={snippet.linkedDocumentPreview} vendorId={v.id} />
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {workbookHref ? (
              <SubmissionDeepLink href={workbookHref} className="text-micro font-medium">
                Workbook →
              </SubmissionDeepLink>
            ) : null}
            {proposalHref ? (
              <SubmissionDeepLink href={proposalHref} className="text-micro font-medium">
                Proposal →
              </SubmissionDeepLink>
            ) : null}
          </div>
          <p className="text-h3 text-[#0F172A]">{parsed.title}</p>
          <p className="mt-1 text-caption text-[#475569]">
            {parsed.fteCount || "—"} FTE · {parsed.geography || "—"}
          </p>
        </div>
        <span className="shrink-0 text-[#475569]">{exp ? "▾" : "▸"}</span>
      </button>
      {exp && (
        <div className="animate-page-in space-y-3 border-t border-[#F1F5F9] px-4 pb-4 pt-3 text-body text-[#475569]">
          <div>
            <p className="text-micro text-[#475569]">Scope</p>
            <p className="text-body text-[#0F172A]">{parsed.scope || "—"}</p>
          </div>
          <div>
            <p className="text-micro text-[#475569]">Technology</p>
            <p className="text-body text-[#0F172A]">{parsed.tech || "—"}</p>
          </div>
          <div>
            <p className="text-micro text-[#475569]">Results</p>
            <div className="max-w-prose text-body text-[#0F172A]">
              <DrillAnswerBody answer={parsed.results || "—"} />
            </div>
          </div>
          <div>
            <p className="text-micro text-[#475569]">Challenges &amp; resolution</p>
            <div className="max-w-prose text-body text-[#0F172A]">
              <DrillAnswerBody answer={parsed.resolution || "—"} />
            </div>
          </div>
          <details className="text-caption">
            <summary className="cursor-pointer font-medium text-[#0F172A]">Full extracted text</summary>
            <div className="mt-2 max-w-prose text-[#475569]">
              <NarrativeBody text={rawAnswer} variant="answer" />
            </div>
          </details>
        </div>
      )}
    </li>
  );
}

const TEMPLATE_PATTERNS_DISPLAY = [
  "complete column d",
  "for rows asking for years",
  "enter the number",
  "provide a written response",
  "specific, evidence-based",
];

function isTemplateInstructionDisplay(text: string): boolean {
  const lower = text.toLowerCase();
  return TEMPLATE_PATTERNS_DISPLAY.some((p) => lower.includes(p));
}

function normalizeSnippetDisplay(s: DrillSnippet): { question?: string; answer: string; isEmpty: boolean } {
  const rawQ = (s.questionText ?? "").trim();
  const rawA = (s.text ?? "").trim();

  if (!rawA || /^no response provided\.?$/i.test(rawA)) {
    if (rawQ.length > 100 && !rawQ.includes("?") && !isTemplateInstructionDisplay(rawQ)) {
      return { question: "", answer: rawQ, isEmpty: false };
    }
    return { question: rawQ || undefined, answer: "", isEmpty: true };
  }

  if (rawA.toLowerCase().startsWith("what we are asking")) {
    const cleaned = rawA.replace(/^what we are asking[\s\S]*?vendor response\s*/i, "").trim();
    if (cleaned.length > 50) {
      return { question: rawQ || undefined, answer: cleaned, isEmpty: false };
    }
  }

  if (isTemplateInstructionDisplay(rawQ)) {
    const lines = rawA.split("\n\n");
    const first = lines[0]?.trim() ?? "";
    if (
      lines.length >= 2 &&
      first.length < 300 &&
      (first.includes("?") || /describe|confirm/i.test(first))
    ) {
      return { question: first, answer: lines.slice(1).join("\n\n").trim(), isEmpty: false };
    }
    return { question: "", answer: rawA, isEmpty: false };
  }

  if (rawQ && rawA && rawQ === rawA) {
    return { question: undefined, answer: "", isEmpty: true };
  }

  return { question: rawQ || undefined, answer: rawA, isEmpty: false };
}

type DrillSnippetBlock = NonNullable<VendorRecord["drilldownSnippets"]>[number];

/** Questionnaire excerpts for Ubiquity — rendered inside VendorResponseCard when Appendix B is empty. */
function UbiquityQuestionnaireBody({ vendor, blocks }: { vendor: VendorRecord; blocks: DrillSnippetBlock[] }) {
  return (
    <div className="space-y-6">
      <p className="text-[15px] font-semibold text-[#0F172A]">Ubiquity — Vendor RFP Questionnaire</p>
      <p className="text-[13px] font-medium text-[#475569] -mt-4 mb-2">Sheets from the questionnaire workbook (not Appendix B tabs).</p>
      {blocks.map((b) => (
        <div key={b.tab}>
          <h4 className="text-[13px] font-medium text-[#0F172A] mb-2">{b.tab}</h4>
          <ul className="space-y-4">
            {(b.snippets as DrillSnippet[]).map((s) => {
              const norm = normalizeSnippetDisplay(s);
              const { workbookHref, proposalHref } = drillSnippetSourceHrefs(vendor, s, b.tab, b.tab);
              return (
                <li key={`${b.tab}-${s.ref}-${(s.questionText ?? "").slice(0, 20)}`} className="text-[14px] text-[#334155] leading-relaxed">
                  <ProvenanceTrigger meta={s.sourcePreview as SourcePreviewMeta} vendorId={vendor.id}>
                    <span className="text-[11px] font-mono text-[#475569]">
                      {b.tab} · {s.ref}
                    </span>
                  </ProvenanceTrigger>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {workbookHref ? (
                      <SubmissionDeepLink href={workbookHref} className="text-[12px] font-medium">
                        Workbook →
                      </SubmissionDeepLink>
                    ) : null}
                    {proposalHref ? (
                      <SubmissionDeepLink href={proposalHref} className="text-[12px] font-medium">
                        Proposal →
                      </SubmissionDeepLink>
                    ) : null}
                  </div>
                  {norm.question ? <p className="font-semibold text-[#0F172A] mt-2 mb-1">{norm.question}</p> : null}
                  {norm.isEmpty ? (
                    <p className="text-[14px] text-[#475569] mt-1 italic">No response provided</p>
                  ) : (
                    <div className="mt-1 max-w-prose text-[14px] text-[#334155] leading-relaxed">
                      <DrillAnswerBody answer={norm.answer} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function VendorResponseCard({
  v,
  block,
  snippets,
  maxWords,
  caseStudyStyle,
  sheetTabFull,
  fullWidth,
}: {
  v: VendorRecord;
  block: ReturnType<typeof blockForTab>;
  snippets: DrillSnippet[];
  maxWords: number;
  caseStudyStyle?: boolean;
  sheetTabFull: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const empty = !block || block.missing || !snippets.length || snippets.every((s) => normalizeSnippetDisplay(s).isEmpty);
  const ubiquityQBlocks = v.id === "ubiquity" ? ubiquityQuestionnaireBlocks(v) : [];
  const totalWords = useMemo(() => {
    let n = 0;
    for (const s of snippets) {
      const norm = normalizeSnippetDisplay(s);
      const t = `${norm.question ?? ""} ${norm.answer ?? ""}`.trim();
      if (t) n += t.split(/\s+/).filter(Boolean).length;
    }
    return n;
  }, [snippets]);

  useEffect(() => {
    if (open && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open]);

  return (
    <div ref={rootRef} className={fullWidth ? "md:col-span-2" : undefined}>
      <Card
        className={`min-h-[200px] flex flex-col overflow-hidden shadow-card ${empty && v.id !== "ubiquity" ? "opacity-50" : ""}`}
        accent={v.color}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 px-6 py-4 border-b border-[#F1F5F9]">
          <h4 className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: v.color }}>
            {v.displayName}
          </h4>
          {sheetTabFull ? (
            <SubmissionDeepLink href={workbookSubmissionHref(v.id, sheetTabFull, 1)} className="shrink-0 text-[12px]">
              Open workbook tab →
            </SubmissionDeepLink>
          ) : null}
        </div>

        <div className="p-6 pt-5 flex-1 flex flex-col">
        <VendorCaveatStrip vendorId={v.id} context="drill" />
        {empty ? (
          v.id === "ubiquity" && ubiquityQBlocks.length > 0 ? (
            <div className="text-[14px] text-[#334155] leading-relaxed space-y-6">
              <UbiquityQuestionnaireBody vendor={v} blocks={ubiquityQBlocks} />
              <div className="border-t border-[#E2E8F0] pt-5">
                <p className="flex items-start gap-2 text-[14px] text-[#334155]">
                  <span className="text-[#D97706] shrink-0" aria-hidden>
                    ⚠
                  </span>
                  <span>
                    Standard Appendix B responses are not used for this vendor on these tabs. Additional materials are in{" "}
                    <Link href="/vendor-submissions/?vendor=ubiquity" className="font-medium text-[#2563EB] hover:underline">
                      Vendor Submissions
                    </Link>
                    .
                  </span>
                </p>
              </div>
            </div>
          ) : v.id === "ubiquity" ? (
            <div className="text-[14px] text-[#334155] leading-relaxed space-y-3">
              <p className="flex items-start gap-2">
                <span className="text-[#D97706] shrink-0" aria-hidden>
                  ⚠
                </span>
                <span>
                  Ubiquity did not submit a standard Appendix B response for this section. Questionnaire responses are available in{" "}
                  <Link href="/vendor-submissions/?vendor=ubiquity" className="font-medium text-[#2563EB] hover:underline">
                    Vendor Submissions
                  </Link>
                  .
                </span>
              </p>
            </div>
          ) : (
            <p className="text-[14px] text-[#475569] italic flex items-center gap-2">
              <span className="text-[#D97706]" aria-hidden>
                ⚠
              </span>
              No response provided for this topic.
            </p>
          )
        ) : (
          <div
            className={`relative overflow-hidden transition-[max-height] duration-300 ease-out ${
              open ? "max-h-none" : caseStudyStyle ? "max-h-[220px]" : "max-h-[400px]"
            }`}
          >
            <ul className={`${caseStudyStyle ? "space-y-4" : "space-y-5"}`}>
              {snippets.map((s) => {
                const norm = normalizeSnippetDisplay(s);
                const key = `${block?.tab}-${s.ref}-${(s.questionText ?? "").slice(0, 24)}`;
                const parsed = caseStudyStyle && norm.answer ? parseCaseStudyText(norm.answer) : null;
                if (parsed) {
                  return (
                    <CaseStudyExpandableCard
                      key={key}
                      v={v}
                      blockTab={block?.tab ?? ""}
                      fallbackSheetTab={sheetTabFull}
                      snippet={s}
                      parsed={parsed}
                      rawAnswer={norm.answer}
                    />
                  );
                }
                const { workbookHref, proposalHref } = drillSnippetSourceHrefs(v, s, block?.tab, sheetTabFull);
                return (
                  <li key={key} className="leading-relaxed">
                    <div>
                      <ProvenanceTrigger meta={s.sourcePreview as SourcePreviewMeta} vendorId={v.id}>
                        <span className="block text-[11px] font-mono text-[#475569] tracking-tight">
                          {block?.tab} · {s.ref}
                        </span>
                      </ProvenanceTrigger>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {workbookHref ? (
                          <SubmissionDeepLink href={workbookHref} className="text-micro font-medium">
                            Workbook →
                          </SubmissionDeepLink>
                        ) : null}
                        {proposalHref ? (
                          <SubmissionDeepLink href={proposalHref} className="text-micro font-medium">
                            Proposal →
                          </SubmissionDeepLink>
                        ) : null}
                      </div>
                      {s.linkedDocumentPreview && (
                        <LinkedDocumentProvenance meta={s.linkedDocumentPreview} vendorId={v.id} />
                      )}
                      {norm.isEmpty ? (
                        <p className="text-[14px] text-[#475569] mt-2 flex items-center gap-2 italic">
                          <span className="text-[#D97706]" aria-hidden>
                            ⚠
                          </span>
                          No response provided
                        </p>
                      ) : (
                        <>
                          {norm.question && (
                            <p className="text-[15px] font-semibold text-[#0F172A] mt-1 mb-1">{norm.question}</p>
                          )}
                          <div className="mt-1 max-w-prose text-[14px] text-[#334155] leading-relaxed">
                            <DrillAnswerBody answer={norm.answer} />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!open && <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />}
          </div>
        )}

        {!empty && (totalWords > 120 || snippets.length > 2) && (
          <button type="button" onClick={() => setOpen(!open)} className="mt-3 text-caption text-[#0F172A] hover:underline font-medium self-start">
            {caseStudyStyle ? (open ? "Collapse card" : "Click to expand →") : open ? "Show less" : "Read more"}
          </button>
        )}
      </div>
      </Card>
    </div>
  );
}