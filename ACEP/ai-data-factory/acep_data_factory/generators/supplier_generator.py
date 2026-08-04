"""Supplier intelligence generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, rand_int, round2
from acep_data_factory.generators._project_context import build_project

SUPPLIERS = [
    "Saudi Building Materials Co.",
    "Arabian Construction Supply",
    "Al-Rajhi Steel",
    "National Ready Mix",
    "Saudi Ceramics",
]


class SupplierGenerator(BaseGenerator):
    name = "supplier"
    domain = "Procurement"
    dataset_type = "question_answer"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        supplier = pick(SUPPLIERS)
        rating = round2(3.5 + rand_int(0, 15) / 10)
        delivery = rand_int(2, 14)
        instruction = bilingual(
            f"Evaluate supplier {supplier} for {p.project_type} in {p.city}.",
            f"قيّم المورد {supplier} لمشروع {p.project_type} في {p.city_ar}.",
            self.language,
        )
        output = bilingual(
            f"Supplier: {supplier}\nRating: {rating}/5\nDelivery: {delivery} days\nRecommendation: Approved for structural materials",
            f"المورد: {supplier}\nالتقييم: {rating}/5\nالتسليم: {delivery} يوم\nالتوصية: معتمد للمواد الإنشائية",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
