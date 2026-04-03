"use client";

import { DrillDownClient } from "./DrillDownClient";
import { allVendors, useDataset } from "@/lib/dataset";

export function DrillDownView() {
  const { portfolio, vendorMap } = useDataset();
  const vendors = allVendors(portfolio, vendorMap);
  return (
    <div className="space-y-8 animate-page-in">
      <div>
        <h1 className="text-h1 text-[#0F172A]">Drill-down</h1>
        <p className="text-body text-[#64748B] mt-2 max-w-4xl">
          Due diligence layer aligned to evaluation themes (workbook tabs 2.0–8.0 under the hood; tab 6.0 / commercial pricing lives on
          Commercial). Summary compares key metrics; vendor responses carry workbook source preview on hover.
        </p>
      </div>
      <DrillDownClient vendors={vendors} portfolio={portfolio} />
    </div>
  );
}
