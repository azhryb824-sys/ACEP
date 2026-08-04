"""Safety hazard generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick
from acep_data_factory.generators._project_context import build_project

HAZARDS = [
    ("Working at height", "العمل على ارتفاع", "Full harness, guardrails, toolbox talk"),
    ("Hot work", "أعمال حرارية", "Fire watch, permit to work, extinguisher standby"),
    ("Confined space", "مساحة محصورة", "Gas test, attendant, rescue plan"),
    ("Heavy lifting", "رفع ثقيل", "Lift plan, certified rigger, exclusion zone"),
]


class SafetyGenerator(BaseGenerator):
    name = "safety"
    domain = "Safety"
    dataset_type = "instruction"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        hazard = pick(HAZARDS)
        instruction = bilingual(
            f"Identify safety controls for {hazard[0]} on {p.project_type} site.",
            f"حدد إجراءات السلامة لـ {hazard[1]} في موقع {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Hazard: {hazard[0]}\nControls: {hazard[2]}\nPPE: Helmet, safety boots, gloves\nEmergency: Site muster point briefing",
            f"الخطر: {hazard[1]}\nالضوابط: {hazard[2]}\nمعدات الوقاية: خوذة، حذاء، قفازات\nالطوارئ: نقطة تجمع",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
