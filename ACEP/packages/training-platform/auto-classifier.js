const db = require('./database');

class AutoClassifier {
  constructor(acepKnowledgeBase) { this.kb = acepKnowledgeBase || null; }

  async classifyImage(imageRecord) {
    if (!imageRecord) return null;
    if (!imageRecord.project_type || !imageRecord.phase) {
      return this._inferFromPrompt(imageRecord);
    }
    return { classified: false, message: 'Image already has sufficient metadata', completeness: this._computeCompleteness(imageRecord) };
  }

  async batchClassify(limit = 50) {
    const incomplete = (db.stores.training_images || []).filter(i => (!i.project_type || !i.phase) && !i.auto_classified).slice(0, limit);
    const results = [];
    for (const img of incomplete) {
      const result = await this._inferFromPrompt(img);
      if (result && result.classified) results.push({ id: img.id, ...result });
    }
    return results;
  }

  async _inferFromPrompt(imageRecord) {
    const prompt = (imageRecord.prompt || imageRecord.caption || '');
    const updates = {};
    if (!imageRecord.project_type) updates.project_type = this._inferProjectType(prompt);
    if (!imageRecord.phase) updates.phase = this._inferPhase(prompt);
    if (!imageRecord.architectural_style) updates.architectural_style = this._inferStyle(prompt);
    if (!imageRecord.finishing) updates.finishing = this._inferFinishing(prompt);
    if (!imageRecord.camera_angle) updates.camera_angle = this._inferCameraAngle(prompt);
    if (!imageRecord.lighting_type) updates.lighting_type = this._inferLighting(prompt);
    if (Object.keys(updates).length === 0) return { classified: false, message: 'No missing fields to fill' };

    db.update('training_images', imageRecord.id, { ...updates, auto_classified: 1 });
    const completeness = this._computeCompleteness({ ...imageRecord, ...updates });
    db.update('training_images', imageRecord.id, { metadata_complete: completeness });
    return { classified: true, updates, completeness };
  }

  _inferProjectType(p) {
    const l = p.toLowerCase();
    if (l.includes('mosque') || l.includes('مسجد') || l.includes('islamic')) return 'mosque';
    if (l.includes('villa') || l.includes('فيلا')) return 'villa';
    if (l.includes('school') || l.includes('مدرسة') || l.includes('university')) return 'school';
    if (l.includes('hospital') || l.includes('مستشفى') || l.includes('clinic')) return 'hospital';
    if (l.includes('hotel') || l.includes('فندق')) return 'hotel';
    if (l.includes('mall') || l.includes('مول') || l.includes('shopping')) return 'mall';
    if (l.includes('factory') || l.includes('مصنع') || l.includes('industrial')) return 'industrial';
    if (l.includes('warehouse') || l.includes('مستودع')) return 'warehouse';
    if (l.includes('office') || l.includes('مكتب')) return 'office';
    if (l.includes('tower') || l.includes('برج')) return 'tower';
    if (l.includes('apartment') || l.includes('شقة') || l.includes('residential')) return 'residential';
    if (l.includes('bridge') || l.includes('جسر') || l.includes('road') || l.includes('طريق') || l.includes('highway')) return 'infrastructure';
    if (l.includes('power plant') || l.includes('محطة كهرباء') || l.includes('substation')) return 'industrial';
    if (l.includes('parking') || l.includes('موقف')) return 'parking';
    if (l.includes('stadium') || l.includes('sports') || l.includes('gym')) return 'sports';
    if (l.includes('airport') || l.includes('مطار')) return 'airport';
    if (l.includes('railway') || l.includes('station') || l.includes('قطار')) return 'transit';
    return null;
  }

  _inferPhase(p) {
    const l = p.toLowerCase();
    if (l.includes('excavation') || l.includes('حفر')) return 'Excavation';
    if (l.includes('foundation') || l.includes('أساس') || l.includes('قواعد')) return 'Foundations';
    if (l.includes('structure') || l.includes('هيكل') || l.includes('concrete frame')) return 'Structure';
    if (l.includes('masonry') || l.includes('طوب') || l.includes('blockwork')) return 'Masonry';
    if (l.includes('plaster') || l.includes('لياسة')) return 'Plastering';
    if (l.includes('electrical') || l.includes('plumbing') || l.includes('hvac') || l.includes('mep')) return 'MEP';
    if (l.includes('gypsum') || l.includes('جبس') || l.includes('ceiling')) return 'Finishes';
    if (l.includes('paint') || l.includes('دهان')) return 'Finishes';
    if (l.includes('tile') || l.includes('floor') || l.includes('سيراميك') || l.includes('بلاط')) return 'Finishes';
    if (l.includes('facade') || l.includes('واجهة') || l.includes('cladding')) return 'Facade';
    if (l.includes('finishing') || l.includes('تشطيب') || l.includes('interior')) return 'Finishes';
    if (l.includes('handover') || l.includes('completed') || l.includes('تسليم') || l.includes('final')) return 'Completed';
    if (l.includes('construction site') || l.includes('under construction')) return 'Structure';
    return null;
  }

  _inferStyle(p) {
    const l = p.toLowerCase();
    if (l.includes('islamic') || l.includes('إسلامي')) return 'Islamic';
    if (l.includes('arabic') || l.includes('عربي') || l.includes('mashrabiya')) return 'Arabic';
    if (l.includes('luxury modern')) return 'Luxury Modern';
    if (l.includes('modern')) return 'Modern';
    if (l.includes('minimalist') || l.includes('بسيط')) return 'Minimalist';
    if (l.includes('contemporary') || l.includes('معاصر')) return 'Contemporary';
    if (l.includes('neo classical') || l.includes('classical')) return 'Neo Classical';
    if (l.includes('high tech') || l.includes('high-tech')) return 'High Tech';
    if (l.includes('industrial') || l.includes('صناعي')) return 'Industrial';
    if (l.includes('parametric')) return 'Parametric';
    if (l.includes('mediterranean')) return 'Mediterranean';
    if (l.includes('scandinavian')) return 'Scandinavian';
    return null;
  }

  _inferFinishing(p) {
    const l = p.toLowerCase();
    if (l.includes('ultra luxury') || l.includes('ultra-luxury') || l.includes('فاخر جداً')) return 'Ultra Luxury';
    if (l.includes('luxury') || l.includes('فاخر') || l.includes('high-end')) return 'Luxury';
    if (l.includes('standard') || l.includes('متوسط') || l.includes('normal')) return 'Standard';
    if (l.includes('economic') || l.includes('اقتصادي') || l.includes('budget')) return 'Economic';
    return null;
  }

  _inferCameraAngle(p) {
    const l = p.toLowerCase();
    if (l.includes('aerial') || l.includes('drone') || l.includes('bird eye') || l.includes('جوي')) return 'Aerial';
    if (l.includes('top view') || l.includes('من الأعلى')) return 'Top View';
    if (l.includes('front view') || l.includes('واجهة') || l.includes('elevation')) return 'Front View';
    if (l.includes('interior') || l.includes('داخلي') || l.includes('inside')) return 'Interior';
    if (l.includes('corner') || l.includes('زاوية')) return 'Corner View';
    if (l.includes('street') || l.includes('شارع') || l.includes('eye level')) return 'Street Level';
    if (l.includes('close up') || l.includes('تفصيل') || l.includes('detail')) return 'Close Up';
    if (l.includes('wide angle') || l.includes('واسعة')) return 'Wide Angle';
    return null;
  }

  _inferLighting(p) {
    const l = p.toLowerCase();
    if (l.includes('daylight') || l.includes('day light') || l.includes('نهار') || l.includes('sunlight')) return 'Daylight';
    if (l.includes('golden hour') || l.includes('غروب') || l.includes('sunset') || l.includes('sunrise')) return 'Golden Hour';
    if (l.includes('night') || l.includes('ليل') || l.includes('evening') || l.includes('twilight')) return 'Night';
    if (l.includes('overcast') || l.includes('غائم') || l.includes('cloudy')) return 'Overcast';
    if (l.includes('architectural lighting') || l.includes('إضاءة معمارية')) return 'Architectural Lighting';
    if (l.includes('interior lighting') || l.includes('إضاءة داخلية')) return 'Interior Lighting';
    return null;
  }

  _computeCompleteness(record) {
    const required = ['project_type', 'phase', 'architectural_style', 'finishing', 'camera_angle', 'lighting_type'];
    const optional = ['subtype', 'area', 'floors', 'country', 'city', 'materials_used', 'caption'];
    let score = 0; let total = 0;
    for (const f of required) { total += 2; if (record[f]) score += 2; }
    for (const f of optional) { total += 1; if (record[f]) score += 1; }
    return total > 0 ? Math.round(score / total * 100) / 100 : 0;
  }
}

module.exports = AutoClassifier;
