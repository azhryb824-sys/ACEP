"""Maintenance plan generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, pick, rand_int
from acep_data_factory.generators._project_context import build_project

ASSETS = ["HVAC AHU", "Fire Pump", "Elevator", "Generator", "BMS Panel"]


class MaintenanceGenerator(BaseGenerator):
    name = "maintenance"
    domain = "Maintenance"
    dataset_type = "instruction"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        asset = pick(ASSETS)
        freq = pick(["Weekly", "Monthly", "Quarterly", "Annual"])
        instruction = bilingual(
            f"Create preventive maintenance plan for {asset} at {p.project_type}.",
            f"أنشئ خطة صيانة وقائية لـ {asset} في {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Asset: {asset}\nFrequency: {freq}\nTasks: Visual inspection, lubrication, functional test\nSpare parts lead time: {rand_int(3, 21)} days",
            f"الأصل: {asset}\nالتكرار: {freq}\nالمهام: فحص بصري، تزييت، اختبار تشغيل\nمدة توريد قطع الغيار: {rand_int(3, 21)} يوم",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
