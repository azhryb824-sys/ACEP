"""Material specification generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, jitter, pick, round2
from acep_data_factory.generators._project_context import build_project

MATERIALS = [
    ("Ready Mix Concrete C30", "خرسانة جاهزة C30", "m3", 320),
    ("Rebar 60ksi", "حديد تسليح 420", "ton", 3800),
    ("Porcelain Tiles 60x60", "بلاط بورسلين 60×60", "m2", 65),
    ("Emulsion Paint", "دهان أكريليك", "L", 28),
    ("PVC Pipe 110mm", "مواسير PVC 110", "m", 25),
]


class MaterialGenerator(BaseGenerator):
    name = "material"
    domain = "Procurement"
    dataset_type = "specification"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        mat = pick(MATERIALS)
        price = round2(mat[3] * p.cost_index * jitter(1, 0.08))
        qty = round2(p.building_area_m2 * jitter(0.1, 0.2))
        instruction = bilingual(
            f"Specify {mat[0]} for {p.project_type} procurement in {p.city}.",
            f"حدد مواصفات {mat[1]} للمشتريات في مشروع {p.project_type} بمدينة {p.city_ar}.",
            self.language,
        )
        output = bilingual(
            f"Material: {mat[0]}\nUnit: {mat[2]}\nEstimated qty: {qty} {mat[2]}\nUnit price: {price} SAR\nTotal: {round2(qty * price)} SAR",
            f"المادة: {mat[1]}\nالوحدة: {mat[2]}\nالكمية: {qty} {mat[2]}\nسعر الوحدة: {price} ر.س\nالإجمالي: {round2(qty * price)} ر.س",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
