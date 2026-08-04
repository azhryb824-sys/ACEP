"""Equipment allocation generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, rand_int, round2
from acep_data_factory.generators._project_context import build_project

EQUIPMENT = [
    ("Tower Crane 8t", "رافعة برجية 8 طن", 5000),
    ("Excavator 20ton", "حفار 20 طن", 1200),
    ("Concrete Pump", "مضخة خرسانة", 1800),
    ("Generator 250kVA", "مولد 250 kVA", 450),
]


class EquipmentGenerator(BaseGenerator):
    name = "equipment"
    domain = "Construction Management"
    dataset_type = "calculation"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        eq = pick(EQUIPMENT)
        days = rand_int(30, 180)
        rate = round2(eq[2] * p.cost_index)
        total = round2(rate * days)
        instruction = bilingual(
            f"Plan equipment {eq[0]} for {p.project_type}.",
            f"خطط لتجهيز {eq[1]} لمشروع {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Equipment: {eq[0]}\nDaily rate: {rate} SAR\nDuration: {days} days\nTotal: {total} SAR",
            f"المعدة: {eq[1]}\nالأجر اليومي: {rate} ر.س\nالمدة: {days} يوم\nالإجمالي: {total} ر.س",
            self.language,
        )
        return self._new_sample(
            instruction=instruction,
            output=output,
            calculations=[{"total_sar": total, "formula": "daily_rate * days"}],
            units={"rate": "SAR/day"},
            project_id=p.project_id,
            index=index,
        )
