/**
 * SheetJS + mammoth loaded from CDN so missing .json/.html assets still work (no Node preprocess).
 */

export type SheetJsGlobal = {
  read: (
    data: ArrayBuffer,
    opts: { type: "array"; cellDates?: boolean; cellStyles?: boolean; cellNF?: boolean },
  ) => XlsxWorkbook;
  utils: {
    decode_range: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell: (c: { r: number; c: number }) => string;
  };
};

type XlsxWorkbook = {
  SheetNames: string[];
  Sheets: Record<
    string,
    {
      "!ref"?: string;
      [addr: string]: { v?: unknown; w?: string; t?: string } | string | undefined;
    }
  >;
};

export type MammothGlobal = {
  convertToHtml: (
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string[]; includeDefaultStyleMap?: boolean },
  ) => Promise<{ value: string; messages?: unknown[] }>;
};

export function loadSheetJs(): Promise<SheetJsGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("window"));
  const w = window as unknown as { XLSX?: SheetJsGlobal };
  if (w.XLSX) return Promise.resolve(w.XLSX);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    s.async = true;
    s.onload = () => {
      const XLSX = (window as unknown as { XLSX?: SheetJsGlobal }).XLSX;
      if (XLSX) resolve(XLSX);
      else reject(new Error("SheetJS did not register"));
    };
    s.onerror = () => reject(new Error("Failed to load SheetJS script"));
    document.head.appendChild(s);
  });
}

export function loadMammoth(): Promise<MammothGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("window"));
  const w = window as unknown as { mammoth?: MammothGlobal };
  if (w.mammoth) return Promise.resolve(w.mammoth);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js";
    s.async = true;
    s.onload = () => {
      const m = (window as unknown as { mammoth?: MammothGlobal }).mammoth;
      if (m) resolve(m);
      else reject(new Error("mammoth did not register"));
    };
    s.onerror = () => reject(new Error("Failed to load mammoth script"));
    document.head.appendChild(s);
  });
}
