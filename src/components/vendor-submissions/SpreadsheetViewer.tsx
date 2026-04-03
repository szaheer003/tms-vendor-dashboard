"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { matchSheetTab } from "@/lib/vendorSubmissionLinks";
import { loadSheetJs } from "./loadCdnLibs";
import {
  autoSizeColumns,
  colLabel,
  computeHeaderRowIndices,
  EMPTY_CELL_STYLE,
  workbookBinaryToJson,
  type ParsedCell,
  type Sheet,
  type SheetCell,
  type WorkbookJson,
} from "./spreadsheetFromXlsx";

type Props = {
  url: string;
  initialTab?: string | null;
  initialRow?: number | null;
  sheetNamesHint?: string[];
  onToggleFullScreen?: () => void;
  fullScreenActive?: boolean;
};

function isJsonSpreadsheet(url: string) {
  return url.split("?")[0].toLowerCase().endsWith(".json");
}

function defaultParsedCell(v: string): ParsedCell {
  return { value: v, style: { ...EMPTY_CELL_STYLE }, type: "s" };
}

function normalizeSheet(
  s: Partial<Sheet> & { name: string; rows: (ParsedCell | SheetCell | Record<string, unknown>)[][] },
): Sheet {
  const rowsIn = s.rows ?? [];
  const ncols = rowsIn[0]?.length ?? 0;
  const merges = s.merges ?? [];

  const rows: ParsedCell[][] = rowsIn.map((row) =>
    (row ?? []).map((cell) => {
      if (cell && typeof cell === "object" && "value" in cell && "style" in cell) {
        return cell as ParsedCell;
      }
      const v = (cell as { v?: string })?.v ?? "";
      return defaultParsedCell(String(v));
    }),
  );

  const textGrid = rows.map((r) => r.map((c) => c.value));
  const legacy = s as unknown as { colWidths?: number[] };
  let colPixelWidths: number[];
  if (s.colPixelWidths && s.colPixelWidths.length === ncols) {
    colPixelWidths = s.colPixelWidths;
  } else if (legacy.colWidths && legacy.colWidths.length === ncols) {
    colPixelWidths = legacy.colWidths.map((w) => Math.round(Math.max(40, Math.min(400, w * 8))));
  } else {
    colPixelWidths = autoSizeColumns(textGrid, ncols);
  }

  const headerRowIndices =
    s.headerRowIndices && s.headerRowIndices.length
      ? s.headerRowIndices
      : computeHeaderRowIndices(rows);

  const rangeStartRow =
    typeof (s as { rangeStartRow?: number }).rangeStartRow === "number"
      ? (s as { rangeStartRow: number }).rangeStartRow
      : 0;

  return { name: s.name, rows, merges, colPixelWidths, headerRowIndices, rangeStartRow };
}

function mergeCoverage(merges: Sheet["merges"], nrows: number, ncols: number) {
  const covered: boolean[][] = Array.from({ length: nrows }, () => Array(ncols).fill(false));
  const span: ({ rs: number; cs: number } | null)[][] = Array.from({ length: nrows }, () =>
    Array(ncols).fill(null),
  );
  for (const m of merges) {
    const { r, c, rs, cs } = m;
    if (r < 0 || c < 0 || r >= nrows || c >= ncols) continue;
    span[r]![c] = { rs, cs };
    for (let dr = 0; dr < rs; dr++) {
      for (let dc = 0; dc < cs; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr;
        const cc = c + dc;
        if (rr < nrows && cc < ncols) covered[rr]![cc] = true;
      }
    }
  }
  return { covered, span };
}

const ROW_NUM_COL_PX = 48;

export function SpreadsheetViewer({
  url,
  initialTab,
  initialRow,
  sheetNamesHint,
  onToggleFullScreen,
  fullScreenActive,
}: Props) {
  const [data, setData] = useState<WorkbookJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [search, setSearch] = useState("");
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setData(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status}`);
        if (isJsonSpreadsheet(url)) {
          const j = (await res.json()) as WorkbookJson;
          if (!cancelled)
            setData({
              sheets: j.sheets.map((s) => normalizeSheet(s as Parameters<typeof normalizeSheet>[0])),
            });
          return;
        }
        const ab = await res.arrayBuffer();
        const XLSX = await loadSheetJs();
        const j = workbookBinaryToJson(XLSX, ab);
        if (!cancelled) setData(j);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const names = useMemo(() => data?.sheets.map((s) => s.name) ?? sheetNamesHint ?? [], [data, sheetNamesHint]);

  useEffect(() => {
    if (!data?.sheets.length) return;
    const idx = matchSheetTab(initialTab ?? null, names);
    setSheetIdx(Math.min(idx, data.sheets.length - 1));
  }, [data, initialTab, names]);

  useEffect(() => {
    if (initialRow == null || !rowRef.current) return;
    rowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [initialRow, sheetIdx, data]);

  const sheet = data?.sheets[sheetIdx];
  const rows = sheet?.rows ?? [];
  const nrows = rows.length;
  const ncols = rows[0]?.length ?? 0;
  const merges = sheet?.merges;
  const colPixelWidths =
    sheet?.colPixelWidths && sheet.colPixelWidths.length === ncols
      ? sheet.colPixelWidths
      : Array.from({ length: Math.max(ncols, 1) }, () => 80);
  const rangeStartRow = sheet?.rangeStartRow ?? 0;
  const headerRowSet = useMemo(
    () => new Set(sheet?.headerRowIndices ?? []),
    [sheet?.headerRowIndices],
  );
  const { covered, span } = useMemo(
    () => mergeCoverage(merges ?? [], nrows, ncols),
    [merges, nrows, ncols],
  );
  const tableWidthPx = ROW_NUM_COL_PX + colPixelWidths.slice(0, ncols).reduce((a, b) => a + b, 0);
  const q = search.trim().toLowerCase();

  const cellHighlight = (text: string) => {
    if (!q) return false;
    return text.toLowerCase().includes(q);
  };

  if (err) {
    return <div className="p-6 text-center text-caption text-[#DC2626]">Could not load spreadsheet data ({err})</div>;
  }

  if (!data || !sheet) {
    return (
      <div className="p-8 text-center">
        <div className="skeleton mx-auto mb-3 h-4 w-48 rounded" />
        <p className="text-caption text-[#64748B]">Loading workbook…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-h-[560px] flex-1 flex-col">
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
        <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:max-w-[320px]">
          <span className="text-micro font-medium uppercase tracking-wide text-[#94A3B8] shrink-0">Find</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter cells (yellow highlight)…"
            className="min-w-0 flex-1 rounded-md border border-[#E2E8F0] bg-white px-2 py-1.5 text-caption text-[#0F172A] placeholder:text-[#94A3B8] transition-colors duration-150"
          />
        </label>
        <span className="text-micro font-medium uppercase tracking-wide text-[#94A3B8]">Sheets</span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1 overflow-x-auto">
          {data.sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setSheetIdx(i)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-caption transition-colors duration-150 ${
                i === sheetIdx
                  ? "border-[#0F172A] bg-white font-medium text-[#0F172A] shadow-sm"
                  : "border-transparent bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {onToggleFullScreen && !fullScreenActive && (
          <button
            type="button"
            onClick={onToggleFullScreen}
            className="shrink-0 rounded px-2 py-1 text-caption text-[#64748B] transition-colors duration-150 hover:bg-white"
            title="Full screen"
          >
            ⛶
          </button>
        )}
      </div>
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-auto"
        style={{
          maxHeight: fullScreenActive ? "100vh" : "calc(100vh - 300px)",
        }}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed", width: tableWidthPx, minWidth: tableWidthPx }}
        >
          <colgroup>
            <col style={{ width: ROW_NUM_COL_PX }} />
            {colPixelWidths.slice(0, ncols).map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr className="sticky top-0 z-30 bg-[#F8FAFC]">
              <th
                className="sticky left-0 top-0 z-[60] border border-[#E2E8F0] bg-[#F8FAFC] p-0 text-center text-[10px] font-medium text-[#64748B] w-12"
                scope="col"
              >
                #
              </th>
              {Array.from({ length: ncols }, (_, ci) => (
                <th
                  key={ci}
                  className="sticky top-0 z-50 border border-[#E2E8F0] bg-[#F8FAFC] px-1 py-0.5 text-center text-[10px] font-medium text-[#64748B]"
                  scope="col"
                >
                  {colLabel(ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const excelRow = rangeStartRow + ri + 1;
              const highlightRow = initialRow != null && excelRow === initialRow;
              const isHeader = headerRowSet.has(ri);
              const rowGrandTotal = row.some((c) => /grand\s*total/i.test(c.value));
              const zebra = !isHeader && ri % 2 === 1 ? "bg-[#FAFBFD]" : "";
              return (
                <tr
                  key={ri}
                  ref={highlightRow ? rowRef : undefined}
                  data-excel-row={excelRow}
                  className={[zebra, highlightRow ? "highlight-row" : ""].filter(Boolean).join(" ")}
                >
                  <td className="sticky left-0 z-40 select-none border border-[#E2E8F0] bg-[#F8FAFC] px-1 text-center font-mono text-[10px] text-[#94A3B8]">
                    {excelRow}
                  </td>
                  {row.map((cell, ci) => {
                    if (covered[ri]?.[ci]) return null;
                    const sp = span[ri]![ci];
                    const rs = sp?.rs ?? 1;
                    const cs = sp?.cs ?? 1;
                    const raw = cell.value ?? "";
                    const hit = cellHighlight(raw);
                    const align =
                      cell.style.hAlign ??
                      (cell.type === "n" || /^[\s$€£%-]*[\d,]+(\.\d+)?[\s%]*$/.test(raw.trim()) ? "right" : "left");
                    const useWrap = cell.style.wrapText || raw.length > 45;
                    const bgFromStyle = cell.style.bgColor ? `#${cell.style.bgColor}` : undefined;
                    const bgHeader = !bgFromStyle && isHeader ? "#EDF2F7" : undefined;
                    const bgGrand = rowGrandTotal && !bgFromStyle ? "#E8EDF5" : undefined;
                    const bgZebra = !bgFromStyle && !isHeader && !rowGrandTotal && ri % 2 === 1 ? "#FAFBFD" : undefined;

                    return (
                      <td
                        key={ci}
                        rowSpan={rs > 1 ? rs : undefined}
                        colSpan={cs > 1 ? cs : undefined}
                        className={[
                          "border border-[#E0E0E0] px-1.5 py-[3px] text-[11px] leading-[1.35]",
                          useWrap ? "whitespace-pre-wrap break-words" : "whitespace-nowrap",
                          hit && q ? "bg-yellow-100 ring-1 ring-inset ring-yellow-300" : "",
                          highlightRow ? "ring-1 ring-inset ring-[#0F172A]/20" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{
                          backgroundColor: hit && q ? undefined : bgFromStyle ?? bgHeader ?? bgGrand ?? bgZebra,
                          color: cell.style.fontColor ? `#${cell.style.fontColor}` : "#1a1a1a",
                          fontWeight:
                            cell.style.bold || isHeader || rowGrandTotal
                              ? 600
                              : highlightRow
                                ? 500
                                : 400,
                          fontStyle: cell.style.italic ? "italic" : undefined,
                          fontSize: cell.style.fontSize
                            ? `${Math.max(9, Math.min(13, cell.style.fontSize))}px`
                            : "11px",
                          textAlign: align,
                          verticalAlign: "top",
                          maxHeight: 240,
                          overflowY: "auto",
                        }}
                        title={raw.length > 80 ? raw : undefined}
                      >
                        {raw}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
