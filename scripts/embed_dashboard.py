"""Bundle portfolio, vendor JSON, and manifest into dashboard-right-here.embedded.html.

Run after extract (public/data/*.json). Safe for HTML: escapes '<' in JSON so </script> cannot appear.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MARKER = "<!--TMS_DASHBOARD_EMBED-->"


def _script_safe_json(obj) -> str:
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("<", "\\u003c")


def main() -> int:
    pub = BASE / "public" / "data"
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

    payload = {"portfolio": portfolio, "vendors": vendors, "manifest": manifest}
    script = f"<script>window.__TMS_DASHBOARD_EMBED__={_script_safe_json(payload)};</script>"

    tpl_path = BASE / "dashboard-right-here.html"
    tpl = tpl_path.read_text(encoding="utf-8")
    if MARKER not in tpl:
        print(f"Marker {MARKER!r} not found in {tpl_path.name}", file=sys.stderr)
        return 1
    out_path = BASE / "dashboard-right-here.embedded.html"
    out_path.write_text(tpl.replace(MARKER, script, 1), encoding="utf-8")
    print(f"Wrote {out_path.name} ({out_path.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
