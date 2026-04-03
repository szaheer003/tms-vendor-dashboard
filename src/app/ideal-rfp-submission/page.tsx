import { Suspense } from "react";
import { IdealRfpSubmissionClient } from "./IdealRfpSubmissionClient";

export default function IdealRfpSubmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-48 rounded-2xl bg-[#F1F5F9]" />
          <div className="h-14 rounded-xl bg-[#F1F5F9]" />
          <div className="h-96 rounded-2xl bg-[#F1F5F9]" />
        </div>
      }
    >
      <IdealRfpSubmissionClient />
    </Suspense>
  );
}
