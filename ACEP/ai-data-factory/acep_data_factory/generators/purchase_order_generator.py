"""Purchase order generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, random_date, round2
from acep_data_factory.generators._project_context import build_project


class PurchaseOrderGenerator(BaseGenerator):
    name = "purchase_order"
    domain = "Procurement"
    dataset_type = "specification"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        item = pick(["Rebar 60ksi", "Ready Mix C30", "Porcelain Tiles"])
        qty = round2(p.concrete_m3 if "C30" in item else p.steel_ton)
        unit = "m3" if "C30" in item else "ton" if "Rebar" in item else "m2"
        instruction = bilingual(
            f"Issue PO for {item} on project {p.project_id}.",
            f"أصدر أمر شراء لـ {item} في المشروع {p.project_id}.",
            self.language,
        )
        output = bilingual(
            f"PO: PO-{p.project_id}-042\nItem: {item}\nQty: {qty} {unit}\nDelivery: {random_date()}\nProject: {p.city}",
            f"أمر شراء: PO-{p.project_id}-042\nالبند: {item}\nالكمية: {qty} {unit}\nالتسليم: {random_date()}\nالمشروع: {p.city_ar}",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
