"""
Resolve vendor proposal PDFs under Folder 2 when filenames change between uploads.

Used by extract_tms.py (PDF text match for drill-down) and copy_vendor_files.py (manifest + public copies).
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional


def _folder2(root: Path) -> Path:
    return root / "Folder 2"


def _pdfs(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(folder.glob("*.pdf"), key=lambda p: p.name.lower())


def _rel_root(root: Path, p: Path) -> str:
    return p.relative_to(root).as_posix()


def _score_cognizant_pdf(p: Path) -> tuple[int, str]:
    n = p.name.lower()
    s = 0
    if "one page" in n or ("summary" in n and "response guide" in n):
        s -= 30
    if "proposal" in n or "presentation" in n or "partnership" in n:
        s += 20
    if "workshop" in n:
        s += 8
    return (s, n)


def resolve_proposal_pdf_tuples_for_copy(
    root: Path, vendor_id: str
) -> Optional[list[tuple[str, str, str, str]]]:
    """
    Returns list of (relative_path_from_root, dest_name, label, kind) with kind='pdf',
    or None to fall back to caller defaults / missing handling.
    Single-proposal vendors: list of one tuple. EXL: two tuples when two PDFs found.
    """
    f2 = _folder2(root)
    if vendor_id == "cognizant":
        cands = [p for p in _pdfs(f2) if "cognizant" in p.name.lower()]
        if not cands:
            return None
        # Prefer revised workshop/presentation decks over older static filenames when both exist.
        cands.sort(key=lambda p: (-_score_cognizant_pdf(p)[0], p.name.lower()))
        p = cands[0]
        return [(_rel_root(root, p), "proposal.pdf", "Proposal", "pdf")]

    if vendor_id == "sutherland":
        for name in (
            "Sutherland_Response to FIS (TSYS).pdf",
            "Sutherland_Response to_FIS (TSYS).pdf",
            "Sutherland_response to FIS-updated March 30, 2026.pdf",
        ):
            hit = f2 / name
            if hit.is_file():
                return [(f"Folder 2/{hit.name}", "proposal.pdf", "Proposal", "pdf")]
        cands = [p for p in _pdfs(f2) if "sutherland" in p.name.lower()]
        if not cands:
            return None

        def score_sut(p: Path) -> tuple[int, str]:
            n = p.name.lower()
            s = 0
            if "response guide" in n:
                s -= 25
            if "response" in n or "updated" in n or "tsys" in n:
                s += 10
            return (s, n)

        cands.sort(key=lambda p: (-score_sut(p)[0], p.name.lower()))
        p = cands[0]
        return [(_rel_root(root, p), "proposal.pdf", "Proposal", "pdf")]

    if vendor_id == "genpact":
        legacy = f2 / "Genpact_FIS - TMS RFP G Proposal - 20 pager.pdf"
        if legacy.is_file():
            return [(f"Folder 2/{legacy.name}", "proposal.pdf", "Proposal", "pdf")]
        cands = [p for p in _pdfs(f2) if "genpact" in p.name.lower() and "exec" not in p.name.lower()]
        if not cands:
            return None

        def score_g(p: Path) -> tuple[int, str]:
            n = p.name.lower()
            s = 0
            if "20 pager" in n or "proposal" in n:
                s += 15
            return (s, n)

        cands.sort(key=lambda p: (-score_g(p)[0], p.name.lower()))
        p = cands[0]
        return [(_rel_root(root, p), "proposal.pdf", "Proposal", "pdf")]

    if vendor_id == "exl":
        p1 = f2 / "EXL_FIS Managed Services RFP_EXL-1.pdf"
        p2 = f2 / "EXL_FIS Managed Services RFP_EXL-2.pdf"
        out: list[tuple[str, str, str, str]] = []
        if p1.is_file():
            out.append((f"Folder 2/{p1.name}", "proposal-0.pdf", "Proposal — Part 1", "pdf"))
        if p2.is_file():
            out.append((f"Folder 2/{p2.name}", "proposal-1.pdf", "Proposal — Part 2", "pdf"))
        if out:
            return out
        cands = [p for p in _pdfs(f2) if "exl" in p.name.lower() and "guide" not in p.name.lower()]
        if len(cands) >= 2:
            cands.sort(key=lambda p: p.name.lower())
            return [
                (_rel_root(root, cands[0]), "proposal-0.pdf", "Proposal — Part 1", "pdf"),
                (_rel_root(root, cands[1]), "proposal-1.pdf", "Proposal — Part 2", "pdf"),
            ]
        if len(cands) == 1:
            return [(_rel_root(root, cands[0]), "proposal.pdf", "Proposal", "pdf")]
        return None

    if vendor_id == "ubiquity":
        legacy = f2 / "Ubiquity_FIS__Ubiquity_Proposal.pdf"
        if legacy.is_file():
            return [(f"Folder 2/{legacy.name}", "proposal.pdf", "Proposal", "pdf")]
        cands = [p for p in _pdfs(f2) if "ubiquity" in p.name.lower()]
        cands = [p for p in cands if "executive" not in p.name.lower() and "summary" not in p.name.lower()]
        if not cands:
            cands = [p for p in _pdfs(f2) if "ubiquity" in p.name.lower()]
        if not cands:
            return None

        def score_u(p: Path) -> tuple[int, str]:
            n = p.name.lower()
            s = 0
            if "proposal" in n:
                s += 15
            if "executive" in n:
                s -= 10
            return (s, n)

        cands.sort(key=lambda p: (-score_u(p)[0], p.name.lower()))
        p = cands[0]
        return [(_rel_root(root, p), "proposal.pdf", "Proposal", "pdf")]

    if vendor_id == "ibm":
        legacy = f2 / "IBM_FIS TMS Managed Services RFP Response_IBM_Mar 26.pdf"
        if legacy.is_file():
            return [(f"Folder 2/{legacy.name}", "proposal.pdf", "Proposal", "pdf")]
        cands = [p for p in _pdfs(f2) if "ibm" in p.name.lower()]
        if not cands:
            return None
        cands.sort(key=lambda p: p.name.lower())
        p = cands[0]
        return [(_rel_root(root, p), "proposal.pdf", "Proposal", "pdf")]

    return None


def proposal_paths_for_extraction(root: Path, vendor_id: str) -> list[tuple[Path, str, Optional[int]]]:
    """
    Absolute Path, manifest-style fileName, proposalPart index for multi-part PDFs (EXL).
    Used by extract_tms linked-document enrichment.
    """
    tuples = resolve_proposal_pdf_tuples_for_copy(root, vendor_id)
    if not tuples:
        return []
    out: list[tuple[Path, str, Optional[int]]] = []
    for i, (rel, _dest, _label, _kind) in enumerate(tuples):
        p = (root / rel).resolve()
        part: Optional[int] = None
        if vendor_id == "exl" and len(tuples) > 1:
            part = i
        out.append((p, p.name, part))
    return out
