"""Base generator interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterator, Optional

from acep_data_factory.core.sample import EngineeringSample
from acep_data_factory.core.utils import sample_id


class BaseGenerator(ABC):
    name: str = "base"
    domain: str = "Construction Management"
    dataset_type: str = "instruction"
    default_language: str = "both"

    def __init__(self, seed: Optional[int] = None, language: str = "both"):
        if seed is not None:
            import random
            random.seed(seed)
        self.language = language

    @abstractmethod
    def generate_one(self, index: int = 0) -> EngineeringSample:
        raise NotImplementedError

    def generate(self, count: int) -> Iterator[EngineeringSample]:
        for i in range(count):
            yield self.generate_one(i)

    def _new_sample(
        self,
        *,
        instruction: str,
        output: str,
        input_text: str = "",
        difficulty: str = "medium",
        metadata: Optional[dict] = None,
        calculations: Optional[list] = None,
        units: Optional[dict] = None,
        project_id: Optional[str] = None,
        index: int = 0,
    ) -> EngineeringSample:
        return EngineeringSample(
            id=sample_id(self.name.upper()),
            generator=self.name,
            domain=self.domain,
            dataset_type=self.dataset_type,
            language=self.language,
            difficulty=difficulty,
            instruction=instruction,
            input=input_text,
            output=output,
            metadata=metadata or {},
            calculations=calculations or [],
            units=units or {},
            source_project_id=project_id,
        )
