"""Schedule / CPM generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, round2
from acep_data_factory.generators._project_context import build_project


class ScheduleGenerator(BaseGenerator):
    name = "schedule"
    domain = "Scheduling"
    dataset_type = "calculation"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        sub = round2(p.duration_months * 0.15)
        super_ = round2(p.duration_months * 0.20)
        mep = round2(p.duration_months * 0.25)
        finish = round2(p.duration_months * 0.40)
        instruction = bilingual(
            f"Build high-level schedule for {p.duration_months} month project.",
            f"أنشئ جدولاً زمنياً عالي المستوى لمشروع {p.duration_months} شهر.",
            self.language,
        )
        output = bilingual(
            f"Substructure: {sub} months\nSuperstructure: {super_} months\nMEP: {mep} months\nFinishing: {finish} months\nCritical path: Superstructure → MEP rough-in → Ceiling closure",
            f"الأساسات: {sub} شهر\nالهيكل: {super_} شهر\nميكانيك وكهرباء: {mep} شهر\nتشطيبات: {finish} شهر\nالمسار الحرج: الهيكل → تمديدات → أسقف",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
