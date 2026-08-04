"""Invoice generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, random_date, round2
from acep_data_factory.generators._project_context import build_project


class InvoiceGenerator(BaseGenerator):
    name = "invoice"
    domain = "Procurement"
    dataset_type = "specification"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        amount = round2(p.estimated_cost_sar * 0.08)
        vat = round2(amount * 0.15)
        instruction = bilingual(
            f"Create progress invoice #3 for project {p.project_id}.",
            f"أنشئ فاتورة مستخلص رقم 3 للمشروع {p.project_id}.",
            self.language,
        )
        output = bilingual(
            f"Invoice: INV-{p.project_id}-003\nDate: {random_date()}\nWork Done Value: {amount} SAR\nVAT 15%: {vat} SAR\nNet: {round2(amount + vat)} SAR",
            f"فاتورة: INV-{p.project_id}-003\nالتاريخ: {random_date()}\nقيمة الأعمال: {amount} ر.س\nضريبة 15%: {vat} ر.س\nالصافي: {round2(amount + vat)} ر.س",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
