"use client";

import { useState, type ReactNode } from "react";

export function ExpandableMetric({
  label,
  value,
  detail,
  defaultOpen = false,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex flex-wrap items-center gap-2 text-left transition-colors duration-150 hover:text-[#0F172A] w-full"
      >
        <span className="text-body font-semibold tabular-nums text-[#0F172A]">{value}</span>
        <span className="text-caption text-[#475569]">{label}</span>
        <span className="text-micro text-[#475569]">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-2 ml-0 sm:ml-4 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-body text-[#475569] animate-page-in">
          {detail}
        </div>
      )}
    </div>
  );
}
