"""Duplicate detection."""

from __future__ import annotations

from typing import Set, Tuple

from acep_data_factory.core.sample import EngineeringSample


class DuplicateDetector:
    def __init__(self):
        self._seen: Set[str] = set()

    def check(self, sample: EngineeringSample) -> Tuple[bool, str]:
        fp = sample.fingerprint()
        if fp in self._seen:
            return False, "duplicate_fingerprint"
        self._seen.add(fp)
        return True, ""

    @property
    def count(self) -> int:
        return len(self._seen)
