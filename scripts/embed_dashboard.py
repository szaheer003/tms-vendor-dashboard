"""Bundle portfolio, vendor JSON, and manifest into dashboard-right-here.embedded.html.

Run after extract (public/data/*.json). Safe for HTML: escapes '<' in JSON so </script> cannot appear.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any, Optional

BASE = Path(__file__).resolve().parent.parent
SRC_DATA = BASE / "src" / "data"
EXTRA_SYNC_NAMES = ("workshop1_memos.json", "idealRfpSubmission.json", "evaluatorScores.json")


def _sync_aux_dashboard_json_to_public(pub: Path) -> None:
    """Ensure public/data has the same auxiliary JSON as src/data (embed + static fetch)."""
    pub.mkdir(parents=True, exist_ok=True)
    for name in EXTRA_SYNC_NAMES:
        src = SRC_DATA / name
        if src.is_file():
            shutil.copy2(src, pub / name)


def _load_json_file(path: Path) -> Optional[Any]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
MARKER = "<!--TMS_DASHBOARD_EMBED-->"


def _script_safe_json(obj) -> str:
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("<", "\\u003c")


def _mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


# Aligns with scripts/import_folder8_scores.py pillar weights and radar scaling.
_SUB_TO_PILLAR: dict[str, str] = {
    "1.1": "commercial",
    "1.2": "commercial",
    "1.3": "commercial",
    "2.1": "operations",
    "2.2": "operations",
    "2.3": "operations",
    "3.1": "technology",
    "3.2": "technology",
    "3.3": "technology",
    "4.1": "migration",
    "4.2": "migration",
    "4.3": "migration",
    "5.1": "partnership",
    "5.2": "partnership",
    "5.3": "partnership",
}

_WEIGHTS = {
    "commercial": 0.225,
    "operations": 0.225,
    "technology": 0.225,
    "migration": 0.225,
    "partnership": 0.1,
}


def patch_portfolio_from_evaluator_scores(portfolio: dict, ev: dict | None) -> None:
    """Fill scorecard cells, composites, and radar from evaluatorScores.json (extract_tms resets these)."""
    if not ev or not isinstance(ev.get("scores"), dict):
        return
    sm = ev["scores"]
    sc = portfolio.get("scorecard") or {}
    col_order = list(sc.get("columnOrder") or [])
    if not col_order:
        col_order = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"]
    n_slots = int(ev.get("evaluatorSlotCount") or 12)
    dims = sc.get("dimensions") or []
    dim_avgs: dict[str, dict[str, float | None]] = {}

    for d in dims:
        sid = d.get("id")
        if not sid or not isinstance(sid, str):
            continue
        dim_avgs[sid] = {}
        for vid in col_order:
            vals: list[float] = []
            for i in range(n_slots):
                ekey = f"ev{i + 1}"
                row = (sm.get(vid) or {}).get(ekey) or {}
                x = row.get(sid)
                if x is not None and isinstance(x, (int, float)):
                    vals.append(float(x))
            dim_avgs[sid][vid] = round(_mean(vals), 3) if vals else None  # type: ignore[arg-type]
        d["scores"] = {vid: dim_avgs[sid].get(vid) for vid in col_order}

    pillar_avgs: dict[str, dict[str, float | None]] = {k: {} for k in _WEIGHTS}
    for vid in col_order:
        for pk in _WEIGHTS:
            subs = [s for s, p in _SUB_TO_PILLAR.items() if p == pk]
            nums = [
                float(dim_avgs[s][vid])
                for s in subs
                if s in dim_avgs and dim_avgs[s].get(vid) is not None
            ]
            pillar_avgs[pk][vid] = round(_mean(nums), 3) if nums else None  # type: ignore[arg-type]

    composite: dict[str, float | None] = {}
    for vid in col_order:
        acc = 0.0
        tw = 0.0
        for pk, w in _WEIGHTS.items():
            pav = pillar_avgs[pk].get(vid)
            if pav is not None:
                acc += w * pav
                tw += w
        composite[vid] = round(acc / tw, 3) if tw > 0 else None

    portfolio.setdefault("scorecard", sc)
    portfolio["scorecard"]["composite"] = composite
    if ev.get("source"):
        portfolio["scorecard"]["source"] = str(ev["source"])
        if ev.get("importedAt"):
            portfolio["scorecard"]["source"] += f" · Imported {str(ev['importedAt'])[:10]}."

    for v in portfolio.get("vendors", []):
        vid = v.get("id")
        if isinstance(vid, str) and vid in composite:
            v["composite"] = composite[vid]

    def scale_radar(x: float | None) -> float:
        if x is None:
            return 0.0
        return max(0.0, min(10.0, (float(x) - 1.0) / 8.0 * 10.0))

    field_sum = {k: 0.0 for k in _WEIGHTS}
    field_n = {k: 0 for k in _WEIGHTS}
    for vid in col_order:
        for pk in _WEIGHTS:
            pv = pillar_avgs[pk].get(vid)
            if pv is not None:
                field_sum[pk] += scale_radar(pv)
                field_n[pk] += 1

    portfolio.setdefault("radar", {})
    portfolio["radar"]["fieldAverage"] = {
        k: round(field_sum[k] / field_n[k], 3) if field_n[k] else 0.0 for k in _WEIGHTS
    }
    for rv in portfolio["radar"].get("vendors", []) or []:
        vid = rv.get("vendorId")
        if not isinstance(vid, str):
            continue
        rv["pillars"] = {k: scale_radar(pillar_avgs[k].get(vid)) for k in _WEIGHTS}


def main() -> int:
    pub = BASE / "public" / "data"
    _sync_aux_dashboard_json_to_public(pub)

    port_path = pub / "portfolio.json"
    if not port_path.exists():
        print("Missing public/data/portfolio.json — run: python scripts/extract_tms.py", file=sys.stderr)
        return 1
    portfolio = json.loads(port_path.read_text(encoding="utf-8"))
    vendors: dict[str, object] = {}
    for row in portfolio.get("vendors") or []:
        vid = row.get("id")
        if not vid:
            continue
        vpath = pub / f"vendor_{vid}.json"
        if not vpath.exists():
            print(f"Missing {vpath}", file=sys.stderr)
            return 1
        vendors[str(vid)] = json.loads(vpath.read_text(encoding="utf-8"))
    man_path = BASE / "public" / "vendor-files-manifest.json"
    if not man_path.exists():
        print(f"Missing {man_path}", file=sys.stderr)
        return 1
    manifest = json.loads(man_path.read_text(encoding="utf-8"))

    eval_path = pub / "evaluatorScores.json"
    if not eval_path.is_file():
        alt = BASE / "src" / "data" / "evaluatorScores.json"
        if alt.is_file():
            eval_path = alt
    evaluator_scores = None
    if eval_path.is_file():
        try:
            evaluator_scores = json.loads(eval_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"Warning: could not parse {eval_path}: {e}", file=sys.stderr)

    patch_portfolio_from_evaluator_scores(portfolio, evaluator_scores)

    workshop1_memos = _load_json_file(pub / "workshop1_memos.json") or _load_json_file(SRC_DATA / "workshop1_memos.json")
    ideal_rfp_submission = _load_json_file(pub / "idealRfpSubmission.json") or _load_json_file(
        SRC_DATA / "idealRfpSubmission.json"
    )

    # Keep on-disk JSON aligned with the embedded snapshot (extract_tms leaves composites null).
    try:
        (pub / "portfolio.json").write_text(json.dumps(portfolio, indent=2), encoding="utf-8")
        src_pf = BASE / "src" / "data" / "portfolio.json"
        src_pf.parent.mkdir(parents=True, exist_ok=True)
        src_pf.write_text(json.dumps(portfolio, indent=2), encoding="utf-8")
        sc_path = BASE / "src" / "data" / "scorecard.json"
        if sc_path.is_file():
            sc = json.loads(sc_path.read_text(encoding="utf-8"))
            sc["source"] = portfolio.get("scorecard", {}).get("source", sc.get("source"))
            sc["dimensions"] = portfolio.get("scorecard", {}).get("dimensions", sc.get("dimensions"))
            sc["composite"] = portfolio.get("scorecard", {}).get("composite", sc.get("composite"))
            sc_path.write_text(json.dumps(sc, indent=2), encoding="utf-8")
            (pub / "scorecard.json").write_text(json.dumps(sc, indent=2), encoding="utf-8")
        print("Updated portfolio.json (+ scorecard) on disk to match embedded evaluator merge.")
    except OSError as e:
        print(f"Note: could not write merged portfolio to disk ({e})", file=sys.stderr)

    payload = {
        "portfolio": portfolio,
        "vendors": vendors,
        "manifest": manifest,
        "evaluatorScores": evaluator_scores,
        "workshop1Memos": workshop1_memos,
        "idealRfpSubmission": ideal_rfp_submission,
    }
    n_memos = len(workshop1_memos) if isinstance(workshop1_memos, list) else 0
    print(
        f"Bundle: evaluatorScores={'yes' if evaluator_scores else 'no'}, "
        f"workshop1Memos={n_memos} vendor(s), idealRfpSubmission={'yes' if ideal_rfp_submission else 'no'}"
    )

    script = f"<script>window.__TMS_DASHBOARD_EMBED__={_script_safe_json(payload)};</script>"

    tpl_path = BASE / "dashboard-right-here.html"
    tpl = tpl_path.read_text(encoding="utf-8")
    if MARKER not in tpl:
        print(f"Marker {MARKER!r} not found in {tpl_path.name}", file=sys.stderr)
        return 1
    out_path = BASE / "dashboard-right-here.embedded.html"
    html_out = tpl.replace(MARKER, script, 1)
    out_path.write_text(html_out, encoding="utf-8")
    standalone = BASE / "TMS-Dashboard-standalone.html"
    standalone.write_text(html_out, encoding="utf-8")
    print(f"Wrote {out_path.name} ({out_path.stat().st_size // 1024} KB)")
    print(f"Wrote {standalone.name} (same embedded bundle)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
