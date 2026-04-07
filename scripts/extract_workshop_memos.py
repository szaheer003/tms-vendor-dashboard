#!/usr/bin/env python3
"""
Extract Workshop 1 executive summaries from Word into JSON for the dashboard.

Usage:
  python scripts/extract_workshop_memos.py
  python scripts/extract_workshop_memos.py --input "C:/path/Workshop_1_Executive_Summaries_All_5_Vendors.docx"

Default input: that single DOCX if present; otherwise every *.docx in <repo>/Folder 6 (e.g. six per-vendor files).
Output:        <repo>/src/data/workshop1_memos.json

Structure follows Heading 1 (vendor), Heading 2 (section), Heading 3 (subsection),
List Paragraph / bullets. Adjust VENDOR_ALIASES if headings differ slightly.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from docx import Document
    from docx.text.paragraph import Paragraph
except ImportError:
    print("Install python-docx: pip install python-docx", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[1]
FOLDER6 = REPO_ROOT / "Folder 6"
LEGACY_COMBINED = FOLDER6 / "Workshop_1_Executive_Summaries_All_5_Vendors.docx"
DEFAULT_OUTPUT = REPO_ROOT / "src" / "data" / "workshop1_memos.json"

VENDOR_ORDER = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"]

VENDOR_ALIASES: dict[str, tuple[str, str]] = {
    "cognizant": ("cognizant", "Cognizant"),
    "genpact": ("genpact", "Genpact"),
    "exl": ("exl", "EXL"),
    "sutherland": ("sutherland", "Sutherland"),
    "ubiquity": ("ubiquity", "Ubiquity"),
    "ibm": ("ibm", "IBM"),
}


def norm_vendor_key(text: str) -> str | None:
    t = text.strip().lower()
    t = re.sub(r"\s+", " ", t)
    for key, (vid, _) in VENDOR_ALIASES.items():
        if key in t or t.startswith(vid):
            return vid
    # title may be "COGNIZANT" only
    for key, (vid, display) in VENDOR_ALIASES.items():
        if display.lower() == t:
            return vid
    return None


def heading_level(p: Paragraph) -> int | None:
    style = (p.style.name if p.style else "") or ""
    low = style.strip().lower()
    if low == "title":
        return 1
    # Custom templates: "heading 10" = vendor, "heading 20" = section, "heading 30" = subsection.
    # Must run before generic "Heading N" because "heading 10" would otherwise parse as level 10.
    m_h = re.match(r"heading\s*(\d+)\s*$", low)
    if m_h:
        n = int(m_h.group(1))
        if 10 <= n <= 19:
            return 1
        if 20 <= n <= 29:
            return 2
        if 30 <= n <= 39:
            return 3
        if n in (1, 2, 3):
            return n
    return None


def is_list_paragraph(p: Paragraph) -> bool:
    style = (p.style.name if p.style else "") or ""
    if "list" in style.lower():
        return True
    text = p.text.strip()
    if text.startswith(("•", "-", "·", "◦")):
        return True
    p_pr = p._p.pPr
    if p_pr is not None and p_pr.numPr is not None:
        return True
    return False


def strip_bullet(text: str) -> str:
    return re.sub(r"^[•\-\·◦]\s*", "", text.strip())


def section_id_from_title(title: str) -> tuple[str, str]:
    t = title.strip()
    # "1. HOW THEY..." -> number 1, id slug
    m = re.match(r"^(\d+)\s*[\.)]\s*(.+)$", t, re.S)
    num = m.group(1) if m else "0"
    rest = (m.group(2) if m else t).strip()
    slug = rest.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    if not slug:
        slug = f"section-{num}"
    return num, slug[:48]


def normalize_memo(m: dict) -> None:
    """Move dedicated BOTTOM LINE heading body into `bottomLine` and drop duplicate section."""
    sections = m.get("sections") or []
    new_sec: list = []
    for s in sections:
        title_u = (s.get("title") or "").upper()
        if "BOTTOM LINE" in title_u and s.get("paragraphs"):
            m["bottomLine"] = "\n\n".join(x.strip() for x in s["paragraphs"] if x and str(x).strip())
            continue
        new_sec.append(s)
    m["sections"] = new_sec
    if not (m.get("bottomLine") or "").strip():
        m["bottomLine"] = ""
    note = (m.get("note") or "").strip()
    if not note:
        m.pop("note", None)


def flush_section(sections: list, current: dict | None) -> None:
    if not current:
        return
    sections.append(
        {
            "id": current["id"],
            "number": current["number"],
            "title": current["title"],
            "paragraphs": current["paragraphs"],
            "bullets": current["bullets"],
            **({"subSections": current["subSections"]} if current.get("subSections") else {}),
            **({"assessment": current["assessment"]} if current.get("assessment") else {}),
        }
    )


def parse_docx(path: Path) -> list[dict]:
    doc = Document(str(path))
    memos: list[dict] = []
    current_memo: dict | None = None
    current_section: dict | None = None
    current_sub: dict | None = None

    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        level = heading_level(p)

        if level == 1:
            vid = norm_vendor_key(text)
            if not vid:
                continue
            flush_section(current_memo["sections"] if current_memo else [], current_section)
            current_section = None
            current_sub = None
            _, display = VENDOR_ALIASES.get(vid, (vid, text))
            current_memo = {
                "vendorId": vid,
                "vendorName": display,
                "workshop": 1,
                "date": "March 2026",
                "sessionDuration": "~90 minutes",
                "bottomLine": "",
                "sections": [],
            }
            memos.append(current_memo)
            continue

        if current_memo is None:
            continue

        if level == 2:
            flush_section(current_memo["sections"], current_section)
            current_sub = None
            num, sid = section_id_from_title(text)
            current_section = {
                "id": sid,
                "number": num,
                "title": text,
                "paragraphs": [],
                "bullets": [],
                "subSections": [],
            }
            continue

        if level == 3 and current_section is not None:
            current_sub = {"title": text, "bullets": []}
            current_section.setdefault("subSections", []).append(current_sub)
            continue

        if current_section is None:
            # Preamble before first H2: metadata lines only (bottom line lives under BOTTOM LINE heading)
            low = text.lower()
            if re.match(r"^date:\s*", low):
                current_memo["date"] = text.split(":", 1)[1].strip()
            elif re.match(r"^session\s*duration:\s*", low):
                current_memo["sessionDuration"] = text.split(":", 1)[1].strip()
            elif re.match(r"^note:\s*", low):
                note_val = text.split(":", 1)[1].strip()
                prev = (current_memo.get("note") or "").strip()
                current_memo["note"] = f"{prev} {note_val}".strip() if prev else note_val
            continue

        if is_list_paragraph(p):
            line = strip_bullet(text)
            if current_sub is not None:
                current_sub["bullets"].append(line)
            else:
                current_section["bullets"].append(line)
            continue

        # Normal paragraph
        low = text.lower()
        if low.startswith("assessment:") or (len(text) < 400 and text.endswith(".") and "assessment" in current_section["title"].lower()):
            current_section["assessment"] = text.replace("Assessment:", "").strip()
        else:
            current_section["paragraphs"].append(text)

    flush_section(current_memo["sections"] if current_memo else [], current_section)

    # Cleanup empty subSections + normalize bottom line / notes
    for m in memos:
        normalize_memo(m)
        for sec in m["sections"]:
            if not sec.get("subSections"):
                sec.pop("subSections", None)
            else:
                sec["subSections"] = [s for s in sec["subSections"] if s.get("bullets") or s.get("title")]

    return memos


def sorted_docx_in_dir(d: Path) -> list[Path]:
    if not d.is_dir():
        return []
    xs = [p for p in d.iterdir() if p.is_file() and p.suffix.lower() == ".docx"]
    xs = [p for p in xs if not p.name.startswith("~$")]
    return sorted(xs, key=lambda p: p.name.lower())


def discover_sources(inp: Path | None) -> list[Path]:
    """One combined DOCX, a directory of DOCX, or auto-detect under Folder 6."""
    if inp is not None:
        if inp.is_file():
            return [inp.resolve()]
        if inp.is_dir():
            found = sorted_docx_in_dir(inp)
            if found:
                return found
            print(f"No .docx in directory: {inp}", file=sys.stderr)
            return []
    if LEGACY_COMBINED.is_file():
        return [LEGACY_COMBINED.resolve()]
    found = sorted_docx_in_dir(FOLDER6)
    return found


def memo_richness(m: dict) -> int:
    sec = m.get("sections") or []
    n = sum(len(s.get("paragraphs") or []) + len(s.get("bullets") or []) for s in sec)
    n += len((m.get("bottomLine") or "").strip())
    return n


def merge_memos_by_vendor(memos: list[dict]) -> list[dict]:
    by_vid: dict[str, dict] = {}
    for m in memos:
        vid = m.get("vendorId")
        if not vid or not isinstance(vid, str):
            continue
        old = by_vid.get(vid)
        if old is None or memo_richness(m) > memo_richness(old):
            by_vid[vid] = m
    return [by_vid[v] for v in VENDOR_ORDER if v in by_vid]


def main() -> None:
    ap = argparse.ArgumentParser(description="Extract Workshop 1 memos from DOCX to JSON.")
    ap.add_argument(
        "--input",
        type=Path,
        default=None,
        help="Single Workshop 1 .docx, or a folder of .docx files (default: Folder 6 auto-detect)",
    )
    ap.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output JSON path")
    args = ap.parse_args()
    out: Path = args.output

    paths = discover_sources(args.input)
    if not paths:
        print(f"No input DOCX found under {FOLDER6}.", file=sys.stderr)
        print("Add one combined memo .docx or multiple vendor .docx files, or pass --input.", file=sys.stderr)
        sys.exit(2)

    combined: list[dict] = []
    for p in paths:
        chunk = parse_docx(p)
        print(f"  {p.name}: {len(chunk)} memo block(s)")
        combined.extend(chunk)

    data = merge_memos_by_vendor(combined)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(data)} memo(s) (merged) to {out} from {len(paths)} file(s)")


if __name__ == "__main__":
    main()
