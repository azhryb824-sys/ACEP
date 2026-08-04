"""Benchmark and evaluation dataset generation."""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import List

from acep_data_factory.core.registry import GeneratorRegistry
from acep_data_factory.export.exporters import sample_to_record, write_jsonl


def generate_benchmark(output_dir: Path, per_category: int = 50, seed: int = 42) -> dict:
    random.seed(seed)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    stats = {}

    def collect(kind: str, difficulty: str = "medium") -> List[dict]:
        gen = GeneratorRegistry.create("prompt", seed=seed, language="both")
        records = []
        for i in range(per_category):
            sample = gen.generate_one(i)
            sample.difficulty = difficulty
            sample.metadata["benchmark_kind"] = kind
            records.append(sample_to_record(sample))
        return records

    edge = collect("edge_case", "hard")
    failure = collect("failure_case", "expert")
    adversarial = collect("adversarial", "expert")

    for name, data in [("evaluation", edge), ("benchmark", edge + failure), ("edge_cases", edge), ("failure_cases", failure), ("adversarial_cases", adversarial)]:
        path = output_dir / f"{name}.jsonl"
        write_jsonl(path, data)
        stats[name] = len(data)

    (output_dir / "benchmark_metadata.json").write_text(
        json.dumps({"seed": seed, "per_category": per_category, "stats": stats}, indent=2),
        encoding="utf-8",
    )
    return stats
