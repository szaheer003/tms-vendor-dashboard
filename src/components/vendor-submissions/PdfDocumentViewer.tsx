"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ZOOM_PRESETS = [0.75, 1, 1.25, 1.5] as const;
const THUMB_SCALE = 0.18;

type Props = {
  url: string;
  initialPage?: number;
  /** Deep-link: run full-document text search after pages load (e.g. from Vendor Submissions `find` query). */
  initialFind?: string | null;
  onMeta?: (pages: number) => void;
  onToggleFullScreen?: () => void;
  fullScreenActive?: boolean;
};

export function PdfDocumentViewer({
  url,
  initialPage = 1,
  initialFind = null,
  onMeta,
  onToggleFullScreen,
  fullScreenActive,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [zoomMode, setZoomMode] = useState<"fit" | "preset">("preset");
  const [zoomIdx, setZoomIdx] = useState(1);
  const [visiblePage, setVisiblePage] = useState(initialPage);
  const [inputPage, setInputPage] = useState(String(initialPage));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showThumbs, setShowThumbs] = useState(true);
  const [contentWidth, setContentWidth] = useState(720);
  const [searchQ, setSearchQ] = useState("");
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  /** Pages containing the current query (1-based); ref avoids stale closures in next/prev. */
  const searchMatchPagesRef = useRef<number[]>([]);
  const [searchMatchUi, setSearchMatchUi] = useState({ idx: 0, total: 0 });

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bootFindKeyRef = useRef("");

  const presetScale = ZOOM_PRESETS[zoomIdx];

  const onDocLoad = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      onMeta?.(n);
      setLoadError(null);
      pageRefs.current = new Array(n).fill(null);
    },
    [onMeta],
  );

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContentWidth(Math.max(320, el.clientWidth - 24));
    });
    ro.observe(el);
    setContentWidth(Math.max(320, el.clientWidth - 24));
    return () => ro.disconnect();
  }, [numPages, showThumbs]);

  useEffect(() => {
    const p = Math.min(Math.max(1, initialPage), numPages || initialPage);
    if (numPages > 0) {
      pageRefs.current[p - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      setVisiblePage(p);
      setInputPage(String(p));
    }
  }, [initialPage, numPages]);

  useEffect(() => {
    const root = mainScrollRef.current;
    if (!root || numPages === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0.35)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target) {
          const idx = pageRefs.current.indexOf(visible[0].target as HTMLDivElement);
          if (idx >= 0) {
            setVisiblePage(idx + 1);
            setInputPage(String(idx + 1));
          }
        }
      },
      { root, rootMargin: "-80px 0px -40% 0px", threshold: [0.35, 0.5, 0.75] },
    );
    pageRefs.current.forEach((node) => node && obs.observe(node));
    return () => obs.disconnect();
  }, [numPages, url, zoomMode, zoomIdx, contentWidth]);

  const goPage = useCallback(
    (p: number) => {
      if (numPages === 0) return;
      const next = Math.min(Math.max(1, p), numPages);
      pageRefs.current[next - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      setVisiblePage(next);
      setInputPage(String(next));
    },
    [numPages],
  );

  const clearSearchHighlights = useCallback(() => {
    mainScrollRef.current?.querySelectorAll(".pdf-search-hit").forEach((n) => {
      n.classList.remove("pdf-search-hit");
    });
  }, []);

  const highlightTextLayerMatches = useCallback((term: string) => {
    const root = mainScrollRef.current;
    if (!root || !term.trim()) return;
    clearSearchHighlights();
    const layers = root.querySelectorAll(".react-pdf__Page__textContent");
    layers.forEach((layer) => {
      layer.querySelectorAll("span").forEach((sp) => {
        const t = sp.textContent ?? "";
        if (t.toLowerCase().includes(term.trim().toLowerCase())) {
          sp.classList.add("pdf-search-hit");
        }
      });
    });
  }, [clearSearchHighlights]);

  const runPdfTextSearch = useCallback(
    async (qRaw: string) => {
      const q = qRaw.trim();
      if (!q || numPages === 0) {
        setSearchStatus(null);
        searchMatchPagesRef.current = [];
        setSearchMatchUi({ idx: 0, total: 0 });
        clearSearchHighlights();
        return;
      }
      setSearchStatus("Searching…");
      try {
        const loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        const lower = q.toLowerCase();
        const pages: number[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          const str = tc.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ");
          if (str.toLowerCase().includes(lower)) pages.push(i);
        }
        if (!pages.length) {
          searchMatchPagesRef.current = [];
          setSearchMatchUi({ idx: 0, total: 0 });
          setSearchStatus("No matches");
          clearSearchHighlights();
          return;
        }
        searchMatchPagesRef.current = pages;
        setSearchMatchUi({ idx: 0, total: pages.length });
        goPage(pages[0]!);
        setSearchStatus(
          pages.length > 1 ? `Match 1 of ${pages.length} · page ${pages[0]}` : `Match on page ${pages[0]}`,
        );
        requestAnimationFrame(() => highlightTextLayerMatches(q));
      } catch {
        setSearchStatus("Search failed");
      }
    },
    [numPages, goPage, highlightTextLayerMatches, clearSearchHighlights, url],
  );

  const runSearch = useCallback(async () => {
    await runPdfTextSearch(searchQ);
  }, [searchQ, runPdfTextSearch]);

  useEffect(() => {
    const q = initialFind?.trim();
    if (!q || numPages === 0) return;
    const k = `${url}|${q}`;
    if (bootFindKeyRef.current === k) return;
    bootFindKeyRef.current = k;
    setSearchQ(q);
    void runPdfTextSearch(q);
  }, [url, numPages, initialFind, runPdfTextSearch]);

  const nextSearchMatch = useCallback(() => {
    const q = searchQ.trim();
    const pages = searchMatchPagesRef.current;
    if (pages.length <= 1 || !q) return;
    setSearchMatchUi((prev) => {
      const ni = (prev.idx + 1) % pages.length;
      const p = pages[ni]!;
      queueMicrotask(() => {
        goPage(p);
        setSearchStatus(`Match ${ni + 1} of ${pages.length} · page ${p}`);
        requestAnimationFrame(() => highlightTextLayerMatches(q));
      });
      return { idx: ni, total: pages.length };
    });
  }, [searchQ, goPage, highlightTextLayerMatches]);

  const prevSearchMatch = useCallback(() => {
    const q = searchQ.trim();
    const pages = searchMatchPagesRef.current;
    if (pages.length < 1 || !q) return;
    setSearchMatchUi((prev) => {
      const ni = (prev.idx - 1 + pages.length) % pages.length;
      const p = pages[ni]!;
      queueMicrotask(() => {
        goPage(p);
        setSearchStatus(`Match ${ni + 1} of ${pages.length} · page ${p}`);
        requestAnimationFrame(() => highlightTextLayerMatches(q));
      });
      return { idx: ni, total: pages.length };
    });
  }, [searchQ, goPage, highlightTextLayerMatches]);

  useEffect(() => {
    if (!searchQ.trim()) {
      clearSearchHighlights();
      setSearchStatus(null);
      searchMatchPagesRef.current = [];
      setSearchMatchUi({ idx: 0, total: 0 });
    }
  }, [searchQ, clearSearchHighlights]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoomMode("preset");
        setZoomIdx((i) => Math.min(ZOOM_PRESETS.length - 1, i + 1));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoomMode("preset");
        setZoomIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPage(visiblePage - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goPage(visiblePage + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPage, visiblePage]);

  const pageWidth = zoomMode === "fit" ? contentWidth : undefined;
  const pageScale = zoomMode === "fit" ? undefined : presetScale;

  return (
    <div className="flex min-h-[560px] flex-1 flex-col" tabIndex={-1}>
      <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-[#334155] bg-[#1E293B] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn label="Previous page" onClick={() => goPage(visiblePage - 1)} disabled={visiblePage <= 1}>
            ◀
          </ToolbarBtn>
          <ToolbarBtn label="Next page" onClick={() => goPage(visiblePage + 1)} disabled={visiblePage >= numPages}>
            ▶
          </ToolbarBtn>
          <label className="ml-1 flex items-center gap-1 text-caption text-white/80">
            Page
            <input
              type="text"
              inputMode="numeric"
              className="w-10 rounded border border-[#475569] bg-[#334155] px-1 py-0.5 text-center text-caption text-white transition-colors duration-150"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = parseInt(inputPage, 10);
                  if (!Number.isNaN(v)) goPage(v);
                }
              }}
            />
            <span className="tabular-nums text-white/90">of {numPages || "—"}</span>
          </label>
        </div>
        <div className="flex min-w-[140px] flex-1 flex-wrap items-center gap-1">
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Find in document…"
            className="min-w-[100px] max-w-[200px] flex-1 rounded border border-[#475569] bg-[#334155] px-2 py-1 text-caption text-white placeholder:text-white/40 transition-colors duration-150"
          />
          <button
            type="button"
            onClick={() => runSearch()}
            className="rounded px-2 py-1 text-caption text-white/90 transition-colors duration-150 hover:bg-white/10"
          >
            Find
          </button>
          {searchMatchUi.total > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous match"
                onClick={() => prevSearchMatch()}
                className="rounded px-1.5 py-1 text-caption text-white/90 transition-colors duration-150 hover:bg-white/10"
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Next match"
                onClick={() => nextSearchMatch()}
                className="rounded px-1.5 py-1 text-caption text-white/90 transition-colors duration-150 hover:bg-white/10"
              >
                ▶
              </button>
            </>
          )}
          {searchStatus && <span className="text-micro text-white/60">{searchStatus}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setShowThumbs((s) => !s)}
            className={`rounded px-2 py-1 text-caption transition-colors duration-150 ${
              showThumbs ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/10"
            }`}
          >
            Thumbs
          </button>
          <button
            type="button"
            onClick={() => setZoomMode("fit")}
            className={`rounded px-2 py-1 text-caption transition-colors duration-150 ${
              zoomMode === "fit" ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/10"
            }`}
          >
            Fit width
          </button>
          {ZOOM_PRESETS.map((z, i) => (
            <button
              key={z}
              type="button"
              onClick={() => {
                setZoomMode("preset");
                setZoomIdx(i);
              }}
              className={`rounded px-2 py-1 text-caption transition-colors duration-150 ${
                zoomMode === "preset" && zoomIdx === i ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
          {onToggleFullScreen && !fullScreenActive && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="ml-1 rounded px-2 py-1 text-caption text-white/80 transition-colors duration-150 hover:bg-white/10"
              title="Full screen"
            >
              ⛶
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <Document
          file={url}
          onLoadSuccess={onDocLoad}
          onLoadError={(e) => setLoadError(e.message)}
          loading={
            <div className="flex w-full flex-col gap-4 p-6">
              <div className="skeleton mx-auto h-[720px] max-w-3xl rounded-lg" />
              <p className="text-center text-caption text-[#64748B]">Loading PDF…</p>
            </div>
          }
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {loadError ? (
            <div className="p-6 text-center text-caption text-[#DC2626]">{loadError}</div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1">
              {showThumbs && numPages > 0 && (
                <aside className="w-[112px] shrink-0 overflow-y-auto border-r border-[#334155] bg-[#1E293B] p-1">
                  {Array.from({ length: numPages }, (_, i) => {
                    const pn = i + 1;
                    const on = pn === visiblePage;
                    return (
                      <button
                        key={`t-${pn}`}
                        type="button"
                        onClick={() => goPage(pn)}
                        className={`mb-2 w-full rounded border p-0.5 transition-colors duration-150 ${
                          on ? "border-white/40 bg-[#334155] shadow-sm" : "border-transparent hover:bg-white/5"
                        }`}
                      >
                        <Page pageNumber={pn} scale={THUMB_SCALE} renderTextLayer={false} renderAnnotationLayer={false} />
                        <span className="block text-center text-micro text-white/60">{pn}</span>
                      </button>
                    );
                  })}
                </aside>
              )}
              <div ref={mainScrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto bg-[#E2E8F0]">
                {numPages > 0 &&
                  Array.from({ length: numPages }, (_, i) => {
                    const pn = i + 1;
                    return (
                      <div
                        key={pn}
                        ref={(el) => {
                          pageRefs.current[i] = el;
                        }}
                        className="relative flex justify-center py-4"
                      >
                        <Page
                          pageNumber={pn}
                          width={pageWidth}
                          scale={pageScale}
                          renderTextLayer
                          renderAnnotationLayer
                          className="shadow-elevated bg-white"
                          loading={
                            <div className="flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4">
                              <div className="skeleton h-[70vh] w-full rounded-lg" />
                            </div>
                          }
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-2 py-1 text-caption text-white/80 transition-colors duration-150 hover:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
