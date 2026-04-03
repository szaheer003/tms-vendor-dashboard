import type { DrillSnippet } from "@/lib/types";

export type ComparisonCell = { value: string; note?: string };

export type ComparisonMetricRow = {
  id: string;
  label: string;
  cells: Record<string, ComparisonCell | null>;
};

function blobFromSnippets(snippets: DrillSnippet[]): string {
  return snippets.map((s) => `${s.questionText ?? ""}\n${s.text}`).join("\n\n");
}

function cell(value: string | null, note?: string): ComparisonCell | null {
  if (value == null || !value.trim()) return null;
  return { value: value.trim(), note };
}

/** First capture group, case-insensitive. */
function pick(blob: string, patterns: RegExp[]): string | null {
  const b = blob;
  for (const re of patterns) {
    const m = b.match(re);
    if (m?.[1] != null && String(m[1]).trim()) {
      return String(m[1]).trim().replace(/,/g, "");
    }
  }
  return null;
}

type Extractor = (blob: string) => ComparisonCell | null;

const activeFsClients: Extractor = (raw) => {
  const blob = raw.toLowerCase();
  const v = pick(raw, [
    /(?:issuer|card\s*&\s*payment|c\s*&\s*p|card printing)[^\d]{0,40}(\d{1,4})\+?/i,
    /(?:active|total)\s+(?:issuer\s+)?(?:clients?|accounts?|programs?)[^\d]{0,12}(\d{2,4})\+?/i,
    /(\d{2,4})\+?\s*(?:\(|,|\s)\s*(?:issuer|c\s*&\s*p|card)/i,
    /(\d{2,4})\+?\s*(?:financial services|fs\s+bpo|bpo)\s+clients?/i,
    /(?:>|over|more than|approximately|~)\s*(\d{2,4})\+?\s*(?:clients?|accounts?)/i,
    /(\d{2,4})\+?\s*(?:clients?|accounts?)(?:\s|$|,|;)/i,
  ]);
  if (!v) return null;
  const note = blob.includes("issuer") || blob.includes("c&p") ? "issuer-linked" : blob.includes("bpo") ? "BPO / FS" : undefined;
  return cell(`${v}+`, note);
};

const activeFsSecondary: Extractor = (raw) => {
  const blob = raw.toLowerCase();
  const v = pick(raw, [
    /(?:bpo|outsourc|operations)[^\d]{0,35}(\d{2,4})\+?/i,
    /(\d{2,4})\+?\s*(?:bpo|operations|programs?)/i,
  ]);
  if (!v || !blob.includes("client")) return null;
  return cell(`${v}+`, "ops / BPO");
};

const attrition: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(?:voluntary\s+)?attrition[^\d]{0,16}(\d{1,2}(?:\.\d)?)\s*%/i,
    /(\d{1,2}(?:\.\d)?)\s*%\s*(?:attrition|voluntary|turnover)/i,
    /attrition\s*(?:rate|of)?\s*:?\s*(\d{1,2}(?:\.\d)?)\s*%/i,
    /(?:~|approximately)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*%/i,
  ]);
  if (!v) return null;
  const range = raw.match(/(?:~|approximately)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*%/i);
  if (range) return cell(`${range[1]}–${range[2]}%`);
  return cell(`${v}%`);
};

const languages: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(\d{2,3})\+?\s*(?:languages?|lingua)/i,
    /(?:>|over|more than)\s*(\d{2,3})\s*(?:languages?|locales?)/i,
    /(?:support|offer|cover)[^\d]{0,20}(\d{2,3})\s+languages?/i,
  ]);
  return v ? cell(`${v}+`) : null;
};

const countriesSites: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(\d{1,3})\+?\s*(?:countries|nations)/i,
    /(\d{1,3})\+?\s*(?:sites|locations|delivery\s+sites)/i,
    /(?:across|in)\s*(\d{1,3})\+?\s*(?:countries|sites)/i,
  ]);
  return v ? cell(`${v}+`) : null;
};

const workforceFte: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /([\d,]{2,6})\+?\s*(?:fte|full[\s-]time\s+equiv)/i,
    /(?:>|approximately|~)\s*([\d,]{2,6})\s*(?:fte|employees|agents)/i,
    /(\d{3,6})\+?\s*(?:employees|staff|agents)(?:\s|$|,)/i,
  ]);
  return v ? cell(v.replace(/,/g, "")) : null;
};

const agentTenure: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(?:average|avg\.?)\s+tenure[^\d]{0,12}(\d+(?:\.\d)?)\s*(?:years?|yrs?)/i,
    /tenure[^\d]{0,12}(\d+(?:\.\d)?)\s*(?:years?|yrs?)/i,
  ]);
  return v ? cell(`${v} yr`) : null;
};

const onshoreOffshoreMix: Extractor = (raw) => {
  const m = raw.match(/(\d{1,2})\s*[:/]\s*(\d{1,3})\s*(?:onshore|offshore|%?\s*off)/i);
  if (m) return cell(`${m[1]}:${m[2]}`);
  const pct = pick(raw.toLowerCase(), [
    /(\d{1,2})\s*%\s*offshore/i,
    /offshore[^\d]{0,8}(\d{1,3})\s*%/i,
    /(\d{2,3})\s*:\s*(\d{1,3})\s*(?:on|off)/i,
  ]);
  return pct ? cell(`${pct}% / mix`) : null;
};

const slaMetric: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(\d{2,3}(?:\.\d)?)\s*%\s*(?:sla|service level)/i,
    /sla[^\d]{0,10}(\d{2,3}(?:\.\d)?)\s*%/i,
    /(\d{1,2}(?:\.\d)?)\s*(?:sec|seconds|min)\s*(?:answer|response)/i,
  ]);
  return v ? cell(v) : null;
};

const waveCount: Extractor = (raw) => {
  const v = pick(raw.toLowerCase(), [
    /(\d{1,2})\s*(?:waves?|phases?|migration\s+waves?)/i,
    /(?:total|planned)\s*(?:of\s*)?(\d{1,2})\s+waves?/i,
    /(\d{1,2})\s*[-–]\s*wave/i,
  ]);
  return v ? cell(v) : null;
};

const pciLevel: Extractor = (raw) => {
  const m = raw.match(/pci[\s-]*dss\s*(?:level\s*)?(\d)/i);
  if (m) return cell(`L${m[1]}`);
  if (/pci[^\w]*(?:compliant|certified)/i.test(raw)) return cell("Yes");
  return null;
};

type MetricSpec = { id: string; label: string; extract: Extractor };

const TABLE_SPECS: Record<string, MetricSpec[]> = {
  "2.0:active-fs": [
    { id: "ac1", label: "Active FS clients (parsed)", extract: activeFsClients },
    { id: "ac2", label: "Secondary client scale signal", extract: activeFsSecondary },
  ],
  "2.0:attrition": [{ id: "at1", label: "Agent attrition (parsed)", extract: attrition }],
  "2.0:languages": [{ id: "lg1", label: "Languages supported", extract: languages }],
  "2.0:countries": [{ id: "ct1", label: "Countries / sites", extract: countriesSites }],
  "2.0:workforce": [{ id: "wf1", label: "Workforce / FTE signal", extract: workforceFte }],
  "2.0:tenure": [{ id: "tn1", label: "Agent tenure", extract: agentTenure }],
  "4.0:mix": [{ id: "mx1", label: "Delivery mix", extract: onshoreOffshoreMix }],
  "4.0:sla": [{ id: "sl1", label: "SLA / service metric", extract: slaMetric }],
  "7.0:waves": [{ id: "wv1", label: "Waves / phases", extract: waveCount }],
  "8.0:pci": [{ id: "pc1", label: "PCI posture", extract: pciLevel }],
};

export function comparisonTableForSubTab(
  primaryTabId: string,
  subTabId: string,
  vendors: { id: string }[],
  snippetsByVendor: Record<string, DrillSnippet[]>,
): ComparisonMetricRow[] | null {
  const key = `${primaryTabId}:${subTabId}`;
  const specs = TABLE_SPECS[key];
  if (!specs?.length) return null;

  const rows: ComparisonMetricRow[] = [];
  for (const spec of specs) {
    const cells: Record<string, ComparisonCell | null> = {};
    for (const v of vendors) {
      const blob = blobFromSnippets(snippetsByVendor[v.id] ?? []);
      cells[v.id] = spec.extract(blob);
    }
    if (Object.values(cells).every((c) => c == null)) continue;
    rows.push({ id: spec.id, label: spec.label, cells });
  }
  return rows.length ? rows : null;
}
