"""BOQ (Bill of Quantities) generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.constants import BOQ_CATEGORIES
from acep_data_factory.core.sample import EngineeringSample
from acep_data_factory.core.utils import bilingual, jitter, pick, pick_many, round2
from acep_data_factory.generators._project_context import build_project


class BOQGenerator(BaseGenerator):
    name = "boq"
    domain = "Quantity Surveying"
    dataset_type = "specification"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        project = build_project(index)
        categories = pick_many(BOQ_CATEGORIES, 6)
        lines = []
        total = 0.0
        for i, cat in enumerate(categories, 1):
            desc_en = pick(cat["items_en"])
            desc_ar = pick(cat["items_ar"])
            qty = round2(project.building_area_m2 * project.floors * jitter(0.05, 0.15))
            unit_price = round2(cat["base_price"] * project.cost_index * jitter(1, 0.1))
            amount = round2(qty * unit_price)
            total += amount
            lines.append(
                f"{i}. [{cat['category']}] {bilingual(desc_en, desc_ar, self.language)} | "
                f"Qty: {qty} {cat['unit']} @ {unit_price} SAR = {amount} SAR"
            )

        instruction = bilingual(
            f"Prepare a BOQ section for {project.project_type} in {project.city} "
            f"(Area: {project.building_area_m2} m2, Floors: {project.floors}).",
            f"أعد قسم جدول كميات لمشروع {project.project_type} في {project.city_ar} "
            f"(المساحة: {project.building_area_m2} م²، الأدوار: {project.floors}).",
            self.language,
        )
        output = "\n".join(lines) + f"\n\nSubtotal: {round2(total)} SAR"
        calc = [{"formula": "line_total = quantity * unit_price", "subtotal_sar": round2(total)}]
        return self._new_sample(
            instruction=instruction,
            output=output,
            metadata={"project_type": project.project_type, "city": project.city, "boq_lines": len(lines)},
            calculations=calc,
            units={"area": "m2", "currency": "SAR"},
            project_id=project.project_id,
            index=index,
        )
