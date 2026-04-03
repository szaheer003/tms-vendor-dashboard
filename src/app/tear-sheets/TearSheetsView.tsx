"use client";

import { useSearchParams } from "next/navigation";
import { TearSheetsClient } from "./TearSheetsClient";
import { allVendors, useDataset } from "@/lib/dataset";
import { TEAR_SHEETS } from "@/lib/tearSheets";

export default function TearSheetsView() {
  const searchParams = useSearchParams();
  const vendorFromUrl = searchParams.get("vendor");
  const { portfolio, vendorMap } = useDataset();
  const vendors = allVendors(portfolio, vendorMap);
  return (
    <TearSheetsClient
      vendors={vendors}
      portfolio={portfolio}
      tearSheets={TEAR_SHEETS}
      vendorFromUrl={vendorFromUrl}
    />
  );
}
