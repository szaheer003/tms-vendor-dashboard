"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildVendorSubmissionHref } from "@/lib/vendorSubmissionLinks";
import type { ProposalSourcePreview, SourcePreviewMeta } from "@/lib/sourceTypes";
import { SnapshotTable } from "./SnapshotTable";

function proposalDocLabel(meta: ProposalSourcePreview): string {
  const s = meta.submissionDoc ?? "proposal";
  if (s === "sow") return "SOW redline";
  if (s === "supplemental") return "Supplemental";
  return "Proposal";
}

const HOVER_OPEN_MS = 400;
const HOVER_CLOSE_MS = 200;

function SourceIcon() {
  return (
    <span
      className="inline-flex shrink-0 text-[10px] leading-none text-[#475569] opacity-70 hover:opacity-100 transition-opacity duration-150"
      aria-hidden
    >
      ●
    </span>
  );
}

function PopoverContent({
  meta,
  deepHref,
  onClose,
}: {
  meta: SourcePreviewMeta;
  deepHref: string | null;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl bg-white p-4 text-[14px] text-[#0F172A] leading-normal shadow-[0_12px_36px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] border border-slate-200 max-w-[480px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#475569]">Source preview</p>
        <button
          type="button"
          onClick={onClose}
          className="text-[#475569] hover:text-[#475569] text-lg leading-none px-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      {"valueLabel" in meta && meta.valueLabel && (
        <p className="text-[14px] font-semibold text-[#0F172A] mb-2">Value: {meta.valueLabel}</p>
      )}
      {meta.kind === "workbook" && (
        <>
          <dl className="space-y-1.5 text-[12px] text-[#475569] mb-3">
            <div>
              <dt className="inline text-[#475569]">Source: </dt>
              <dd className="inline">{meta.sourceFile}</dd>
            </div>
            <div>
              <dt className="inline text-[#475569]">Tab: </dt>
              <dd className="inline">{meta.tab}</dd>
            </div>
            <div>
              <dt className="inline text-[#475569]">Location: </dt>
              <dd className="inline">{meta.location}</dd>
            </div>
            <div>
              <dt className="inline text-[#475569]">Calculation: </dt>
              <dd className="inline">{meta.calculation}</dd>
            </div>
          </dl>
          {meta.snapshot && <SnapshotTable snap={meta.snapshot} />}
          <p className="mt-3 text-[12px] text-[#059669]">
            {meta.verified !== false ? "Verified ✓" : "Unverified"} · Last extracted: {meta.extractionTimestamp ?? "—"}
          </p>
        </>
      )}
      {meta.kind === "proposal" && (
        <>
          <dl className="space-y-1 text-[12px] text-[#475569] mb-2">
            <div>Document: {proposalDocLabel(meta)}</div>
            <div>Source: {meta.sourceFile}</div>
            {meta.page && meta.page !== "—" && (
              <div>{meta.submissionDoc === "sow" ? "Section ref." : "Page"}: {meta.page}</div>
            )}
            <div>Context: {meta.section}</div>
          </dl>
          <div className="rounded-lg bg-slate-50 p-3 text-[13px] text-[#0F172A] border border-slate-100 max-h-40 overflow-y-auto">
            {meta.highlightPhrase && meta.excerpt.includes(meta.highlightPhrase) ? (
              <>
                {meta.excerpt.split(meta.highlightPhrase).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <strong className="bg-amber-100">{meta.highlightPhrase}</strong>}
                  </span>
                ))}
              </>
            ) : (
              meta.excerpt
            )}
          </div>
          {meta.vendorClaimNote ? (
            <p className="mt-2 text-[11px] text-[#D97706]">{meta.vendorClaimNote}</p>
          ) : null}
        </>
      )}
      {meta.kind === "scorecard" && (
        <div className="text-[12px] text-[#475569] space-y-1">
          {meta.valueLabel && <p className="font-semibold text-[#0F172A]">{meta.valueLabel}</p>}
          <p>{meta.note}</p>
          <p className="text-[#475569]">{meta.location}</p>
          <p>Extracted: {meta.extractionTimestamp ?? "—"}</p>
        </div>
      )}
      {meta.kind === "analyst" && (
        <p className="text-[12px] text-[#475569]">{meta.note}</p>
      )}
      {deepHref && (
        <Link
          href={deepHref}
          className="mt-3 block text-caption font-medium text-[#0F172A] hover:underline"
          onClick={onClose}
        >
          Open in vendor submissions →
        </Link>
      )}
    </div>
  );
}

export function ProvenanceTrigger({
  meta,
  vendorId,
  children,
  className = "",
}: {
  meta: SourcePreviewMeta | null | undefined;
  /** When set, workbook/proposal document popovers can link into Vendor Submissions. */
  vendorId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const updatePos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.left + r.width / 2 - 240;
    left = Math.max(16, Math.min(left, window.innerWidth - 496));
    let top = r.bottom + 12;
    if (top + 400 > window.innerHeight) top = r.top - 12 - 400;
    top = Math.max(72, top);
    setPos({ top, left });
  }, []);

  const scheduleOpen = () => {
    if (!meta) return;
    clearTimers();
    openTimer.current = setTimeout(() => {
      updatePos();
      setOpen(true);
    }, HOVER_OPEN_MS);
  };

  const scheduleClose = () => {
    if (pinned) return;
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
      setPinned(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (!meta) {
    return <span className={className}>{children}</span>;
  }

  const deepHref = buildVendorSubmissionHref(meta, vendorId);

  return (
    <span
      ref={wrapRef}
      className={`inline-flex items-center gap-1 align-baseline group/prov ${className}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onClick={(e) => {
        e.stopPropagation();
        setPinned((p) => !p);
        if (!open) {
          updatePos();
          setOpen(true);
        }
      }}
    >
      {children}
      <SourceIcon />
      {typeof document !== "undefined" &&
        open &&
        createPortal(
          <div
            ref={popRef}
            className="fixed z-[100] w-[480px] pointer-events-auto"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => clearTimers()}
            onMouseLeave={() => {
              if (!pinned) scheduleClose();
            }}
          >
            <div className="before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-ml-2 before:border-8 before:border-transparent before:border-b-white before:drop-shadow-sm" />
            <PopoverContent
              meta={meta}
              deepHref={deepHref}
              onClose={() => {
                setOpen(false);
                setPinned(false);
              }}
            />
          </div>,
          document.body,
        )}
    </span>
  );
}
