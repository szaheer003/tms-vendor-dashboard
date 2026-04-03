"use client";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fallbackVendorFilesManifest, VENDOR_SUBMISSION_ORDER } from "@/lib/vendorFilesManifest";
import type { VendorDocFile, VendorFilesManifest, VendorManifestEntry } from "@/lib/vendorFilesTypes";
import { DocumentError } from "@/components/vendor-submissions/DocumentError";
import { DocumentMetadataBar } from "@/components/vendor-submissions/DocumentMetadataBar";
import { DocxViewer } from "@/components/vendor-submissions/DocxViewer";
import { HtmlDocViewer } from "@/components/vendor-submissions/HtmlDocViewer";
import { PdfDocumentViewer } from "@/components/vendor-submissions/PdfDocumentViewer";
import { SpreadsheetViewer } from "@/components/vendor-submissions/SpreadsheetViewer";
import { TextDocViewer } from "@/components/vendor-submissions/TextDocViewer";

type DocKey = "proposal" | "workbook" | "sow" | "supplemental";

function availableDocTypes(entry: VendorManifestEntry | undefined): DocKey[] {
  if (!entry) return [];
  const out: DocKey[] = [];
  if (entry.proposal) out.push("proposal");
  if (entry.workbook) out.push("workbook");
  if (entry.sow) out.push("sow");
  if (entry.supplemental && entry.supplemental.length > 0) out.push("supplemental");
  return out;
}

function getActiveDoc(
  entry: VendorManifestEntry,
  docType: DocKey,
  proposalPart: number,
  supIndex: number,
): { doc: VendorDocFile | null; multiProposal: boolean } {
  if (docType === "proposal") {
    const p = entry.proposal;
    if (!p) return { doc: null, multiProposal: false };
    if (Array.isArray(p)) {
      const doc = p[proposalPart] ?? p[0] ?? null;
      return { doc, multiProposal: true };
    }
    return { doc: p, multiProposal: false };
  }
  if (docType === "workbook") {
    return { doc: entry.workbook ?? null, multiProposal: false };
  }
  if (docType === "sow") {
    return { doc: entry.sow ?? null, multiProposal: false };
  }
  const list = entry.supplemental ?? [];
  if (!list.length) return { doc: null, multiProposal: false };
  const idx = Math.min(Math.max(0, supIndex), list.length - 1);
  return { doc: list[idx] ?? null, multiProposal: false };
}

const DOC_LABELS: Record<DocKey, string> = {
  proposal: "Proposal",
  workbook: "Workbook",
  sow: "SOW Redline",
  supplemental: "Supplemental",
};

export default function VendorSubmissionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [remoteManifest, setRemoteManifest] = useState<VendorFilesManifest | null>(null);
  const manifest = remoteManifest ?? fallbackVendorFilesManifest;
  const { vendors } = manifest;

  const [fullScreen, setFullScreen] = useState(false);
  const [pdfPages, setPdfPages] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/vendor-files-manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: VendorFilesManifest | null) => {
        if (!cancelled && j?.vendors) setRemoteManifest(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const vendorFromUrl = searchParams.get("vendor");
  const typeFromUrl = searchParams.get("type") as DocKey | null;
  const tabFromUrl = searchParams.get("tab");
  const rowFromUrl = searchParams.get("row");
  const pageFromUrl = searchParams.get("page");
  const partFromUrl = searchParams.get("part");
  const supFromUrl = searchParams.get("sup");
  const findFromUrl = searchParams.get("find");

  const vendorId = useMemo(() => {
    if (vendorFromUrl && vendors[vendorFromUrl]) return vendorFromUrl;
    return VENDOR_SUBMISSION_ORDER[0];
  }, [vendorFromUrl, vendors]);

  const entry = vendors[vendorId];
  const avail = useMemo(() => availableDocTypes(entry), [entry]);

  const docType =
    typeFromUrl && avail.includes(typeFromUrl) ? typeFromUrl : (avail[0] ?? "proposal");

  const proposalPart = partFromUrl != null ? Math.max(0, parseInt(partFromUrl, 10) || 0) : 0;
  const supIndex = supFromUrl != null ? Math.max(0, parseInt(supFromUrl, 10) || 0) : 0;

  const initialPage = pageFromUrl != null ? Math.max(1, parseInt(pageFromUrl, 10) || 1) : 1;
  const initialRow = rowFromUrl != null ? Math.max(1, parseInt(rowFromUrl, 10) || 1) : null;

  const { doc: activeDoc, multiProposal } = useMemo(
    () => getActiveDoc(entry, docType, proposalPart, supIndex),
    [entry, docType, proposalPart, supIndex],
  );

  const pushUrl = useCallback(
    (next: {
      vendor?: string;
      type?: DocKey;
      tab?: string | null;
      row?: string | null;
      page?: string | null;
      part?: string | null;
      sup?: string | null;
    }) => {
      const p = new URLSearchParams(searchParams.toString());
      const v = next.vendor ?? vendorId;
      p.set("vendor", v);
      if (next.vendor !== undefined) {
        p.delete("part");
        p.delete("sup");
      }
      const a = availableDocTypes(vendors[v]);
      const t = next.type && a.includes(next.type) ? next.type : a[0] ?? "proposal";
      p.set("type", t);
      if (next.tab !== undefined) {
        if (next.tab) p.set("tab", next.tab);
        else p.delete("tab");
      }
      if (next.row !== undefined) {
        if (next.row) p.set("row", next.row);
        else p.delete("row");
      }
      if (next.page !== undefined) {
        if (next.page) p.set("page", next.page);
        else p.delete("page");
      }
      if (next.part !== undefined) {
        if (next.part) p.set("part", next.part);
        else p.delete("part");
      }
      if (next.sup !== undefined) {
        if (next.sup) p.set("sup", next.sup);
        else p.delete("sup");
      }
      router.replace(`/vendor-submissions/?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, vendorId, vendors],
  );

  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullScreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullScreen]);

  useEffect(() => {
    setPdfPages(undefined);
  }, [activeDoc?.path, vendorId, docType]);

  const renderViewer = () => {
    if (!activeDoc) {
      return <DocumentError fileName="Unknown document" detail="No file selected for this tab." />;
    }
    if (activeDoc.missing) {
      return <DocumentError fileName={activeDoc.fileName} />;
    }

    const fsToggle = () => setFullScreen((f) => !f);

    const docUrl = `${BP}${activeDoc.path}`;
    switch (activeDoc.kind) {
      case "pdf":
        return (
          <PdfDocumentViewer
            url={docUrl}
            initialPage={initialPage}
            initialFind={findFromUrl}
            onMeta={(n) => setPdfPages(n)}
            onToggleFullScreen={fsToggle}
            fullScreenActive={fullScreen}
          />
        );
      case "spreadsheet":
        return (
          <SpreadsheetViewer
            url={docUrl}
            initialTab={tabFromUrl}
            initialRow={activeDoc.kind === "spreadsheet" && initialRow != null ? initialRow : null}
            sheetNamesHint={activeDoc.sheetNames}
            onToggleFullScreen={fsToggle}
            fullScreenActive={fullScreen}
          />
        );
      case "html":
        return (
          <div className="flex min-h-0 min-h-[560px] flex-1 flex-col">
            {!fullScreen && (
              <div className="flex h-10 shrink-0 items-center justify-end border-b border-[#E2E8F0] bg-[#F8FAFC] px-3">
                <button
                  type="button"
                  onClick={fsToggle}
                  className="rounded px-2 py-1 text-caption text-[#64748B] hover:bg-white"
                  title="Full screen"
                >
                  ⛶
                </button>
              </div>
            )}
            <HtmlDocViewer url={docUrl} />
          </div>
        );
      case "text":
        return (
          <div className="flex min-h-0 min-h-[560px] flex-1 flex-col">
            {!fullScreen && (
              <div className="flex h-10 shrink-0 items-center justify-end border-b border-[#E2E8F0] bg-[#F8FAFC] px-3">
                <button
                  type="button"
                  onClick={fsToggle}
                  className="rounded px-2 py-1 text-caption text-[#64748B] hover:bg-white"
                  title="Full screen"
                >
                  ⛶
                </button>
              </div>
            )}
            <TextDocViewer url={docUrl} />
          </div>
        );
      case "docx":
        return (
          <div className="flex min-h-0 min-h-[560px] flex-1 flex-col">
            {!fullScreen && (
              <div className="flex h-10 shrink-0 items-center justify-end border-b border-[#E2E8F0] bg-[#F8FAFC] px-3">
                <button
                  type="button"
                  onClick={fsToggle}
                  className="rounded px-2 py-1 text-caption text-[#64748B] hover:bg-white"
                  title="Full screen"
                >
                  ⛶
                </button>
              </div>
            )}
            <DocxViewer url={docUrl} fullScreenActive={fullScreen} initialFind={findFromUrl} />
          </div>
        );
      default:
        return <DocumentError fileName={activeDoc.fileName} />;
    }
  };

  const metaPages = activeDoc?.kind === "pdf" ? pdfPages ?? activeDoc.pages : undefined;

  const shell = (
    <div
      className={`flex flex-col overflow-hidden border border-[#F1F5F9] bg-white shadow-card transition-all duration-150 ${
        fullScreen ? "fixed inset-0 z-[200] rounded-none shadow-raised" : "rounded-lg"
      }`}
      style={fullScreen ? undefined : { minHeight: "max(700px, calc(100vh - 260px))" }}
    >
      {fullScreen && (
        <button
          type="button"
          className="absolute right-4 top-4 z-[210] rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-caption font-medium text-[#64748B] shadow-card hover:bg-[#F8FAFC]"
          onClick={() => setFullScreen(false)}
        >
          Exit full screen
        </button>
      )}

      {docType === "proposal" && multiProposal && entry.id === "exl" && (
        <div className="border-b border-[#F1F5F9] bg-[#FFFBEB] px-4 py-2 text-caption text-[#92400E]">
          <span className="font-medium">EXL submitted their proposal in two parts.</span>
          <span className="ml-3 inline-flex gap-2">
            <button
              type="button"
              onClick={() => pushUrl({ part: "0" })}
              className={`rounded-full px-3 py-1 font-medium ${
                proposalPart === 0 ? "bg-[#EA580C]/15 text-[#EA580C] ring-1 ring-[#EA580C]" : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]"
              }`}
            >
              Part 1
            </button>
            <button
              type="button"
              onClick={() => pushUrl({ part: "1" })}
              className={`rounded-full px-3 py-1 font-medium ${
                proposalPart === 1 ? "bg-[#EA580C]/15 text-[#EA580C] ring-1 ring-[#EA580C]" : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]"
              }`}
            >
              Part 2
            </button>
          </span>
        </div>
      )}

      {docType === "supplemental" && entry.supplemental && entry.supplemental.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2">
          {entry.supplemental.map((s, i) => (
            <button
              key={s.path + i}
              type="button"
              onClick={() => pushUrl({ sup: String(i) })}
              className={`rounded-full px-3 py-1 text-caption font-medium ${
                supIndex === i
                  ? "bg-white text-[#0F172A] shadow-sm ring-1 ring-[#E2E8F0]"
                  : "text-[#64748B] hover:bg-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">{renderViewer()}</div>

      {activeDoc && (
        <DocumentMetadataBar
          fileName={activeDoc.fileName}
          pages={metaPages}
          bytes={activeDoc.bytes}
          submittedAt={activeDoc.submittedAt}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-page-in">
      <div>
        <h1 className="text-h1 text-[#0F172A]">Vendor submissions</h1>
        <p className="text-body text-[#64748B] mt-2 max-w-3xl">
          Original proposals, Appendix B workbooks, SOW redlines, and supplements — embedded for in-browser review without
          opening external files.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-[#F1F5F9] pb-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-micro font-medium uppercase tracking-[0.08em] text-[#94A3B8]">Vendor</span>
          {VENDOR_SUBMISSION_ORDER.map((id) => {
            const v = vendors[id];
            if (!v) return null;
            const on = id === vendorId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pushUrl({ vendor: id, type: availableDocTypes(v)[0] })}
                className={`text-body transition-colors duration-[120ms] ${on ? "font-medium" : "text-[#94A3B8]"}`}
                style={on ? { color: v.color } : undefined}
              >
                {v.displayName}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <span className="text-micro font-medium uppercase tracking-[0.08em] text-[#94A3B8] mr-3">Document</span>
          {avail.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pushUrl({ type: d })}
              className={`px-3 py-2 text-caption font-medium transition-colors duration-[120ms] border-b-2 -mb-px ${
                docType === d
                  ? "border-[#0F172A] text-[#0F172A]"
                  : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              {DOC_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {shell}
    </div>
  );
}
