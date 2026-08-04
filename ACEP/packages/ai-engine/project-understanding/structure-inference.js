/**
 * Structure Inference — Evidence-Driven Structural System Inference
 * Phase 1: Intelligent Project Understanding (Rebuilt — No Assumptions)
 *
 * Only infers when project type is known from evidence.
 * When floors/area are unknown, relevant fields return null.
 */
class StructureInference {
  constructor(kb) {
    this.kb = kb;
  }

  infer(project, classifiedType, area, floors) {
    if (!classifiedType) {
      return this._unknownAll('نوع المشروع غير معروف — لا يمكن تحديد الهيكل الإنشائي');
    }

    const pt = this.kb.getProjectType(classifiedType);
    return {
      structuralSystem: this._inferStructuralSystem(classifiedType, floors),
      foundation: this._inferFoundation(classifiedType, floors, pt),
      roof: this._inferRoof(classifiedType, pt),
      slabs: this._inferSlabSystem(classifiedType, floors),
      walls: this._inferWallSystem(classifiedType, floors),
      columns: this._inferColumnSystem(classifiedType, floors),
      height: this._inferHeight(floors, classifiedType),
      basement: this._inferBasement(classifiedType, floors),
      seismic: this._inferSeismicRequirements(classifiedType, floors),
      constructionMethod: this._inferConstructionMethod(classifiedType)
    };
  }

  _unknownAll(reason) {
    return {
      structuralSystem: { value: null, confidence: 0, source: 'none', reason },
      foundation: { value: null, confidence: 0, source: 'none', reason },
      roof: { value: null, confidence: 0, source: 'none', reason },
      slabs: { value: null, confidence: 0, source: 'none', reason },
      walls: { value: null, confidence: 0, source: 'none', reason },
      columns: { value: null, confidence: 0, source: 'none', reason },
      height: { value: null, confidence: 0, source: 'none', reason },
      basement: { value: null, confidence: 0, source: 'none', reason },
      seismic: { value: null, confidence: 0, source: 'none', reason },
      constructionMethod: { value: null, confidence: 0, source: 'none', reason }
    };
  }

  _inferStructuralSystem(type, floors) {
    const map = {
      Villa: 'Reinforced Concrete Frame',
      Luxury_Villa: 'Reinforced Concrete Frame with Shear Walls',
      Apartment: 'Reinforced Concrete Frame',
      Apartment_Building: 'Reinforced Concrete Frame with Shear Walls',
      Residential_Compound: 'Reinforced Concrete Frame',
      Residential_Tower: 'Reinforced Concrete Core with Shear Walls',
      Hotel: 'Reinforced Concrete Frame with Shear Walls',
      Hospital: 'Reinforced Concrete Frame with Shear Walls',
      School: 'Reinforced Concrete Frame',
      Office_Building: floors > 10 ? 'Steel Frame with Concrete Core' : 'Reinforced Concrete Frame',
      Mall: 'Steel Frame with Reinforced Concrete Core',
      Factory: floors > 1 ? 'Reinforced Concrete Frame' : 'Steel Frame with Metal Cladding',
      Warehouse: 'Steel Frame',
      Bridge: 'Prestressed Concrete / Steel',
      Road: 'Flexible Pavement / Rigid Pavement',
      Mosque: 'Reinforced Concrete Frame with Domes',
      Sports_Club: 'Steel Frame with Large Spans',
      Cinema_Theater: 'Steel Frame with Long Spans',
      Data_Center: 'Reinforced Concrete Frame with Raised Floors',
      Power_Plant: 'Steel Frame with Heavy Foundations',
      Water_Treatment: 'Reinforced Concrete Tanks and Structures',
      Infrastructure: 'Varies by Element',
      Farm: 'Light Steel Frame',
      Gas_Station: 'Steel Frame with Canopy',
      Park: 'Lightweight Structures',
      Church: 'Reinforced Concrete / Masonry',
      Islamic_Center: 'Reinforced Concrete Frame with Dome',
      Mixed_Use: 'Reinforced Concrete with Steel Elements',
    };
    return { value: map[type] || null, confidence: map[type] ? 70 : 0, source: 'knowledgeBase', reason: map[type] ? `نظام إنشائي نموذجي لـ ${type}` : `لا توجد بيانات كافية عن النوع ${type}` };
  }

  _inferFoundation(type, floors, pt) {
    let value = null;
    if (pt && pt.foundationType) value = pt.foundationType;
    else if (floors !== null && floors > 15) value = 'Mat / Raft Foundation with Piles';
    else if (floors !== null && floors > 5) value = 'Raft Foundation';
    else if (floors !== null) value = 'Isolated Footings';
    return { value, confidence: value ? 70 : 0, source: 'knowledgeBase', reason: value ? `نوع الأساسات النموذجي لـ ${type}` : 'لا توجد بيانات كافية' };
  }

  _inferRoof(type, pt) {
    let value = null;
    if (pt && pt.roofType) value = pt.roofType;
    else {
      const map = {
        Mosque: 'Dome Structure',
        Villa: 'Sloped Roof with Clay Tiles',
        Luxury_Villa: 'Flat Roof with Green Terrace',
        Factory: 'Metal Deck Roof',
        Warehouse: 'Metal Deck Roof',
        Mall: 'Flat Roof with Skylights',
        Sports_Club: 'Long-Span Metal Roof',
        Cinema_Theater: 'Long-Span Roof with Acoustic Treatment',
        School: 'Flat Roof',
        Hospital: 'Flat Roof with Helipad',
        Church: 'Vaulted / Pitched Roof',
        Data_Center: 'Flat Roof with Heavy Loading',
      };
      value = map[type] || null;
    }
    return { value, confidence: value ? 65 : 0, source: 'knowledgeBase', reason: value ? `نوع السقف النموذجي لـ ${type}` : 'لا توجد بيانات كافية' };
  }

  _inferSlabSystem(type, floors) {
    const map = {
      Villa: 'One-Way Ribbed Slab',
      Luxury_Villa: 'Two-Way Flat Slab',
      Apartment: 'Two-Way Flat Slab',
      Apartment_Building: 'Two-Way Flat Slab',
      Residential_Tower: 'Post-Tensioned Flat Slab',
      Hotel: 'Post-Tensioned Flat Slab',
      Hospital: 'Flat Slab with Drop Panels',
      Office_Building: floors !== null && floors > 10 ? 'Composite Steel Deck' : 'Two-Way Flat Slab',
      Mall: 'Post-Tensioned Flat Slab with Large Spans',
      Factory: 'Ground Slab + Metal Deck for Upper',
      Warehouse: 'Ground Slab (Heavy Duty)',
      Bridge: 'Prestressed Box Girder',
      Road: 'Reinforced Concrete Pavement',
      Mosque: 'Dome Shell Structure',
      Data_Center: 'Flat Slab with Raised Access Floor',
    };
    return { value: map[type] || null, confidence: map[type] ? 65 : 0, source: 'knowledgeBase', reason: map[type] ? `نظام البلاطات النموذجي لـ ${type}` : 'لا توجد بيانات كافية' };
  }

  _inferWallSystem(type, floors) {
    const map = {
      Villa: 'Hollow Concrete Block 20cm',
      Luxury_Villa: 'Double Wall: AAC Block + Stone Cladding',
      Apartment: 'Hollow Concrete Block 15cm',
      Apartment_Building: 'Hollow Concrete Block 20cm',
      Residential_Tower: 'Shear Walls + Hollow Block Partitions',
      Hotel: 'Drywall Partitions + Concrete Block',
      Hospital: 'Concrete Block + Lead-Lined Walls (X-Ray)',
      School: 'Concrete Block',
      Office_Building: 'Drywall Partitions + Glass Curtain Wall',
      Mall: 'Glass Curtain Wall + Drywall',
      Factory: 'Metal Cladding + Concrete Block (Office)',
      Warehouse: 'Metal Cladding',
      Mosque: 'Concrete Block + Stone/Marble Cladding',
      Data_Center: 'Concrete Block with Vapor Barrier',
      Power_Plant: 'Reinforced Concrete + Metal Cladding',
      Water_Treatment: 'Reinforced Concrete Walls',
      Infrastructure: 'Reinforced Concrete / Gabion',
      Farm: 'Lightweight / Mesh',
      Gas_Station: 'Concrete Block + Metal Cladding',
      Sports_Club: 'Hollow Concrete Block / Drywall',
      Cinema_Theater: 'Double Drywall with Acoustic Insulation',
    };
    return { value: map[type] || null, confidence: map[type] ? 60 : 0, source: 'knowledgeBase', reason: map[type] ? `نظام الجدران النموذجي لـ ${type}` : 'لا توجد بيانات كافية' };
  }

  _inferColumnSystem(type, floors) {
    const map = {
      Villa: 'Rectangular RC Columns 30x50cm',
      Luxury_Villa: 'Rectangular RC Columns 40x60cm + Architectural Columns',
      Apartment: 'Rectangular RC Columns 30x50cm',
      Apartment_Building: 'Rectangular RC Columns 40x60cm',
      Residential_Tower: 'Circular RC Columns + Shear Walls',
      Hotel: 'Rectangular RC Columns 50x70cm',
      Hospital: 'Rectangular RC Columns 50x70cm',
      Office_Building: floors !== null && floors > 10 ? 'Steel Columns + RC Core' : 'Rectangular RC Columns',
      Mall: 'Large-Span Steel Columns + RC Columns',
      Factory: 'Steel Columns',
      Warehouse: 'Steel Columns',
      Mosque: 'Circular RC Columns + Columns',
      Bridge: 'RC / Steel Piers',
      Data_Center: 'Rectangular RC Columns',
    };
    return { value: map[type] || null, confidence: map[type] ? 60 : 0, source: 'knowledgeBase', reason: map[type] ? `نظام الأعمدة النموذجي لـ ${type}` : 'لا توجد بيانات كافية' };
  }

  _inferHeight(floors, type) {
    if (floors === null) return { value: null, confidence: 0, source: 'none', reason: 'عدد الأدوار غير معروف' };
    let value;
    if (type === 'Mosque') value = Math.max(15, floors * 5);
    else if (type === 'Mall') value = floors * 5.5;
    else if (type === 'Warehouse' || type === 'Factory') value = Math.max(8, floors * 6);
    else if (type === 'Sports_Club' || type === 'Cinema_Theater') value = Math.max(10, floors * 6);
    else value = floors * 3.2;
    return { value, confidence: 55, source: 'estimation', reason: `تقدير الارتفاع بناءً على ${floors} أدوار ونوع ${type}` };
  }

  _inferBasement(type, floors) {
    if (floors === null || floors === undefined) return { value: null, confidence: 0, source: 'none', reason: 'عدد الأدوار غير معروف' };
    if (['Residential_Tower', 'Mall', 'Hotel', 'Hospital', 'Office_Building'].includes(type) && floors > 5) return { value: true, confidence: 70, source: 'knowledgeBase', reason: `عادةً ما يحتوي ${type} على دور قبو` };
    if (['Factory', 'Warehouse'].includes(type)) return { value: false, confidence: 60, source: 'knowledgeBase', reason: `عادةً لا يحتوي ${type} على قبو` };
    if (type === 'Road' || type === 'Bridge') return { value: false, confidence: 90, source: 'knowledgeBase', reason: `لا يحتوي ${type} على قبو` };
    if (floors > 3) return { value: true, confidence: 40, source: 'knowledgeBase', reason: `احتمالية وجود قبو للمباني التي تزيد عن 3 أدوار` };
    return { value: null, confidence: 0, source: 'none', reason: 'لا توجد بيانات كافية' };
  }

  _inferSeismicRequirements(type, floors) {
    if (floors === null) {
      if (['Residential_Tower', 'Hospital', 'School'].includes(type)) return { required: true, level: 'High', details: 'متطلبات زلزالية عالية حسب نوع المشروع', confidence: 50 };
      return { value: null, confidence: 0, source: 'none', reason: 'عدد الأدوار غير معروف' };
    }
    if (floors > 10 || ['Residential_Tower', 'Hospital', 'School'].includes(type)) {
      return { required: true, level: 'High', details: 'تفاصيل لدنة حسب SBC 301 / ACI 318', confidence: 75 };
    }
    if (floors > 5) {
      return { required: true, level: 'Moderate', details: 'كانات زلزالية خاصة، جدران قص', confidence: 65 };
    }
    if (type === 'Bridge' || type === 'Infrastructure') {
      return { required: true, level: 'High', details: 'أجهزة عزل زلزالي إذا لزم الأمر', confidence: 60 };
    }
    return { required: false, level: 'Standard', details: 'تفاصيل قياسية حسب SBC 301', confidence: 50 };
  }

  _inferConstructionMethod(type) {
    const methods = this.kb.getConstructionMethods() || [];
    const suitable = methods.filter(m => m.suitableFor.includes(type));
    const value = suitable.length > 0 ? suitable[0].name : null;
    return { value, confidence: value ? 60 : 0, source: 'knowledgeBase', reason: value ? `طريقة الإنشاء الموصى بها لـ ${type}` : 'لا توجد بيانات كافية' };
  }
}

module.exports = StructureInference;
