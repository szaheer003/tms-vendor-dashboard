import { Fragment } from "react";

/** Collapse runs of identical paragraphs (merged cells / repeated row labels). */
export function dedupeConsecutiveParagraphs(text: string): string {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let prevNorm = "";
  for (const p of paras) {
    const n = p.replace(/\s+/g, " ").toLowerCase();
    if (n === prevNorm) continue;
    out.push(p);
    prevNorm = n;
  }
  return out.join("\n\n");
}

/**
 * Tab 7.0 migration merge: remove consecutive dupes, then drop repeated short labels (same table header on many rows).
 * Not used for generic drill answers (could remove a second legitimate "Yes.").
 */
export function sanitizeMigrationNoteParagraphs(text: string): string {
  const step1 = dedupeConsecutiveParagraphs(text);
  const paras = step1.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const shortSeen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const n = p.replace(/\s+/g, " ").toLowerCase();
    if (p.length <= 160 && shortSeen.has(n)) continue;
    if (p.length <= 160) shortSeen.add(n);
    out.push(p);
  }
  return out.join("\n\n");
}

/** Client-side trim so existing JSON without re-extract drops Tab 7.0 RFP preamble. */
export function stripLeadingMigrationBoilerplate(text: string): string {
  const t = text.trim();
  if (!t || t === "—") return t;
  const low = t.toLowerCase();
  let cut = -1;
  for (const a of ["this table represent", "this table represents"]) {
    const i = low.indexOf(a);
    if (i > 80 && (cut < 0 || i < cut)) cut = i;
  }
  let out = cut >= 0 ? t.slice(cut).trim() : t;
  out = out.replace(
    /\n\nPart\s+2\s*[\u2014\u2013\-–]\s*Wave Timeline:[\s\S]+?evaluated more favorably than generic frameworks\.?\s*/gi,
    "\n\n"
  );
  return sanitizeMigrationNoteParagraphs(out.trim() || t);
}

const PART_TITLE_BODY = /^(Part\s+\d+\s*[—\-–\u2014]\s*[^:]+:\s*)([\s\S]*)$/i;

function shouldFormatAsNarrative(text: string): boolean {
  const t = text.trim();
  if (t.length > 320) return true;
  return /\n{2,}/.test(t) || /^Part\s+\d+\s*[—\-–\u2014]/im.test(t);
}

/** Renders long drill-down / migration text with paragraphs, Part headings, and simple lists. */
export function NarrativeBody({
  text,
  className,
  stripMigrationPreamble,
  variant = "migration",
}: {
  text: string;
  className?: string;
  stripMigrationPreamble?: boolean;
  variant?: "migration" | "answer";
}) {
  let raw = (text ?? "").trim();
  if (stripMigrationPreamble) raw = stripLeadingMigrationBoilerplate(raw);
  else if (variant === "migration") raw = sanitizeMigrationNoteParagraphs(raw);
  const bodyColor = variant === "answer" ? "text-[#0F172A]" : "text-[#64748B]";
  if (!raw || raw === "—") {
    return <p className={className ?? "text-[#94A3B8]"}>—</p>;
  }
  const blocks = raw.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className ?? `text-body ${bodyColor}`}>
      {blocks.map((block, i) => {
        const partTb = block.match(PART_TITLE_BODY);
        if (partTb) {
          const title = partTb[1]!.trim();
          const body = partTb[2]!.trim();
          return (
            <Fragment key={i}>
              <h4 className="text-caption font-bold text-[#0F172A] mt-5 mb-2 first:mt-0 border-b border-[#E2E8F0] pb-1">
                {title}
              </h4>
              {body ? (
                <p className={`leading-relaxed whitespace-pre-wrap mb-3 ${bodyColor}`}>{body}</p>
              ) : null}
            </Fragment>
          );
        }

        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const allParenNumbered =
          lines.length >= 2 && lines.every((l) => /^\(\d+\)\s/.test(l) || /^\d+\.\s/.test(l));
        if (allParenNumbered) {
          return (
            <ol key={i} className={`list-decimal pl-5 space-y-2 mb-3 [&>li]:leading-relaxed ${bodyColor}`}>
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^\(\d+\)\s*|^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          );
        }

        if (lines.length >= 2 && lines.every((l) => /^[-•*]\s/.test(l))) {
          return (
            <ul key={i} className={`list-disc pl-5 space-y-1 mb-3 ${bodyColor}`}>
              {lines.map((line, j) => (
                <li key={j} className="leading-relaxed">{line.replace(/^[-•*]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className={`leading-relaxed whitespace-pre-wrap mb-3 last:mb-0 ${bodyColor}`}>
            {block}
          </p>
        );
      })}
    </div>
  );
}

export function DrillAnswerBody({ answer }: { answer: string }) {
  let a = (answer ?? "").trim();
  if (!a) return null;
  if (shouldFormatAsNarrative(a)) {
    a = dedupeConsecutiveParagraphs(a);
    return <NarrativeBody text={a} variant="answer" />;
  }
  return <p className="text-body text-[#0F172A] whitespace-pre-wrap leading-relaxed">{a}</p>;
}
