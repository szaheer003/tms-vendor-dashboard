import type { ReactNode } from "react";

export function InterpretationPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <p className="text-micro mb-2 uppercase tracking-wider text-[#94A3B8]">What this means</p>
      <div className="text-body text-[#64748B] space-y-2">{children}</div>
    </div>
  );
}
