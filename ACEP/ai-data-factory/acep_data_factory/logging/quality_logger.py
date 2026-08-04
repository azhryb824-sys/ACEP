"""Quality logging and reports."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class QualityReport:
    started_at: str
    finished_at: str = ""
    generated: int = 0
    accepted: int = 0
    rejected: int = 0
    validation_stats: Dict[str, Any] = field(default_factory=dict)
    rejected_samples: List[dict] = field(default_factory=list)
    generators: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


class QualityLogger:
    def __init__(self, log_dir: Path):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.sample_log = self.log_dir / "generation.log"
        self.rejected_log = self.log_dir / "rejected.jsonl"
        self.report = QualityReport(started_at=datetime.now(timezone.utc).isoformat())

    def log_sample(self, sample_id: str, generator: str, accepted: bool, errors: List[str]) -> None:
        line = f"{datetime.now(timezone.utc).isoformat()} | {generator} | {sample_id} | {'OK' if accepted else 'REJECT'} | {','.join(errors)}\n"
        with self.sample_log.open("a", encoding="utf-8") as f:
            f.write(line)

    def log_rejected(self, record: dict, errors: List[str]) -> None:
        payload = {"record": record, "errors": errors}
        with self.rejected_log.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
        self.report.rejected_samples.append(payload)

    def finalize(self) -> Path:
        self.report.finished_at = datetime.now(timezone.utc).isoformat()
        path = self.log_dir / "quality_report.json"
        path.write_text(json.dumps(self.report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return path
