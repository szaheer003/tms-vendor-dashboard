/** Heuristic parse of Tab 3.0 case-study style blobs into labeled sections. */

export type ParsedCaseStudy = {
  title: string;
  fteCount: string;
  geography: string;
  scope: string;
  tech: string;
  results: string;
  resolution: string;
};

const LABEL_ALIASES: [RegExp, keyof Omit<ParsedCaseStudy, "title">][] = [
  [/^(?:FTE|Headcount|FTEs?)\s*[:#\-]/i, "fteCount"],
  [/^(?:Geo|Geograph|Location|Region|Countries?)\s*[:#\-]/i, "geography"],
  [/^(?:Scope|Services?|Engagement)\s*[:#\-]/i, "scope"],
  [/^(?:Tech|Technology|Platform|Tools?)\s*[:#\-]/i, "tech"],
  [/^(?:Results?|Outcomes?|Impact|Metrics?)\s*[:#\-]/i, "results"],
  [/^(?:Challenges?|Resolution|Mitigation|Lessons?)\s*[:#\-]/i, "resolution"],
];

export function parseCaseStudyText(raw: string): ParsedCaseStudy | null {
  const text = raw.trim();
  if (text.length < 80) return null;

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedCaseStudy = {
    title: lines[0]!.length > 100 ? `${lines[0]!.slice(0, 97)}…` : lines[0]!,
    fteCount: "",
    geography: "",
    scope: "",
    tech: "",
    results: "",
    resolution: "",
  };

  let assigned = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    for (const [re, key] of LABEL_ALIASES) {
      if (re.test(line)) {
        const rest = line.replace(re, "").trim();
        if (rest && !out[key]) {
          (out as Record<string, string>)[key] = rest;
          assigned++;
        }
        break;
      }
    }
  }

  const body = text.slice(Math.min(text.length, lines[0]!.length + 1)).trim();
  if (assigned < 2 && body.length > 120) {
    const mid = Math.min(body.length, 480);
    out.scope = body.slice(0, mid);
    if (body.length > mid) out.results = body.slice(mid, Math.min(body.length, mid + 400));
    assigned += 2;
  }

  return assigned >= 1 ? out : null;
}
