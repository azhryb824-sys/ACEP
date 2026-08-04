"""Generator registry."""

from __future__ import annotations

from typing import Dict, List, Type

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.generators.boq_generator import BOQGenerator
from acep_data_factory.generators.contract_generator import ContractGenerator
from acep_data_factory.generators.cost_generator import CostGenerator
from acep_data_factory.generators.drawing_description_generator import DrawingDescriptionGenerator
from acep_data_factory.generators.engineering_report_generator import EngineeringReportGenerator
from acep_data_factory.generators.equipment_generator import EquipmentGenerator
from acep_data_factory.generators.inspection_generator import InspectionGenerator
from acep_data_factory.generators.invoice_generator import InvoiceGenerator
from acep_data_factory.generators.maintenance_generator import MaintenanceGenerator
from acep_data_factory.generators.material_generator import MaterialGenerator
from acep_data_factory.generators.method_statement_generator import MethodStatementGenerator
from acep_data_factory.generators.prompt_generator import PromptGenerator
from acep_data_factory.generators.purchase_order_generator import PurchaseOrderGenerator
from acep_data_factory.generators.quantity_generator import QuantityGenerator
from acep_data_factory.generators.quality_generator import QualityGenerator
from acep_data_factory.generators.rfi_generator import RFIGenerator
from acep_data_factory.generators.risk_generator import RiskGenerator
from acep_data_factory.generators.safety_generator import SafetyGenerator
from acep_data_factory.generators.schedule_generator import ScheduleGenerator
from acep_data_factory.generators.supplier_generator import SupplierGenerator
from acep_data_factory.generators.tender_generator import TenderGenerator


class GeneratorRegistry:
    _GENERATORS: Dict[str, Type[BaseGenerator]] = {
        "boq": BOQGenerator,
        "quantity": QuantityGenerator,
        "cost": CostGenerator,
        "material": MaterialGenerator,
        "supplier": SupplierGenerator,
        "tender": TenderGenerator,
        "contract": ContractGenerator,
        "invoice": InvoiceGenerator,
        "purchase_order": PurchaseOrderGenerator,
        "maintenance": MaintenanceGenerator,
        "inspection": InspectionGenerator,
        "safety": SafetyGenerator,
        "quality": QualityGenerator,
        "risk": RiskGenerator,
        "schedule": ScheduleGenerator,
        "equipment": EquipmentGenerator,
        "drawing_description": DrawingDescriptionGenerator,
        "engineering_report": EngineeringReportGenerator,
        "rfi": RFIGenerator,
        "method_statement": MethodStatementGenerator,
        "prompt": PromptGenerator,
    }

    @classmethod
    def names(cls) -> List[str]:
        return sorted(cls._GENERATORS.keys())

    @classmethod
    def create(cls, name: str, **kwargs) -> BaseGenerator:
        key = name.lower().replace("-", "_")
        if key not in cls._GENERATORS:
            raise KeyError(f"Unknown generator: {name}. Available: {', '.join(cls.names())}")
        return cls._GENERATORS[key](**kwargs)

    @classmethod
    def create_all(cls, **kwargs) -> Dict[str, BaseGenerator]:
        return {name: cls.create(name, **kwargs) for name in cls.names()}
