#!/usr/bin/env python3
"""Train ACEP research models on a reproducible one-million-project corpus.

The generated records are synthetic engineering-prior scenarios. They exercise
geometry semantics and cross-engine consistency, but they are not a substitute
for licensed, independently reviewed completed-project data.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import os
import platform
import sys
import time
import io
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, Tuple

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "packages" / "ai-engine" / "model-training" / "project-archetypes.json"
DEFAULT_ARTIFACT = ROOT / "models" / "registry" / "candidates" / "acep-million-synthetic-v2.json"
DEFAULT_REPORT = ROOT / "docs" / "governance" / "ACEP_MILLION_SYNTHETIC_TRAINING.md"
DEFAULT_OUTPUT = ROOT / ".runtime" / "model-training" / "acep-million-synthetic-v2"

TARGETS = (
    "costSar",
    "durationDays",
    "concreteM3",
    "steelTon",
    "blocksM2",
    "hvacTR",
    "electricalKVA",
    "waterLpd",
    "riskScore",
    "expectedDefects",
)

MAPE_TARGETS = set(TARGETS) - {"riskScore"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--records", type=int, default=1_000_000, help="Exact number of training project records")
    parser.add_argument("--holdout", type=int, default=50_000, help="Independent test records")
    parser.add_argument("--calibration", type=int, default=35_000, help="Separate interval calibration records")
    parser.add_argument("--model-id", default="acep-million-synthetic-v2")
    parser.add_argument("--shard-size", type=int, default=100_000)
    parser.add_argument("--seed", type=int, default=20260916)
    parser.add_argument("--ridge", type=float, default=0.01)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--artifact", type=Path, default=DEFAULT_ARTIFACT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--force", action="store_true", help="Permit replacement of files in the exact output directory")
    parser.add_argument("--no-record-files", action="store_true", help="Train without persisting compressed record shards")
    args = parser.parse_args()
    if not 1_000 <= args.records <= 10_000_000:
        parser.error("--records must be between 1,000 and 10,000,000")
    if not 1_000 <= args.holdout <= 1_000_000:
        parser.error("--holdout must be between 1,000 and 1,000,000")
    if not 1_000 <= args.calibration <= 1_000_000:
        parser.error("--calibration must be between 1,000 and 1,000,000")
    if not 1_000 <= args.shard_size <= 250_000:
        parser.error("--shard-size must be between 1,000 and 250,000")
    return args


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def safe_write_text(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(value, encoding="utf-8")
    os.replace(temporary, path)


def logit(values: np.ndarray) -> np.ndarray:
    bounded = np.clip(values, 1e-6, 1 - 1e-6)
    return np.log(bounded / (1 - bounded))


def sigmoid(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, -40, 40)
    return 1 / (1 + np.exp(-clipped))


def feature_names(config: dict) -> list[str]:
    base = [
        "intercept",
        "logGrossArea",
        "logLandArea",
        "floors",
        "basements",
        "buildings",
        "logCapacity",
        "complexity",
        "footprintShare",
        "landRatio",
        "cityCostIndex",
        "climateIndex",
        "finishCostIndex",
        "finishDurationIndex",
        "finishDefectIndex",
        "methodCostIndex",
        "methodDurationIndex",
        "methodRiskIndex",
        "areaComplexityInteraction",
        "areaFloorsInteraction",
        "isLinear",
        "isExisting",
    ]
    base.extend(f"type:{item['key']}" for item in config["projectTypes"])
    families = sorted({item["family"] for item in config["projectTypes"]})
    base.extend(f"family:{name}" for name in families)
    base.extend(f"city:{name}" for name in config["cities"])
    base.extend(f"finish:{name}" for name in config["finishes"])
    base.extend(f"method:{name}" for name in config["methods"])
    return base


class CorpusGenerator:
    def __init__(self, config: dict, seed: int):
        self.config = config
        self.seed = seed
        self.types = config["projectTypes"]
        self.cities = list(config["cities"])
        self.finishes = list(config["finishes"])
        self.methods = list(config["methods"])
        self.families = sorted({item["family"] for item in self.types})
        self.names = feature_names(config)
        self.type_index = {item["key"]: index for index, item in enumerate(self.types)}
        self.family_index = {name: index for index, name in enumerate(self.families)}

    def generate(self, start: int, count: int, seed_offset: int = 0) -> Tuple[np.ndarray, np.ndarray, dict]:
        rng = np.random.default_rng(self.seed + seed_offset + start * 17)
        row_ids = np.arange(start, start + count, dtype=np.int64)
        type_ids = row_ids % len(self.types)
        city_ids = rng.integers(0, len(self.cities), size=count)
        finish_ids = rng.integers(0, len(self.finishes), size=count)
        method_ids = rng.integers(0, len(self.methods), size=count)
        for type_index, profile in enumerate(self.types):
            mask = type_ids == type_index
            compatibility = self.config.get("compatibility", {}).get(profile["family"])
            if compatibility:
                finish_ids[mask] = rng.choice([self.finishes.index(name) for name in compatibility["finishes"]], int(mask.sum()))
                method_ids[mask] = rng.choice([self.methods.index(name) for name in compatibility["methods"]], int(mask.sum()))

        min_area = np.array([self.types[index]["area"][0] for index in type_ids], dtype=np.float64)
        max_area = np.array([self.types[index]["area"][1] for index in type_ids], dtype=np.float64)
        gross_area = np.exp(np.log(min_area) + rng.random(count) * (np.log(max_area) - np.log(min_area)))

        floor_min = np.array([self.types[index]["floors"][0] for index in type_ids], dtype=np.int32)
        floor_max = np.array([self.types[index]["floors"][1] for index in type_ids], dtype=np.int32)
        floors = floor_min + np.floor(rng.random(count) * (floor_max - floor_min + 1)).astype(np.int32)
        floors = np.maximum(floors, 1)

        family_values = np.array([self.types[index]["family"] for index in type_ids])
        multi_floor = np.isin(family_values, ["building", "industrial", "existing", "other"])
        footprint = np.where(multi_floor, gross_area / floors, gross_area)
        land_factor = np.where(
            np.isin(family_values, ["linear", "site", "utility"]),
            rng.uniform(1.0, 1.8, count),
            rng.uniform(1.15, 4.5, count),
        )
        land_area = footprint * land_factor

        basement_probability = np.where(multi_floor, np.clip((floors - 1) / 35, 0.03, 0.65), 0.0)
        basements = rng.binomial(3, basement_probability).astype(np.int32)
        buildings = 1 + rng.binomial(5, np.where(np.isin(family_values, ["site", "industrial"]), 0.28, 0.08)).astype(np.int32)

        complexity_base = np.array([self.types[index]["complexity"] for index in type_ids], dtype=np.float64)
        complexity = np.clip(complexity_base + rng.normal(0, 0.45, count), 1, 10)
        capacity_density = np.array([self.types[index]["capacity"] for index in type_ids], dtype=np.float64)
        capacity = np.maximum(1, gross_area * capacity_density * rng.lognormal(0, 0.16, count))

        city_cost = np.array([self.config["cities"][self.cities[index]]["costIndex"] for index in city_ids])
        climate = np.array([self.config["cities"][self.cities[index]]["climateIndex"] for index in city_ids])
        finish_cost = np.array([self.config["finishes"][self.finishes[index]]["cost"] for index in finish_ids])
        finish_duration = np.array([self.config["finishes"][self.finishes[index]]["duration"] for index in finish_ids])
        finish_defects = np.array([self.config["finishes"][self.finishes[index]]["defects"] for index in finish_ids])
        method_cost = np.array([self.config["methods"][self.methods[index]]["cost"] for index in method_ids])
        method_duration = np.array([self.config["methods"][self.methods[index]]["duration"] for index in method_ids])
        method_risk = np.array([self.config["methods"][self.methods[index]]["risk"] for index in method_ids])

        base_cost = np.array([self.types[index]["costPerM2"] for index in type_ids])
        base_duration = np.array([self.types[index]["durationMonths"] for index in type_ids])
        area_mid = np.sqrt(min_area * max_area)
        scale = np.maximum(gross_area / area_mid, 0.02)

        cost = (
            gross_area * base_cost * city_cost * finish_cost * method_cost
            * (1 + 0.028 * (complexity - 5) + 0.035 * basements + 0.012 * np.sqrt(np.maximum(floors - 1, 0)))
            * rng.lognormal(0, 0.065, count)
        )
        duration_days = (
            base_duration * 22 * np.power(scale, 0.29)
            * (1 + 0.018 * np.maximum(floors - 1, 0) + 0.055 * basements + 0.025 * (buildings - 1))
            * finish_duration * method_duration
            * rng.lognormal(0, 0.075, count)
        )

        concrete_factor = np.array([self.types[index]["concrete"] for index in type_ids])
        steel_factor = np.array([self.types[index]["steel"] for index in type_ids])
        block_factor = np.array([self.types[index]["blocks"] for index in type_ids])
        hvac_factor = np.array([self.types[index]["hvac"] for index in type_ids])
        electrical_factor = np.array([self.types[index]["electrical"] for index in type_ids])
        water_factor = np.array([self.types[index]["water"] for index in type_ids])
        water_capacity_factor = np.array([self.types[index].get("waterPerCapacity", 18) for index in type_ids])
        risk_base = np.array([self.types[index]["risk"] for index in type_ids])
        defect_factor = np.array([self.types[index]["defects"] for index in type_ids])

        concrete = gross_area * concrete_factor * (1 + 0.045 * basements) * rng.lognormal(0, 0.055, count)
        steel = gross_area * steel_factor * (1 + 0.010 * np.maximum(floors - 1, 0)) * rng.lognormal(0, 0.060, count)
        blocks = gross_area * block_factor * rng.lognormal(0, 0.060, count)
        hvac = gross_area / 100 * hvac_factor * climate * finish_cost ** 0.20 * rng.lognormal(0, 0.070, count)
        electrical = gross_area * electrical_factor / 0.90 * finish_cost ** 0.18 * rng.lognormal(0, 0.060, count)
        water = (gross_area * water_factor + capacity * water_capacity_factor) * rng.lognormal(0, 0.070, count)

        risk_logit = (
            logit(risk_base)
            + 0.22 * np.log(np.maximum(scale, 0.05))
            + 0.030 * np.maximum(floors - 1, 0)
            + 0.15 * basements
            + np.log(np.maximum(method_risk, 0.2))
            + rng.normal(0, 0.16, count)
        )
        risk = np.clip(sigmoid(risk_logit), 0.04, 0.95)
        defects = (
            gross_area / 1000 * defect_factor * finish_defects
            * (1 + 0.06 * basements + 0.018 * np.maximum(floors - 1, 0))
            * rng.lognormal(0, 0.12, count)
        )

        raw = {
            "rowIds": row_ids,
            "typeIds": type_ids,
            "cityIds": city_ids,
            "finishIds": finish_ids,
            "methodIds": method_ids,
            "families": family_values,
            "grossArea": gross_area,
            "footprint": footprint,
            "landArea": land_area,
            "floors": floors,
            "basements": basements,
            "buildings": buildings,
            "capacity": capacity,
            "complexity": complexity,
            "cityCost": city_cost,
            "climate": climate,
            "finishCost": finish_cost,
            "finishDuration": finish_duration,
            "finishDefects": finish_defects,
            "methodCost": method_cost,
            "methodDuration": method_duration,
            "methodRisk": method_risk,
        }
        x = self._features(raw)
        y = np.column_stack((cost, duration_days, concrete, steel, blocks, hvac, electrical, water, risk, defects))
        return x, y, raw

    def _features(self, raw: dict) -> np.ndarray:
        count = len(raw["grossArea"])
        log_area = np.log1p(raw["grossArea"]) / 16.0
        log_land = np.log1p(raw["landArea"]) / 17.0
        floors = raw["floors"] / 60.0
        complexity = raw["complexity"] / 10.0
        columns = [
            np.ones(count),
            log_area,
            log_land,
            floors,
            raw["basements"] / 5.0,
            raw["buildings"] / 10.0,
            np.log1p(raw["capacity"]) / 14.0,
            complexity,
            np.clip(raw["footprint"] / raw["grossArea"], 0, 1),
            np.clip(raw["landArea"] / np.maximum(raw["footprint"], 1), 1, 10) / 10.0,
            raw["cityCost"],
            raw["climate"],
            raw["finishCost"],
            raw["finishDuration"],
            raw["finishDefects"],
            raw["methodCost"],
            raw["methodDuration"],
            raw["methodRisk"],
            log_area * complexity,
            log_area * floors,
            (raw["families"] == "linear").astype(np.float64),
            (raw["families"] == "existing").astype(np.float64),
        ]
        x = np.column_stack(columns + [
            np.eye(len(self.types), dtype=np.float64)[raw["typeIds"]],
            np.eye(len(self.families), dtype=np.float64)[np.array([self.family_index[value] for value in raw["families"]])],
            np.eye(len(self.cities), dtype=np.float64)[raw["cityIds"]],
            np.eye(len(self.finishes), dtype=np.float64)[raw["finishIds"]],
            np.eye(len(self.methods), dtype=np.float64)[raw["methodIds"]],
        ])
        if x.shape[1] != len(self.names):
            raise RuntimeError(f"feature shape mismatch: {x.shape[1]} != {len(self.names)}")
        return x

    def record(self, raw: dict, y: np.ndarray, index: int, split: str) -> dict:
        type_id = int(raw["typeIds"][index])
        city_id = int(raw["cityIds"][index])
        finish_id = int(raw["finishIds"][index])
        method_id = int(raw["methodIds"][index])
        return {
            "id": f"ACEP-{split.upper()}-{int(raw['rowIds'][index]):09d}",
            "projectType": self.types[type_id]["key"],
            "family": self.types[type_id]["family"],
            "city": self.cities[city_id],
            "finish": self.finishes[finish_id],
            "method": self.methods[method_id],
            "geometry": {
                "grossBuiltAreaM2": float(raw["grossArea"][index]),
                "footprintAreaM2": float(raw["footprint"][index]),
                "landAreaM2": float(raw["landArea"][index]),
                "floors": int(raw["floors"][index]),
                "basements": int(raw["basements"][index]),
                "buildings": int(raw["buildings"][index]),
            },
            "capacity": float(raw["capacity"][index]),
            "capacityUnit": self.types[type_id].get("capacityUnit", "scenario_capacity_index"),
            "complexity": float(raw["complexity"][index]),
            "areaBasis": "gross_floor_area" if self.types[type_id]["family"] in ["building", "industrial", "existing", "other"] else "treated_area",
            "targets": {name: float(y[index, target_index]) for target_index, name in enumerate(TARGETS)},
            "provenance": "synthetic_engineering_prior",
            "verified": False,
            "suitableForModelApproval": False,
        }


def transform_targets(y: np.ndarray) -> np.ndarray:
    # Fit strictly positive engineering targets in log space. Using log1p here
    # materially distorted small-but-valid quantities (for example reinforcing
    # steel in a fit-out). Exact physical zeros are excluded from the fit and
    # restored by enforce_domain_constraints().
    result = np.log(np.maximum(y, 1e-12))
    result[:, TARGETS.index("riskScore")] = logit(y[:, TARGETS.index("riskScore")])
    return result


def inverse_targets(values: np.ndarray) -> np.ndarray:
    result = np.exp(values)
    result[:, TARGETS.index("riskScore")] = sigmoid(values[:, TARGETS.index("riskScore")])
    return np.maximum(result, 0)


def enforce_domain_constraints(predicted: np.ndarray, type_ids: np.ndarray, project_types: list[dict]) -> np.ndarray:
    """Apply exact physical zeros declared by an archetype after regression."""
    constrained = predicted.copy()
    factors = {
        "concreteM3": "concrete",
        "steelTon": "steel",
        "blocksM2": "blocks",
        "hvacTR": "hvac",
        "electricalKVA": "electrical",
        "waterLpd": "water",
    }
    for target, factor in factors.items():
        column = TARGETS.index(target)
        zero_types = [index for index, profile in enumerate(project_types) if float(profile[factor]) == 0]
        if zero_types:
            constrained[np.isin(type_ids, zero_types), column] = 0.0
    return constrained


def validate_chunk(raw: dict, y: np.ndarray) -> list[str]:
    failures: list[str] = []
    arrays = [raw["grossArea"], raw["footprint"], raw["landArea"], raw["floors"], y]
    if any(not np.all(np.isfinite(value)) for value in arrays):
        failures.append("non_finite_value")
    if np.any(raw["grossArea"] <= 0) or np.any(raw["footprint"] <= 0):
        failures.append("non_positive_area")
    if np.any(raw["landArea"] + 1e-6 < raw["footprint"]):
        failures.append("land_smaller_than_footprint")
    if np.any(raw["grossArea"] + 1e-6 < raw["footprint"]):
        failures.append("gross_smaller_than_footprint")
    if np.any(raw["floors"] < 1):
        failures.append("invalid_floor_count")
    if np.any(y < 0):
        failures.append("negative_target")
    return failures


def write_shard(path: Path, generator: CorpusGenerator, raw: dict, y: np.ndarray, split: str) -> None:
    # Fixed gzip timestamp makes independently rebuilt shard bytes verifiable.
    with path.open("wb") as binary, gzip.GzipFile(filename="", fileobj=binary, mode="wb", mtime=0, compresslevel=6) as zipped, io.TextIOWrapper(zipped, encoding="utf-8") as handle:
        for index in range(len(y)):
            handle.write(json.dumps(generator.record(raw, y, index, split), ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")


def metric_bundle(actual: np.ndarray, predicted: np.ndarray) -> dict:
    error = predicted - actual
    absolute = np.abs(error)
    denominator = np.maximum(np.abs(actual), 1e-9)
    ape = absolute / denominator
    ss_res = float(np.sum(error ** 2))
    centered = actual - np.mean(actual)
    ss_tot = float(np.sum(centered ** 2))
    return {
        "mae": float(np.mean(absolute)),
        "rmse": float(np.sqrt(np.mean(error ** 2))),
        "mape": float(np.mean(ape)),
        "p50Ape": float(np.quantile(ape, 0.50)),
        "p90Ape": float(np.quantile(ape, 0.90)),
        "p90AbsoluteError": float(np.quantile(absolute, 0.90)),
        "withinTwoPercent": float(np.mean(ape <= 0.02)),
        "nonZeroCount": int(np.sum(np.abs(actual) > 1e-9)),
        "nonZeroMape": float(np.mean(ape[np.abs(actual) > 1e-9])) if np.any(np.abs(actual) > 1e-9) else None,
        "r2": float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0,
    }


def rounded(value: object, digits: int = 8) -> object:
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, list):
        return [rounded(item, digits) for item in value]
    if isinstance(value, dict):
        return {key: rounded(item, digits) for key, item in value.items()}
    return value


def markdown_report(artifact: dict) -> str:
    lines = [
        "# ACEP million-project research training",
        "",
        f"- Model ID: `{artifact['modelId']}`",
        f"- Training projects: **{artifact['training']['records']:,}**",
        f"- Independent holdout projects: **{artifact['evaluation']['records']:,}**",
        f"- Project types: **{artifact['training']['projectTypes']}**",
        f"- Dataset provenance: `{artifact['governance']['dataProvenance']}`",
        f"- Release status: `{artifact['governance']['status']}`",
        "",
        "This candidate is trained only on reproducible synthetic engineering-prior scenarios. "
        "Its holdout metrics measure how well it reproduces those priors; they do not establish real-project accuracy.",
        "",
        "## Independent synthetic holdout metrics",
        "",
        "| Target | MAPE | P90 APE | MAE | R² | Gate |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for name in TARGETS:
        metric = artifact["evaluation"]["metrics"][name]
        if name == "riskScore":
            mape = "n/a"
            p90 = "n/a"
        else:
            mape = f"{metric['mape'] * 100:.2f}%"
            p90 = f"{metric['p90Ape'] * 100:.2f}%"
        lines.append(f"| {name} | {mape} | {p90} | {metric['mae']:.4g} | {metric['r2']:.4f} | {'PASS' if metric['passed'] else 'FAIL'} |")
    lines.extend([
        "",
        "## Per-project-type gates",
        "",
        f"- Type-target checks evaluated: **{artifact['training']['projectTypes'] * len(TARGETS):,}**",
        f"- Failed type-target checks: **{len(artifact['evaluation']['perProjectTypeFailures']):,}**",
        "- A global average cannot pass the candidate when any non-zero project-type target exceeds its dedicated threshold.",
        "",
        "## Governance",
        "",
        "- `suitableForModelApproval` is false.",
        "- The bundle is enabled only for experimental inference unless an operator explicitly changes the governed release state.",
        "- Supplier selection is excluded: project records cannot establish live supplier identity, price, availability, or contractual suitability.",
        "- A production release still requires licensed real project data, frozen independent evaluation, licensed engineering review, model-risk review, and rollback/monitoring evidence.",
        "",
        "## Dataset shards",
        "",
        "| File | Records | SHA-256 |",
        "|---|---:|---|",
    ])
    for shard in artifact["training"]["shards"]:
        lines.append(f"| `{shard['file']}` | {shard['records']:,} | `{shard['sha256']}` |")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    started = time.time()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    if len(config.get("projectTypes", [])) != 35:
        raise RuntimeError("project archetype catalog must contain exactly 35 project types")
    generator = CorpusGenerator(config, args.seed)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    existing = list(args.output_dir.glob("*.jsonl.gz")) + list(args.output_dir.glob("manifest.json"))
    if existing and not args.force:
        raise RuntimeError(f"output directory already contains a corpus; use --force for this exact path: {args.output_dir}")

    feature_count = len(generator.names)
    target_count = len(TARGETS)
    xtx = np.zeros((target_count, feature_count, feature_count), dtype=np.float64)
    xty = np.zeros((feature_count, target_count), dtype=np.float64)
    type_counts: Counter[str] = Counter()
    validation_failures: Counter[str] = Counter()
    shards: list[dict] = []

    print(f"[ACEP] generating and training on {args.records:,} project records")
    for shard_number, start in enumerate(range(0, args.records, args.shard_size), start=1):
        count = min(args.shard_size, args.records - start)
        x, y, raw = generator.generate(start, count)
        for failure in validate_chunk(raw, y):
            validation_failures[failure] += 1
        if validation_failures:
            raise RuntimeError(f"corpus validation failed: {dict(validation_failures)}")
        transformed = transform_targets(y)
        for target_index in range(target_count):
            # Exact-zero physical targets (for example HVAC on a road) are
            # enforced by the runtime constraint layer. They must not flatten
            # the learned scale relationship for project types where the
            # system actually exists.
            mask = y[:, target_index] > 0
            target_x = x[mask]
            xtx[target_index] += target_x.T @ target_x
            xty[:, target_index] += target_x.T @ transformed[mask, target_index]
        type_counts.update(generator.types[int(index)]["key"] for index in raw["typeIds"])

        shard_name = f"train-{shard_number:03d}.jsonl.gz"
        shard_path = args.output_dir / shard_name
        if not args.no_record_files:
            write_shard(shard_path, generator, raw, y, "train")
            shard_hash = sha256_file(shard_path)
            shard_size = shard_path.stat().st_size
        else:
            shard_hash = None
            shard_size = 0
        shards.append({"file": shard_name, "records": count, "bytes": shard_size, "sha256": shard_hash})
        print(f"[ACEP] shard {shard_number}: {start + count:,}/{args.records:,}")

    ridge = np.eye(feature_count, dtype=np.float64) * args.ridge
    ridge[0, 0] = 0.0
    coefficients = np.column_stack([
        np.linalg.solve(xtx[target_index] + ridge, xty[:, target_index])
        for target_index in range(target_count)
    ])

    print(f"[ACEP] evaluating on {args.holdout:,} independent records")
    test_x_parts = []
    test_y_parts = []
    test_type_parts = []
    for start in range(0, args.holdout, args.shard_size):
        count = min(args.shard_size, args.holdout - start)
        x, y, raw = generator.generate(start + 10_000_000, count, seed_offset=991_733)
        failures = validate_chunk(raw, y)
        if failures:
            raise RuntimeError(f"holdout validation failed: {failures}")
        test_x_parts.append(x)
        test_y_parts.append(y)
        test_type_parts.append(raw["typeIds"])
    test_x = np.vstack(test_x_parts)
    test_y = np.vstack(test_y_parts)
    test_types = np.concatenate(test_type_parts)
    predicted = enforce_domain_constraints(inverse_targets(test_x @ coefficients), test_types, generator.types)

    calibration_x, calibration_y, calibration_raw = generator.generate(30_000_000, args.calibration, seed_offset=774_311)
    calibration_predicted = enforce_domain_constraints(inverse_targets(calibration_x @ coefficients), calibration_raw["typeIds"], generator.types)
    calibration_metrics = {name: metric_bundle(calibration_y[:, i], calibration_predicted[:, i]) for i, name in enumerate(TARGETS)}
    calibration_by_type = {profile["key"]: {name: metric_bundle(calibration_y[calibration_raw["typeIds"] == ti, i], calibration_predicted[calibration_raw["typeIds"] == ti, i]) for i, name in enumerate(TARGETS)} for ti, profile in enumerate(generator.types)}
    # Freeze intervals on calibration data, then measure coverage on untouched test data.
    interval_coverage = {}
    per_type_coverage = {profile["key"]: {} for profile in generator.types}
    for i, name in enumerate(TARGETS):
        delta = np.array([calibration_by_type[generator.types[int(ti)]["key"]][name]["p90AbsoluteError" if name == "riskScore" else "p90Ape"] for ti in test_types])
        lower = np.maximum(0, predicted[:, i] - delta) if name == "riskScore" else predicted[:, i] / (1 + delta)
        upper = np.minimum(1, predicted[:, i] + delta) if name == "riskScore" else predicted[:, i] / (1 - delta)
        covered = (test_y[:, i] >= lower) & (test_y[:, i] <= upper)
        interval_coverage[name] = float(np.mean(covered))
        for ti, profile in enumerate(generator.types):
            per_type_coverage[profile["key"]][name] = float(np.mean(covered[test_types == ti]))

    gates = {
        "costSar": ("mape", 0.13),
        "durationDays": ("mape", 0.16),
        "concreteM3": ("mape", 0.14),
        "steelTon": ("mape", 0.15),
        "blocksM2": ("mape", 0.16),
        "hvacTR": ("mape", 0.16),
        "electricalKVA": ("mape", 0.15),
        "waterLpd": ("mape", 0.17),
        "riskScore": ("mae", 0.08),
        "expectedDefects": ("mape", 0.22),
    }
    metrics: Dict[str, dict] = {}
    per_type: Dict[str, dict] = defaultdict(dict)
    for target_index, name in enumerate(TARGETS):
        metric = metric_bundle(test_y[:, target_index], predicted[:, target_index])
        gate_name, threshold = gates[name]
        metric["gateMetric"] = gate_name
        metric["gateThreshold"] = threshold
        metric["passed"] = metric[gate_name] <= threshold
        metrics[name] = metric
        for type_index, profile in enumerate(generator.types):
            mask = test_types == type_index
            per_type[profile["key"]][name] = metric_bundle(test_y[mask, target_index], predicted[mask, target_index])

    per_type_gates = {
        "costSar": ("mape", 0.14),
        "durationDays": ("mape", 0.17),
        "concreteM3": ("mape", 0.16),
        "steelTon": ("mape", 0.18),
        "blocksM2": ("mape", 0.18),
        "hvacTR": ("mape", 0.18),
        "electricalKVA": ("mape", 0.17),
        "waterLpd": ("mape", 0.18),
        "riskScore": ("mae", 0.08),
        "expectedDefects": ("mape", 0.24),
    }
    per_type_failures = []
    for profile in generator.types:
        project_type = profile["key"]
        for target_name, (metric_name, threshold) in per_type_gates.items():
            metric = per_type[project_type][target_name]
            # A declared exact-zero target is correct by construction and has
            # no meaningful relative-error gate.
            factor_name = {
                "concreteM3": "concrete", "steelTon": "steel", "blocksM2": "blocks",
                "hvacTR": "hvac", "electricalKVA": "electrical", "waterLpd": "water",
            }.get(target_name)
            if factor_name and float(profile[factor_name]) == 0:
                continue
            if metric[metric_name] > threshold:
                per_type_failures.append({
                    "projectType": project_type,
                    "target": target_name,
                    "metric": metric_name,
                    "value": round(float(metric[metric_name]), 8),
                    "threshold": threshold,
                })
    all_passed = all(metric["passed"] for metric in metrics.values()) and not per_type_failures
    dataset_manifest = {
        "schema": "acep-synthetic-project-record/v2",
        "generatorSha256": sha256_file(Path(__file__)),
        "dependencyLockSha256": sha256_file(ROOT / "package-lock.json"),
        "recordFilesPersisted": not args.no_record_files,
        "calibration": {"records": args.calibration, "start": 30_000_000, "seedOffset": 774_311},
        "holdout": {"records": args.holdout, "start": 10_000_000, "seedOffset": 991_733},
        "records": args.records,
        "holdoutRecords": args.holdout,
        "seed": args.seed,
        "shardSize": args.shard_size,
        "projectTypes": len(generator.types),
        "typeCounts": dict(sorted(type_counts.items())),
        "shards": shards,
        "configSha256": sha256_file(args.config),
        "dataProvenance": "synthetic_engineering_prior",
        "suitableForModelApproval": False,
    }
    dataset_manifest["manifestSha256"] = hashlib.sha256(canonical_json(dataset_manifest)).hexdigest()
    safe_write_json(args.output_dir / "manifest.json", dataset_manifest)

    models = {}
    for target_index, name in enumerate(TARGETS):
        models[name] = {
            "transform": "logit" if name == "riskScore" else "log",
            "coefficients": [round(float(value), 12) for value in coefficients[:, target_index]],
            "holdout": rounded(metrics[name]),
            "calibration": rounded(calibration_metrics[name]),
            "calibrationByProjectType": rounded({key: values[name] for key, values in calibration_by_type.items()}),
        }

    artifact = {
        "schemaVersion": "1.0.0",
        "modelId": args.model_id,
        "trainedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "algorithm": "multi-target ridge regression over engineered log-scale features",
        "features": generator.names,
        "targets": list(TARGETS),
        "models": models,
        "training": {
            "records": args.records,
            "projectTypes": len(generator.types),
            "ridge": args.ridge,
            "seed": args.seed,
            "datasetManifestSha256": dataset_manifest["manifestSha256"],
            "generatorSha256": dataset_manifest["generatorSha256"],
            "recordSchema": dataset_manifest["schema"],
            "recordsPersisted": not args.no_record_files,
            "configSha256": dataset_manifest["configSha256"],
            "shards": shards,
            "typeCounts": dict(sorted(type_counts.items())),
            "durationSeconds": round(time.time() - started, 3),
            "runtime": {"python": platform.python_version(), "numpy": np.__version__, "platform": platform.platform()},
        },
        "evaluation": {
            "records": args.holdout,
            "split": "independent_seed_and_nonoverlapping_identifiers",
            "metrics": rounded(metrics),
            "perProjectType": rounded(per_type),
            "perProjectTypeGates": per_type_gates,
            "perProjectTypeFailures": per_type_failures,
            "intervalCoverage": rounded(interval_coverage),
            "perProjectTypeIntervalCoverage": rounded(per_type_coverage),
            "calibrationRecords": args.calibration,
            "realProjectRecords": 0,
            "allSyntheticGatesPassed": all_passed,
        },
        "governance": {
            "status": "research_candidate" if all_passed else "rejected_candidate",
            "dataProvenance": "synthetic_engineering_prior",
            "suitableForModelApproval": False,
            "contractualUse": False,
            "productionEnabled": False,
            "requiresIndependentRealProjectEvaluation": True,
            "excludedTargets": ["supplier_identity", "live_market_price", "code_compliance", "design_approval"],
        },
    }
    safe_write_json(args.artifact, artifact)
    artifact_checksum = sha256_file(args.artifact)
    safe_write_text(
        args.artifact.with_suffix(args.artifact.suffix + ".sha256"),
        f"{artifact_checksum}  {args.artifact.name}\n",
    )
    safe_write_text(args.report, markdown_report(artifact))
    print(json.dumps({
        "modelId": artifact["modelId"],
        "trainingRecords": args.records,
        "holdoutRecords": args.holdout,
        "projectTypes": len(generator.types),
        "allSyntheticGatesPassed": all_passed,
        "artifact": str(args.artifact),
        "artifactSha256": artifact_checksum,
        "report": str(args.report),
        "manifest": str(args.output_dir / "manifest.json"),
        "durationSeconds": artifact["training"]["durationSeconds"],
        "metrics": {name: {"mape": round(metric["mape"], 5), "mae": round(metric["mae"], 5), "r2": round(metric["r2"], 5), "passed": metric["passed"]} for name, metric in metrics.items()},
    }, indent=2))
    return 0 if all_passed else 3


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        raise SystemExit(1)
