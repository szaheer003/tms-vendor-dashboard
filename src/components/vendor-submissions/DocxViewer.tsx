"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { loadMammoth } from "./loadCdnLibs";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isW(el: Element, local: string): boolean {
  return el.namespaceURI === W_NS && el.localName === local;
}

function textFromRun(run: Element): string {
  let s = "";
  for (const ch of Array.from(run.children)) {
    if (isW(ch, "t")) s += escapeHtml(ch.textContent ?? "");
    else if (isW(ch, "delText")) s += escapeHtml(ch.textContent ?? "");
    else if (isW(ch, "tab")) s += "    ";
    else if (isW(ch, "sym")) s += escapeHtml(ch.getAttribute("w:char") || "");
  }
  return s;
}

function serializeDel(del: Element): string {
  let html = "";
  for (const ch of Array.from(del.children)) {
    if (isW(ch, "r")) html += textFromRun(ch);
    else if (isW(ch, "ins")) html += serializeBlock(ch);
    else if (isW(ch, "p")) html += serializeBlock(ch);
  }
  return html || escapeHtml(del.textContent ?? "");
}

function serializeBlock(parent: Element): string {
  let html = "";
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.namespaceURI !== W_NS) continue;
    switch (el.localName) {
      case "r":
        html += textFromRun(el);
        break;
      case "ins":
        html += `<ins class="docx-ins">${serializeBlock(el)}</ins>`;
        break;
      case "del":
        html += `<del class="docx-del">${serializeDel(el)}</del>`;
        break;
      case "hyperlink":
      case "fldSimple":
      case "smartTag":
        html += serializeBlock(el);
        break;
      case "sdt": {
        const sc = el.getElementsByTagNameNS(W_NS, "sdtContent")[0];
        if (sc) html += serializeBlock(sc);
        else html += serializeBlock(el);
        break;
      }
      default:
        html += serializeBlock(el);
    }
  }
  return html;
}

function serializeTable(tbl: Element): string {
  let html =
    '<table class="docx-table my-2 w-full border-collapse border border-[#E2E8F0] text-caption">';
  for (const tr of Array.from(tbl.children)) {
    if (!isW(tr, "tr")) continue;
    html += "<tr>";
    for (const tc of Array.from(tr.children)) {
      if (!isW(tc, "tc")) continue;
      html += "<td class=\"align-top border border-[#E2E8F0] p-1\">";
      for (const block of Array.from(tc.children)) {
        if (isW(block, "p")) {
          html += `<p class="my-0.5 leading-snug">${serializeBlock(block)}</p>`;
        } else if (isW(block, "tbl")) {
          html += serializeTable(block);
        } else {
          html += serializeBlock(block);
        }
      }
      html += "</td>";
    }
    html += "</tr>";
  }
  return `${html}</table>`;
}

function serializeBody(body: Element): string {
  let html = "";
  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.namespaceURI !== W_NS) continue;
    if (el.localName === "p") {
      html += `<p class="my-2 leading-relaxed">${serializeBlock(el)}</p>`;
    } else if (el.localName === "tbl") {
      html += serializeTable(el);
    } else if (el.localName === "sdt") {
      const sc = el.getElementsByTagNameNS(W_NS, "sdtContent")[0];
      if (sc) html += serializeBody(sc);
    }
  }
  return html;
}

async function documentXmlHasRevisionMarks(buffer: ArrayBuffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const f = zip.file("word/document.xml");
    if (!f) return false;
    const xml = await f.async("string");
    return (
      /<w:ins\b/i.test(xml) ||
      /<w:del\b/i.test(xml) ||
      /<w:moveFrom\b/i.test(xml) ||
      /<w:moveTo\b/i.test(xml)
    );
  } catch {
    return false;
  }
}

async function buildHtmlFromOoxmlRevisions(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const f = zip.file("word/document.xml");
    if (!f) return null;
    const xml = await f.async("string");
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return null;
    const body = doc.getElementsByTagNameNS(W_NS, "body")[0];
    if (!body) return null;
    const inner = serializeBody(body);
    return inner.trim() ? inner : null;
  } catch {
    return null;
  }
}

function styleTrackedChanges(html: string): string {
  const insStyle =
    'class="docx-ins" style="background-color:#DCFCE7;color:#166534;text-decoration:underline;text-decoration-color:#16A34A;"';
  const delStyle =
    'class="docx-del" style="background-color:#FEE2E2;color:#991B1B;text-decoration:line-through;text-decoration-color:#DC2626;"';
  let styled = html.replace(/<ins\b([^>]*)>/gi, (_, attrs: string) => {
    if (/\bdocx-ins\b/.test(attrs)) return `<ins${attrs}>`;
    const rest = attrs.trim();
    return rest ? `<ins ${insStyle} ${rest}>` : `<ins ${insStyle}>`;
  });
  styled = styled.replace(/<del\b([^>]*)>/gi, (_, attrs: string) => {
    if (/\bdocx-del\b/.test(attrs)) return `<del${attrs}>`;
    const rest = attrs.trim();
    return rest ? `<del ${delStyle} ${rest}>` : `<del ${delStyle}>`;
  });
  return styled;
}

function countRedlineTags(html: string): number {
  const ins = html.match(/<ins\b/gi)?.length ?? 0;
  const del = html.match(/<del\b/gi)?.length ?? 0;
  return ins + del;
}

type Props = {
  url: string;
  fullScreenActive?: boolean;
  /** Deep-link: scroll to first paragraph containing this substring (from Vendor Submissions `find` query). */
  initialFind?: string | null;
};

export function DocxViewer({ url, fullScreenActive, initialFind = null }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [redlineIndex, setRedlineIndex] = useState(0);
  const [xmlHasRevisions, setXmlHasRevisions] = useState(false);
  const [usedOoxmlFallback, setUsedOoxmlFallback] = useState(false);
  const [showXmlBanner, setShowXmlBanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const findBootKeyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    setErr(null);
    setHtml(null);
    setRedlineIndex(0);
    setXmlHasRevisions(false);
    setUsedOoxmlFallback(false);
    setShowXmlBanner(false);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const xmlRev = await documentXmlHasRevisionMarks(buf);
        if (!cancelled) setXmlHasRevisions(xmlRev);

        const mammoth = await loadMammoth();
        let result: { value?: string };
        try {
          result = await mammoth.convertToHtml(
            { arrayBuffer: buf },
            {
              includeDefaultStyleMap: true,
              styleMap: ["comment-reference => sup"],
            },
          );
        } catch {
          result = await mammoth.convertToHtml({ arrayBuffer: buf });
        }
        let bodyHtml = result.value ?? "";
        let ooxmlUsed = false;
        if (countRedlineTags(styleTrackedChanges(bodyHtml)) === 0 && xmlRev) {
          const oox = await buildHtmlFromOoxmlRevisions(buf);
          if (oox && (/<ins\b/i.test(oox) || /<del\b/i.test(oox))) {
            bodyHtml = oox;
            ooxmlUsed = true;
          }
        }
        const styledBody = styleTrackedChanges(bodyHtml);
        const finalRedlineCount = countRedlineTags(styledBody);
        if (!cancelled) {
          setUsedOoxmlFallback(ooxmlUsed);
          setShowXmlBanner(xmlRev && finalRedlineCount === 0);
        }
        const wrapped = `<div class="vendor-doc mammoth-doc">${styledBody}</div>`;
        if (!cancelled) setHtml(wrapped);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const needle = initialFind?.trim();
    if (!html || !needle || needle.length < 4) return;
    const k = `${url}|${needle}`;
    if (findBootKeyRef.current === k) return;
    findBootKeyRef.current = k;
    const n = needle.toLowerCase().slice(0, 200);
    const head = n.slice(0, Math.min(80, n.length));
    if (head.length < 4) return;
    const raf = requestAnimationFrame(() => {
      const root = containerRef.current;
      if (!root) return;
      const paras = root.querySelectorAll("p");
      for (const p of Array.from(paras)) {
        if ((p.textContent || "").toLowerCase().includes(head)) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
          (p as HTMLElement).style.outline = "2px solid #0F172A";
          (p as HTMLElement).style.outlineOffset = "2px";
          window.setTimeout(() => {
            (p as HTMLElement).style.outline = "";
            (p as HTMLElement).style.outlineOffset = "";
          }, 2600);
          break;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [html, url, initialFind]);

  const redlineCount = useMemo(() => (html ? countRedlineTags(html) : 0), [html]);
  const previewHasRedlines = redlineCount > 0;

  const getRedlines = useCallback(() => {
    const root = containerRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("ins, del"));
  }, []);

  const jumpToRedline = useCallback(
    (delta: number) => {
      const nodes = getRedlines();
      if (!nodes.length) return;
      const next = (redlineIndex + delta + nodes.length) % nodes.length;
      setRedlineIndex(next);
      nodes[next].scrollIntoView({ behavior: "smooth", block: "center" });
      nodes[next].style.outline = "3px solid #0F172A";
      nodes[next].style.outlineOffset = "2px";
      window.setTimeout(() => {
        nodes[next].style.outline = "";
        nodes[next].style.outlineOffset = "";
      }, 2000);
    },
    [getRedlines, redlineIndex],
  );

  useEffect(() => {
    const nodes = getRedlines();
    if (nodes.length && redlineIndex >= nodes.length) setRedlineIndex(0);
  }, [html, getRedlines, redlineIndex]);

  if (err) {
    return <div className="p-6 text-center text-caption text-[#DC2626]">Could not load Word document ({err})</div>;
  }
  if (html == null) {
    return (
      <div className="p-8 text-center">
        <div className="skeleton mx-auto mb-3 h-4 w-48 rounded" />
        <p className="text-caption text-[#64748B]">Loading document…</p>
      </div>
    );
  }

  const fileName = url.split("/").pop() ?? "document.docx";

  return (
    <div className="relative min-h-[560px] flex-1">
      {!previewHasRedlines && !xmlHasRevisions && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-caption text-amber-800">
          This document was not submitted with standard Word tracked changes. Vendor edits are embedded as inline
          text, not as tracked revisions.{" "}
          <a href={url} download={fileName} className="font-medium underline">
            Download the original .docx
          </a>{" "}
          to inspect in Word.
        </div>
      )}
      {!previewHasRedlines && xmlHasRevisions && showXmlBanner && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-caption text-amber-800">
          Tracked revisions exist in the file, but the preview could not render them as markup. Open the original in
          Word for full redlines.{" "}
          <a href={url} download={fileName} className="font-medium underline">
            Download .docx
          </a>
        </div>
      )}
      {usedOoxmlFallback && previewHasRedlines && (
        <div className="mx-6 mt-4 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-caption text-[#1E40AF]">
          Showing insertions and deletions from Word XML. Some formatting may differ from the authored document.
        </div>
      )}
      <div
        ref={containerRef}
        className="overflow-y-auto px-6 py-6 text-body text-[#0F172A]"
        style={{ maxHeight: fullScreenActive ? "calc(100vh - 140px)" : "min(70vh, 900px)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="fixed bottom-6 right-6 z-[220] flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white/95 px-3 py-2 text-caption shadow-lg backdrop-blur-sm">
        {redlineCount > 0 ? (
          <>
            <button
              type="button"
              aria-label="Previous redline"
              className="rounded px-2 py-1 text-[#64748B] transition-colors duration-150 hover:bg-[#F1F5F9]"
              onClick={() => jumpToRedline(-1)}
            >
              ◀
            </button>
            <span className="tabular-nums text-micro text-[#64748B]">
              Redline {Math.min(redlineIndex + 1, redlineCount)} of {redlineCount}
            </span>
            <button
              type="button"
              aria-label="Next redline"
              className="rounded px-2 py-1 text-[#64748B] transition-colors duration-150 hover:bg-[#F1F5F9]"
              onClick={() => jumpToRedline(1)}
            >
              ▶
            </button>
          </>
        ) : (
          <span className="text-micro text-[#64748B]">No tracked changes in preview</span>
        )}
      </div>
    </div>
  );
}
