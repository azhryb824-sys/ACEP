"""Risk register generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, rand_int
from acep_data_factory.generators._project_context import build_project

RISKS = [
    ("Material price escalation", "ارتفاع أسعار المواد", "Financial"),
    ("Weather delay", "تأخير بسبب الطقس", "Schedule"),
    ("Design change", "تغيير تصميم", "Scope"),
    ("Subcontractor default", "تعثر مقاول باطن", "Commercial"),
]


class RiskGenerator(BaseGenerator):
    name = "risk"
    domain = "Risk Management"
    dataset_type = "reasoning"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        risk = pick(RISKS)
        prob = rand_int(1, 5)
        impact = rand_int(1, 5)
        score = prob * impact
        instruction = bilingual(
            f"Add risk entry for {p.project_type} in {p.city}.",
            f"أضف مخاطرة لمشروع {p.project_type} في {p.city_ar}.",
            self.language,
        )
        output = bilingual(
            f"Risk: {risk[0]}\nCategory: {risk[2]}\nProbability: {prob}/5\nImpact: {impact}/5\nScore: {score}\nMitigation: Fixed-price BOQ, buffer in schedule",
            f"المخاطرة: {risk[1]}\nالفئة: {risk[2]}\nالاحتمال: {prob}/5\nالأثر: {impact}/5\nالدرجة: {score}\nالتخفيف: أسعار ثابتة، احتياطي زمني",
            self.language,
        )
        return self._new_sample(
            instruction=instruction,
            output=output,
            calculations=[{"risk_score": score, "formula": "probability * impact"}],
            project_id=p.project_id,
            index=index,
        )
