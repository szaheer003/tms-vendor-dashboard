"use client";

import { EvaluatorScoresClient } from "./EvaluatorScoresClient";
import { useDataset } from "@/lib/dataset";

export default function EvaluatorScoresPage() {
  const { portfolio } = useDataset();
  return <EvaluatorScoresClient portfolio={portfolio} />;
}
