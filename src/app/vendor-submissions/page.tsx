import { Suspense } from "react";
import dynamic from "next/dynamic";

const VendorSubmissionsClient = dynamic(() => import("./VendorSubmissionsClient"), { ssr: false });

export default function VendorSubmissionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-caption text-[#475569]">Loading vendor submissions…</div>}>
      <VendorSubmissionsClient />
    </Suspense>
  );
}
