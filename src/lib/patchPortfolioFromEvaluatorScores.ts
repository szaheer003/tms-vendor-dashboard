import type { Portfolio } from "./types";

/** Aligns with scripts/embed_dashboard.py and scripts/import_folder8_scores.py */
const SUB_TO_PILLAR: Record<string, keyof typeof WEIGHTS> = {
  "1.1": "commercial",
  "1.2": "commercial",
  "1.3": "commercial",
  "2.1": "operations",
  "2.2": "operations",
  "2.3": "operations",
  "3.1": "technology",
  "3.2": "technology",
  "3.3": "technology",
  "4.1": "migration",
  "4.2": "migration",
  "4.3": "migration",
  "5.1": "partnership",
  "5.2": "partnership",
  "5.3": "partnership",
};

const WEIGHTS = {
  commercial: 0.225,
  operations: 0.225,
  technology: 0.225,
  migration: 0.225,
  partnership: 0.1,
} as const;

export type EvaluatorScoresPatchInput = {
  source?: string;
  importedAt?: string;
  evaluatorSlotCount?: number;
  scores?: Record<string, Record<string, Record<string, number | null | undefined>>>;
};

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Mutates portfolio in place (same semantics as embed_dashboard.patch_portfolio_from_evaluator_scores). */
export function patchPortfolioFromEvaluatorScores(portfolio: Portfolio, ev: EvaluatorScoresPatchInput | null | undefined): void {
  if (!ev?.scores || typeof ev.scores !== "object") return;

  const sm = ev.scores;
  const sc = portfolio.scorecard;
  let colOrder = [...(sc.columnOrder ?? [])];
  if (!colOrder.length) colOrder = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"];
  const nSlots = Math.max(1, Math.min(24, Number(ev.evaluatorSlotCount) || 12));
  const dims = sc.dimensions ?? [];

  const dimAvgs: Record<string, Record<string, number | null>> = {};

  for (const d of dims) {
    const sid = d.id;
    if (!sid) continue;
    dimAvgs[sid] = {};
    for (const vid of colOrder) {
      const vals: number[] = [];
      for (let i = 0; i < nSlots; i++) {
        const ekey = `ev${i + 1}`;
        const row = sm[vid]?.[ekey];
        const x = row?.[sid];
        if (x != null && typeof x === "number" && !Number.isNaN(x)) vals.push(x);
      }
      const m = mean(vals);
      dimAvgs[sid]![vid] = m != null ? Math.round(m * 1000) / 1000 : null;
    }
    d.scores = Object.fromEntries(colOrder.map((vid) => [vid, dimAvgs[sid]![vid] ?? null])) as Record<string, number | null>;
  }

  const pillarAvgs: Record<keyof typeof WEIGHTS, Record<string, number | null>> = {
    commercial: {},
    operations: {},
    technology: {},
    migration: {},
    partnership: {},
  };

  for (const vid of colOrder) {
    for (const pk of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const subs = Object.entries(SUB_TO_PILLAR)
        .filter(([, p]) => p === pk)
        .map(([s]) => s);
      const nums = subs
        .map((s) => dimAvgs[s]?.[vid])
        .filter((v): v is number => v != null && typeof v === "number");
      pillarAvgs[pk][vid] = nums.length ? Math.round((mean(nums) ?? 0) * 1000) / 1000 : null;
    }
  }

  const composite: Record<string, number | null> = {};
  for (const vid of colOrder) {
    let acc = 0;
    let tw = 0;
    for (const pk of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const w = WEIGHTS[pk];
      const pav = pillarAvgs[pk][vid];
      if (pav != null) {
        acc += w * pav;
        tw += w;
      }
    }
    composite[vid] = tw > 0 ? Math.round((acc / tw) * 1000) / 1000 : null;
  }

  portfolio.scorecard.composite = composite as Portfolio["scorecard"]["composite"];
  if (ev.source) {
    let src = String(ev.source);
    if (ev.importedAt) src += ` · Imported ${String(ev.importedAt).slice(0, 10)}.`;
    portfolio.scorecard.source = src;
  }

  for (const v of portfolio.vendors) {
    if (composite[v.id] !== undefined) v.composite = composite[v.id] ?? null;
  }

  function scaleRadar(x: number | null): number {
    if (x == null) return 0;
    return Math.max(0, Math.min(10, ((x - 1) / 8) * 10));
  }

  const fieldSum: Record<keyof typeof WEIGHTS, number> = {
    commercial: 0,
    operations: 0,
    technology: 0,
    migration: 0,
    partnership: 0,
  };
  const fieldN: Record<keyof typeof WEIGHTS, number> = {
    commercial: 0,
    operations: 0,
    technology: 0,
    migration: 0,
    partnership: 0,
  };

  for (const vid of colOrder) {
    for (const pk of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]) {
      const pv = pillarAvgs[pk][vid];
      if (pv != null) {
        fieldSum[pk] += scaleRadar(pv);
        fieldN[pk] += 1;
      }
    }
  }

  if (!portfolio.radar.vendors) portfolio.radar.vendors = [];

  portfolio.radar.fieldAverage = Object.fromEntries(
    (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => [
      k,
      fieldN[k] ? Math.round((fieldSum[k] / fieldN[k]) * 1000) / 1000 : 0,
    ]),
  ) as Portfolio["radar"]["fieldAverage"];

  const rvendors = portfolio.radar.vendors ?? [];
  for (const rv of rvendors) {
    const vid = rv.vendorId;
    if (!vid) continue;
    rv.pillars = Object.fromEntries(
      (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((k) => [k, scaleRadar(pillarAvgs[k][vid] ?? null)]),
    ) as (typeof rvendors)[0]["pillars"];
  }
}
