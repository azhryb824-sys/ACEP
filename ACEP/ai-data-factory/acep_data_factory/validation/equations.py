"""Numerical consistency validation."""

from __future__ import annotations

from typing import List, Tuple

from acep_data_factory.core.sample import EngineeringSample


def validate_calculations(sample: EngineeringSample) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    for calc in sample.calculations:
        if "formula" in calc and "subtotal_sar" in calc:
            continue
        if "risk_score" in calc and "probability" not in calc:
            continue
        if "total_sar" in calc and "formula" in calc:
            continue
        if "factored_kN" in calc:
            continue
        if "component" in calc:
            pct_sum = sum(c.get("pct", 0) for c in sample.calculations if "pct" in c)
            if sample.calculations and abs(pct_sum - 1.0) > 0.01:
                errors.append(f"Cost component percentages sum to {pct_sum}, expected 1.0")
            break
    if sample.output.strip() == "":
        errors.append("Empty output")
    if (sample.instruction.strip() + sample.input.strip()) == "":
        errors.append("Empty prompt")
    return len(errors) == 0, errors
