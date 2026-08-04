"""Inspection checklist generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick
from acep_data_factory.generators._project_context import build_project

ELEMENTS = ["Foundation", "Column", "Beam", "Slab", "Waterproofing", "MEP Rough-in"]


class InspectionGenerator(BaseGenerator):
    name = "inspection"
    domain = "Quality"
    dataset_type = "instruction"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        element = pick(ELEMENTS)
        instruction = bilingual(
            f"Prepare inspection checklist for {element} on floor {p.floors}.",
            f"أعد قائمة فحص لـ {element} في الدور {p.floors}.",
            self.language,
        )
        output = bilingual(
            f"Element: {element}\nChecks: Dimensions, reinforcement cover, cleanliness, documentation\nHold point: Yes\nReference: Project QA plan",
            f"العنصر: {element}\nالفحوصات: الأبعاد، الغطاء، النظافة، المستندات\nنقطة توقف: نعم\nالمرجع: خطة الجودة",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
