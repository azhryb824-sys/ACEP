"""Unit validation for engineering samples."""

from __future__ import annotations

import re
from typing import List, Tuple

from acep_data_factory.core.constants import VALID_UNITS
from acep_data_factory.core.sample import EngineeringSample

UNIT_PATTERN = re.compile(r"\b(\d+(?:\.\d+)?)\s*(m2|m3|m\b|mm|cm|ton|kg|kN|MPa|kVA|kW|SAR|no|each|L|gal|months?|days?)\b", re.IGNORECASE)


def validate_units(sample: EngineeringSample) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    text = f"{sample.instruction} {sample.input} {sample.output}"
    for match in UNIT_PATTERN.finditer(text):
        unit = match.group(2)
        normalized = unit.lower().rstrip(".")
        if normalized in {"m", "sar", "no", "each", "l", "gal", "month", "months", "day", "days"}:
            continue
        if unit not in VALID_UNITS and normalized not in {u.lower() for u in VALID_UNITS}:
            errors.append(f"Unknown unit: {unit}")
    for key, unit in sample.units.items():
        if unit and unit not in VALID_UNITS:
            errors.append(f"Invalid declared unit for {key}: {unit}")
    return len(errors) == 0, errors
