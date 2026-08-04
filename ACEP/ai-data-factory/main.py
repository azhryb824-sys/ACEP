#!/usr/bin/env python3
"""ACEP AI Data Factory — CLI entry point."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running without pip install
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from acep_data_factory.core.pipeline import DataFactoryPipeline
from acep_data_factory.core.registry import GeneratorRegistry


def parse_args():
    p = argparse.ArgumentParser(description="ACEP AI Data Factory — synthetic engineering datasets")
    p.add_argument("--count", type=int, default=1000, help="Total samples to generate (100 to 10M)")
    p.add_argument("--output", type=str, default="datasets", help="Output root directory")
    p.add_argument("--language", choices=["en", "ar", "both"], default="both")
    p.add_argument("--generators", type=str, default="all", help="Comma-separated generator names or 'all'")
    p.add_argument("--formats", type=str, default="jsonl", help="jsonl,json,csv,md,sql,parquet,excel")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--no-benchmark", action="store_true")
    p.add_argument("--no-training-config", action="store_true")
    p.add_argument("--list-generators", action="store_true")
    return p.parse_args()


def main():
    args = parse_args()
    if args.list_generators:
        print("Available generators:")
        for name in GeneratorRegistry.names():
            print(f"  - {name}")
        return 0

    gens = None if args.generators == "all" else [g.strip() for g in args.generators.split(",")]
    formats = [f.strip() for f in args.formats.split(",")]

    pipeline = DataFactoryPipeline(
        output_root=Path(args.output),
        language=args.language,
        seed=args.seed,
    )

    print("=" * 50)
    print("  ACEP AI DATA FACTORY")
    print("=" * 50)
    print(f"  Samples: {args.count:,}")
    print(f"  Language: {args.language}")
    print(f"  Output: {args.output}")
    print("=" * 50)

    summary = pipeline.run(
        count=args.count,
        generators=gens,
        export_formats=formats,
        generate_benchmarks=not args.no_benchmark,
        generate_training_configs=not args.no_training_config,
    )

    print(f"\nDone - accepted: {summary['total_accepted']:,}, rejected: {summary['rejected']:,}")
    print(f"Output: {Path(args.output).resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
