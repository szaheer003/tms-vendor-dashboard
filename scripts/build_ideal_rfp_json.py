"""Legacy: build idealRfpSubmission.json from submission-checklist-extracted.txt.

Prefer `scripts/build_ideal_rfp_from_docx.py` (or `npm run ideal-rfp`) which reads
Folder 7/*.docx directly and aligns to the five evaluation criteria.
"""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
src_txt = root / "submission-checklist-extracted.txt"
if not src_txt.is_file():
    print("Missing submission-checklist-extracted.txt — see docstring.", file=sys.stderr)
    sys.exit(1)
text = src_txt.read_text(encoding="utf-8")
lines = [ln.strip() for ln in text.splitlines()]

purpose_lines = []
how_lines = []
i = 0
while i < len(lines):
    if lines[i].startswith("Purpose:"):
        purpose_lines.append(lines[i].replace("Purpose:", "").strip())
        i += 1
        continue
    if lines[i].startswith("How to Use:"):
        how_lines.append(lines[i].replace("How to Use:", "").strip())
        i += 1
        continue
    if re.match(r"^\d+\.\s+", lines[i]):
        break
    i += 1

sections = []
while i < len(lines):
    m = re.match(r"^(\d+)\.\s+(.+)$", lines[i])
    if not m:
        i += 1
        continue
    num, title = int(m.group(1)), m.group(2)
    i += 1
    intro = []
    while i < len(lines) and lines[i] and not re.match(
        r"^(Signals of a Strong Submission|If/Then Logic Checks|Red Flags|Evidence the Vendor Read the Materials|Evidence of Creative|Final Evaluator Gut-Check)",
        lines[i],
    ):
        intro.append(lines[i])
        i += 1
    intro_s = " ".join(intro).strip()

    signals, logic_lines, red, ev_r, ev_c, gut = [], [], [], [], [], []
    mode = None
    while i < len(lines):
        ln = lines[i]
        nm = re.match(r"^(\d+)\.\s+", ln)
        if nm and int(nm.group(1)) != num:
            break
        if ln == "Signals of a Strong Submission":
            mode = "sig"
            i += 1
            continue
        if ln == "If/Then Logic Checks":
            mode = "logic"
            i += 1
            continue
        if ln == "Red Flags":
            mode = "red"
            i += 1
            continue
        if ln == "Evidence the Vendor Read the Materials":
            mode = "evr"
            i += 1
            continue
        if ln.startswith("Evidence of Creative"):
            mode = "evc"
            i += 1
            continue
        if ln.startswith("Final Evaluator Gut-Check"):
            mode = "gut"
            i += 1
            continue
        if not ln:
            i += 1
            continue
        if mode == "sig":
            signals.append(ln)
        elif mode == "logic":
            logic_lines.append(ln)
        elif mode == "red":
            red.append(ln)
        elif mode == "evr":
            ev_r.append(ln)
        elif mode == "evc":
            ev_c.append(ln)
        elif mode == "gut":
            gut.append(ln)
        i += 1

    logic_checks = []
    buf = []
    for ln in logic_lines:
        parts = re.split(r"\bIF\s+", ln)
        for p in parts:
            p = p.strip()
            if not p:
                continue
            up = p.upper()
            sep = " THEN "
            if sep in up:
                idx = up.find(sep)
                cond, then = p[:idx].strip(), p[idx + len(sep) :].strip()
                logic_checks.append({"if": cond, "then": then})
            else:
                if p:
                    logic_checks.append({"if": p, "then": ""})

    sid = (
        "pl-assumptions",
        "client-migrations",
        "technology",
        "commercial",
        "rebadge",
        "language-locations",
        "investments",
        "offshoring",
        "regulatory",
        "completeness",
    )[num - 1]

    sections.append(
        {
            "id": sid,
            "num": num,
            "title": title,
            "intro": intro_s,
            "signals": signals,
            "logicChecks": logic_checks,
            "redFlags": red,
            "evidenceRead": ev_r,
            "evidenceCreative": ev_c,
            "gutCheckQuestions": gut,
        }
    )

out = {
    "meta": {
        "documentTitle": "FIS TMS Managed Services RFP",
        "subtitle": "Evaluator's Checklist: What Good Looks Like",
        "sectionNote": "Section 3 — Submission Quality & Critical Thinking Assessment",
        "purpose": " ".join(purpose_lines),
        "howToUse": " ".join(how_lines),
    },
    "sections": sections,
}

path = root / "src" / "data" / "idealRfpSubmission.json"
path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", path, "sections", len(sections))
