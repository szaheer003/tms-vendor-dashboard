"use client";

import { useEffect, useState } from "react";

export function HtmlDocViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setHtml(t);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (err) {
    return <div className="p-6 text-center text-caption text-[#DC2626]">Could not load document ({err})</div>;
  }
  if (html == null) {
    return <div className="p-8 text-center text-caption text-[#475569]">Loading…</div>;
  }

  return (
    <div
      className="vendor-doc mammoth-doc min-h-[560px] flex-1 overflow-y-auto px-6 py-6 text-body text-[#0F172A]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
