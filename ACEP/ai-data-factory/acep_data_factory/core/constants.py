"""Shared engineering constants aligned with ACEP knowledge base."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class City:
    name: str
    name_ar: str
    region: str
    cost_index: float


CITIES: Tuple[City, ...] = (
    City("Riyadh", "الرياض", "Central", 1.00),
    City("Jeddah", "جدة", "Western", 0.95),
    City("Makkah", "مكة", "Western", 0.92),
    City("Madinah", "المدينة", "Western", 0.90),
    City("Dammam", "الدمام", "Eastern", 0.93),
    City("Khobar", "الخبر", "Eastern", 0.96),
    City("Taif", "الطائف", "Western", 0.85),
    City("Abha", "أبها", "Southern", 0.82),
    City("Tabuk", "تبوك", "Northern", 0.80),
    City("Buraydah", "بريدة", "Central", 0.88),
)

DOMAINS: Tuple[str, ...] = (
    "Civil Engineering",
    "Structural Engineering",
    "Architecture",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Plumbing",
    "Fire Protection",
    "Elevator Engineering",
    "Road Engineering",
    "Bridge Engineering",
    "Tunnel Engineering",
    "Facility Management",
    "Maintenance",
    "Construction Management",
    "Quantity Surveying",
    "Cost Estimation",
    "Procurement",
    "Contracts",
    "Safety",
    "Quality",
    "Risk Management",
    "Planning",
    "Scheduling",
    "Project Management",
    "Asset Management",
)

PROJECT_TYPES: Dict[str, dict] = {
    "Villa": {"min_area": 250, "max_area": 1200, "floors": (1, 3), "concrete_factor": 0.24, "steel_per_m3": 110},
    "Apartment_Building": {"min_area": 1500, "max_area": 8000, "floors": (4, 12), "concrete_factor": 0.30, "steel_per_m3": 115},
    "Hospital": {"min_area": 5000, "max_area": 80000, "floors": (3, 15), "concrete_factor": 0.40, "steel_per_m3": 135},
    "Hotel": {"min_area": 3000, "max_area": 30000, "floors": (5, 40), "concrete_factor": 0.32, "steel_per_m3": 125},
    "Mall": {"min_area": 5000, "max_area": 100000, "floors": (2, 6), "concrete_factor": 0.28, "steel_per_m3": 120},
    "Office_Building": {"min_area": 2000, "max_area": 20000, "floors": (4, 20), "concrete_factor": 0.28, "steel_per_m3": 112},
    "Factory": {"min_area": 2000, "max_area": 50000, "floors": (1, 3), "concrete_factor": 0.20, "steel_per_m3": 95},
    "Bridge": {"min_area": 0, "max_area": 0, "floors": (0, 0), "concrete_factor": 0.35, "steel_per_m3": 140},
    "Road": {"min_area": 0, "max_area": 0, "floors": (0, 0), "concrete_factor": 0.0, "steel_per_m3": 0},
}

FINISHING_LEVELS = ("Raw", "Standard", "Good", "Premium", "Luxury", "UltraLuxury")

BOQ_CATEGORIES: List[dict] = [
    {"category": "EarthWork", "items_en": ["Excavation for foundations", "Backfilling", "Soil compaction"], "items_ar": ["حفر للأساسات", "ردم", "دك التربة"], "unit": "m3", "base_price": 25},
    {"category": "Concrete", "items_en": ["RC foundations", "RC columns", "RC beams", "RC slabs"], "items_ar": ["خرسانة مسلحة للأساسات", "أعمدة خرسانية", "كمرات", "بلاطات"], "unit": "m3", "base_price": 450},
    {"category": "Reinforcement", "items_en": ["Steel reinforcement 60ksi", "Steel mesh"], "items_ar": ["حديد تسليح 420", "شبك حديد"], "unit": "ton", "base_price": 3800},
    {"category": "Block", "items_en": ["Hollow blocks 20cm", "AAC blocks"], "items_ar": ["بلوك 20 سم", "بلوك AAC"], "unit": "m2", "base_price": 42},
    {"category": "Electrical", "items_en": ["PVC conduit", "MCB panel", "Earthing system"], "items_ar": ["مجرى PVC", "لوحة MCB", "نظام تأريض"], "unit": "no", "base_price": 85},
    {"category": "Plumbing", "items_en": ["PVC pipe 110mm", "Sanitary fitting", "Water heater"], "items_ar": ["مواسير PVC 110", "تركيبات صحية", "سخان ماء"], "unit": "no", "base_price": 120},
    {"category": "HVAC", "items_en": ["Split AC unit", "Ductwork", "AHU"], "items_ar": ["مكيف سبليت", "مجاري هواء", "وحدة معالجة"], "unit": "no", "base_price": 2500},
    {"category": "FireFighting", "items_en": ["Sprinkler head", "Fire hose cabinet", "Smoke detector"], "items_ar": ["رشاش حريق", "خزانة خرطوم", "كاشف دخان"], "unit": "no", "base_price": 350},
]

ENGINEERING_CODES = (
    {"code": "SBC 301", "name": "Saudi Building Code - Structural", "category": "Structural"},
    {"code": "SBC 302", "name": "Saudi Building Code - Fire Protection", "category": "Fire"},
    {"code": "ACI 318-19", "name": "Building Code for Structural Concrete", "category": "Structural"},
    {"code": "ASCE 7-22", "name": "Minimum Design Loads for Buildings", "category": "Structural"},
    {"code": "NFPA 101", "name": "Life Safety Code", "category": "Fire"},
)

VALID_UNITS = frozenset({"m", "m2", "m3", "mm", "cm", "ton", "kg", "no", "each", "L", "gal", "kW", "kVA", "MPa", "kN", "days", "months", "SAR"})

DATASET_FOLDERS = (
    "engineering_llm",
    "quantity_ai",
    "cost_ai",
    "contract_ai",
    "procurement_ai",
    "drawing_ai",
    "elevator_ai",
    "planning_ai",
    "quality_ai",
    "safety_ai",
    "risk_ai",
)

GENERATOR_TO_FOLDER = {
    "boq": "quantity_ai",
    "quantity": "quantity_ai",
    "cost": "cost_ai",
    "material": "procurement_ai",
    "supplier": "procurement_ai",
    "tender": "procurement_ai",
    "contract": "contract_ai",
    "invoice": "procurement_ai",
    "purchase_order": "procurement_ai",
    "maintenance": "planning_ai",
    "inspection": "quality_ai",
    "safety": "safety_ai",
    "quality": "quality_ai",
    "risk": "risk_ai",
    "schedule": "planning_ai",
    "equipment": "planning_ai",
    "drawing_description": "drawing_ai",
    "engineering_report": "engineering_llm",
    "rfi": "engineering_llm",
    "method_statement": "engineering_llm",
    "prompt": "engineering_llm",
}

PROMPT_DIFFICULTIES = ("easy", "medium", "hard", "expert")
PROMPT_TYPES = (
    "chain_of_thought",
    "multi_step",
    "calculation",
    "comparison",
    "recommendation",
    "troubleshooting",
    "qa",
)

DATASET_TYPES = (
    "instruction",
    "question_answer",
    "conversation",
    "reasoning",
    "calculation",
    "code",
    "engineering_report",
    "specification",
    "contract",
    "tender",
)
