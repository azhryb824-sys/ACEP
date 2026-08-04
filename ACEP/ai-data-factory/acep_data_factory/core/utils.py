"""Random utilities and ID generation."""

from __future__ import annotations

import hashlib
import math
import random
import uuid
from datetime import date, timedelta
from typing import Any, Iterable, List, Sequence, TypeVar

T = TypeVar("T")


def rand_float(lo: float, hi: float) -> float:
    return random.uniform(lo, hi)


def rand_int(lo: int, hi: int) -> int:
    return random.randint(lo, hi)


def pick(seq: Sequence[T]) -> T:
    return random.choice(seq)


def pick_many(seq: Sequence[T], n: int) -> List[T]:
    n = min(n, len(seq))
    return random.sample(list(seq), n)


def rnorm(mean: float, std: float) -> float:
    u = random.random()
    v = random.random()
    while u == 0:
        u = random.random()
    while v == 0:
        v = random.random()
    z = math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v)
    return mean + std * z


def jitter(value: float, pct: float) -> float:
    return max(0.0, value * (1 + rnorm(0, pct / 3)))


def round2(value: float) -> float:
    return round(value, 2)


def sample_id(prefix: str = "ACEP") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def project_id(index: int) -> str:
    return f"SA-R{index:05d}"


def content_hash(payload: dict) -> str:
    text = "|".join(f"{k}={payload.get(k)}" for k in sorted(payload.keys()))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def random_date(start_year: int = 2020, end_year: int = 2026) -> str:
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    delta = (end - start).days
    return (start + timedelta(days=rand_int(0, delta))).isoformat()


def bilingual(en: str, ar: str, lang: str) -> str:
    if lang == "ar":
        return ar
    if lang == "both":
        return f"{en}\n{ar}"
    return en


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def batch_iter(items: Iterable[Any], size: int):
    batch: List[Any] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch
