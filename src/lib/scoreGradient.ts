import type { CSSProperties } from "react";

// scoreGradient.ts — 1/3/7/9 discrete evaluation scale (Workshop 1 rubric)
// Heatmap ramp: orange (low) → yellow (mid) → green (high) on 1–9.

export const SCORE_LABELS: Record<number, string> = {
  1: "Unacceptable risk",
  3: "Material gaps",
  7: "Strong",
  9: "Differentiated",
};

/** Saturated stops for dots / chart lines (aligned hue path; slightly deeper for contrast). */
const VIVID_ORANGE: [number, number, number] = [234, 88, 12]; // orange-600
const VIVID_YELLOW: [number, number, number] = [202, 138, 4]; // yellow-600
const VIVID_GREEN: [number, number, number] = [22, 163, 74]; // green-600

/**
 * Table / matrix fills — stronger saturation & wider light–dark spread so heatmap
 * bands read clearly at a glance (vs. prior pastel ramp).
 */
const SOFT_RED: [number, number, number] = [220, 38, 38]; // red-600
const SOFT_ORANGE: [number, number, number] = [234, 88, 12]; // orange-600
const SOFT_YELLOW: [number, number, number] = [217, 119, 6]; // amber-600
const SOFT_GREEN: [number, number, number] = [22, 163, 74]; // green-600
const SOFT_GREEN_DEEP: [number, number, number] = [20, 83, 45]; // green-800

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Map score 1–9 along orange → yellow (at 5) → green.
 * `t = (s-1)/8`: first half orange→yellow, second half yellow→green.
 */
function heatRgb(s: number, soft: boolean): [number, number, number] {
  if (soft) {
    const x = Math.min(9, Math.max(1, s));
    if (x <= 2) return [lerp(SOFT_RED[0], SOFT_ORANGE[0], (x - 1) / 1), lerp(SOFT_RED[1], SOFT_ORANGE[1], (x - 1) / 1), lerp(SOFT_RED[2], SOFT_ORANGE[2], (x - 1) / 1)];
    if (x <= 5) {
      const u = (x - 2) / 3;
      return [lerp(SOFT_ORANGE[0], SOFT_YELLOW[0], u), lerp(SOFT_ORANGE[1], SOFT_YELLOW[1], u), lerp(SOFT_ORANGE[2], SOFT_YELLOW[2], u)];
    }
    if (x <= 8) {
      const u = (x - 5) / 3;
      return [lerp(SOFT_YELLOW[0], SOFT_GREEN[0], u), lerp(SOFT_YELLOW[1], SOFT_GREEN[1], u), lerp(SOFT_YELLOW[2], SOFT_GREEN[2], u)];
    }
    return SOFT_GREEN_DEEP;
  }
  const o = VIVID_ORANGE;
  const y = VIVID_YELLOW;
  const g = VIVID_GREEN;
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

/** sRGB relative luminance (0–1); used to pick light vs dark label on heat cells. */
function relativeLuminance(rgb: [number, number, number]): number {
  const lin = rgb.map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
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

/** Text on heat cells: white on dark bands, near-black on lighter mid-amber. */
export function scoreHeatTextOnRamp(v: number): string {
  const s = Math.min(9, Math.max(1, v));
  const rgb = heatRgb(s, true);
  return relativeLuminance(rgb) < 0.42 ? "#FFFFFF" : "#0F172A";
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
