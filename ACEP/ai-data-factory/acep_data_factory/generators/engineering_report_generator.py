"""Engineering report generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.constants import ENGINEERING_CODES
from acep_data_factory.core.utils import bilingual, pick
from acep_data_factory.generators._project_context import build_project


class EngineeringReportGenerator(BaseGenerator):
    name = "engineering_report"
    domain = "Structural Engineering"
    dataset_type = "engineering_report"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        code = pick(ENGINEERING_CODES)
        instruction = bilingual(
            f"Write executive summary of structural design report for {p.project_type}.",
            f"اكتب ملخصاً تنفيذياً لتقرير التصميم الإنشائي لـ {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Project: {p.project_id}\nSystem: RC frame\nConcrete: {p.concrete_m3} m3\nSteel: {p.steel_ton} ton\n"
            f"Design code: {code['code']} - {code['name']}\nConclusion: Design complies with applicable code requirements.",
            f"المشروع: {p.project_id}\nالنظام: إطار خرساني\nخرسانة: {p.concrete_m3} م³\nحديد: {p.steel_ton} طن\n"
            f"الكود: {code['code']} - {code['name']}\nالاستنتاج: التصميم مطابق للمتطلبات.",
            self.language,
        )
        return self._new_sample(
            instruction=instruction,
            output=output,
            metadata={"referenced_code": code["code"], "hallucinated_code": False},
            project_id=p.project_id,
            index=index,
        )
