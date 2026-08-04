"""Main data factory pipeline."""

from __future__ import annotations

import json
import random
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from acep_data_factory.benchmark.benchmark_generator import generate_benchmark
from acep_data_factory.core.constants import DATASET_FOLDERS, GENERATOR_TO_FOLDER
from acep_data_factory.core.registry import GeneratorRegistry
from acep_data_factory.core.sample import EngineeringSample
from acep_data_factory.export.exporters import (
    sample_to_record,
    write_csv,
    write_excel,
    write_json,
    write_jsonl,
    write_markdown,
    write_parquet,
    write_sql,
)
from acep_data_factory.logging.quality_logger import QualityLogger
from acep_data_factory.training.config_generator import write_all_training_configs
from acep_data_factory.validation.validator import SampleValidator


class DataFactoryPipeline:
    """Orchestrates generation, validation, splitting, export, and training prep."""

    def __init__(
        self,
        output_root: Path,
        language: str = "both",
        seed: Optional[int] = 42,
        train_ratio: float = 0.8,
        val_ratio: float = 0.1,
    ):
        self.output_root = Path(output_root)
        self.language = language
        self.seed = seed
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        if seed is not None:
            random.seed(seed)

    def run(
        self,
        count: int = 1000,
        generators: Optional[List[str]] = None,
        export_formats: Optional[List[str]] = None,
        generate_benchmarks: bool = True,
        generate_training_configs: bool = True,
    ) -> dict:
        gens = generators or GeneratorRegistry.names()
        formats = export_formats or ["jsonl"]
        log_dir = self.output_root / "logs"
        logger = QualityLogger(log_dir)
        validator = SampleValidator()

        samples_by_folder: Dict[str, List[EngineeringSample]] = defaultdict(list)
        per_gen = max(1, count // len(gens))

        for gen_name in gens:
            generator = GeneratorRegistry.create(gen_name, seed=self.seed, language=self.language)
            logger.report.generators.append(gen_name)
            for i in range(per_gen):
                sample = generator.generate_one(i)
                result = validator.validate(sample)
                record = sample_to_record(sample)
                logger.log_sample(sample.id, gen_name, result.accepted, result.errors)
                logger.report.generated += 1
                if result.accepted:
                    folder = GENERATOR_TO_FOLDER.get(gen_name, "engineering_llm")
                    samples_by_folder[folder].append(sample)
                    logger.report.accepted += 1
                else:
                    logger.log_rejected(record, result.errors)
                    logger.report.rejected += 1

        logger.report.validation_stats = validator.stats
        for folder in DATASET_FOLDERS:
            if folder not in samples_by_folder:
                samples_by_folder[folder] = []

        summary = {"folders": {}, "total_accepted": 0}
        for folder, samples in samples_by_folder.items():
            if not samples:
                continue
            summary["total_accepted"] += len(samples)
            summary["folders"][folder] = self._export_folder(folder, samples, formats)

        if generate_training_configs:
            for folder in summary["folders"]:
                cfg_dir = self.output_root / "datasets" / folder / "training_configs"
                write_all_training_configs(cfg_dir, str(self.output_root / "datasets" / folder))

        if generate_benchmarks:
            bench_stats = generate_benchmark(self.output_root / "datasets" / "benchmark")
            summary["benchmark"] = bench_stats

        report_path = logger.finalize()
        summary["quality_report"] = str(report_path)
        summary["generated"] = logger.report.generated
        summary["rejected"] = logger.report.rejected
        (self.output_root / "run_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        return summary

    def _split(self, samples: List[EngineeringSample]):
        random.shuffle(samples)
        n = len(samples)
        train_end = int(n * self.train_ratio)
        val_end = train_end + int(n * self.val_ratio)
        return samples[:train_end], samples[train_end:val_end], samples[val_end:]

    def _export_folder(self, folder: str, samples: List[EngineeringSample], formats: List[str]) -> dict:
        out = self.output_root / "datasets" / folder
        out.mkdir(parents=True, exist_ok=True)
        train, val, test = self._split(samples)
        splits = {"training": train, "validation": val, "test": test}
        stats = {"total": len(samples), "train": len(train), "val": len(val), "test": len(test)}

        for split_name, split_samples in splits.items():
            records = [sample_to_record(s) for s in split_samples]
            write_jsonl(out / f"{split_name}.jsonl", records)

        metadata = {
            "name": folder,
            "domain": folder.replace("_ai", ""),
            "language": self.language,
            "generators": sorted({s.generator for s in samples}),
            "dataset_types": sorted({s.dataset_type for s in samples}),
            "splits": stats,
        }
        (out / "metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
        (out / "statistics.json").write_text(
            json.dumps(
                {
                    **stats,
                    "by_generator": _count_by(samples, "generator"),
                    "by_domain": _count_by(samples, "domain"),
                    "by_difficulty": _count_by(samples, "difficulty"),
                },
                indent=2,
            ),
            encoding="utf-8",
        )

        all_records = [sample_to_record(s) for s in samples]
        if "json" in formats:
            write_json(out / "full.json", all_records)
        if "csv" in formats:
            write_csv(out / "full.csv", all_records)
        if "md" in formats or "markdown" in formats:
            write_markdown(out / "full.md", all_records)
        if "sql" in formats:
            write_sql(out / "full.sql", f"acep_{folder}", all_records)
        if "parquet" in formats:
            try:
                write_parquet(out / "full.parquet", all_records)
            except ImportError:
                pass
        if "excel" in formats:
            try:
                write_excel(out / "full.xlsx", all_records)
            except ImportError:
                pass

        return stats


def _count_by(samples: Iterable[EngineeringSample], field: str) -> dict:
    counts: dict = {}
    for s in samples:
        key = getattr(s, field)
        counts[key] = counts.get(key, 0) + 1
    return counts
