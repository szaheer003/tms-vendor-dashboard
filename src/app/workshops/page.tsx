import { Suspense } from "react";
import { WorkshopsClient } from "./WorkshopsClient";

export default function WorkshopsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#475569]">Loading workshops…</div>}>
      <WorkshopsClient />
    </Suspense>
  );
}
