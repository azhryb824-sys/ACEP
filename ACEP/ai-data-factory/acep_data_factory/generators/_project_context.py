"""Shared synthetic project context for all generators."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from acep_data_factory.core.constants import CITIES, FINISHING_LEVELS, PROJECT_TYPES
from acep_data_factory.core.utils import jitter, pick, project_id, rand_float, rand_int, round2


@dataclass
class ProjectContext:
    project_id: str
    city: str
    city_ar: str
    region: str
    cost_index: float
    project_type: str
    building_area_m2: float
    floors: int
    finishing: str
    concrete_m3: float
    steel_ton: float
    duration_months: float
    estimated_cost_sar: float


def build_project(index: int = 0) -> ProjectContext:
    city = pick(CITIES)
    ptype_key = pick(list(PROJECT_TYPES.keys()))
    spec = PROJECT_TYPES[ptype_key]
    area = rand_float(spec["min_area"] or 500, spec["max_area"] or 5000)
    floors = rand_int(spec["floors"][0] or 1, max(spec["floors"][1], 1))
    finishing = pick(FINISHING_LEVELS)
    concrete = round2(area * spec["concrete_factor"] * max(1, floors * 0.85))
    steel = round2(concrete * spec["steel_per_m3"] / 1000)
    cost_per_m2 = {"Raw": 1000, "Standard": 2000, "Good": 3000, "Premium": 4500, "Luxury": 7000, "UltraLuxury": 12000}[finishing]
    total_cost = round2(area * floors * cost_per_m2 * city.cost_index * jitter(1, 0.08))
    duration = round2((area ** 0.5) * 0.2 + floors * 0.5 + 4)
    return ProjectContext(
        project_id=project_id(index + 1),
        city=city.name,
        city_ar=city.name_ar,
        region=city.region,
        cost_index=city.cost_index,
        project_type=ptype_key,
        building_area_m2=round2(area),
        floors=floors,
        finishing=finishing,
        concrete_m3=concrete,
        steel_ton=steel,
        duration_months=duration,
        estimated_cost_sar=total_cost,
    )
