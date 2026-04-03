"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const MONEY_RE = /\$[\d,]+(?:\.\d+)?M\b/g;

/** Inline links for commercial dollar amounts; hides styling when parent has print class. */
export function MemoRichText({
  text,
  vendorId,
  className = "",
}: {
  text: string;
  vendorId: string;
  className?: string;
}) {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MONEY_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    const amt = m[0]!;
    parts.push(
      <Link
        key={`${m.index}-${amt}`}
        href={`/commercial/?vendor=${encodeURIComponent(vendorId)}`}
        className="memo-inline-link text-[#0F172A] font-medium underline underline-offset-2 hover:text-[#334155]"
      >
        {amt}
      </Link>,
    );
    last = m.index + amt.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return <span className={className}>{parts}</span>;
}
