import { Suspense } from "react";
import { DrillDownView } from "./DrillDownView";

export default function DrillDownPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#94A3B8]">Loading drill-down…</div>}>
      <DrillDownView />
    </Suspense>
  );
}
