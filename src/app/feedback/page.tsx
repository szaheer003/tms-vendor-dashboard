"use client";

import { FeedbackDashboardClient } from "./FeedbackDashboardClient";
import { useDataset } from "@/lib/dataset";

export default function FeedbackPage() {
  const { portfolio } = useDataset();
  return (
    <FeedbackDashboardClient portfolioVendors={portfolio.vendors} columnOrder={portfolio.scorecard.columnOrder} />
  );
}
