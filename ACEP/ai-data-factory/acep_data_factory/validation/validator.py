"""Sample validator orchestrator."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple

from acep_data_factory.core.sample import EngineeringSample
from acep_data_factory.validation.deduplication import DuplicateDetector
from acep_data_factory.validation.equations import validate_calculations
from acep_data_factory.validation.language import validate_language
from acep_data_factory.validation.units import validate_units


@dataclass
class ValidationResult:
    accepted: bool
    errors: List[str] = field(default_factory=list)


class SampleValidator:
    def __init__(self, check_duplicates: bool = True, check_language: bool = True):
        self.check_duplicates = check_duplicates
        self.check_language = check_language
        self.dedup = DuplicateDetector()
        self.stats = {"accepted": 0, "rejected": 0, "reasons": {}}

    def validate(self, sample: EngineeringSample) -> ValidationResult:
        errors: List[str] = []
        ok, unit_errors = validate_units(sample)
        errors.extend(unit_errors)
        ok2, calc_errors = validate_calculations(sample)
        errors.extend(calc_errors)
        if self.check_language:
            ok3, lang_errors = validate_language(sample)
            errors.extend(lang_errors)
        if self.check_duplicates:
            unique, reason = self.dedup.check(sample)
            if not unique:
                errors.append(reason)
        accepted = len(errors) == 0
        if accepted:
            self.stats["accepted"] += 1
        else:
            self.stats["rejected"] += 1
            for e in errors:
                self.stats["reasons"][e] = self.stats["reasons"].get(e, 0) + 1
        return ValidationResult(accepted=accepted, errors=errors)
