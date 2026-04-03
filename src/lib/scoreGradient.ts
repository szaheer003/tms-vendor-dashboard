import type { CSSProperties } from "react";

// scoreGradient.ts — 1/3/7/9 discrete evaluation scale (Workshop 1 rubric)
// Heatmap ramp: orange (low) → yellow (mid) → green (high) on 1–9.

export const SCORE_LABELS: Record<number, string> = {
  1: "Unacceptable risk",
  3: "Material gaps",
  7: "Strong",
  9: "Differentiated",
};

/** Saturated stops for dots / chart lines (same hue path as heatmap). */
const VIVID_ORANGE: [number, number, number] = [249, 115, 22]; // orange-500
const VIVID_YELLOW: [number, number, number] = [234, 179, 8]; // yellow-500
const VIVID_GREEN: [number, number, number] = [34, 197, 94]; // green-500

/** Pastel stops for table / matrix cells. */
const SOFT_ORANGE: [number, number, number] = [254, 215, 170]; // orange-200
const SOFT_YELLOW: [number, number, number] = [253, 230, 138]; // yellow-200
const SOFT_GREEN: [number, number, number] = [167, 243, 208]; // green-200

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Map score 1–9 along orange → yellow (at 5) → green.
 * `t = (s-1)/8`: first half orange→yellow, second half yellow→green.
 */
function heatRgb(s: number, soft: boolean): [number, number, number] {
  const o = soft ? SOFT_ORANGE : VIVID_ORANGE;
  const y = soft ? SOFT_YELLOW : VIVID_YELLOW;
  const g = soft ? SOFT_GREEN : VIVID_GREEN;
  const x = Math.min(9, Math.max(1, s));
  const t = (x - 1) / 8;
  if (t <= 0.5) {
    const u = t / 0.5;
    return [lerp(o[0], y[0], u), lerp(o[1], y[1], u), lerp(o[2], y[2], u)];
  }
  const u = (t - 0.5) / 0.5;
  return [lerp(y[0], g[0], u), lerp(y[1], g[1], u), lerp(y[2], g[2], u)];
}

function rgbToCss(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})`;
}

function rgbToHex(rgb: [number, number, number]): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`;
}

/** Discrete anchor fills = samples on the same orange–yellow–green ramp. */
export const SCORE_BG: Record<number, string> = {
  1: rgbToHex(heatRgb(1, true)),
  3: rgbToHex(heatRgb(3, true)),
  7: rgbToHex(heatRgb(7, true)),
  9: rgbToHex(heatRgb(9, true)),
};

/** Chart / legend dots at rubric anchors (orange → yellow → green). */
export const SCORE_COLORS: Record<number, string> = {
  1: rgbToHex(heatRgb(1, false)),
  3: rgbToHex(heatRgb(3, false)),
  7: rgbToHex(heatRgb(7, false)),
  9: rgbToHex(heatRgb(9, false)),
};

/**
 * Map a 1–9 score to rubric band 1 / 3 / 7 / 9 using midpoints between anchors.
 * Boundaries: [1,2)→1, [2,5)→3, [5,8)→7, [8,9]→9.
 */
export function discreteScoreBand(value: number): 1 | 3 | 7 | 9 {
  const x = Math.min(9, Math.max(1, value));
  if (x < 2) return 1;
  if (x < 5) return 3;
  if (x < 8) return 7;
  return 9;
}

/** Smooth 1–9 heatmap background: orange → yellow (middle) → green. */
export function scoreBgContinuous(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "#F8FAFC";
  return rgbToCss(heatRgb(value, true));
}

/** Text color on the orange–yellow–green ramp (readable on pastel fills). */
export function scoreHeatTextOnRamp(v: number): string {
  const t = (v - 1) / 8;
  if (t < 0.35) return "#9A3412";
  if (t < 0.55) return "#854D0E";
  if (t < 0.8) return "#166534";
  return "#14532D";
}

export function scoreColor(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "#E2E8F0";
  const band = discreteScoreBand(value);
  return SCORE_COLORS[band];
}

export function scoreBg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "#F8FAFC";
  const band = discreteScoreBand(value);
  return SCORE_BG[band];
}

export function scoreLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Pending";
  const band = discreteScoreBand(value);
  return SCORE_LABELS[band] ?? "—";
}

/** Smooth RGB for charts (vivid orange → yellow → green). */
export function scoreToHeatColor(score: number): string {
  const s = Math.min(9, Math.max(1, score));
  return rgbToCss(heatRgb(s, false));
}

export function scoreToHeatStyle(score: number): CSSProperties {
  const bg = scoreToHeatColor(score);
  return {
    backgroundColor: bg,
    color: "#0F172A",
  };
}
