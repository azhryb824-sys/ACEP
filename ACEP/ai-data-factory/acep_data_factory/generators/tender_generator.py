"""Tender document generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, random_date
from acep_data_factory.generators._project_context import build_project


class TenderGenerator(BaseGenerator):
    name = "tender"
    domain = "Procurement"
    dataset_type = "tender"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        tender_no = f"TND-{p.project_id}"
        instruction = bilingual(
            f"Draft tender summary for {p.project_type} project {p.project_id}.",
            f"اكتب ملخص مناقصة لمشروع {p.project_type} رقم {p.project_id}.",
            self.language,
        )
        output = bilingual(
            f"Tender No: {tender_no}\nProject: {p.project_type} - {p.city}\nEstimated Value: {p.estimated_cost_sar} SAR\n"
            f"Submission Deadline: {random_date()}\nScope: Design, supply, construction, testing and commissioning.",
            f"رقم المناقصة: {tender_no}\nالمشروع: {p.project_type} - {p.city_ar}\nالقيمة التقديرية: {p.estimated_cost_sar} ر.س\n"
            f"آخر موعد للتقديم: {random_date()}\nالنطاق: تصميم، توريد، تنفيذ، اختبار وتشغيل.",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
