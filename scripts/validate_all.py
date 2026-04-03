#!/usr/bin/env python3
"""
Validate vendor workbooks (Folder 1) against dashboard JSON in src/data (or TMS_VALIDATE_DATA).
Exits with code 1 if any check status is FAIL. Writes validation-output/validation_report.{json,txt}

Run: python scripts/validate_all.py
Module: from validate_all import main; main()
"""
from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import extract_tms as et  # noqa: E402

DATA_DIR = Path(os.environ.get("TMS_VALIDATE_DATA", str(ROOT / "src" / "data")))
REPORT_DIR = ROOT / "validation-output"
SRC_DIR = ROOT / "src"

VENDOR_ORDER = ("cognizant", "exl", "genpact", "ibm", "sutherland", "ubiquity")

EXPECTED_TCV_ROW: dict[str, int] = {
    "cognizant": 120,
    "exl": 113,
    "genpact": 131,
    "ibm": 119,
    "sutherland": 120,
    "ubiquity": 0,
}

# Workbook-as-opened (data_only): EXL/Sutherland store quarterly fees already in $M in C:V.
DIVIDE_MILLION: dict[str, bool] = {
    "cognizant": True,
    "exl": False,
    "genpact": False,
    "ibm": False,
    "sutherland": False,
    "ubiquity": True,
}

# Ground truth: 20 quarters in $M (rounded reference values)
_QU: dict[str, tuple[float, ...]] = {
    "cognizant": (
        21.74, 21.74, 21.74, 21.74, 31.02, 31.02, 31.02, 31.02, 27.88, 27.88, 27.88, 27.88,
        22.16, 22.16, 22.16, 22.16, 22.18, 22.18, 22.18, 22.18,
    ),
    "exl": (
        48.66, 46.93, 36.34, 31.25, 26.36, 23.07, 20.73, 19.77, 19.31, 18.86, 18.58, 18.58,
        18.57, 18.57, 18.57, 18.57, 18.57, 18.57, 18.57, 18.57,
    ),
    "genpact": (
        41.97, 43.97, 44.22, 42.15, 43.63, 28.44, 19.74, 17.26, 14.52, 14.03, 13.47, 13.02,
        12.72, 12.3, 11.36, 11.36, 10.45, 10.45, 10.13, 10.13,
    ),
    "ibm": (
        2.2, 9.6, 24.45, 31.02, 33.06, 30.69, 29.9, 29.12, 27.18, 25.7, 24.85, 23.99,
        23.02, 22.11, 21.55, 21.14, 20.7, 20.21, 19.79, 19.71,
    ),
    "sutherland": (
        50.7, 50.7, 50.7, 50.7, 31.77, 31.77, 31.77, 31.77, 20.16, 20.16, 20.16, 20.16,
        18.94, 18.94, 18.94, 18.94, 18.34, 18.34, 18.34, 18.34,
    ),
}

EXPECTED_ANNUAL: dict[str, tuple[float, ...]] = {
    "cognizant": (86.96, 124.08, 111.5, 88.63, 88.72),
    "exl": (163.18, 89.93, 75.32, 74.29, 74.29),
    "genpact": (172.3, 109.07, 55.04, 47.73, 41.16),
    "ibm": (67.27, 122.77, 101.72, 87.82, 80.41),
    "sutherland": (202.8, 127.07, 80.65, 75.77, 73.37),
    "ubiquity": (176.82, 182.12, 187.59, 193.21, 199.01),
}

EXPECTED_TCV: dict[str, tuple[float, float]] = {
    "cognizant": (499.89, 0.1),
    "exl": (477.0, 0.2),
    "genpact": (425.3, 0.1),
    "ibm": (460.0, 0.15),
    "sutherland": (559.66, 0.15),
    "ubiquity": (938.75, 0.1),
}

COLA_EXPECT: dict[str, dict[str, str]] = {
    "cognizant": {"us": "3%", "ca": "4%", "ph": "4%", "uk": "3%", "nl": "—", "de": "—"},
    "exl": {"us": "4%", "ca": "4%", "ph": "4%", "uk": "actuals", "nl": "actuals", "de": "actuals"},
    "genpact": {"us": "3%", "ca": "3%", "ph": "5%", "uk": "3%", "nl": "3%", "de": "3%"},
    "ibm": {"us": "0%", "ca": "0%", "ph": "0%", "uk": "0%", "nl": "0%", "de": "0%"},
    "sutherland": {"us": "2.5%", "ca": "2.5%", "ph": "4%", "uk": "2.5%", "nl": "2.5%", "de": "2.5%"},
}

RATE_EXPECT_CS: dict[str, dict[str, Optional[float]]] = {
    "cognizant": {"on": 41.0, "near": 24.0, "off": 18.5, "emea": 38.0},
    "exl": {"on": None, "near": None, "off": 11.95, "emea": None},
    "genpact": {"on": 48.48, "near": None, "off": 16.68, "emea": 42.07},
    "ibm": {"on": None, "near": None, "off": None, "emea": None},
    "sutherland": {"on": 49.61, "near": 15.38, "off": 13.92, "emea": 42.63},
}

TEMPLATE_MARKERS = (
    "complete column d",
    "for rows asking for years of experience",
    "enter the number",
)

BANNED_IN_TEXT = ("undefined", "nan%", "nan}")


def _norm_pct(s: str) -> str:
    t = (s or "").strip().replace("\u2014", "—")
    return t


def _close_pct(a: str, b: str) -> bool:
    aa, bb = _norm_pct(a).lower(), _norm_pct(b).lower()
    if bb in ("—", "n/a", ""):
        return aa in ("—", "n/a", "", "blank")
    return aa == bb or (bb == "actuals" and "actual" in aa)


def parse_money_cell(s: str) -> Optional[float]:
    if not s:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", ""))
    if not m:
        return None
    return float(m.group(1))


def find_cs_live_row(rate_card: list[dict]) -> Optional[dict]:
    for r in rate_card:
        lab = (r.get("label") or "").lower()
        if "live agent" in lab and "canonical" in lab:
            return r
        if "live agent" in lab:
            return r
    for r in rate_card:
        if "multilingual" in (r.get("label") or "").lower() and "canonical" in (r.get("label") or "").lower():
            return r
    return rate_card[0] if rate_card else None


def near_num(a: float, b: float, tol: float) -> bool:
    return abs(a - b) <= tol + 1e-9


class ValidationRun:
    def __init__(self) -> None:
        self.results: list[dict[str, Any]] = []
        self.critical: list[str] = []

    def add(
        self,
        check_id: str,
        desc: str,
        status: str,
        expected: Any = None,
        actual: Any = None,
        detail: str = "",
        critical: bool = False,
    ) -> None:
        self.results.append(
            {
                "check_id": check_id,
                "description": desc,
                "expected": expected,
                "actual": actual,
                "status": status,
                "detail": detail,
            }
        )
        if status == "FAIL" and critical:
            self.critical.append(f"{check_id} {desc}: {detail}")


def load_vendor_json(vid: str) -> dict:
    p = DATA_DIR / f"vendor_{vid}.json"
    return json.loads(p.read_text(encoding="utf-8"))


def load_portfolio() -> dict:
    return json.loads((DATA_DIR / "portfolio.json").read_text(encoding="utf-8"))


def open_vendor_wb(vid: str):
    wbs = et.open_all_vendor_workbooks()
    return wbs.get(vid)


def workbook_quarters_scaled(vid: str, ws) -> tuple[list[Optional[float]], bool, int]:
    """Returns (20 quarters in $M, divide_million_used, row_used)."""
    if vid == "ubiquity":
        q: list[Optional[float]] = []
        for c in range(3, 23):
            a, b = ws.cell(110, c).value, ws.cell(111, c).value
            sa = float(a) if isinstance(a, (int, float)) and not (isinstance(a, float) and math.isnan(a)) else 0.0
            sb = float(b) if isinstance(b, (int, float)) and not (isinstance(b, float) and math.isnan(b)) else 0.0
            q.append((sa + sb) / 1e6 if (sa or sb) else None)
        return q, True, 110
    row = et.find_total_annual_cost_row(ws) or EXPECTED_TCV_ROW[vid]
    q = et.quarterly_values(ws, row)
    nz = next((x for x in q if x is not None), None)
    div = et.infer_scale_million(nz) if nz is not None else DIVIDE_MILLION[vid]
    out = [((x / 1e6) if div and x is not None else x) for x in q]
    return out, div, row


def run_checks(run: ValidationRun, vendors_json: dict[str, dict], portfolio: dict) -> None:
    # Phase 2 financial
    for vid in VENDOR_ORDER:
        if vid == "ubiquity":
            continue
        wb = open_vendor_wb(vid)
        if wb is None:
            run.add("2.0", f"Workbook missing — {vid}", "FAIL", vid, None, "Could not open workbook", critical=True)
            continue
        ws = wb["6.0  Pricing"]
        exp_row = EXPECTED_TCV_ROW[vid]
        found = et.find_total_annual_cost_row(ws)
        if found != exp_row:
            run.add(
                "2.1",
                f"TCV row — {vid}",
                "FAIL" if found is None else "WARNING",
                exp_row,
                found,
                "Row mismatch" if found else "Not found",
                critical=found is None,
            )
        q_ws, div, row_used = workbook_quarters_scaled(vid, ws)
        div_ok = div == DIVIDE_MILLION[vid]
        run.add("2.2", f"Unit detection — {vid}", "PASS" if div_ok else "FAIL", DIVIDE_MILLION[vid], div, "", critical=True)

        ref = _QU[vid]
        q_fail: list[str] = []
        for i, (a, b) in enumerate(zip(q_ws, ref)):
            if a is None:
                q_fail.append(f"Q{i+1} missing")
            elif not near_num(a, b, 0.02):
                q_fail.append(f"Q{i+1} got {round(a, 2)} want {b}")
        run.add(
            "2.3",
            f"All 20 quarters ($M) — {vid}",
            "PASS" if not q_fail else "FAIL",
            "20q spec",
            q_fail[:4] if q_fail else "ok",
            "; ".join(q_fail[:6]),
            critical=bool(q_fail),
        )

        years, tcv = et.annualize_quarters(q_ws)
        ann_ref = EXPECTED_ANNUAL[vid]
        for yi, (got, want) in enumerate(zip(years[:5], ann_ref)):
            g = got if got is not None else 0.0
            st = "PASS" if near_num(g, want, 0.06) else "FAIL"
            run.add("2.4", f"Annual Y{yi+1} — {vid}", st, want, round(g, 2) if got is not None else None, "", critical=st == "FAIL")

        tref, ttol = EXPECTED_TCV[vid]
        st = "PASS" if near_num(tcv, tref, ttol) else "FAIL"
        run.add("2.5", f"TCV — {vid}", st, tref, round(tcv, 2), "", critical=st == "FAIL")

        sum_y = sum(y for y in years[:5] if y is not None)
        st = "PASS" if near_num(sum_y, tcv, 0.11) else "FAIL"
        run.add("2.6", f"Sum Y1–Y5 = TCV — {vid}", st, tcv, sum_y, "", critical=st == "FAIL")

        pj = vendors_json[vid]["pricing"]
        st = "PASS" if near_num(float(pj["tcvM"]), tcv, 0.15) else "FAIL"
        run.add("2.json", f"JSON TCV matches workbook — {vid}", st, tcv, pj["tcvM"], "", critical=st == "FAIL")

        for yi in range(5):
            jv = pj["years"][yi].get("valueM")
            yv = years[yi]
            if yv is None and jv is None:
                continue
            if jv is None or yv is None:
                run.add("2.jsony", f"JSON annual Y{yi+1} — {vid}", "FAIL", yv, jv, "", critical=True)
            elif not near_num(float(jv), yv, 0.08):
                run.add("2.jsony", f"JSON annual Y{yi+1} — {vid}", "FAIL", yv, jv, "", critical=True)

    # Ubiquity 110+111
    wb = open_vendor_wb("ubiquity")
    if wb:
        ws = wb["6.0  Pricing"]
        q_ws, div, _ = workbook_quarters_scaled("ubiquity", ws)
        y_vals = [44.2, 45.53, 46.9, 48.3, 49.75]
        uq_fail: list[str] = []
        for yi, yq in enumerate(y_vals):
            chunk = q_ws[yi * 4 : (yi + 1) * 4]
            for j, g in enumerate(chunk):
                if g is None or not near_num(g, yq, 0.02):
                    uq_fail.append(f"Y{yi+1}Q{j+1}")
        run.add(
            "2.3u",
            "Ubiquity 20 quarters (NA+EMEA)",
            "PASS" if not uq_fail else "FAIL",
            "5y x4 identical bands",
            uq_fail[:6] if uq_fail else "ok",
            ",".join(uq_fail),
            critical=bool(uq_fail),
        )
        tcv = sum(x for x in q_ws if x is not None)
        tref, ttol = EXPECTED_TCV["ubiquity"]
        run.add("2.5u", "TCV Ubiquity", "PASS" if near_num(tcv, tref, ttol) else "FAIL", tref, round(tcv, 2), "", critical=True)

    # Genpact Y6–Y7
    vg = vendors_json.get("genpact", {})
    pr = vg.get("pricing", {})
    for lab, exp in (("y6M", 40.31), ("y7M", 39.59), ("tcv7M", 505.2)):
        av = pr.get(lab)
        st = "PASS" if av is not None and near_num(float(av), exp, 0.05) else "FAIL"
        run.add("2.7", f"Genpact {lab}", st, exp, av, "", critical=st == "FAIL")

    # IBM investment vs TCV
    wb = open_vendor_wb("ibm")
    if wb:
        ws = wb["6.0  Pricing"]
        q = et.quarterly_values(ws, 119)
        tcv119 = sum(x for x in q if x is not None)
        inv = sum(et.sum_onetime_row(ws, r) or 0 for r in range(68, 74))
        inv_m = inv / 1e6
        run.add("2.8", "IBM Row 119 sum ($M)", "PASS" if near_num(tcv119, 459.99, 0.02) else "FAIL", 459.99, tcv119, "", True)
        run.add("2.8b", "IBM investment rows 68–73 ($M)", "PASS" if near_num(inv_m, 11.30, 0.05) else "FAIL", 11.30, round(inv_m, 2), "", True)
        json_tcv = float(vendors_json["ibm"]["pricing"]["tcvM"])
        net_mistake = tcv119 - inv_m
        bad = near_num(json_tcv, net_mistake, 0.25)
        run.add(
            "2.8c",
            "IBM JSON TCV is operating row (not net of investment)",
            "FAIL" if bad else "PASS",
            "~460 not net",
            json_tcv,
            f"netting would be ~{net_mistake:.2f}M",
            critical=bad,
        )

    # Sutherland TCV in JSON
    ts = float(vendors_json["sutherland"]["pricing"]["tcvM"])
    st = "PASS" if 559.0 <= ts <= 560.5 else "FAIL"
    run.add("2.9", "Sutherland TCV displayed", st, "~559.66M", ts, "", critical=st == "FAIL")

    # JSON flags Ubiquity caveat (rate-card / baseline)
    fl = " ".join(vendors_json["ubiquity"].get("flags") or []).lower()
    run.add(
        "2.10",
        "Ubiquity caveat in JSON flags",
        "WARNING" if "baseline" not in fl and "synergy" not in fl else "PASS",
        "baseline/synergy context",
        fl[:200],
        "",
    )

    # Phase 3 COLA JSON vs expected
    for vid, exp in COLA_EXPECT.items():
        ca = vendors_json.get(vid, {}).get("colaAssumptions") or {}
        if not ca:
            run.add("3.1", f"COLA extracted — {vid}", "FAIL", exp, ca, "missing colaAssumptions", True)
            continue
        bad = False
        for k, ve in exp.items():
            av = str(ca.get(k, ""))
            if not _close_pct(av, ve):
                bad = True
                run.add("3.1", f"COLA {k} — {vid}", "FAIL", ve, av, "", True)
        if not bad:
            run.add("3.1", f"COLA all — {vid}", "PASS", "see spec", ca.get("summary", ""), "")

    ubi = vendors_json.get("ubiquity", {}).get("colaAssumptions") or {}
    u_ok = all("≤" in str(ubi.get(x, "")) or "3%" in str(ubi.get(x, "")) for x in ("us", "ca", "uk"))
    run.add("3.1u", "Ubiquity COLA capped ≤3%", "PASS" if u_ok else "WARNING", "≤3%", ubi, "")

    # Phase 4 rates (JSON)
    for vid, want in RATE_EXPECT_CS.items():
        if vid == "ibm":
            continue
        rc = vendors_json[vid]["rateCard"]
        row = find_cs_live_row(rc)
        if not row:
            run.add("4.1", f"CS rate row — {vid}", "FAIL", want, None, "", True)
            continue
        for key, lab in (("on", "onshore"), ("near", "nearshore"), ("off", "offshore"), ("emea", "emeaOnshore")):
            exp = want.get(key)
            raw = row.get(lab) or ""
            if exp is None:
                if raw and raw not in ("0", "0.00", "") and not raw.startswith("—"):
                    num = parse_money_cell(raw)
                    if num and num > 1:
                        run.add("4.1", f"CS {key} should be blank — {vid}", "WARNING", "—", raw, "")
            else:
                num = parse_money_cell(str(raw)) or float("nan")
                st = "PASS" if near_num(num, exp, 0.06) else "FAIL"
                run.add("4.1", f"CS {key} — {vid}", st, exp, raw, "", critical=st == "FAIL")
        for lab in ("onshore", "nearshore", "offshore", "emeaOnshore"):
            t = row.get(lab) or ""
            if re.search(r"\d+\.\d{3,}", t):
                run.add("4.2", f"Rate decimals — {vid}", "FAIL", "max 2dp", t, "", True)

    ibm_rc = json.dumps(vendors_json["ibm"].get("rateCard") or []).lower()
    ibm_blob = ibm_rc + " " + " ".join(vendors_json["ibm"].get("flags") or []).lower()
    has_note = "fixed" in ibm_blob or "declin" in ibm_blob or "managed" in ibm_blob or "fixed-price" in ibm_blob
    run.add("4.3", "IBM rate narrative", "WARNING" if not has_note else "PASS", "fixed-price / declined", "", "")

    # Phase 5 efficiency (workbook Tab 9.0)
    for vid, ws_name in (
        ("cognizant", "9.0 Client EfficiencyAssumption"),
        ("exl", "9.0 Client EfficiencyAssumption"),
        ("genpact", "9.0 Client EfficiencyAssumption"),
        ("ibm", "9.0 Client EfficiencyAssumption"),
        ("sutherland", "9.0 Client EfficiencyAssumption"),
    ):
        wb = open_vendor_wb(vid)
        if not wb or ws_name not in wb.sheetnames:
            run.add("5.1", f"Efficiency tab — {vid}", "FAIL", ws_name, "missing", "", True)
            continue
        tbl = et.extract_efficiency_table(wb[ws_name])
        if vid == "ibm":
            rows = tbl.get("rows") or []

            def _ibm_cell_placeholder(c: Any) -> bool:
                t = str(c or "").strip().lower()
                if not t:
                    return True
                return "vendor to provide" in t or t in ("n/a", "tbd", "—", "na")

            bad_val = any(
                any(not _ibm_cell_placeholder(c) for c in (r.get("cells") or {}).values()) for r in rows
            )
            if bad_val:
                run.add("5.1", "IBM efficiency data cells", "FAIL", "blank/placeholder only", "numeric text?", "", True)
            else:
                run.add("5.1", "IBM efficiency", "PASS", "vendor to provide / blank", "", "")
            continue
        txt = json.dumps(tbl).lower()
        if vid == "cognizant" and "22.5%" in txt and "20-25" not in txt:
            run.add("5.1c", "Cognizant labor arb range", "FAIL", "20-25%", "22.5%", "", False)

    # Phase 6 one-time
    wb = open_vendor_wb("exl")
    if wb:
        ws = wb["6.0  Pricing"]
        tr = (et.sum_onetime_row(ws, 71) or 0) / 1e6
        dr = (et.sum_onetime_row(ws, 72) or 0) / 1e6
        cr_raw = et.sum_onetime_row(ws, 73) or 0
        cr = cr_raw / 1e6
        run.add("6.1", "EXL training $M", "PASS" if near_num(tr, 46.33, 0.15) else "FAIL", 46.33, round(tr, 2), "", True)
        run.add("6.1", "EXL dual run $M", "PASS" if near_num(dr, 13.07, 0.15) else "FAIL", 13.07, round(dr, 2), "", True)
        run.add(
            "6.1",
            "EXL investment credit $M",
            "PASS" if near_num(cr, -19.25, 0.15) else "FAIL",
            -19.25,
            round(cr, 2),
            "",
            True,
        )
        for ln in (vendors_json["exl"].get("oneTimeLines") or []):
            if ln.get("label") == "Training":
                tv = (ln.get("sumQuarterlyUsd") or 0) / 1e6
                run.add("6.json", "JSON EXL training", "PASS" if near_num(tv, 46.33, 0.15) else "FAIL", 46.33, tv, "", True)

    # Phase 7 governance — JSON must match workbook Tab 5.0 count_governance()
    for vid in ("cognizant", "exl", "genpact", "ibm", "sutherland"):
        wb = open_vendor_wb(vid)
        if not wb or "5.0  Technology Solution" not in wb.sheetnames:
            continue
        exp = et.count_governance(wb["5.0  Technology Solution"])
        g = vendors_json[vid].get("governance") or {}
        cc, pp, nn = g.get("commit", 0), g.get("partial", 0), g.get("cannotCommit", 0)
        ok = cc == exp["commit"] and pp == exp["partial"] and nn == exp["cannotCommit"]
        run.add(
            "7.1",
            f"Governance counts — {vid}",
            "PASS" if ok else "FAIL",
            (exp["commit"], exp["partial"], exp["cannotCommit"]),
            (cc, pp, nn),
            "",
            not ok,
        )

    ug = vendors_json["ubiquity"].get("governance") or {}
    ubad = bool(ug.get("commit") or ug.get("partial") or ug.get("cannotCommit"))
    run.add("7.1u", "Ubiquity no governance grid", "FAIL" if ubad else "PASS", "empty", ug, "", ubad)

    exl_gov = vendors_json["exl"].get("governance") or {}
    exl_wip = bool(vendors_json["exl"].get("governanceWip"))
    run.add(
        "7.exl",
        "EXL governance WIP",
        "WARNING" if exl_wip else "PASS",
        "governanceWip flag" if exl_wip else "complete (see 7.1)",
        exl_gov,
        "",
    )

    # Phase 8 migration notes
    notes = {k: (vendors_json[k].get("migrationNotes") or "").lower() for k in VENDOR_ORDER}
    if "15" not in notes["ibm"] or "wave" not in notes["ibm"]:
        run.add("8.1", "IBM ~15 waves", "WARNING", "15 waves", notes["ibm"][:80], "")
    if "21" not in notes["sutherland"]:
        run.add("8.1", "Sutherland 21 waves", "WARNING", "21", notes["sutherland"][:80], "")
    if re.search(r"\b5\b.*wave", notes["cognizant"]) or "5 wave" in notes["cognizant"] or "wave" in notes["cognizant"]:
        run.add("8.1", "Cognizant waves mentioned", "PASS", ">=5", "present", "")

    if len(notes["ubiquity"]) > 20 and "not submitted" not in notes["ubiquity"] and "7.0" not in notes["ubiquity"]:
        run.add("8.1u", "Ubiquity migration absent", "WARNING", "not submitted", "check notes", "")

    # Phase 9 drill text
    for vid in VENDOR_ORDER:
        for block in vendors_json[vid].get("drilldownSnippets") or []:
            for sn in block.get("snippets") or []:
                tx = (sn.get("text") or "").lower()
                if any(m in tx for m in TEMPLATE_MARKERS):
                    run.add("9.1", f"Template answer? — {vid}", "FAIL", "vendor answer", sn.get("text", "")[:80], "", True)

    texts: dict[str, list[str]] = defaultdict(list)
    for vid in VENDOR_ORDER:
        for block in vendors_json[vid].get("drilldownSnippets") or []:
            for sn in block.get("snippets") or []:
                t = (sn.get("text") or "").strip()
                if len(t.split()) >= 40 and t.lower() != "no response provided.":
                    texts[t].append(vid)
    for t, ids in texts.items():
        if len(set(ids)) >= 2:
            run.add("9.4", "Identical long response across vendors", "FAIL", ids[0], f"{len(ids)} vendors", t[:60], True)

    # Phase 10 scoring
    sc = portfolio.get("scorecard", {})
    nums = []
    for d in sc.get("dimensions", []):
        for vid, val in (d.get("scores") or {}).items():
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                nums.append((d.get("id"), vid, val))
    run.add("10.1", "No numeric scorecard cells", "FAIL" if nums else "PASS", "none", nums[:5], "", bool(nums))
    for vid, c in (sc.get("composite") or {}).items():
        if isinstance(c, (int, float)):
            run.add("10.2", f"Composite numeric — {vid}", "FAIL", None, c, "", True)

    # 10.3 names
    bad_pat = re.compile(
        r"\b(blake|simon|suneel|walter|prakash)\b",
        re.I,
    )
    hits = []
    for root, _, files in os.walk(SRC_DIR):
        for fn in files:
            if fn.endswith((".tsx", ".ts", ".jsx", ".js")):
                fp = Path(root) / fn
                try:
                    s = fp.read_text(encoding="utf-8", errors="ignore")
                except OSError:
                    continue
                m = bad_pat.search(s)
                if m:
                    hits.append(f"{fp}:{m.group(0)}")
    run.add("10.3", "Evaluator de-identified", "FAIL" if hits else "PASS", "no names", hits[:8], "", bool(hits))

    if "1-5" in (sc.get("source") or "").lower() and "1/3/5/9" not in json.dumps(sc).lower():
        run.add("10.4", "Scoring methodology scale", "WARNING", "1/3/5/9", sc.get("source"), "")

    src_sc = ""
    p_sc = ROOT / "src" / "app" / "scorecard" / "page.tsx"
    p_meth = ROOT / "src" / "components" / "ScoringMethodologyPanel.tsx"
    if p_sc.is_file():
        src_sc = p_sc.read_text(encoding="utf-8")
    src_meth = p_meth.read_text(encoding="utf-8") if p_meth.is_file() else ""
    rubric_src = src_sc + src_meth
    if (
        "1 = Does not meet" in rubric_src
        or "Does not meet" in rubric_src
        or "Fundamental gaps" in rubric_src
        or "1 / 3 / 7 / 9" in rubric_src
    ):
        run.add("10.4b", "Rubric text present", "PASS", "rubric", "found", "")
    else:
        run.add("10.4b", "Rubric text present", "WARNING", "rubric", "not spotted", "")

    if "April 2, 2026" in src_sc or "Apr 2, 2026" in src_sc:
        run.add("10.5", "Target date April 3 2026", "WARNING", "remove Apr 2", "Apr 2 still in scorecard page", "")
    elif "April 3, 2026" in src_sc or "Apr 3, 2026" in src_sc:
        run.add("10.5", "Target date April 3 2026", "PASS", "Apr 3", "", "")
    else:
        run.add("10.5", "Target date April 3 2026", "WARNING", "Apr 3 2026", "not in scorecard page", "")

    # Phase 11 admin — Ubiquity only 6.0 complete (JSON)
    ubt = {x["tab"]: x["status"] for x in vendors_json["ubiquity"]["adminTabs"]}
    u_extra = [t for t, st in ubt.items() if "6.0" not in t and st in ("complete", "partial")]
    run.add("11.1u", "Ubiquity tab matrix (only 6.0)", "FAIL" if u_extra else "PASS", "missing except 6.0", u_extra, "", bool(u_extra))
    if ubt.get("6.0  Pricing") not in ("complete", "partial"):
        run.add("11.1u2", "Ubiquity 6.0 present", "FAIL", "complete", ubt.get("6.0  Pricing"), "", True)

    # Phase 12–13 caveat file
    cave_path = ROOT / "src" / "lib" / "vendorCaveats.ts"
    cave = cave_path.read_text(encoding="utf-8") if cave_path.is_file() else ""
    nb_miss = "non-binding" not in cave.lower()
    run.add("12.1", "IBM non-binding in vendorCaveats", "FAIL" if nb_miss else "PASS", "non-binding", "missing" if nb_miss else "ok", "", nb_miss)
    u_miss = "not a synergy" not in cave.lower() and "synergy bid" not in cave.lower()
    run.add("12.2", "Ubiquity baseline caveat in vendorCaveats", "FAIL" if u_miss else "PASS", "synergy/baseline", "", "", u_miss)

    # 13.1 TCV portfolio vs vendor JSON
    pmap = {v["id"]: v["tcvM"] for v in portfolio["vendors"]}
    for vid in VENDOR_ORDER:
        a, b = pmap.get(vid), vendors_json[vid]["pricing"]["tcvM"]
        st = "PASS" if a is not None and b is not None and near_num(float(a), float(b), 0.02) else "FAIL"
        run.add("13.1", f"Portfolio TCV = vendor JSON — {vid}", st, b, a, "", critical=st == "FAIL")

    # Phase 14 banned substrings in string fields only (exclude JSON null token)
    def walk_str(o: Any) -> list[str]:
        out: list[str] = []
        if isinstance(o, dict):
            for v in o.values():
                out.extend(walk_str(v))
        elif isinstance(o, list):
            for x in o:
                out.extend(walk_str(x))
        elif isinstance(o, str):
            out.append(o.lower())
        return out

    blob = " ".join(walk_str(vendors_json))
    for sub in BANNED_IN_TEXT:
        if sub in blob:
            run.add("14.1", f"Banned string in vendor text: {sub}", "FAIL", "absent", "found", "", True)

    # 14.2 critical fields
    exl_ot = {x.get("label"): x.get("sumQuarterlyUsd") for x in (vendors_json["exl"].get("oneTimeLines") or [])}
    run.add("14.2", "EXL training in JSON", "FAIL" if not exl_ot.get("Training") else "PASS", "present", str(exl_ot.get("Training")), "", not bool(exl_ot.get("Training")))


def write_reports(run: ValidationRun) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    n_pass = sum(1 for r in run.results if r["status"] == "PASS")
    n_fail = sum(1 for r in run.results if r["status"] == "FAIL")
    n_warn = sum(1 for r in run.results if r["status"] == "WARNING")
    summary = (
        f"Validation at {ts}: {n_pass} passed, {n_fail} failed, {n_warn} warnings. "
        f"Critical failures: {len(run.critical)}."
    )
    doc = {
        "timestamp": ts,
        "total_checks": len(run.results),
        "passed": n_pass,
        "failed": n_fail,
        "warnings": n_warn,
        "results": run.results,
        "critical_failures": run.critical,
        "summary": summary,
    }
    (REPORT_DIR / "validation_report.json").write_text(json.dumps(doc, indent=2), encoding="utf-8")
    lines = [summary, ""]
    for r in run.results:
        lines.append(f"[{r['status']}] {r['check_id']} {r['description']}")
        if r.get("detail"):
            lines.append(f"    {r['detail']}")
    (REPORT_DIR / "validation_report.txt").write_text("\n".join(lines), encoding="utf-8")


def main(argv: Optional[list[str]] = None) -> int:
    os.chdir(ROOT)
    if not DATA_DIR.is_dir():
        print("DATA_DIR missing:", DATA_DIR)
        return 1
    run = ValidationRun()
    vendors_json = {v: load_vendor_json(v) for v in VENDOR_ORDER}
    portfolio = load_portfolio()
    run_checks(run, vendors_json, portfolio)
    write_reports(run)
    n_pass = sum(1 for r in run.results if r["status"] == "PASS")
    n_fail = sum(1 for r in run.results if r["status"] == "FAIL")
    n_warn = sum(1 for r in run.results if r["status"] == "WARNING")
    print()
    print("  " + "=" * 39)
    print("  VALIDATION COMPLETE")
    print("  " + "=" * 39)
    print(f"  Total checks:     {len(run.results)}")
    print(f"  Passed:           {n_pass}")
    print(f"  Failed:           {n_fail}")
    print(f"  Warnings:         {n_warn}")
    print("  " + "=" * 39)
    print("  Critical failures:", run.critical if run.critical else "[]")
    print("  " + "=" * 39)
    return 1 if n_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
