"""Quality defect analysis generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, rand_int
from acep_data_factory.generators._project_context import build_project

DEFECTS = [
    ("Honeycombing in column", "تعشيش في العمود", "Increase vibration, revise pour sequence"),
    ("Crack in slab", "شق في البلاطة", "Structural review, epoxy injection if allowed"),
    ("Efflorescence on wall", "ترسبات ملحية على الجدار", "Improve curing, check waterproofing"),
]


class QualityGenerator(BaseGenerator):
    name = "quality"
    domain = "Quality"
    dataset_type = "reasoning"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        defect = pick(DEFECTS)
        severity = pick(["Low", "Medium", "High"])
        instruction = bilingual(
            f"Analyze quality defect: {defect[0]} on project {p.project_id}.",
            f"حلل عيب الجودة: {defect[1]} في المشروع {p.project_id}.",
            self.language,
        )
        output = bilingual(
            f"Defect: {defect[0]}\nSeverity: {severity}\nRoot cause: Workmanship / curing\nCorrective action: {defect[2]}\nNCR ref: NCR-{rand_int(1000, 9999)}",
            f"العيب: {defect[1]}\nالخطورة: {severity}\nالسبب: التنفيذ / المعالجة\nالإجراء: {defect[2]}\nتقرير NCR: NCR-{rand_int(1000, 9999)}",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty="medium", project_id=p.project_id, index=index)
