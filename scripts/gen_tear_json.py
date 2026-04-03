"""One-off helper: emit TEAR object as JSON for dashboard-right-here.html."""
import json
from pathlib import Path

TEAR = {
    "cognizant": {
        "h": "Cognizant",
        "c": "#1E3A5F",
        "b": (
            "Lowest 5-year operating TCV in the field (~$499.9M) with a credible FIS/TSYS delivery story, "
            "but savings credibility hinges on client consent for offshore, a 29% AI/digital overlay on FIS platforms, "
            "and a 100%* certainty qualifier that is not unpacked in the workbook. The proposal's ~$25M investment narrative "
            "does not reconcile cleanly to workbook one-time lines—workshop time should reconcile dollars and commitments "
            "before treating synergy timing as bankable."
        ),
        "a": [
            "Fixed quarterly fees with COLA bundled (US/CA/PH/UK stated; NL/DE not stated in COLA rows).",
            "Efficiency: US&CA labor arbitrage expressed as 20%–25% (range, not a midpoint); AI/digital 29%; productivity 12%; NL/DE/UK AI cells blank.",
            "Migration: 5 waves / 12 months with large early rebadge (workbook Tab 7.0).",
        ],
        "s": [
            "Deep card-ops vocabulary; end-state footprint spans required geographies with first-party delivery emphasis in materials.",
            "Governance responses are explicit enough to count (Commit / Partial / Cannot) for workshop debate—not all vendors provide that clarity.",
            "Commercial shape is front-loaded then declining—pattern consistent with transition then run-rate efficiency in modeled years.",
        ],
        "r": [
            "Investment story vs workbook one-time tech/migration lines (~$5.2M excl. absorbed training per brief) creates diligence exposure on who funds what.",
            "Asterisked 100% certainty without disclosed conditions is a red-flag for a CFO-grade model.",
        ],
        "w": [
            "Reconcile proposal investment pages to Appendix B rows 74/76/77 and retained-FIS costs in Y1.",
            "What has to be true in client consent letters for the offshore mix to be contractually binding Day 1?",
            "How is AI measured monthly if NL/DE/UK overlays are not quantified?",
        ],
        "g": ["Strong commercial finalist if governance and migration mechanics survive reference checks and client-consent feasibility."],
    },
    "genpact": {
        "h": "Genpact",
        "c": "#059669",
        "b": (
            "Most aggressive modeled labor-arbitrage position with the lowest 5-year operating TCV among full Appendix B "
            "respondents (~$425.3M on 20 quarters) and a 7-year envelope (~$505.2M) that must be evaluated on a like-for-like "
            "term basis. Certainty is uniformly TBD in Tab 9.0 while productivity levers are large—this is exactly the profile "
            "where workshop scoring should separate ‘modeled savings’ from ‘contractual certainty.’"
        ),
        "a": [
            "7-year economics include continuation quarters beyond Year 5 (workbook row 131 extended columns).",
            "COLA exclusive by country with US/CA/UK/NL/DE at 3% and PH/India at 5% (verify exact rows in 6.0).",
            "Large one-time gross with vendor tech credit offset (brief cites ~$58.4M gross and ~$23.3M credit).",
        ],
        "s": [
            "Existing FIS rebadge scale (1,600+ FTE, high acceptance) reduces execution imagination risk versus cold-start peers.",
            "Joint-strongest Tab 5.0 governance posture with IBM in commit counting (verify in workbook).",
        ],
        "r": [
            "TBD certainty across geographies alongside very high arbitrage/productivity math is the core tension for Workshop 1 model review.",
            "Term extension changes NPV and comparison to 5-year bids—normalize before ranking.",
        ],
        "w": [
            "What contractual instrument replaces ‘TBD’ on certainty, and on what timeline?",
            "Walk quarter-by-quarter from gross one-time to net and tie to cash timing in Y1–Y2.",
        ],
        "g": ["Default shortlist candidate on relationship + transformation scale; commercial diligence must stress-test certainty language."],
    },
    "exl": {
        "h": "EXL",
        "c": "#EA580C",
        "b": (
            "Sharp India-led unit economics (offshore rate card populated; CS India $11.95/hr in brief) with a TCV (~$477.0M) "
            "that is not apples-to-apples until you add back excluded severance, CCaaS, and interpret COLA on actuals. "
            "Training and dual-run one-time lines are material—do not let a slim operating line hide transition cash."
        ),
        "a": [
            "9-month India migration posture and analytics-heavy operating model (per proposal themes).",
            "NA efficiency claims vs EMEA negative arb in Tab 9.0 (costs can rise in EMEA under their math—validate).",
        ],
        "s": ["Analytics and automation narrative is differentiated; offshore rate transparency exists where others declined cards."],
        "r": [
            "Onshore rate cells blank—cannot benchmark hybrid voice models without follow-up.",
            "Baseline mismatch (~$841M vs ~$750.6M) impairs direct savings comparability to FIS framing.",
        ],
        "w": [
            "Provide loaded all-in comparison including severance, CCaaS, and COLA scenarios.",
            "How does EMEA negative arb net against NA savings under client constraints?",
        ],
        "g": ["Include if offshore-first economics survive adjusted TCO; insist on binding rate card completeness."],
    },
    "ibm": {
        "h": "IBM",
        "c": "#1E40AF",
        "b": (
            "Fixed-price managed services envelope at ~$460.0M operating TCV on Tab 6.0 row 119 with separate IBM investment lines "
            "that must not be netted against operating rows. COLA at 0% pending mutual agreement means the number is a negotiating floor, "
            "not a ceiling; combined with non-binding proposal language and blank Tab 9.0 efficiency, this is a technology-led bet that still needs commercial hardening."
        ),
        "a": [
            "Rate card declined; economics are not reconstructable from hourly tiles.",
            "FIS transition one-time (~$15.1M) and IBM investment (~$11.3M) sit outside row 119 operating stream.",
        ],
        "s": ["AI and governance story tests well on rubric; Tab 5.0 commit posture is joint-strong with Genpact."],
        "r": [
            "Efficiency blank shifts all transformation proof to statements of direction until populated.",
            "Non-binding framing in proposal must be converted to executable SOW economics before sign.",
        ],
        "w": [
            "Provide filled Tab 9.0 with measurable levers tied to price holds.",
            "What is the COLA cap/floor mechanism post ‘mutual agreement’?",
        ],
        "g": ["Technology co-lead candidate if legal/commercial can convert positioning into enforceable outcomes."],
    },
    "sutherland": {
        "h": "Sutherland",
        "c": "#4B5563",
        "b": (
            "Highest modeled precision on migration (21 waves) and rich rate-card transparency, with operating TCV ~$559.7M. "
            "Certainty percentages in Tab 9.0 are the lowest among detailed submissions—pair that with aggressive offshore targets "
            "in regulated markets and pressure-test how much is modeled vs committed."
        ),
        "a": [
            "COLA baked into trajectory with differentiated US/UK/NL/DE vs PH/India/DR escalators (verify 6.0).",
            "Workforce stability metrics (attrition band) are a differentiator on paper—validate with references.",
        ],
        "s": [
            "Payments issuer references and granular migration plan improve operational inspectability.",
            "Rate card includes US/NL/DE/India exemplars useful for sanity-checking loaded costs.",
        ],
        "r": ["Low certainty vs peers changes how much of the curve is bankable for FY28 synergy math."],
        "w": [
            "Map each wave to revenue recognition and regulatory touchpoints.",
            "Which SLAs move from variance targets to contractual floors?",
        ],
        "g": ["Strong diligence candidate when migration credibility matters as much as headline TCV."],
    },
    "ubiquity": {
        "h": "Ubiquity",
        "c": "#DC2626",
        "b": (
            "Continuity and stabilization play, not a synergy bid: TCV ~$938.8M with costs rising each year as rates compound on static productivity. "
            "Only Tab 6.0 exists in the pricing workbook—most diligence tabs are absent—so comparison on governance, migration, and efficiency is inherently asymmetric. "
            "Treat exclusivity and tech migration payments as structural deal terms, not savings."
        ),
        "a": [
            "COLA capped as lesser of in-country inflation or 3% (favorable cap vs field).",
            "Rates entered as text strings in places—parsed for dashboard but require legal confirmation.",
        ],
        "s": ["Cap-friendly COLA language and questionnaire supplements on fraud/ops topics add context where workbook is thin."],
        "r": ["Above-baseline economics and missing standard tabs increase integration risk if cost reduction is the primary objective."],
        "w": [
            "Complete Appendix B tabs or accept asymmetric scoring on operational risk.",
            "What efficiency path—if any—would align to $40M FY28 synergy targets?",
        ],
        "g": ["Keep in set only if strategic continuity outweighs cost-out; otherwise deprioritize for pure synergy chase."],
    },
}

if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / ".tear_embed.json"
    out.write_text(json.dumps(TEAR, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(out)
