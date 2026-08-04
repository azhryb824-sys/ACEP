"""Drawing description generator for RAG / vision training."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick
from acep_data_factory.generators._project_context import build_project

DRAWINGS = [
    ("Architectural floor plan", "مخطط معماري دوري", "Rooms, doors, dimensions, grid lines"),
    ("Structural foundation plan", "مخطط أساسات", "Footings, piles, reinforcement schedule"),
    ("MEP layout", "مخطط MEP", "Duct routes, pipe risers, panel locations"),
]


class DrawingDescriptionGenerator(BaseGenerator):
    name = "drawing_description"
    domain = "Architecture"
    dataset_type = "engineering_report"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        dwg = pick(DRAWINGS)
        instruction = bilingual(
            f"Describe {dwg[0]} for {p.project_type} level typical floor.",
            f"صف {dwg[1]} للدور النموذجي في {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Drawing: {dwg[0]}\nScale: 1:100\nContent: {dwg[2]}\nProject: {p.project_id}, Area: {p.building_area_m2} m2",
            f"المخطط: {dwg[1]}\nالمقياس: 1:100\nالمحتوى: {dwg[2]}\nالمشروع: {p.project_id}، المساحة: {p.building_area_m2} م²",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
