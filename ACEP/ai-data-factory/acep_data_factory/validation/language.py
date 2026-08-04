"""Language quality heuristics."""

from __future__ import annotations

import re
from typing import List, Tuple

from acep_data_factory.core.sample import EngineeringSample

ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
LATIN_RE = re.compile(r"[A-Za-z]")


def validate_language(sample: EngineeringSample) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    text = sample.output
    if len(text) < 20:
        errors.append("Output too short")
    if sample.language == "ar" and not ARABIC_RE.search(text):
        errors.append("Expected Arabic content")
    if sample.language == "en" and not LATIN_RE.search(text):
        errors.append("Expected English content")
    if sample.language == "both" and not (ARABIC_RE.search(text) and LATIN_RE.search(text)):
        errors.append("Expected bilingual content")
    return len(errors) == 0, errors
