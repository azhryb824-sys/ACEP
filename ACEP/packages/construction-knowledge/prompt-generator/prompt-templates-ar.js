const PROMPT_TEMPLATES_AR = {
  exterior: [
    'صورة معمارية احترافية لـ {projectType}، تصميم {style}، {subtype}، المساحة {area}م²، {floors} طوابق، إضاءة {lighting}، {angle}، {quality}',
    'واجهة خارجية لـ {projectType} {style}، {subtype}، {floors} طوابق مع {feature}، {material}، {lighting}، {angle}، {quality}، {constraint}',
    'تصميم {style} لـ {projectType}، {subtype}، مساحة {area}م²، تشطيب {finishing}، {floors} طوابق، {lighting}، {angle}، {quality}، {constraint}',
    'مشهد معماري لـ {projectType} {style}، {subtype}، واجهة {finishing}، {floors} طوابق، {area}م²، {lighting}، {constraint}، {quality}',
    'رؤية معمارية لـ {projectType} حديث، {subtype}، مساحة {area}م²، {floors} طوابق، {finishing}، {style}، {lighting}، {angle}، {quality}، {constraint}',
  ],
  interior: [
    'تصميم داخلي لـ {roomType} في {projectType} {style}، {subtype}، {finishing}، {area}م²، {lighting}، {angle}، {quality}، {constraint}',
    'ديكور داخلي احترافي لـ {projectType}، {roomType}، {style}، {finishing}، {feature}، {material}، {lighting}، {quality}، {constraint}',
    'مساحة داخلية لـ {roomType}، {style}، {finishing}، {area}م²، {material}، {lighting}، {angle}، {quality}، {constraint}',
    'لقطة داخلية لـ {projectType} {style}، {roomType}، {subtype}، {floors} طوابق، {finishing}، {lighting}، {quality}، {constraint}',
  ],
  construction: [
    'موقع إنشاء لـ {projectType} {style}، مرحلة {phase}، {subtype}، المساحة {area}م²، {floors} طوابق، {material}، تشطيب {finishing}، {lighting}، {constraint}، {quality}',
    'توثيق إنشاء لـ {projectType}، مرحلة {phase}، {subtype}، {area}م²، {floors} طوابق، {material}، {lighting}، {constraint}، {quality}',
    'أعمال إنشاء {projectType} {style}، مرحلة {phase}، {subtype}، مساحة {area}م²، {floors} طوابق، {lighting}، {constraint}، {quality}',
    'صور موقع لـ {projectType} {style}، مرحلة {phase}، {subtype}، {finishing}، {area}م²، {material}، {lighting}، {constraint}',
  ],
  facade: [
    'تصميم واجهة {style} لـ {projectType}، {subtype}، {material}، {floors} طوابق، {area}م²، {lighting}، {angle}، {quality}، {constraint}',
    'واجهة {projectType} {style}، {subtype}، تشطيب {finishing}، {material}، {floors} طوابق، {lighting}، {quality}، {constraint}',
    'لقطة تفصيلية لواجهة {projectType} {style}، {material}، {finishing}، {feature}، {lighting}، {angle}، {quality}، {constraint}',
    'تصميم واجهة {projectType}، {style}، {subtype}، {material}، {floors} طوابق، {feature}، {lighting}، {angle}، {quality}',
  ],
  aerial: [
    'تصوير جوي لـ {projectType} {style}، {subtype}، المساحة {area}م²، {floors} طوابق، {lighting}، {quality}، {constraint}',
    'منظر جوي علوي لـ {projectType} {style}، {subtype}، مساحة {area}م²، {lighting}، {quality}، {constraint}',
    'لقطة جوية 45 درجة لـ {projectType}، {subtype}، {floors} طوابق، {style}، {lighting}، {quality}، {constraint}',
    'تصوير جوي بانورامي لـ {projectType} {style}، {subtype}، {area}م²، {lighting}، {constraint}، {quality}',
  ],
  night: [
    'إضاءة ليلية لـ {projectType} {style}، {subtype}، {floors} طوابق، {area}م²، {lighting}، {angle}، {quality}، {constraint}',
    'منظر ليلي لـ {projectType} {style}، {subtype}، {finishing}، {material}، {floors} طوابق، {lighting}، {quality}، {constraint}',
    'واجهة مضيئة لـ {projectType} {style}، {subtype}، {floors} طوابق، {area}م²، {lighting}، {angle}، {quality}، {constraint}',
    'لقطة ليلية احترافية لـ {projectType} {style}، {subtype}، {finishing}، {feature}، {lighting}، {quality}، {constraint}',
  ],
};

const PHASE_SPECIFIC_MAPPINGS_AR = {
  pre_construction:  { subtype: ['مخطط الموقع', 'دراسة الجدوى', 'تصور معماري', 'مخطط أولي'], template: 'construction' },
  excavation:       { subtype: ['حفر الأساسات', 'حفرة مفتوحة', 'حفر الخنادق'],             template: 'construction' },
  foundation:       { subtype: ['قواعد خرسانية', 'أسس مسلحة', 'قواعد منفصلة'],              template: 'construction' },
  structure:        { subtype: ['هيكل خرساني', 'هيكل حديدي', 'أعمدة وكمرات'],              template: 'construction' },
  masonry:          { subtype: ['جدران طوب', 'جدران حجرية', 'بناء طوب أحمر'],              template: 'construction' },
  plastering:       { subtype: ['لياسة جدران', 'تجليس', 'بياض'],                          template: 'construction' },
  electrical:       { subtype: ['تمديدات كهربائية', 'أسلاك وكابلات', 'لويحات كهربائية'],   template: 'construction' },
  plumbing:         { subtype: ['تمديدات سباكة', 'مواسير مياه', 'تمديدات صرف صحي'],        template: 'construction' },
  hvac:             { subtype: ['مجاري هواء', ['مكيفات سبليت', 'مكيفات مركزية']],           template: 'construction' },
  gypsum:           { subtype: ['أسقف جبس', 'ديكورات جبس', 'جدار جبس'],                    template: 'interior' },
  painting:         { subtype: ['دهان جدران', 'دهان أسقف', 'طلاء'],                        template: 'interior' },
  tiling:           { subtype: ['بلاط سيراميك', 'أرضيات بورسلان', 'تركيب رخام'],           template: 'interior' },
  facade:           { subtype: ['كسوة حجر', 'واجهة زجاج', 'ألمنيوم واجهات'],               template: 'facade' },
  finishing:        { subtype: ['تشطيب فاخر', 'لمسات نهائية', 'ديكورات'],                  template: 'interior' },
  handover:         { subtype: ['تام التسليم', 'جاهز', 'نهائي'],                           template: 'exterior' },
};

const QUALITY_TAGS_AR = [
  'واقعي فوتوغرافي', 'فائق الواقعية', 'بدقة 8K', 'HDR',
  'تصوير معماري احترافي', 'إضاءة احترافية', 'تفاصيل فائقة',
  'إضاءة سينمائية', 'هندسة معمارية حائزة على جوائز',
  'واقعي جداً', 'رندر V-Ray', 'تصور معماري',
  'دقة عالية', 'تفاصيل نسيج دقيقة', 'مواد واقعية',
];

const CONSTRAINT_TAGS_AR = [
  'بدون بشر', 'بدون مركبات', 'بدون حيوانات', 'بدون شعارات',
  'بدون نصوص', 'بدون علامات مائية', 'بدون ملصقات',
  'نسب معمارية صحيحة', 'منظور صحيح',
  'مواد واقعية', 'إضاءة واقعية',
  'تصور إنشائي', 'دقة معمارية',
];

module.exports = {
  PROMPT_TEMPLATES_AR,
  PHASE_SPECIFIC_MAPPINGS_AR,
  QUALITY_TAGS_AR,
  CONSTRAINT_TAGS_AR,
};
