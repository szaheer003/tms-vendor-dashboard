"""Build src/data/idealRfpSubmission.json from Folder 7 Word checklist (.docx).

Default resolution (no CLI arg):
  1. Folder 7 / DEFAULT_IDEAL_CHECKLIST_DOCX (edit the constant below if you rename the file)
  2. Folder 7 / v2 submission checklist.docx
  3. Newest Folder 7/*checklist*.docx

Override: pass a path as the first argument (relative to repo root or absolute).

Requires: python-docx
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from docx import Document
except ImportError:
    print("Install python-docx: pip install python-docx", file=sys.stderr)
    sys.exit(1)

root = Path(__file__).resolve().parents[1]

# If you rename the evaluator checklist on disk, update this one line only.
DEFAULT_IDEAL_CHECKLIST_DOCX = "Evaluator_Checklist_Final.docx"


def source_docx_posix(path: Path) -> str:
    """Store repo-relative paths with forward slashes (UI + git friendly)."""
    rp = path.resolve()
    rr = root.resolve()
    try:
        return rp.relative_to(rr).as_posix()
    except ValueError:
        return str(rp).replace("\\", "/")

MODE_SIGNALS = "Signals of a Strong Submission"
MODE_LOGIC = "If/Then Logic Checks"
MODE_RED = "Red Flags"
MODE_EXPECT = "What FIS is Expecting"
MODE_ENCOURAGE = "What FIS is Encouraging Vendors to Do"


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "section"


def split_logic_line(ln: str) -> list[tuple[str, str]]:
    """Split leading IF ... THEN ... (one pair per line; THEN is first case-insensitive match)."""
    ln = ln.strip()
    if not ln.upper().startswith("IF "):
        return [(ln, "")]
    rest = ln[3:].strip()
    up = rest.upper()
    sep = " THEN "
    idx = up.find(sep)
    if idx < 0:
        return [(rest, "")]
    cond, then = rest[:idx].strip(), rest[idx + len(sep) :].strip()
    return [(cond, then)]


def is_major_criterion(ln: str) -> tuple[int, str] | None:
    m = re.match(r"^(\d+)\.\s+(.+)$", ln)
    if not m:
        return None
    return int(m.group(1)), m.group(2).strip()


def looks_like_intro(ln: str) -> bool:
    if len(ln) > 95:
        return True
    return bool(
        re.match(
            r"^(This |The |Beyond |Rebadging |Evaluators |This section )",
            ln,
        )
    )


def paragraphs_from_docx(path: Path) -> list[str]:
    doc = Document(str(path))
    return [p.text.strip() for p in doc.paragraphs if p.text.strip()]


def parse_meta(lines: list[str]) -> tuple[dict[str, str], int]:
    purpose, how = [], []
    i = 0
    while i < len(lines):
        if lines[i].startswith("Purpose:"):
            purpose.append(lines[i].replace("Purpose:", "").strip())
            i += 1
            continue
        if lines[i].startswith("How to Use:"):
            how.append(lines[i].replace("How to Use:", "").strip())
            i += 1
            continue
        if is_major_criterion(lines[i]):
            break
        i += 1
    meta = {
        "documentTitle": "FIS TMS Managed Services RFP",
        "subtitle": "Evaluator's Checklist: What Good Looks Like",
        "sectionNote": "Submission Quality & Critical Thinking Assessment",
        "purpose": " ".join(purpose),
        "howToUse": " ".join(how),
    }
    return meta, i


def parse_subsection_standard(
    lines: list[str],
    i: int,
    crit_num: int,
    sub_title: str,
) -> tuple[dict, int]:
    intro: list[str] = []
    signals: list[str] = []
    logic_lines: list[str] = []
    red: list[str] = []
    mode: str | None = None

    while i < len(lines):
        ln = lines[i]
        mc = is_major_criterion(ln)
        if mc and mc[0] > crit_num:
            break
        if mc and mc[0] == crit_num + 1:
            break

        if ln == MODE_SIGNALS:
            mode = "sig"
            i += 1
            continue
        if ln == MODE_LOGIC:
            mode = "logic"
            i += 1
            continue
        if ln == MODE_RED:
            mode = "red"
            i += 1
            continue

        if mode is None:
            if ln in (MODE_SIGNALS, MODE_LOGIC, MODE_RED):
                continue
            # next subsection title: short line, not IF, not bullet-like vendor sentence
            if intro and len(ln) < 90 and not ln.upper().startswith("IF "):
                if not ln.startswith("The vendor") and not ln.startswith("P&L ") and not ln.startswith("Tab "):
                    break
            intro.append(ln)
            i += 1
            continue

        if mode == "sig":
            if ln == MODE_LOGIC or ln == MODE_RED:
                continue
            if len(ln) < 90 and not ln.upper().startswith("IF ") and intro and ln[0].isupper():
                # likely new subsection
                break
            signals.append(ln)
            i += 1
            continue
        if mode == "logic":
            if ln == MODE_RED or ln == MODE_SIGNALS:
                continue
            if len(ln) < 90 and not ln.upper().startswith("IF ") and ln not in (MODE_LOGIC,):
                break
            logic_lines.append(ln)
            i += 1
            continue
        if mode == "red":
            if ln in (MODE_SIGNALS, MODE_LOGIC, MODE_RED):
                i += 1
                continue
            low = ln.lower()
            looks_like_red = (
                low.startswith("the vendor")
                or low.startswith("the pricing")
                or low.startswith("the p&l")
                or low.startswith("the migration")
                or low.startswith("tab ")
                or low.startswith("p&l ")
                or low.startswith("no ")
                or low.startswith("all ")
                or low.startswith("key ")
                or low.startswith("european")
                or low.startswith("ai tools")
            )
            if looks_like_red or len(ln) >= 90:
                red.append(ln)
                i += 1
                continue
            # Short line that is not typical red-flag wording → next subsection
            break

    logic_checks = []
    for ln in logic_lines:
        for cond, then in split_logic_line(ln):
            logic_checks.append({"if": cond, "then": then})

    return (
        {
            "id": slug(sub_title),
            "title": sub_title,
            "intro": " ".join(intro).strip(),
            "signals": signals,
            "logicChecks": logic_checks,
            "redFlags": red,
            "evidenceRead": [],
            "evidenceCreative": [],
            "gutCheckQuestions": [],
            "layout": "standard",
        },
        i,
    )


def parse_partnership(lines: list[str], i: int) -> tuple[list[dict], int]:
    """Criterion 5: intro paragraph(s) then three holistic blocks."""
    crit_intro: list[str] = []
    while i < len(lines):
        if lines[i] == MODE_EXPECT:
            break
        if lines[i].startswith("Final Evaluator Gut-Check"):
            break
        if lines[i].startswith("What FIS is Encouraging"):
            break
        mc = is_major_criterion(lines[i])
        if mc and mc[0] >= 5 and lines[i].strip().startswith("5."):
            i += 1
            continue
        if mc and mc[0] > 5:
            break
        crit_intro.append(lines[i])
        i += 1

    subsections: list[dict] = []
    if crit_intro:
        subsections.append(
            {
                "id": "overview",
                "title": "Overview",
                "intro": " ".join(crit_intro).strip(),
                "signals": [],
                "logicChecks": [],
                "redFlags": [],
                "evidenceRead": [],
                "evidenceCreative": [],
                "gutCheckQuestions": [],
                "layout": "standard",
            }
        )

    def read_until_header(stop_pred) -> tuple[list[str], int]:
        nonlocal i
        acc: list[str] = []
        while i < len(lines):
            if stop_pred(lines[i]):
                break
            mc = is_major_criterion(lines[i])
            if mc and mc[0] > 5:
                return acc, i
            acc.append(lines[i])
            i += 1
        return acc, i

    # What FIS is Expecting
    if i < len(lines) and lines[i] == MODE_EXPECT:
        i += 1
        ev_r, i = read_until_header(
            lambda s: s.startswith("What FIS is Encouraging") or s.startswith("Final Evaluator Gut-Check")
        )
        subsections.append(
            {
                "id": "what-fis-expects",
                "title": MODE_EXPECT,
                "intro": "",
                "signals": [],
                "logicChecks": [],
                "redFlags": [],
                "evidenceRead": ev_r,
                "evidenceCreative": [],
                "gutCheckQuestions": [],
                "layout": "holistic",
            }
        )

    if i < len(lines) and lines[i].startswith("What FIS is Encouraging"):
        i += 1
        ev_c, i = read_until_header(lambda s: s.startswith("Final Evaluator Gut-Check"))
        subsections.append(
            {
                "id": "what-fis-encourages",
                "title": MODE_ENCOURAGE,
                "intro": "",
                "signals": [],
                "logicChecks": [],
                "redFlags": [],
                "evidenceRead": [],
                "evidenceCreative": ev_c,
                "gutCheckQuestions": [],
                "layout": "holistic",
            }
        )

    if i < len(lines) and lines[i].startswith("Final Evaluator Gut-Check"):
        i += 1
        gut: list[str] = []
        while i < len(lines):
            mc = is_major_criterion(lines[i])
            if mc and mc[0] > 5:
                break
            gut.append(lines[i])
            i += 1
        subsections.append(
            {
                "id": "gut-check",
                "title": "Final evaluator gut-check",
                "intro": "",
                "signals": [],
                "logicChecks": [],
                "redFlags": [],
                "evidenceRead": [],
                "evidenceCreative": [],
                "gutCheckQuestions": gut,
                "layout": "holistic",
            }
        )

    return subsections, i


def parse_docx(path: Path) -> dict:
    lines = paragraphs_from_docx(path)
    meta, i = parse_meta(lines)

    criteria_ids = [
        "commercial-attractiveness",
        "operational-excellence",
        "technology-ai",
        "client-workforce-migration",
        "partnership-readiness",
    ]

    criteria: list[dict] = []
    while i < len(lines):
        mc = is_major_criterion(lines[i])
        if not mc:
            i += 1
            continue
        crit_num, crit_title = mc
        if crit_num < 1 or crit_num > 5:
            i += 1
            continue
        i += 1
        cid = criteria_ids[crit_num - 1]

        if crit_num == 5:
            subs, i = parse_partnership(lines, i)
            criteria.append(
                {
                    "id": cid,
                    "num": crit_num,
                    "title": crit_title,
                    "subsections": subs,
                }
            )
            continue

        subsections: list[dict] = []
        while i < len(lines):
            mc2 = is_major_criterion(lines[i])
            if mc2 and mc2[0] > crit_num:
                break
            if mc2 and mc2[0] == crit_num + 1:
                break

            if looks_like_intro(lines[i]):
                sub_title = crit_title
            else:
                sub_title = lines[i]
                i += 1

            sub, i = parse_subsection_standard(lines, i, crit_num, sub_title)
            subsections.append(sub)

        criteria.append(
            {
                "id": cid,
                "num": crit_num,
                "title": crit_title,
                "subsections": subsections,
            }
        )

    return {
        "meta": meta,
        "sourceDocx": source_docx_posix(path),
        "criteria": criteria,
    }


def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    if arg:
        docx_path = Path(arg)
        if not docx_path.is_absolute():
            docx_path = (root / docx_path).resolve()
    else:
        f7 = root / "Folder 7"
        candidates = [
            f7 / DEFAULT_IDEAL_CHECKLIST_DOCX,
            f7 / "v2 submission checklist.docx",
        ]
        docx_path = next((p for p in candidates if p.is_file()), None)
        if docx_path is None:
            globs = sorted(f7.glob("*checklist*.docx"), key=lambda p: p.stat().st_mtime, reverse=True)
            docx_path = globs[0] if globs else candidates[0]

    if not docx_path.is_file():
        print("Docx not found:", docx_path, file=sys.stderr)
        sys.exit(1)

    out = parse_docx(docx_path.resolve())
    path = root / "src" / "data" / "idealRfpSubmission.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    nsub = sum(len(c["subsections"]) for c in out["criteria"])
    print("wrote", path, "criteria", len(out["criteria"]), "subsections", nsub)


if __name__ == "__main__":
    main()
