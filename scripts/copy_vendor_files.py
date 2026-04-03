"""
Copy vendor submission files into public/vendor-files/ and write
public/vendor-files-manifest.json (and sync both into out/ if that folder exists).

Requires Python 3.9+ (stdlib only — no pip install).
Run from repo root:
  python scripts/copy_vendor_files.py
"""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_VENDOR = ROOT / "public" / "vendor-files"
SUBMITTED = "2026-03-30"


def safe_copy(src: Path, dest: Path) -> tuple[bool, int | None]:
    if not src.is_file():
        return False, None
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return True, dest.stat().st_size


def is_zip_docx(path: Path) -> bool:
    if not path.is_file():
        return False
    with path.open("rb") as f:
        return f.read(2) == b"PK"


def doc_entry(
    *,
    kind: str,
    rel: str,
    original_name: str,
    label: str,
    missing: bool,
    bytes_: int | None = None,
    pages: int | None = None,
    sheet_names: list | None = None,
):
    d = {
        "kind": kind,
        "path": f"/vendor-files/{rel}".replace("\\", "/"),
        "fileName": original_name,
        "label": label,
        "missing": missing,
        "submittedAt": SUBMITTED,
    }
    if bytes_ is not None:
        d["bytes"] = bytes_
    if pages is not None:
        d["pages"] = pages
    if sheet_names is not None:
        d["sheetNames"] = sheet_names
    return d


BUILD = [
    (
        "cognizant",
        "Cognizant",
        "#1E3A5F",
        {
            "proposal": ("Folder 2/Cognizant_FIS TSYS Managed Services Partnership Cognizant Proposal Document.pdf", "proposal.pdf", "Proposal", "pdf"),
            "workbook": ("Folder 1/Cognizant_ Appendix B - TMS RFP - Cognizant - Vendor Response Workbook.xlsx", "workbook.xlsx", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/Cognizant_Appendix C - Draft FIS SOW_Cognizant Redline.Docx", "sow", "SOW Redline"),
            "supplemental": [
                ("Folder 2/Cognizant_One page summary - FIS RFP Response Guide.pdf", "supplemental-0.pdf", "One page summary", "pdf"),
            ],
        },
    ),
    (
        "genpact",
        "Genpact",
        "#059669",
        {
            "proposal": ("Folder 2/Genpact_FIS - TMS RFP G Proposal - 20 pager.pdf", "proposal.pdf", "Proposal", "pdf"),
            "workbook": ("Folder 1/Genpact_Appendix B - TMS RFP - G updated.xlsx", "workbook.xlsx", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/Genpact_Appendix C - Draft FIS SOW_G updated.docx", "sow.docx", "SOW Redline", "docx"),
            "supplemental": [
                ("Folder 2/Genpact_FIS - TMS RFP G Proposal Exec Summary.docx", "supplemental-0.docx", "Executive summary", "docx"),
            ],
        },
    ),
    (
        "exl",
        "EXL",
        "#EA580C",
        {
            "proposal": [
                ("Folder 2/EXL_FIS Managed Services RFP_EXL-1.pdf", "proposal-0.pdf", "Proposal — Part 1", "pdf"),
                ("Folder 2/EXL_FIS Managed Services RFP_EXL-2.pdf", "proposal-1.pdf", "Proposal — Part 2", "pdf"),
            ],
            "workbook": ("Folder 1/EXL_APPEND~1.XLS", "workbook.xls", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/EXL_Draft FIS SOW - EXL Comment.docx", "sow.docx", "SOW Redline", "docx"),
            "supplemental": [
                ("Folder 2/EXL_Response Guide.docx", "supplemental-0.docx", "Response guide", "docx"),
            ],
        },
    ),
    (
        "sutherland",
        "Sutherland",
        "#4B5563",
        {
            "proposal": ("Folder 2/Sutherland_Response to FIS (TSYS).pdf", "proposal.pdf", "Proposal", "pdf"),
            "workbook": ("Folder 1/Sutherland_Appendix B - TMS RFP - Sutherland Response to FIS.xlsx", "workbook.xlsx", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/Sutherland_Response to Appendix C - FIS SOW.docx", "sow.docx", "SOW Redline", "docx"),
            "supplemental": [
                ("Folder 2/Sutherland_Response Guide.docx", "supplemental-0.docx", "Response guide", "docx"),
            ],
        },
    ),
    (
        "ubiquity",
        "Ubiquity",
        "#DC2626",
        {
            "proposal": ("Folder 2/Ubiquity_FIS__Ubiquity_Proposal.pdf", "proposal.pdf", "Proposal", "pdf"),
            "workbook": ("Folder 1/Ubiquity_Pricing Response for FIS(2).xlsx", "workbook.xlsx", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/Ubiquity_Appendix C - Draft FIS SOW RF redliines CB.docx", "sow.docx", "SOW Redline", "docx"),
            "supplemental": [
                ("Folder 2/Ubiquity_Executive Summary_Ubiquity-FIS.pdf", "supplemental-0.pdf", "Executive summary", "pdf"),
                ("Folder 1/Ubiquity_Response_Vendor_RFP_Questionnaire_with_Fraud_Supplement_FINAL.xlsx", "supplemental-1.xlsx", "RFP questionnaire", "spreadsheet"),
                ("Folder 1/Ubiquity_Pricing Response for FIS.xlsx", "supplemental-2.xlsx", "Pricing response (alternate)", "spreadsheet"),
            ],
        },
    ),
    (
        "ibm",
        "IBM",
        "#1E40AF",
        {
            "proposal": ("Folder 2/IBM_FIS TMS Managed Services RFP Response_IBM_Mar 26.pdf", "proposal.pdf", "Proposal", "pdf"),
            "workbook": ("Folder 1/IBM_Appendix B - TMS RFP - Vendor Response Workbook_IBM 26-Mar-2026.xlsx", "workbook.xlsx", "Workbook", "spreadsheet"),
            "sow": ("Folder 3/IBM_Appendix C - Draft FIS SOW_IBM March 26.docx", "sow.docx", "SOW Redline", "docx"),
        },
    ),
]


def process_cognizant_sow(src: Path, vendor_dir: Path) -> dict:
    """Plain-text 'Docx' → sow.txt + kind text; real OOXML → sow.docx + kind docx."""
    ok, _ = safe_copy(src, vendor_dir / "_tmp_sow")
    tmp = vendor_dir / "_tmp_sow"
    if not ok:
        return doc_entry(
            kind="text",
            rel="cognizant/sow.txt",
            original_name=src.name,
            label="SOW Redline",
            missing=True,
        )
    if is_zip_docx(tmp):
        dest = vendor_dir / "sow.docx"
        shutil.move(tmp, dest)
        sz = dest.stat().st_size
        return doc_entry(
            kind="docx",
            rel="cognizant/sow.docx",
            original_name=src.name,
            label="SOW Redline",
            missing=False,
            bytes_=sz,
        )
    dest = vendor_dir / "sow.txt"
    shutil.move(tmp, dest)
    sz = dest.stat().st_size
    return doc_entry(
        kind="text",
        rel="cognizant/sow.txt",
        original_name=src.name,
        label="SOW Redline",
        missing=False,
        bytes_=sz,
    )


def process_vendor(vendor_id: str, display: str, color: str, spec: dict) -> dict:
    vendor_dir = PUBLIC_VENDOR / vendor_id
    entry: dict = {"id": vendor_id, "displayName": display, "color": color}

    # Proposal(s)
    prop = spec.get("proposal")
    if isinstance(prop, list):
        entry["proposal"] = []
        for tup in prop:
            rel_name = tup[1]
            src = ROOT / Path(tup[0])
            dest = vendor_dir / rel_name
            ok, sz = safe_copy(src, dest)
            entry["proposal"].append(
                doc_entry(
                    kind=tup[3],
                    rel=f"{vendor_id}/{rel_name}",
                    original_name=Path(tup[0]).name,
                    label=tup[2],
                    missing=not ok,
                    bytes_=sz,
                )
            )
    elif prop:
        tup = prop
        rel_name = tup[1]
        src = ROOT / Path(tup[0])
        dest = vendor_dir / rel_name
        ok, sz = safe_copy(src, dest)
        entry["proposal"] = doc_entry(
            kind=tup[3],
            rel=f"{vendor_id}/{rel_name}",
            original_name=Path(tup[0]).name,
            label=tup[2],
            missing=not ok,
            bytes_=sz,
        )

    # Workbook
    if "workbook" in spec:
        tup = spec["workbook"]
        rel_name = tup[1]
        src = ROOT / Path(tup[0])
        dest = vendor_dir / rel_name
        ok, sz = safe_copy(src, dest)
        entry["workbook"] = doc_entry(
            kind="spreadsheet",
            rel=f"{vendor_id}/{rel_name}",
            original_name=Path(tup[0]).name,
            label=tup[2],
            missing=not ok,
            bytes_=sz,
            sheet_names=[],
        )

    # SOW
    if "sow" in spec:
        if vendor_id == "cognizant":
            src = ROOT / Path(spec["sow"][0])
            vendor_dir.mkdir(parents=True, exist_ok=True)
            entry["sow"] = process_cognizant_sow(src, vendor_dir)
        else:
            tup = spec["sow"]
            if len(tup) == 4:
                rel_name, label, k = tup[1], tup[2], tup[3]
                src_path = tup[0]
            else:
                src_path, rel_name, label = tup[0], tup[1], tup[2]
                k = "docx"
            src = ROOT / Path(src_path)
            dest = vendor_dir / Path(rel_name).name
            ok, sz = safe_copy(src, dest)
            entry["sow"] = doc_entry(
                kind=k,
                rel=f'{vendor_id}/{dest.name}',
                original_name=Path(src_path).name,
                label=label,
                missing=not ok,
                bytes_=sz,
            )

    # Supplemental
    if spec.get("supplemental"):
        entry["supplemental"] = []
        for tup in spec["supplemental"]:
            rel_name = tup[1]
            src = ROOT / Path(tup[0])
            dest = vendor_dir / rel_name
            ok, sz = safe_copy(src, dest)
            entry["supplemental"].append(
                doc_entry(
                    kind=tup[3],
                    rel=f"{vendor_id}/{rel_name}",
                    original_name=Path(tup[0]).name,
                    label=tup[2],
                    missing=not ok,
                    bytes_=sz,
                    sheet_names=[],
                )
            )

    return entry


def sync_to_out():
    out = ROOT / "out"
    if not out.is_dir():
        return
    man_src = ROOT / "public" / "vendor-files-manifest.json"
    if man_src.is_file():
        shutil.copy2(man_src, out / "vendor-files-manifest.json")
    pv = ROOT / "public" / "vendor-files"
    if not pv.is_dir():
        return
    dest = out / "vendor-files"
    if dest.exists():
        try:
            shutil.rmtree(dest)
        except OSError as e:
            print(f"Note: could not remove {dest} ({e}); merging copy instead (OneDrive lock?)")
    shutil.copytree(pv, dest, dirs_exist_ok=True)
    print("Synced vendor-files + manifest to out/ (static export)")


def main():
    PUBLIC_VENDOR.mkdir(parents=True, exist_ok=True)
    vendors = {}
    for vendor_id, display, color, spec in BUILD:
        vendors[vendor_id] = process_vendor(vendor_id, display, color, spec)

    manifest = {
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "vendors": vendors,
    }
    man_path = ROOT / "public" / "vendor-files-manifest.json"
    man_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {man_path}")
    # Keep TypeScript fallback in sync (optional dev)
    data_manifest = ROOT / "src" / "data" / "vendor-files-manifest.json"
    data_manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {data_manifest}")
    sync_to_out()


if __name__ == "__main__":
    main()
