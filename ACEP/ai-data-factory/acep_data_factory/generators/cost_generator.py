"""Cost estimation generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, round2
from acep_data_factory.generators._project_context import build_project


class CostGenerator(BaseGenerator):
    name = "cost"
    domain = "Cost Estimation"
    dataset_type = "calculation"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        structure = round2(p.estimated_cost_sar * 0.35)
        mep = round2(p.estimated_cost_sar * 0.25)
        finishing = round2(p.estimated_cost_sar * 0.30)
        prelim = round2(p.estimated_cost_sar * 0.10)
        check = round2(structure + mep + finishing + prelim)

        instruction = bilingual(
            f"Estimate total project cost for {p.project_type} in {p.city} ({p.building_area_m2} m2, {p.finishing} finishing).",
            f"قدّر التكلفة الإجمالية لمشروع {p.project_type} في {p.city_ar} ({p.building_area_m2} م²، تشطيب {p.finishing}).",
            self.language,
        )
        output = bilingual(
            f"Structure: {structure} SAR (35%)\nMEP: {mep} SAR (25%)\nFinishing: {finishing} SAR (30%)\n"
            f"Preliminaries: {prelim} SAR (10%)\nTotal: {check} SAR\nDuration: {p.duration_months} months",
            f"إنشاءات: {structure} ر.س (35%)\nميكانيك وكهرباء: {mep} ر.س (25%)\nتشطيبات: {finishing} ر.س (30%)\n"
            f"تجهيزات: {prelim} ر.س (10%)\nالإجمالي: {check} ر.س\nالمدة: {p.duration_months} شهر",
            self.language,
        )
        return self._new_sample(
            instruction=instruction,
            output=output,
            calculations=[
                {"component": "structure", "pct": 0.35, "amount_sar": structure},
                {"component": "mep", "pct": 0.25, "amount_sar": mep},
                {"component": "finishing", "pct": 0.30, "amount_sar": finishing},
                {"component": "preliminaries", "pct": 0.10, "amount_sar": prelim},
            ],
            units={"currency": "SAR"},
            project_id=p.project_id,
            index=index,
        )
