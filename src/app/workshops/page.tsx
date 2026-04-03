import { Suspense } from "react";
import { WorkshopsClient } from "./WorkshopsClient";

export default function WorkshopsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#94A3B8]">Loading workshops…</div>}>
      <WorkshopsClient />
    </Suspense>
  );
}
