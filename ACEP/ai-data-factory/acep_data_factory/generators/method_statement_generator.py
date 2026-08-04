"""Method statement generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick
from acep_data_factory.generators._project_context import build_project

ACTIVITIES = [
    ("RC slab casting", "صب بلاطة خرسانية", "Survey → shutter → rebar → MEP embed → pour → cure"),
    ("Curtain wall installation", "تركيب واجهة زجاجية", "Setting out → bracket → panel → sealant → QA"),
    ("Excavation near existing structure", "حفر بجوار مبنى قائم", "Survey → shoring → staged excavation → monitoring"),
]


class MethodStatementGenerator(BaseGenerator):
    name = "method_statement"
    domain = "Construction Management"
    dataset_type = "instruction"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        act = pick(ACTIVITIES)
        instruction = bilingual(
            f"Write method statement for {act[0]} on {p.project_type}.",
            f"اكتب Method Statement لـ {act[1]} في {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Activity: {act[0]}\nSequence: {act[2]}\nPlant: Crane, vibrators, pumps\nSafety: PTW, exclusion zone, PPE\nQuality: Cube tests, checklists",
            f"النشاط: {act[1]}\nالتسلسل: {act[2]}\nالمعدات: رافعة، هزازات، مضخات\nالسلامة: تصريح عمل، منطقة محظورة، معدات وقاية\nالجودة: اختبارات، قوائم فحص",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
