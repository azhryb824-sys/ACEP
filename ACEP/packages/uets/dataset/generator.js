class UETSDatasetGenerator {
  constructor(uetsCore) {
    this.core = uetsCore;
  }

  generateCSVTrainingData(egts) {
    const projects = [];
    const boqItems = [];
    const materialPrices = [];
    const laborRates = [];
    const equipmentRates = [];
    const suppliers = [];
    const risks = [];
    const qualityDefects = [];

    for (const egt of egts) {
      projects.push({
        project_id: egt.uuid,
        city: egt.location.city,
        region: egt.location.region,
        project_type: egt.classification.projectType,
        land_area_m2: egt.geometry.landArea,
        building_area_m2: egt.geometry.buildingArea || egt.geometry.totalArea / Math.max(1, egt.geometry.floors),
        floors: egt.geometry.floors,
        units: egt.geometry.units,
        finishing_level: egt.geometry.finishing,
        construction_method: egt.geometry.constructionMethod,
        structural_system: egt.geometry.structure,
        concrete_m3: this._getMaterialQty(egt, 'Concrete'),
        steel_ton: this._getMaterialQty(egt, 'Steel'),
        blocks_m2: this._getMaterialQty(egt, 'Blocks'),
        tiles_m2: this._getMaterialQty(egt, 'Tiles'),
        paint_m2: this._getMaterialQty(egt, 'Paint'),
        electrical_points: this._getMaterialQty(egt, 'Electrical'),
        plumbing_points: this._getMaterialQty(egt, 'Plumbing'),
        estimated_cost_sar: egt.cost.total,
        duration_months: egt.schedule.totalDurationMonths,
        year: new Date().getFullYear()
      });

      for (const boq of egt.boq) {
        boqItems.push({
          project_id: egt.uuid,
          item_code: boq.code,
          description_ar: boq.descriptionAr || boq.description,
          category: boq.category,
          unit: boq.unit,
          quantity: boq.quantity,
          unit_price_sar: boq.unitPrice,
          confidence: boq.confidence,
          waste_factor: boq.wasteFactor
        });
      }

      for (const mat of egt.materials) {
        if (mat.unitPrice > 0) {
          materialPrices.push({
            material_name: mat.name,
            category: mat.category || 'General',
            unit: mat.unit,
            city: egt.location.city,
            supplier_name: '',
            avg_price_sar: mat.unitPrice,
            price_date: new Date().toISOString().split('T')[0],
            quality_grade: mat.qualityGrade || 'Standard'
          });
        }
      }

      for (const risk of egt.risks) {
        risks.push({
          project_id: egt.uuid,
          risk_category: risk.category,
          description: risk.description,
          probability: risk.probability,
          impact: risk.impact,
          mitigation: risk.mitigation,
          detected_by_ai: true
        });
      }

      for (const defect of (egt.quality && egt.quality.defectTypes || [])) {
        qualityDefects.push({
          project_id: egt.uuid,
          defect_type: defect.type,
          severity: defect.severity,
          location: defect.location || '',
          element_type: defect.elementType || '',
          detected_by: 'ai',
          confidence: defect.confidence,
          status: 'open'
        });
      }

      for (const sup of egt.suppliers) {
        const key = `${sup.name}|${sup.city}`;
        if (!this._seenSupplier(key)) {
          suppliers.push({
            supplier_name: sup.name,
            city: sup.city || egt.location.city,
            speciality: sup.speciality || egt.classification.projectType,
            rating: sup.rating,
            delivery_speed_days: sup.deliverySpeedDays,
            contract_years: 1,
            compliance_percent: sup.compliancePercent,
            total_deals: sup.totalDeals
          });
          this._supplierSeen.add(key);
        }
      }
    }

    return { projects, boqItems, materialPrices, laborRates, equipmentRates, suppliers, risks, qualityDefects };
  }

  generateJSONLTrainingData(egts, domain) {
    const samples = [];
    for (const egt of egts) {
      const sample = this._buildJSONLSample(egt, domain);
      if (sample) samples.push(sample);
    }
    return samples;
  }

  generateJSONLForAllDomains(egts) {
    const domains = ['contract_ai', 'cost_ai', 'drawing_ai', 'engineering_llm', 'planning_ai', 'procurement_ai', 'quality_ai', 'quantity_ai', 'risk_ai', 'safety_ai'];
    const result = {};
    for (const domain of domains) {
      result[domain] = this.generateJSONLTrainingData(egts, domain);
    }
    return result;
  }

  writeJSONLToDisk(outputDir, egts, options = {}) {
    const fs = require('fs');
    const path = require('path');
    const splitRatio = options.validationRatio || 0.1;
    const domains = this.generateJSONLForAllDomains(egts);
    const written = {};

    for (const [domain, samples] of Object.entries(domains)) {
      const dir = path.join(outputDir, domain);
      fs.mkdirSync(dir, { recursive: true });
      const shuffled = samples.slice().sort(() => Math.random() - 0.5);
      const split = Math.floor(shuffled.length * (1 - splitRatio));
      const train = shuffled.slice(0, split);
      const val = shuffled.slice(split);

      const write = (file, rows) => {
        if (rows.length === 0) return 0;
        fs.writeFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
        return rows.length;
      };

      written[domain] = {
        train: write(path.join(dir, 'training.jsonl'), train),
        validation: write(path.join(dir, 'validation.jsonl'), val),
      };
    }

    console.log(`[UETS-Gen] Wrote ${Object.keys(written).length} JSONL domains to ${outputDir}`);
    return { domains: Object.keys(written).length, samples: written };
  }

  generateImagePrompts(egt) {
    const prompts = [];
    const type = egt.classification.projectType;
    const area = egt.geometry.totalArea;
    const floors = egt.geometry.floors;
    const city = egt.location.city;
    const finishing = egt.geometry.finishing;
    const materials = egt.materials.map(m => m.name).filter(Boolean).join(', ');

    const basePrompt = `${type} building, ${area} sqm, ${floors} floor${floors > 1 ? 's' : ''}` +
      (city ? ` in ${city}` : '') +
      (finishing ? `, ${finishing.toLowerCase()} finishing` : '') +
      (materials ? `, materials: ${materials}` : '') +
      ', Saudi Arabia, modern architectural style, photorealistic, 8K resolution, professional architectural photography';

    prompts.push({ type: 'exterior', prompt: basePrompt });
    prompts.push({ type: 'aerial', prompt: `Aerial drone view of ${basePrompt}, bird's eye perspective, showing surrounding landscape` });
    if (egt.geometry.floors > 0) {
      prompts.push({ type: 'interior', prompt: `Interior view of ${type}, modern furnished ${finishing.toLowerCase()} quality finish, spacious living area, professional interior photography, 8K` });
    }
    return prompts;
  }

  generate3DParams(egt) {
    return {
      projectType: egt.classification.projectType,
      area: egt.geometry.totalArea,
      floors: egt.geometry.floors,
      floorHeight: egt.geometry.floorHeight,
      totalHeight: egt.geometry.totalHeight || egt.geometry.floors * egt.geometry.floorHeight,
      structure: egt.geometry.structure,
      finishing: egt.geometry.finishing,
      boqItems: egt.boq.map(b => ({ code: b.code, name: b.description, quantity: b.quantity, unit: b.unit })),
      schedulePhases: egt.schedule.phases.map(p => ({ name: p.name, duration: p.durationMonths, order: p.order })),
      materials: egt.materials.map(m => ({ name: m.name, category: m.category }))
    };
  }

  _buildJSONLSample(egt, domain) {
    const id = `${domain}-${egt.uuid.substr(0, 8)}`;
    const type = egt.classification.projectType;
    const area = egt.geometry.totalArea;
    const floors = egt.geometry.floors;
    const city = egt.location.city;

    switch (domain) {
      case 'engineering_llm':
        return {
          id, domain,
          system: 'أنت مهندس مدني خبير في التشييد والبناء في المملكة العربية السعودية.',
          instruction: `حلل مشروع ${type} بمساحة ${area} م² و ${floors} أدوار في ${city || 'المملكة العربية السعودية'}. قدم تحليلاً هندسياً كاملاً.`,
          output: `مشروع ${type} بمساحة ${area} م² يتكون من ${floors} أدوار. التكلفة التقديرية: ${egt.cost.total} ريال سعودي. المدة المتوقعة: ${egt.schedule.totalDurationMonths} شهر.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'quantity_ai':
        return {
          id, domain,
          system: 'أنت خبير في حساب كميات مواد البناء.',
          instruction: `احسب كميات المواد المطلوبة لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: JSON.stringify({ concrete_m3: this._getMaterialQty(egt, 'Concrete'), steel_ton: this._getMaterialQty(egt, 'Steel'), blocks_m2: this._getMaterialQty(egt, 'Blocks'), tiles_m2: this._getMaterialQty(egt, 'Tiles'), paint_m2: this._getMaterialQty(egt, 'Paint') }),
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'cost_ai':
        return {
          id, domain,
          system: 'أنت خبير في تقدير تكاليف مشاريع البناء.',
          instruction: `قدر التكلفة الإجمالية لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `التكلفة التقديرية: ${egt.cost.total} ريال سعودي. تكلفة المتر المربع: ${egt.cost.perM2 || Math.round(egt.cost.total / area)} ريال.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'planning_ai':
        return {
          id, domain,
          system: 'أنت خبير في تخطيط وجدولة مشاريع البناء.',
          instruction: `ضع جدولاً زمنياً لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `المدة الإجمالية: ${egt.schedule.totalDurationMonths} شهر. إجمالي المراحل: ${egt.schedule.phases.length} مرحلة.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'risk_ai':
        return {
          id, domain,
          system: 'أنت خبير في إدارة مخاطر مشاريع البناء.',
          instruction: `حدد المخاطر المحتملة لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `عدد المخاطر المحددة: ${egt.risks.length}. المخاطر الرئيسية: ${egt.risks.slice(0, 3).map(r => `${r.category} (احتمال: ${Math.round(r.probability * 100)}%, تأثير: ${Math.round(r.impact * 100)}%)`).join('، ')}`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'quality_ai':
        return {
          id, domain,
          system: 'أنت خبير في مراقبة جودة مشاريع البناء.',
          instruction: `حدد معايير الجودة لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `العدد المتوقع للعيوب: ${(egt.quality && egt.quality.expectedDefects) || 3}. أنواع العيوب: ${(egt.quality && egt.quality.defectTypes || []).map(d => d.type).join('، ') || 'تشققات, تشطيبات'}`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'contract_ai':
        return {
          id, domain,
          system: 'أنت خبير في العقود الهندسية والمشتريات.',
          instruction: `أنشئ ملخص عقد لمشروع ${type} بمساحة ${area} م² في ${city || 'المملكة العربية السعودية'}.`,
          output: `عقد تنفيذ مشروع ${type} في ${city || 'المملكة العربية السعودية'} بمساحة إجمالية ${area} م². المدة: ${egt.schedule.totalDurationMonths} شهراً. القيمة: ${egt.cost.total} ريال سعودي.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'procurement_ai':
        return {
          id, domain,
          system: 'أنت خبير في المشتريات واللوجستics لمواد البناء.',
          instruction: `حدد احتياجات المشتريات لمشروع ${type} بمساحة ${area} م².`,
          output: `المواد المطلوبة: ${egt.materials.map(m => `${m.name}: ${m.quantity} ${m.unit}`).join('، ') || 'خرسانة, حديد, بلوك, بلاط'}. الموردون: ${egt.suppliers.length} مورد.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'drawing_ai':
        return {
          id, domain,
          system: 'أنت مهندس معماري خبير في إعداد المخططات.',
          instruction: `صف المخططات المعمارية المطلوبة لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `مخططات معمارية لمشروع ${type}: ${floors} أدوار بمساحة ${area} م². نظام إنشائي: ${egt.geometry.structure}. المخططات تشمل: مخططات معمارية, إنشائية, كهرباء, سباكة, ميكانيكا.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      case 'safety_ai':
        return {
          id, domain,
          system: 'أنت خبير في السلامة المهنية في مواقع البناء.',
          instruction: `حدد متطلبات السلامة لمشروع ${type} بمساحة ${area} م² و ${floors} أدوار.`,
          output: `مشروع ${type} بارتفاع ${egt.geometry.floors * 3} متر يتطلب: مهمات السلامة, تدريب العمال, خطة إخلاء, معدات حماية شخصية. مستوى التعقيد: ${egt.classification.complexity}/10.`,
          source: 'UETS-EGT-v1', created: new Date().toISOString()
        };

      default:
        return null;
    }
  }

  _getMaterialQty(egt, name) {
    const mat = egt.materials.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    return mat ? mat.quantity : 0;
  }

  _supplierSeen = new Set();
  _seenSupplier(key) {
    return this._supplierSeen.has(key);
  }
}

module.exports = { UETSDatasetGenerator };
