"use client";

import type { CaveatContext } from "@/lib/vendorCaveats";
import { caveatsFor } from "@/lib/vendorCaveats";

export function VendorCaveatStrip({ vendorId, context }: { vendorId: string; context: CaveatContext }) {
  const lines = caveatsFor(vendorId, context);
  if (!lines.length) return null;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-caption text-[#92400E]">
      {lines.map((t) => (
        <p key={t.slice(0, 80)} className="flex gap-2">
          <span aria-hidden>⚠</span>
          <span>{t}</span>
        </p>
      ))}
    </div>
  );
}
