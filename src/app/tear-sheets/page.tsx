import { Suspense } from "react";
import TearSheetsView from "./TearSheetsView";

export default function TearSheetsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#475569]">Loading tear sheets…</div>}>
      <TearSheetsView />
    </Suspense>
  );
}
