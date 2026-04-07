"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { buildDashboardDataset, type DashboardDataset } from "./loadDashboardDataset";
import type { Portfolio, VendorRecord } from "./types";

export type DatasetValue = {
  portfolio: Portfolio;
  vendorMap: Record<string, VendorRecord>;
};

const Ctx = createContext<DatasetValue | null>(null);

type InitState = { ok: true; data: DatasetValue } | { ok: false; message: string };

function initDataset(): InitState {
  try {
    return { ok: true, data: buildDashboardDataset() };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "load failed" };
  }
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state] = useState<InitState>(initDataset);

  if (!state.ok) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center text-[#B91C1C] gap-2">
        <p className="text-h3">Could not load dashboard data</p>
        <p className="text-caption text-[#475569] max-w-lg">{state.message}</p>
        <p className="text-caption text-[#475569] max-w-lg">
          Contact the dashboard administrator to refresh the data pipeline and try again.
        </p>
      </div>
    );
  }

  return <Ctx.Provider value={state.data}>{children}</Ctx.Provider>;
}

export function useDataset(): DatasetValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDataset must be used inside DatasetProvider");
  return v;
}
