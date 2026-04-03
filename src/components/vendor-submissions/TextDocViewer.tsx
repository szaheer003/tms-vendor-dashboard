"use client";

import { useEffect, useState } from "react";

export function TextDocViewer({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setText(t);
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
  if (text == null) {
    return <div className="p-8 text-center text-caption text-[#64748B]">Loading…</div>;
  }

  return (
    <pre className="min-h-[560px] flex-1 overflow-auto whitespace-pre-wrap break-words px-6 py-6 font-sans text-body text-[#0F172A]">
      {text}
    </pre>
  );
}
