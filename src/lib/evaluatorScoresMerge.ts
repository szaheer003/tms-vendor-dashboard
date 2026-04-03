import {
  EVALUATOR_IDS,
  emptyConfidence,
  emptyProceed,
  emptyQualitative,
  emptyScores,
  VENDOR_IDS,
  type ConfidenceVotes,
  type ProceedVotes,
  type QualitativeResponses,
  type ScoredMatrix,
} from "@/lib/evaluatorData";

export type EvaluatorScoresPayload = {
  source?: string;
  importedAt?: string;
  scores?: ScoredMatrix;
  qualitative?: QualitativeResponses;
  confidence?: ConfidenceVotes;
  proceed?: ProceedVotes;
};

/** Merge Folder 8 JSON into empty matrices (used for bundled data + fetch refresh). */
export function mergeEvaluatorScoresPayload(raw: EvaluatorScoresPayload | null | undefined): {
  scores: ScoredMatrix;
  qualitative: QualitativeResponses;
  confidence: ConfidenceVotes;
  proceed: ProceedVotes;
  importNote: string | null;
} {
  const scores = emptyScores();
  const qualitative = emptyQualitative();
  const confidence = emptyConfidence();
  const proceed = emptyProceed();

  if (raw?.scores) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const patch = raw.scores[vid]?.[eid];
        if (patch) Object.assign(scores[vid]![eid]!, patch);
      }
    }
  }
  if (raw?.qualitative) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const patch = raw.qualitative[vid]?.[eid];
        if (patch) Object.assign(qualitative[vid]![eid]!, patch);
      }
    }
  }
  if (raw?.confidence) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const v = raw.confidence[vid]?.[eid];
        if (v !== undefined) confidence[vid]![eid] = v;
      }
    }
  }
  if (raw?.proceed) {
    for (const vid of VENDOR_IDS) {
      for (const eid of EVALUATOR_IDS) {
        const v = raw.proceed[vid]?.[eid];
        if (v !== undefined) proceed[vid]![eid] = v;
      }
    }
  }

  const importNote = [raw?.source, raw?.importedAt ? `Imported ${String(raw.importedAt).slice(0, 10)}` : null]
    .filter(Boolean)
    .join(" · ");

  return {
    scores,
    qualitative,
    confidence,
    proceed,
    importNote: importNote || null,
  };
}
