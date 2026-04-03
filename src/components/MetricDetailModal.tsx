"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function MetricDetailModal({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40" role="dialog" aria-modal aria-labelledby="metric-modal-title">
      <div className="bg-white rounded-card border border-[#E2E8F0] shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#F1F5F9]">
          <h2 id="metric-modal-title" className="text-h3 text-[#0F172A]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-caption text-[#0F172A] hover:underline shrink-0">
            Close
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto text-body text-[#64748B]">{children}</div>
      </div>
    </div>
  );
}
