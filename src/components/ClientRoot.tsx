"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { DatasetProvider, useDataset } from "@/lib/DatasetContext";
import { countSourcePreviewLeaves } from "@/lib/datasetUtils";

function ShellWithData({ children }: { children: ReactNode }) {
  const { portfolio, vendorMap } = useDataset();
  const ext = portfolio.extractionTimestamp ?? "";
  const built = portfolio.dashboardBuildTimestamp ?? ext;
  const provLeaves = Object.values(vendorMap).reduce((n, v) => n + countSourcePreviewLeaves(v), 0);
  const dataFootnote =
    ext || built
      ? `Data extracted: ${ext || "—"} · Validated: ${built || "—"} · ~${provLeaves.toLocaleString()} source mappings in vendor JSON. Hover any metric with ● for provenance · "View in original →" opens Vendor Submissions when linked.`
      : undefined;

  return (
    <AppShell
      title={portfolio.title}
      subtitle={portfolio.subtitle}
      classification={portfolio.classification}
      footer={portfolio.footer}
      dataFootnote={dataFootnote}
    >
      {children}
    </AppShell>
  );
}

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <DatasetProvider>
        <ShellWithData>{children}</ShellWithData>
      </DatasetProvider>
    </AuthGate>
  );
}
