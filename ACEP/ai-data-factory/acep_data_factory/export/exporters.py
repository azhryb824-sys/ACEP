"""Multi-format dataset exporters."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Iterable, List

from acep_data_factory.core.sample import EngineeringSample


def sample_to_record(sample: EngineeringSample, fmt: str = "instruction") -> dict:
    if fmt == "chat":
        return sample.to_chat_record()
    if fmt == "qa":
        return sample.to_qa_record()
    return sample.to_instruction_record()


def write_jsonl(path: Path, records: Iterable[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            count += 1
    return count


def write_json(path: Path, records: List[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(path: Path, records: List[dict]) -> None:
    if not records:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = sorted({k for r in records for k in r.keys() if k != "metadata"})
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        for rec in records:
            row = {k: rec.get(k, "") for k in keys}
            if "metadata" in rec:
                row["metadata"] = json.dumps(rec["metadata"], ensure_ascii=False)
            writer.writerow(row)


def write_markdown(path: Path, records: List[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# ACEP Dataset Export\n"]
    for i, rec in enumerate(records[:500], 1):
        lines.append(f"## Sample {i}\n")
        lines.append(f"**Instruction:** {rec.get('instruction', rec.get('question', ''))}\n")
        lines.append(f"**Output:** {rec.get('output', rec.get('answer', ''))}\n")
    path.write_text("\n".join(lines), encoding="utf-8")


def write_sql(path: Path, table: str, records: List[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"CREATE TABLE IF NOT EXISTS {table} (",
        "  id TEXT PRIMARY KEY,",
        "  instruction TEXT,",
        "  input TEXT,",
        "  output TEXT,",
        "  metadata JSON",
        ");",
        "",
    ]
    for rec in records:
        i = rec.get("instruction", "").replace("'", "''")
        inp = rec.get("input", "").replace("'", "''")
        o = rec.get("output", "").replace("'", "''")
        meta = json.dumps(rec.get("metadata", {}), ensure_ascii=False).replace("'", "''")
        lines.append(
            f"INSERT INTO {table} (id, instruction, input, output, metadata) VALUES "
            f"('{rec['id']}', '{i}', '{inp}', '{o}', '{meta}');"
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def write_parquet(path: Path, records: List[dict]) -> None:
    try:
        import pandas as pd
    except ImportError as exc:
        raise ImportError("Install pandas and pyarrow: pip install -r requirements-full.txt") from exc
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(records).to_parquet(path, index=False)


def write_excel(path: Path, records: List[dict]) -> None:
    try:
        import pandas as pd
    except ImportError as exc:
        raise ImportError("Install pandas and openpyxl: pip install -r requirements-full.txt") from exc
    path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(records).to_excel(path, index=False)
