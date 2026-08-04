"""RFI (Request for Information) generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, random_date
from acep_data_factory.generators._project_context import build_project

TOPICS = [
    ("Clash between duct and beam", "تعارض بين مجاري الهواء والكمرة"),
    ("Missing door schedule detail", "نقص في جدول الأبواب"),
    ("Foundation level discrepancy", "تعارض في مناسيب الأساسات"),
]


class RFIGenerator(BaseGenerator):
    name = "rfi"
    domain = "Construction Management"
    dataset_type = "conversation"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        topic = pick(TOPICS)
        rfi_no = f"RFI-{p.project_id}-{index % 100:03d}"
        instruction = bilingual(
            f"Draft RFI regarding {topic[0]}.",
            f"صِغ RFI بخصوص {topic[1]}.",
            self.language,
        )
        output = bilingual(
            f"RFI No: {rfi_no}\nDate: {random_date()}\nSubject: {topic[0]}\nQuestion: Please clarify coordination and proposed resolution.\nRequired by: 7 calendar days",
            f"RFI رقم: {rfi_no}\nالتاريخ: {random_date()}\nالموضوع: {topic[1]}\nالسؤال: يرجى توضيح التنسيق والحل المقترح.\nالمطلوب خلال: 7 أيام",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
