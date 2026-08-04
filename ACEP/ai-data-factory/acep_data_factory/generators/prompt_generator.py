"""Multi-difficulty engineering prompt generator for LLM fine-tuning."""

from __future__ import annotations

from acep_data_factory.core.base_generator import BaseGenerator
from acep_data_factory.core.constants import ENGINEERING_CODES, PROMPT_DIFFICULTIES, PROMPT_TYPES
from acep_data_factory.core.utils import bilingual, pick, rand_int, round2
from acep_data_factory.generators._project_context import build_project


class PromptGenerator(BaseGenerator):
    name = "prompt"
    domain = "Civil Engineering"
    dataset_type = "reasoning"

    def generate_one(self, index: int = 0) -> EngineeringSample:
        p = build_project(index)
        difficulty = PROMPT_DIFFICULTIES[index % len(PROMPT_DIFFICULTIES)]
        ptype = PROMPT_TYPES[index % len(PROMPT_TYPES)]
        return getattr(self, f"_gen_{ptype}", self._gen_qa)(p, difficulty, index)

    def _gen_calculation(self, p, difficulty: str, index: int):
        load = round2(p.building_area_m2 * 5.0)
        factored = round2(load * 1.4)
        instruction = bilingual(
            f"[{difficulty}] Calculate factored dead load if service load is {load} kN (factor 1.4).",
            f"[{difficulty}] احسب الحمل المضروب إذا كان الحمل {load} kN والمعامل 1.4.",
            self.language,
        )
        output = bilingual(
            f"Step 1: Service load = {load} kN\nStep 2: Load factor = 1.4\nStep 3: Factored load = {load} × 1.4 = {factored} kN",
            f"1) الحمل الخدمي = {load} kN\n2) المعامل = 1.4\n3) الحمل المضروب = {factored} kN",
            self.language,
        )
        return self._new_sample(
            instruction=instruction,
            output=output,
            difficulty=difficulty,
            metadata={"prompt_type": "calculation"},
            calculations=[{"factored_kN": factored}],
            project_id=p.project_id,
            index=index,
        )

    def _gen_chain_of_thought(self, p, difficulty: str, index: int):
        instruction = bilingual(
            f"[{difficulty}] Should we use raft or isolated footings for {p.project_type} with {p.floors} floors?",
            f"[{difficulty}] هل نستخدم لبشة أم قواعد منفصلة لـ {p.project_type} بـ {p.floors} أدوار؟",
            self.language,
        )
        choice = "Raft foundation" if p.floors > 8 or p.building_area_m2 > 5000 else "Isolated footings"
        output = bilingual(
            f"1) Review soil bearing and loads\n2) Floors={p.floors}, area={p.building_area_m2} m2\n3) High load spread favors raft for tall/heavy buildings\n4) Recommendation: {choice}",
            f"1) مراجعة التربة والأحمال\n2) الأدوار={p.floors}، المساحة={p.building_area_m2} م²\n3) الأحمال العالية ت favor اللبشة\n4) التوصية: {choice}",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "chain_of_thought"}, project_id=p.project_id, index=index)

    def _gen_comparison(self, p, difficulty: str, index: int):
        instruction = bilingual(
            f"[{difficulty}] Compare precast vs cast-in-place for {p.project_type} schedule.",
            f"[{difficulty}] قارن Precast مع Cast-in-place من حيث الجدول لـ {p.project_type}.",
            self.language,
        )
        output = bilingual(
            "Precast: faster erection, factory QC, crane dependency\nCast-in-place: flexible geometry, longer cycle, lower mobilization for small sites\n"
            f"For {p.duration_months} month duration, hybrid approach may optimize critical path.",
            "Precast: تركيب أسرع، جودة مصنع، يحتاج رافعة\nCast-in-place: مرونة هندسية، دورة أطول\n"
            f"لمدة {p.duration_months} شهر، نهج هجين قد يحسّن المسار الحرج.",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "comparison"}, project_id=p.project_id, index=index)

    def _gen_recommendation(self, p, difficulty: str, index: int):
        code = pick(ENGINEERING_CODES)
        instruction = bilingual(
            f"[{difficulty}] Recommend fire protection approach per {code['code']} for {p.project_type}.",
            f"[{difficulty}] أوصِ بنظام حماية حريق وفق {code['code']} لـ {p.project_type}.",
            self.language,
        )
        output = bilingual(
            f"Reference: {code['code']}\nProvide sprinklers, hose reels, smoke detection, egress signage\nCoordinate with approved fire strategy submittal.",
            f"المرجع: {code['code']}\nرشاشات، خراطيم، كواشف دخان، لافتات مخارج\nالتنسيق مع استراتيجية الحريق المعتمدة.",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "recommendation", "code": code["code"]}, project_id=p.project_id, index=index)

    def _gen_troubleshooting(self, p, difficulty: str, index: int):
        instruction = bilingual(
            f"[{difficulty}] Troubleshoot excessive slab deflection on floor {rand_int(1, p.floors)}.",
            f"[{difficulty}] تشخيص زيادة انحراف بلاطة في الدور {rand_int(1, p.floors)}.",
            self.language,
        )
        output = bilingual(
            "Check: design span/depth, shoring removal timing, concrete strength at stripping, live load during works\n"
            "Actions: survey deflection, structural review, temporary propping if L/360 exceeded.",
            "تحقق: البحر/العمق، إزالة الدعامات، مقاومة الخرسانة، الأحمال أثناء التنفيذ\n"
            "إجراءات: مسح، مراجعة إنشائية، دعامات مؤقتة إذا تجاوز L/360.",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "troubleshooting"}, project_id=p.project_id, index=index)

    def _gen_multi_step(self, p, difficulty: str, index: int):
        instruction = bilingual(
            f"[{difficulty}] Multi-step: estimate rebar for column {rand_int(400, 800)}×{rand_int(400, 800)} mm, height 3.2 m.",
            f"[{difficulty}] متعدد الخطوات: قدّر حديد عمود {rand_int(400, 800)}×{rand_int(400, 800)} مم، ارتفاع 3.2 م.",
            self.language,
        )
        output = bilingual(
            "Step 1: Determine bar schedule from drawing\nStep 2: Calculate main bars + ties\nStep 3: Add lap lengths and waste 7%\nStep 4: Convert to ton using unit weight 0.00617 kg/mm/m",
            "1) جدول التسليح من المخطط\n2) حساب الأسياخ والكانات\n3) إضافة التوصيل والهدر 7%\n4) التحويل للطن",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "multi_step"}, project_id=p.project_id, index=index)

    def _gen_qa(self, p, difficulty: str, index: int):
        instruction = bilingual(
            f"[{difficulty}] What is the estimated concrete volume for this {p.project_type}?",
            f"[{difficulty}] ما حجم الخرسانة التقديري لهذا {p.project_type}؟",
            self.language,
        )
        output = bilingual(
            f"The estimated concrete volume is {p.concrete_m3} m3 based on area {p.building_area_m2} m2 and {p.floors} floors.",
            f"حجم الخرسانة التقديري {p.concrete_m3} م³ بناءً على مساحة {p.building_area_m2} م² و{p.floors} أدوار.",
            self.language,
        )
        return self._new_sample(instruction=instruction, output=output, difficulty=difficulty, metadata={"prompt_type": "qa"}, project_id=p.project_id, index=index)
