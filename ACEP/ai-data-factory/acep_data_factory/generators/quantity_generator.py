"""Quantity takeoff generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, round2
from acep_data_factory.generators._project_context import build_project


class QuantityGenerator(BaseGenerator):
    name = "quantity"
    domain = "Quantity Surveying"
    dataset_type = "calculation"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        blocks_m2 = round2(p.building_area_m2 * p.floors * 1.8)
        tiles_m2 = round2(p.building_area_m2 * p.floors * 0.65)
        paint_m2 = round2(p.building_area_m2 * p.floors * 2.2)
        elec = round(p.building_area_m2 * p.floors * 0.15)
        plumb = round(p.building_area_m2 * p.floors * 0.04)

        instruction = bilingual(
            f"Calculate material quantities for {p.project_type}, built-up area {p.building_area_m2} m2, {p.floors} floors.",
            f"احسب كميات المواد لمشروع {p.project_type} بمساحة {p.building_area_m2} م² و{p.floors} أدوار.",
            self.language,
        )
        output = bilingual(
            f"Concrete: {p.concrete_m3} m3\nSteel: {p.steel_ton} ton\nBlocks: {blocks_m2} m2\n"
            f"Tiles: {tiles_m2} m2\nPaint: {paint_m2} m2\nElectrical points: {elec} no\nPlumbing points: {plumb} no",
            f"خرسانة: {p.concrete_m3} م³\nحديد: {p.steel_ton} طن\nبلوك: {blocks_m2} م²\n"
            f"بلاط: {tiles_m2} م²\nدهان: {paint_m2} م²\nنقاط كهرباء: {elec} عدد\nنقاط سباكة: {plumb} عدد",
            self.language,
        )
        calcs = [
            {"item": "concrete_m3", "formula": "area * concrete_factor * floors * 0.85", "value": p.concrete_m3, "unit": "m3"},
            {"item": "steel_ton", "formula": "concrete_m3 * steel_ratio / 1000", "value": p.steel_ton, "unit": "ton"},
        ]
        return self._new_sample(
            instruction=instruction,
            output=output,
            calculations=calcs,
            units={"concrete": "m3", "steel": "ton", "blocks": "m2"},
            metadata={"traceable": True},
            project_id=p.project_id,
            index=index,
        )
