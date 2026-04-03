"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Portfolio, VendorRecord } from "./types";

export type DatasetValue = {
  portfolio: Portfolio;
  vendorMap: Record<string, VendorRecord>;
};

const Ctx = createContext<DatasetValue | null>(null);

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

const fetchJsonNoCache = (path: string) =>
  fetch(`${BP}${path}`, { cache: "no-store", credentials: "same-origin" });

async function loadDataset(): Promise<DatasetValue> {
  const pr = await fetchJsonNoCache("/data/portfolio.json");
  if (!pr.ok) throw new Error(`portfolio.json HTTP ${pr.status}`);
  const portfolio = (await pr.json()) as Portfolio;
  const ids = portfolio.vendors.map((v) => v.id);
  const rows = await Promise.all(
    ids.map(async (id) => {
      const r = await fetchJsonNoCache(`/data/vendor_${id}.json`);
      if (!r.ok) throw new Error(`vendor_${id}.json HTTP ${r.status}`);
      return [id, (await r.json()) as VendorRecord] as const;
    }),
  );
  const vendorMap: Record<string, VendorRecord> = {};
  for (const [id, rec] of rows) vendorMap[id] = rec;
  return { portfolio, vendorMap };
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DatasetValue | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadDataset()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "load failed"));
  }, []);

  if (err) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-[#B91C1C] gap-2">
        <p className="text-h3">Could not load dashboard data</p>
        <p className="text-caption text-[#64748B] max-w-lg">{err}</p>
        <p className="text-caption text-[#64748B] max-w-lg">
          Run <code className="bg-[#F1F5F9] px-1 rounded">python scripts/extract_tms.py</code> then refresh. For static{" "}
          <code className="bg-[#F1F5F9] px-1 rounded">out/</code>, ensure <code className="bg-[#F1F5F9] px-1 rounded">out/data</code>{" "}
          contains the same JSON (extract copies automatically).
        </p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-caption text-[#94A3B8]">Loading dashboard…</div>
    );
  }

  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useDataset(): DatasetValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDataset must be used inside DatasetProvider");
  return v;
}
