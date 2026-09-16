/**
 * MEP Inference — Evidence-Driven MEP System Inference
 * Phase 1: Intelligent Project Understanding (Rebuilt — No Assumptions)
 *
 * Only infers when project type is known from evidence.
 * When area/floors are unknown, relevant fields return null.
 */
class MEPInference {
  constructor(kb) {
    this.kb = kb;
  }

  infer(project, classifiedType, area, floors) {
    if (!classifiedType) {
      return this._unknownAll('نوع المشروع غير معروف — لا يمكن تحديد الأنظمة الميكانيكية والكهربائية');
    }

    return {
      electrical: this._inferElectrical(classifiedType, area, floors),
      hvac: this._inferHVAC(classifiedType, area, floors),
      plumbing: this._inferPlumbing(classifiedType, area, floors),
      fireSafety: this._inferFireSafety(classifiedType, area, floors),
      networks: this._inferNetworks(classifiedType, area, floors),
      security: this._inferSecurity(classifiedType, area, floors),
      bms: this._inferBMS(classifiedType, area, floors),
      verticalTransport: this._inferVerticalTransport(classifiedType, floors),
      emergency: this._inferEmergencySystems(classifiedType, area, floors),
      specialSystems: this._inferSpecialSystems(classifiedType)
    };
  }

  _unknownAll(reason) {
    return {
      electrical: { value: null, confidence: 0, source: 'none', reason },
      hvac: { value: null, confidence: 0, source: 'none', reason },
      plumbing: { value: null, confidence: 0, source: 'none', reason },
      fireSafety: { value: null, confidence: 0, source: 'none', reason },
      networks: { value: null, confidence: 0, source: 'none', reason },
      security: { value: null, confidence: 0, source: 'none', reason },
      bms: { value: null, confidence: 0, source: 'none', reason },
      verticalTransport: { value: null, confidence: 0, source: 'none', reason },
      emergency: { value: null, confidence: 0, source: 'none', reason },
      specialSystems: { value: null, confidence: 0, source: 'none', reason }
    };
  }

  _inferElectrical(type, area, floors) {
    const loadPerM2 = {
      Villa: 0.12, Luxury_Villa: 0.15, Apartment: 0.08, Apartment_Building: 0.10,
      Residential_Tower: 0.11, Hotel: 0.14, Hospital: 0.20,
      School: 0.08, Office_Building: 0.12, Mall: 0.18,
      Factory: 0.15, Warehouse: 0.05, Mosque: 0.08,
      Data_Center: 2.0, Power_Plant: 0.25, Water_Treatment: 0.10,
      Sports_Club: 0.12, Cinema_Theater: 0.16, Infrastructure: 0.02
    };
    const loadPerM2Val = loadPerM2[type];
    if (!loadPerM2Val) return { estimatedLoadKVA: null, loadPerM2: null, mainDistribution: null, backupGenerator: null, ups: null, lightingType: null, confidence: 0, reason: 'نوع المشروع غير معروف للنظام الكهربائي' };

    if (area === null) {
      return {
        estimatedLoadKVA: null,
        loadPerM2: loadPerM2Val,
        mainDistribution: floors !== null && floors > 10 ? 'Medium Voltage Distribution' : 'Low Voltage Distribution',
        backupGenerator: ['Hospital', 'Data_Center', 'Hotel', 'Residential_Tower'].includes(type) ? 'Required' : 'Optional',
        ups: ['Data_Center', 'Hospital', 'Hotel'].includes(type) ? 'Required' : 'Optional',
        lightingType: type === 'Mall' ? 'Architectural + Emergency' : 'General + Emergency',
        confidence: 30,
        reason: 'المساحة غير معروفة — لا يمكن تقدير الحمولة'
      };
    }

    const load = loadPerM2Val * area;
    const totalVA = load * 1000;
    return {
      estimatedLoadKVA: Math.round(totalVA / 1000),
      loadPerM2: loadPerM2Val,
      mainDistribution: floors !== null && floors > 10 ? 'Medium Voltage Distribution' : 'Low Voltage Distribution',
      backupGenerator: ['Hospital', 'Data_Center', 'Hotel', 'Residential_Tower'].includes(type) ? 'Required' : 'Optional',
      ups: ['Data_Center', 'Hospital', 'Hotel'].includes(type) ? 'Required' : 'Optional',
      lightingType: type === 'Mall' ? 'Architectural + Emergency' : 'General + Emergency',
      confidence: 60,
      reason: `تقدير كهربائي بناءً على ${area} م² ونوع ${type}`
    };
  }

  _inferHVAC(type, area, floors) {
    const coolingPerM2 = {
      Villa: 0.25, Luxury_Villa: 0.30, Apartment: 0.18, Apartment_Building: 0.20,
      Residential_Tower: 0.25, Hotel: 0.35, Hospital: 0.50,
      School: 0.20, Office_Building: 0.30, Mall: 0.45,
      Factory: 0.15, Warehouse: 0.10, Mosque: 0.25,
      Data_Center: 1.50, Sports_Club: 0.35, Cinema_Theater: 0.40,
      Power_Plant: 0.10, Water_Treatment: 0.10
    };
    const systemType = {
      Villa: 'Split Units / Ducted Split',
      Luxury_Villa: 'VRF System',
      Apartment: 'Split Units (Individual)',
      Apartment_Building: 'Split Units (Individual)',
      Residential_Tower: 'Chilled Water + FCU',
      Hotel: 'Chilled Water + FCU + VRF for Suites',
      Hospital: 'Chilled Water + AHU + HEPA Filtration',
      School: 'Split Units / Cassettes',
      Office_Building: 'VRF / Chilled Water + AHU',
      Mall: 'Chilled Water + AHU + Large Air Handling',
      Factory: 'Industrial Ventilation + Spot Cooling',
      Warehouse: 'Ventilation + Exhaust Fans',
      Mosque: 'Split Units / Ducted AC',
      Data_Center: 'Precision Cooling (CRAC/CRAH) + In-Row Cooling',
      Sports_Club: 'Chilled Water + AHU',
      Cinema_Theater: 'Chilled Water + AHU + Acoustic Ducting',
      Power_Plant: 'Industrial Ventilation',
      Water_Treatment: 'Ventilation + Dehumidification',
    };
    const coolVal = coolingPerM2[type];
    const sysVal = systemType[type];

    if (!coolVal && !sysVal) return { systemType: null, estimatedCoolingTR: null, coolingPerM2: null, ventilation: null, specialRequirements: null, confidence: 0, reason: 'نوع المشروع غير معروف لنظام التكييف' };

    let estimatedCoolingTR = null;
    if (area !== null && coolVal) {
      const cooling = coolVal * area;
      estimatedCoolingTR = Math.round(cooling / 3.517);
    }

    return {
      systemType: sysVal || null,
      estimatedCoolingTR,
      coolingPerM2: coolVal || null,
      ventilation: ['Data_Center', 'Factory', 'Warehouse'].includes(type) ? 'Mechanical Ventilation Required' : 'Natural + Mechanical',
      specialRequirements: type === 'Hospital' ? 'HEPA Filters, Isolation Room Pressure Control' :
                          type === 'Data_Center' ? 'Cold Aisle Containment, Humidity Control' :
                          type === 'Cinema_Theater' ? 'Acoustic Ducting, Low Noise' : 'Standard',
      confidence: estimatedCoolingTR ? 60 : 35,
      reason: estimatedCoolingTR ? `تقدير تكييف بناءً على ${area} م² ونوع ${type}` : `نوع النظام معروف لكن المساحة غير محددة — لا يمكن تقدير الحمولة`
    };
  }

  _inferPlumbing(type, area, floors) {
    const waterDemandPerM2 = {
      Villa: 8, Luxury_Villa: 10, Apartment: 7, Apartment_Building: 7.5,
      Residential_Tower: 8.5, Hotel: 13, Hospital: 18,
      School: 6, Office_Building: 5, Mall: 6,
      Factory: 6, Warehouse: 2, Mosque: 9,
      Sports_Club: 7, Data_Center: 3, Power_Plant: 10,
      Water_Treatment: 20, Farm: 25
    };
    const drainageType = {
      Villa: 'Separate (Sanitary + Stormwater)',
      Apartment_Building: 'Separate (Sanitary + Stormwater)',
      Residential_Tower: 'Separate + Grey Water Recycling',
      Hotel: 'Separate + Grey Water Recycling',
      Hospital: 'Separate + Medical Waste Treatment',
      Factory: 'Industrial Waste Treatment Plant',
      Mall: 'Separate + Grease Traps',
      Mosque: 'Separate + Ablution Water Collection',
      Data_Center: 'Standard + Leak Detection',
      Water_Treatment: 'Process Water Systems',
    };
    const waterVal = waterDemandPerM2[type];
    if (!waterVal) return { dailyWaterDemandL: null, waterSource: null, drainageType: null, hotWater: null, irrigation: null, specialSystems: null, confidence: 0, reason: 'نوع المشروع غير معروف لنظام السباكة' };

    return {
      dailyWaterDemandL: area !== null ? Math.round(waterVal * area) : null,
      waterSource: type === 'Water_Treatment' ? 'Raw Water Intake' : 'Municipal Supply',
      drainageType: drainageType[type] || 'Combined System',
      hotWater: ['Hotel', 'Hospital', 'Luxury_Villa', 'Residential_Tower', 'Sports_Club'].includes(type) ? 'Central Hot Water System' : 'Individual Water Heaters',
      irrigation: ['Villa', 'Luxury_Villa', 'Residential_Compound', 'Park', 'Sports_Club', 'Mosque'].includes(type) ? 'Landscape Irrigation System' : 'Minimal',
      specialSystems: type === 'Hospital' ? 'Medical Gas Piping, Vacuum System' :
                      type === 'Mosque' ? 'Ablution Water Recycling' :
                      type === 'Hotel' ? 'Grey Water Recycling' :
                      type === 'Water_Treatment' ? 'Process Piping, Chemical Dosing' : 'None',
      confidence: area !== null ? 55 : 35,
      reason: area !== null ? `تقدير طلب مائي مفاهيمي بناءً على ${area} م² ونوع ${type}` : `المساحة غير معروفة — لا يمكن تقدير الاستهلاك اليومي`
    };
  }

  _inferFireSafety(type, area, floors) {
    const systems = {
      Villa: { sprinklers: false, alarms: true, hoseReel: false, extinguishers: true, special: 'None' },
      Luxury_Villa: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'None' },
      Apartment: { sprinklers: false, alarms: true, hoseReel: false, extinguishers: true, special: 'None' },
      Apartment_Building: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Smoke Management' },
      Residential_Tower: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Pressurized Stairs + Smoke Management' },
      Hotel: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Voice Evacuation + Pressurized Stairs' },
      Hospital: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Voice Evacuation + Medical Gas Shutoff' },
      School: { sprinklers: area !== null && area > 2000, alarms: true, hoseReel: false, extinguishers: true, special: 'Manual Call Points' },
      Office_Building: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Voice Evacuation' },
      Mall: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Smoke Curtains + Voice Evacuation + Emergency Lighting' },
      Factory: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'Foam Suppression (Flammable Areas)' },
      Warehouse: { sprinklers: true, alarms: true, hoseReel: false, extinguishers: true, special: 'ESFR Sprinklers (High Rack)' },
      Mosque: { sprinklers: false, alarms: true, hoseReel: true, extinguishers: true, special: 'None' },
      Data_Center: { sprinklers: false, alarms: true, hoseReel: false, extinguishers: true, special: 'Gas-Based Suppression (FM200/Novec)' },
      Sports_Club: { sprinklers: true, alarms: true, hoseReel: true, extinguishers: true, special: 'None' },
      Power_Plant: { sprinklers: false, alarms: true, hoseReel: true, extinguishers: true, special: 'Foam + CO2 Suppression' },
      Water_Treatment: { sprinklers: false, alarms: true, hoseReel: false, extinguishers: true, special: 'Gas Detection + Chlorine Scrubbing' },
    };
    const sys = systems[type];
    if (!sys) return { value: null, confidence: 0, source: 'none', reason: 'نوع المشروع غير معروف لنظام الحريق' };
    return { value: sys, confidence: 65, source: 'knowledgeBase', reason: `نظام الحريق النموذجي لـ ${type}` };
  }

  _inferNetworks(type, area, floors) {
    const level = {
      Villa: 'Basic', Luxury_Villa: 'Advanced', Apartment: 'Basic', Apartment_Building: 'Basic',
      Residential_Tower: 'Advanced', Hotel: 'Advanced', Hospital: 'Enterprise',
      School: 'Basic', Office_Building: 'Enterprise', Mall: 'Advanced',
      Factory: 'Basic', Warehouse: 'Basic', Data_Center: 'Tier 3+',
      Sports_Club: 'Advanced', Cinema_Theater: 'Advanced', Power_Plant: 'Industrial',
      Water_Treatment: 'Industrial'
    };
    const lvl = level[type];
    if (!lvl) return { structuredCabling: null, wifi: null, telephone: null, level: null, confidence: 0, reason: 'نوع المشروع غير معروف للشبكات' };
    return {
      structuredCabling: ['Hospital', 'Office_Building', 'Data_Center', 'Hotel', 'Residential_Tower'].includes(type) ? 'Category 6A / Fiber Optic Backbone' : 'Category 6',
      wifi: ['Villa', 'Luxury_Villa'].includes(type) ? 'Mesh Wi-Fi' : 'Enterprise Wi-Fi 6',
      telephone: ['Hotel', 'Office_Building', 'Hospital'].includes(type) ? 'VoIP System' : 'Basic',
      level: lvl,
      confidence: 55,
      reason: `مستوى الشبكات النموذجي لـ ${type}`
    };
  }

  _inferSecurity(type, area, floors) {
    const systems = {
      Villa: { cctv: false, accessControl: false, intercom: true, gate: true, smartHome: false },
      Luxury_Villa: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: true },
      Apartment: { cctv: false, accessControl: false, intercom: true, gate: true, smartHome: false },
      Apartment_Building: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: false },
      Residential_Tower: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: false },
      Hotel: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: true },
      Hospital: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: false },
      School: { cctv: true, accessControl: true, intercom: true, gate: true, smartHome: false },
      Office_Building: { cctv: true, accessControl: true, intercom: false, gate: true, smartHome: false },
      Mall: { cctv: true, accessControl: false, intercom: false, gate: false, smartHome: false },
      Factory: { cctv: true, accessControl: true, intercom: false, gate: true, smartHome: false },
      Data_Center: { cctv: true, accessControl: true, intercom: false, gate: true, smartHome: false, biometric: true },
    };
    const sys = systems[type];
    if (!sys) return { value: null, confidence: 0, source: 'none', reason: 'نوع المشروع غير معروف لنظام الأمن' };
    return { value: sys, confidence: 55, source: 'knowledgeBase', reason: `نظام الأمن النموذجي لـ ${type}` };
  }

  _inferBMS(type, area, floors) {
    if (['Residential_Tower', 'Hotel', 'Hospital', 'Mall', 'Office_Building', 'Data_Center'].includes(type)) {
      return { required: true, scope: 'HVAC Control, Lighting Control, Energy Monitoring, Metering', confidence: 60, reason: `BMS مطلوب لـ ${type}` };
    }
    if (['Luxury_Villa', 'Apartment_Building', 'School', 'Factory'].includes(type)) {
      return { required: false, scope: 'Basic HVAC + Lighting Control', confidence: 45, reason: `BMS اختياري لـ ${type}` };
    }
    return { required: false, scope: 'None', confidence: 30, reason: `BMS غير مطلوب عادةً لـ ${type}` };
  }

  _inferVerticalTransport(type, floors) {
    if (floors === null) return { elevators: null, escalators: null, elevatorType: null, confidence: 0, reason: 'عدد الأدوار غير معروف' };
    if (floors <= 2 && type !== 'Mall' && type !== 'Residential_Tower') return { elevators: 0, escalators: 0, elevatorType: 'None', confidence: 80, reason: `لا حاجة لمصعد — ${floors} أدوار` };

    const elevatorCount = {
      Villa: 0, Luxury_Villa: floors > 2 ? 1 : 0,
      Apartment: 0,
      Apartment_Building: Math.max(1, Math.ceil(floors / 8)),
      Residential_Tower: Math.max(2, Math.ceil(floors / 6)),
      Hotel: Math.max(2, Math.ceil(floors / 8)),
      Hospital: Math.max(3, Math.ceil(floors / 6)),
      Office_Building: Math.max(2, Math.ceil(floors / 8)),
      Mall: Math.max(2, Math.ceil(floors / 3)),
      School: floors > 3 ? 1 : 0,
      Data_Center: floors > 2 ? 1 : 0,
    };
    const escalatorCount = {
      Mall: Math.max(2, Math.ceil(floors * 2)),
      Office_Building: floors > 10 ? Math.max(1, Math.ceil(floors / 5)) : 0,
      Hotel: floors > 10 ? Math.max(1, Math.ceil(floors / 10)) : 0,
    };
    const elev = elevatorCount[type];
    if (elev === undefined) return { elevators: null, escalators: null, elevatorType: null, confidence: 0, reason: `نوع المشروع غير معروف للنقل الرأسي` };

    return {
      elevators: elev,
      escalators: escalatorCount[type] || 0,
      elevatorType: floors > 20 ? 'High-Speed Traction' : floors > 5 ? 'Hydraulic / Traction' : 'None',
      confidence: 60,
      reason: `تقدير النقل الرأسي بناءً على ${floors} أدوار ونوع ${type}`
    };
  }

  _inferEmergencySystems(type, area, floors) {
    if (!type) return { emergencyPower: null, emergencyLighting: null, exitSigns: null, confidence: 0, reason: 'نوع المشروع غير معروف' };
    return {
      emergencyPower: ['Hospital', 'Data_Center', 'Hotel', 'Residential_Tower'].includes(type) ? 'Dual Generator + UPS' :
                      ['Mall', 'Office_Building', 'Factory'].includes(type) ? 'Generator + UPS for Critical' : 'UPS Only for Critical',
      emergencyLighting: true,
      exitSigns: true,
      confidence: 55,
      reason: `نظام الطوارئ النموذجي لـ ${type}`
    };
  }

  _inferSpecialSystems(type) {
    const map = {
      Hospital: ['Medical Gas System', 'Nurse Call System', 'Doctor Paging', 'Operation Room Systems'],
      Data_Center: ['Structured Cabling System', 'Environmental Monitoring', 'Leak Detection'],
      Hotel: ['Room Management System', 'Entertainment System', 'Mini-Bar Monitoring'],
      Cinema_Theater: ['Acoustic Treatment', 'Projection Systems', 'Surround Sound'],
      Mosque: ['Call to Prayer System', 'Quran Distribution', 'Ablution Automation'],
      Power_Plant: ['SCADA System', 'Substation Automation', 'Protection Relays'],
      Water_Treatment: ['SCADA System', 'Process Control', 'Chemical Dosing Automation'],
      Mall: ['Parking Management System', 'Digital Signage', 'Wayfinding'],
      Sports_Club: ['Scoreboard System', 'Sound System', 'Lighting Control'],
      Villa: ['Smart Home System'],
      Luxury_Villa: ['Smart Home System', 'Home Theater', 'Automated Curtains'],
    };
    const sys = map[type];
    return { value: sys || [], confidence: sys ? 55 : 0, source: 'knowledgeBase', reason: sys ? `الأنظمة الخاصة بـ ${type}` : 'لا توجد أنظمة خاصة معروفة' };
  }
}

module.exports = MEPInference;
