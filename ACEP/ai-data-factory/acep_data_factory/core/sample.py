"""Sample data model for generated records."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EngineeringSample:
    """Unified sample container for all generators."""

    id: str
    generator: str
    domain: str
    dataset_type: str
    language: str
    difficulty: str = "medium"
    instruction: str = ""
    input: str = ""
    output: str = ""
    messages: List[Dict[str, str]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    calculations: List[Dict[str, Any]] = field(default_factory=list)
    units: Dict[str, str] = field(default_factory=dict)
    source_project_id: Optional[str] = None

    def to_instruction_record(self) -> dict:
        return {
            "id": self.id,
            "instruction": self.instruction,
            "input": self.input,
            "output": self.output,
            "metadata": self.metadata,
        }

    def to_chat_record(self) -> dict:
        if self.messages:
            return {"id": self.id, "messages": self.messages, "metadata": self.metadata}
        return {
            "id": self.id,
            "messages": [
                {"role": "system", "content": "You are ACEP Engineering AI, expert in construction engineering."},
                {"role": "user", "content": self.instruction or self.input},
                {"role": "assistant", "content": self.output},
            ],
            "metadata": self.metadata,
        }

    def to_qa_record(self) -> dict:
        return {
            "id": self.id,
            "question": self.instruction or self.input,
            "answer": self.output,
            "metadata": self.metadata,
        }

    def to_dict(self) -> dict:
        return asdict(self)

    def fingerprint(self) -> str:
        key = f"{self.generator}|{self.instruction}|{self.input}|{self.output}"
        return key.strip().lower()
