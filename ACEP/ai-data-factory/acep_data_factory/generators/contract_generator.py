"""Contract clause generator."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.utils import bilingual, rand_int
from acep_data_factory.generators._project_context import build_project


class ContractGenerator(BaseGenerator):
    name = "contract"
    domain = "Contracts"
    dataset_type = "contract"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        retention = rand_int(5, 10)
        ld_rate = round(rand_int(1, 3) / 10, 1)
        instruction = bilingual(
            f"Generate key contract clauses for {p.project_type} EPC contract.",
            f"أنشئ بنود عقد أساسية لعقد EPC لمشروع {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Contract Value: {p.estimated_cost_sar} SAR\nRetention: {retention}%\nLiquidated Damages: {ld_rate}% per week\n"
            f"Defects Liability: 12 months\nPayment: Monthly interim certificates",
            f"قيمة العقد: {p.estimated_cost_sar} ر.س\nخصم ضمان: {retention}%\nغرامات التأخير: {ld_rate}% أسبوعياً\n"
            f"فترة العيوب: 12 شهر\nالدفع: مستخلصات شهرية",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, project_id=p.project_id, index=index)
