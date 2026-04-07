"use client";

export function PrintButton({ label = "Print view" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide text-caption text-[#475569] hover:text-[#0F172A] px-3 py-1.5 rounded-btn border border-[#E2E8F0] bg-white transition-colors duration-150"
    >
      {label}
    </button>
  );
}
