import { Suspense } from "react";
import TearSheetsView from "./TearSheetsView";

export default function TearSheetsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#94A3B8]">Loading tear sheets…</div>}>
      <TearSheetsView />
    </Suspense>
  );
}
