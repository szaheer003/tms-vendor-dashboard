import type { SheetJsGlobal } from "./loadCdnLibs";

export type CellStyle = {
  bold: boolean;
  italic: boolean;
  bgColor: string | null;
  fontColor: string | null;
  fontSize: number | null;
  hAlign: "left" | "center" | "right" | null;
  wrapText: boolean;
  numberFormat: string | null;
};

export const EMPTY_CELL_STYLE: CellStyle = {
  bold: false,
  italic: false,
  bgColor: null,
  fontColor: null,
  fontSize: null,
  hAlign: null,
  wrapText: false,
  numberFormat: null,
};

/** Parsed cell for rendering */
export type ParsedCell = {
  value: string;
  style: CellStyle;
  /** SheetJS type: n, s, b, e, … */
  type: string;
};

/** Legacy JSON snapshot cell */
export type SheetCell = { v: string };
export type SheetRowLegacy = SheetCell[];

/** Excel-style merge (0-based indices within `rows` grid) */
export type SheetMerge = { r: number; c: number; rs: number; cs: number };

export type Sheet = {
  name: string;
  rows: ParsedCell[][];
  merges: SheetMerge[];
  /** Pixel width per column */
  colPixelWidths: number[];
  /** 0-based row indices treated as header bands */
  headerRowIndices: number[];
  /** 0-based first row in workbook (!ref) — for accurate Excel row numbers in the gutter */
  rangeStartRow: number;
};

export type WorkbookJson = { sheets: Sheet[] };

type XlsxColInfo = { hidden?: boolean; wpx?: number; wch?: number; width?: number };

function normalizeHex(hex: string): string | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.replace(/^FF/i, "").replace(/^#/, "");
  if (clean.length === 8) {
    const tail = clean.slice(-6);
    if (/^[0-9A-Fa-f]{6}$/.test(tail)) {
      if (["FFFFFF", "ffffff"].includes(tail)) return null;
      return tail.toUpperCase();
    }
  }
  if (clean.length === 6 && /^[0-9A-Fa-f]{6}$/i.test(clean)) {
    const u = clean.toUpperCase();
    if (u === "FFFFFF") return null;
    return u;
  }
  return null;
}

function extractCellStyle(cell: unknown): CellStyle {
  const base: CellStyle = { ...EMPTY_CELL_STYLE };
  if (!cell || typeof cell !== "object") return base;
  const c = cell as Record<string, unknown>;
  const s = c.s;
  if (!s || typeof s !== "object") return base;
  const so = s as Record<string, unknown>;
  const font = (so.font as Record<string, unknown>) ?? {};
  const fill = (so.fill as Record<string, unknown>) ?? {};
  const align = (so.alignment as Record<string, unknown>) ?? {};
  const patternFill = (fill.patternFill as Record<string, unknown>) ?? {};
  const fgColor =
    (fill.fgColor as Record<string, unknown> | undefined) ??
    (patternFill.fgColor as Record<string, unknown> | undefined);
  const bgColor = (fill.bgColor as Record<string, unknown> | undefined) ?? patternFill.bgColor;
  let bg: string | null = null;
  if (fgColor?.rgb) bg = normalizeHex(String(fgColor.rgb));
  if (!bg && bgColor && typeof (bgColor as { rgb?: string }).rgb === "string") {
    bg = normalizeHex(String((bgColor as { rgb: string }).rgb));
  }
  const fontColor = font.color as { rgb?: string } | undefined;
  const fc = fontColor?.rgb ? normalizeHex(String(fontColor.rgb)) : null;
  const hz = align.horizontal;
  const hAlign =
    hz === "left" || hz === "center" || hz === "right" ? (hz as CellStyle["hAlign"]) : null;
  return {
    bold: !!font.bold,
    italic: !!font.italic,
    bgColor: bg,
    fontColor: fc,
    fontSize: typeof font.sz === "number" ? font.sz : null,
    hAlign,
    wrapText: !!align.wrapText,
    numberFormat: typeof c.z === "string" ? c.z : null,
  };
}

function getColWidths(ws: { "!cols"?: XlsxColInfo[] }, colCount: number, rangeStartC: number): number[] {
  const cols = ws["!cols"] ?? [];
  const widths: number[] = [];
  for (let i = 0; i < colCount; i++) {
    const absC = rangeStartC + i;
    const info = cols[absC];
    if (info?.hidden) {
      widths.push(0);
    } else if (info?.wpx && info.wpx > 0) {
      widths.push(Math.max(32, Math.min(500, info.wpx)));
    } else if (info?.wch && info.wch > 0) {
      widths.push(Math.max(32, Math.min(500, Math.round(info.wch * 7.5))));
    } else if (typeof info?.width === "number" && info.width > 0) {
      widths.push(Math.max(32, Math.min(500, Math.round(info.width))));
    } else {
      widths.push(0);
    }
  }
  return widths;
}

export function autoSizeColumns(rows: string[][], colCount: number): number[] {
  const widths: number[] = new Array(colCount).fill(60);
  const sampleRows = rows.slice(0, 30);
  for (let c = 0; c < colCount; c++) {
    let maxLen = 0;
    for (const row of sampleRows) {
      const cellText = row[c] ?? "";
      maxLen = Math.max(maxLen, cellText.length);
    }
    if (maxLen === 0) widths[c] = 40;
    else if (maxLen <= 5) widths[c] = 55;
    else if (maxLen <= 15) widths[c] = 100;
    else if (maxLen <= 40) widths[c] = 180;
    else if (maxLen <= 100) widths[c] = 260;
    else widths[c] = 360;
  }
  return widths;
}

function readCellParts(cell: unknown): { v: unknown; t: string; z: string | null; w: string | null } {
  if (!cell || typeof cell !== "object") return { v: "", t: "s", z: null, w: null };
  const c = cell as { v?: unknown; t?: string; z?: string; w?: string };
  return {
    v: c.v,
    t: c.t ?? "s",
    z: c.z != null ? String(c.z) : null,
    w: c.w != null && String(c.w).length ? String(c.w) : null,
  };
}

function formatCellValue(XLSX: SheetJsGlobal, v: unknown, t: string, z: string | null): string {
  if (v == null || v === "") return "";
  if (t === "b") return v ? "TRUE" : "FALSE";
  if (t === "e") return String(v);
  if (t === "n" && typeof v === "number") {
    if (z) {
      const SSF = (XLSX as unknown as { SSF?: { format: (fmt: string, val: number) => string } }).SSF;
      if (SSF?.format) {
        try {
          return SSF.format(z, v);
        } catch {
          /* fall through */
        }
      }
      if (z.includes("%")) {
        const m = z.match(/0\.(0+)/);
        const decimals = m ? m[1]!.length : 2;
        return `${(v * 100).toFixed(Math.min(decimals, 4))}%`;
      }
      if (z.includes("$") || z.includes("#,##0.00")) {
        return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
      }
      if (z.includes("#,##0") && !z.includes(".")) {
        return Math.round(v).toLocaleString("en-US");
      }
    }
    if (Number.isInteger(v)) return v.toLocaleString("en-US");
    return v.toFixed(2);
  }
  if (v instanceof Date) return v.toLocaleString();
  return String(v);
}

function formattedDisplay(XLSX: SheetJsGlobal, cell: unknown): string {
  const parts = readCellParts(cell);
  if (parts.w != null) return parts.w;
  return formatCellValue(XLSX, parts.v, parts.t, parts.z);
}

export function isHeaderRow(row: ParsedCell[]): boolean {
  const nonEmpty = row.filter((c) => c.value.trim() !== "");
  if (nonEmpty.length < 2) return false;
  const hasBold = nonEmpty.filter((c) => c.style.bold).length;
  const hasBg = nonEmpty.filter((c) => c.style.bgColor != null).length;
  if (hasBold > nonEmpty.length * 0.5 || hasBg > nonEmpty.length * 0.5) return true;
  const avgLen = nonEmpty.reduce((s, c) => s + c.value.length, 0) / nonEmpty.length;
  const allShort = nonEmpty.every((c) => c.value.length < 50);
  if (allShort && nonEmpty.length >= 3 && avgLen < 30) return true;
  return false;
}

export function computeHeaderRowIndices(rows: ParsedCell[][]): number[] {
  const out: number[] = [];
  for (let ri = 0; ri < rows.length; ri++) {
    if (isHeaderRow(rows[ri]!)) out.push(ri);
  }
  return out;
}

/** 0-based column index → A, B, … */
export function colLabel(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    x--;
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return s || "A";
}

type XlsxWorksheet = Record<string, unknown> & {
  "!ref"?: string;
  "!merges"?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
  "!cols"?: XlsxColInfo[];
};

export function workbookBinaryToJson(XLSX: SheetJsGlobal, ab: ArrayBuffer): WorkbookJson {
  let wb: { SheetNames: string[]; Sheets: Record<string, XlsxWorksheet> };
  try {
    wb = XLSX.read(ab, {
      type: "array",
      cellDates: true,
      cellStyles: true,
      cellNF: true,
    }) as { SheetNames: string[]; Sheets: Record<string, XlsxWorksheet> };
  } catch {
    wb = XLSX.read(ab, { type: "array", cellDates: true }) as {
      SheetNames: string[];
      Sheets: Record<string, XlsxWorksheet>;
    };
  }

  const sheets: Sheet[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws["!ref"];
    if (!ref) {
      sheets.push({
        name,
        rows: [],
        merges: [],
        colPixelWidths: [],
        headerRowIndices: [],
        rangeStartRow: 0,
      });
      continue;
    }
    const range = XLSX.utils.decode_range(ref);
    const ncols = range.e.c - range.s.c + 1;
    const nrows = range.e.r - range.s.r + 1;

    const rows: ParsedCell[][] = [];
    for (let R = range.s.r; R <= range.e.r; R++) {
      const row: ParsedCell[] = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        const parts = readCellParts(cell);
        const value = formattedDisplay(XLSX, cell);
        const style = extractCellStyle(cell);
        style.numberFormat = parts.z ?? style.numberFormat;
        row.push({
          value,
          style,
          type: parts.t,
        });
      }
      rows.push(row);
    }

    const rawMerges = (ws["!merges"] ?? []) as { s: { r: number; c: number }; e: { r: number; c: number } }[];
    const merges: SheetMerge[] = rawMerges.map((m) => ({
      r: m.s.r - range.s.r,
      c: m.s.c - range.s.c,
      rs: m.e.r - m.s.r + 1,
      cs: m.e.c - m.s.c + 1,
    }));

    const textGrid = rows.map((r) => r.map((c) => c.value));
    const rawWidths = getColWidths(ws, ncols, range.s.c);
    const hasExplicitWidths = rawWidths.some((w) => w > 0);
    const colPixelWidths = hasExplicitWidths
      ? rawWidths.map((w) => (w === 0 ? 80 : w))
      : autoSizeColumns(textGrid, ncols);

    const headerRowIndices = computeHeaderRowIndices(rows);

    sheets.push({
      name,
      rows,
      merges,
      colPixelWidths,
      headerRowIndices,
      rangeStartRow: range.s.r,
    });
  }

  return { sheets };
}
