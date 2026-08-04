const STAGES = [
  {
    id: 'Empty_Land', nameAr: 'أرض فارغة', nameEn: 'Empty Land', order: 0,
    constructionElements: ['land'],
    materials: [], equipment: [], colorPalette: ['#8B7355', '#6B8E23', '#228B22'],
    duration: 0, progressWeight: 0, dependencies: [],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Site_Preparation', nameAr: 'تحضير الموقع', nameEn: 'Site Preparation', order: 1,
    constructionElements: ['cleared_area', 'survey_markers', 'site_fence', 'temporary_office'],
    materials: ['gravel', 'marker_paint', 'steak'],
    equipment: ['bulldozer', 'survey_equipment', 'compactor'],
    colorPalette: ['#D2B48C', '#A0522D', '#FFD700'],
    duration: 5, progressWeight: 1, dependencies: ['Empty_Land'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Excavation', nameAr: 'الحفر', nameEn: 'Excavation', order: 2,
    constructionElements: ['excavated_area', 'excavation_pit', 'soil_stack', 'shoring_system'],
    materials: ['soil'],
    equipment: ['excavator', 'dump_truck', 'shoring_equipment', 'pump'],
    colorPalette: ['#8B4513', '#A0522D', '#CD853F', '#D2691E'],
    duration: 10, progressWeight: 3, dependencies: ['Site_Preparation'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Backfilling', nameAr: 'الردم', nameEn: 'Backfilling', order: 3,
    constructionElements: ['backfilled_area', 'compacted_layer', 'gravel_layer'],
    materials: ['gravel', 'sand', 'compacted_soil'],
    equipment: ['compactor', 'loader', 'vibratory_roller'],
    colorPalette: ['#D2B48C', '#C4A882', '#B8860B', '#DEB887'],
    duration: 5, progressWeight: 2, dependencies: ['Excavation'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Foundations', nameAr: 'الأساسات', nameEn: 'Foundations', order: 4,
    constructionElements: ['footing', 'foundation_wall', 'reinforcement_cage', 'concrete_base', 'blinding_layer'],
    materials: ['concrete', 'reinforcement_steel', 'formwork', 'waterproofing_membrane'],
    equipment: ['concrete_pump', 'vibrator', 'crane', 'mixer_truck'],
    colorPalette: ['#808080', '#B22222', '#A0522D', '#696969'],
    duration: 14, progressWeight: 8, dependencies: ['Backfilling'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Columns', nameAr: 'الأعمدة', nameEn: 'Columns', order: 5,
    constructionElements: ['column_reinforcement', 'column_formwork', 'column_concrete', 'column_curing'],
    materials: ['concrete', 'reinforcement_steel', 'formwork', 'tie_wire'],
    equipment: ['crane', 'concrete_pump', 'vibrator', 'scaffolding'],
    colorPalette: ['#808080', '#B22222', '#A0522D', '#8B4513'],
    duration: 12, progressWeight: 7, dependencies: ['Foundations'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Beams', nameAr: 'الجسور', nameEn: 'Beams', order: 6,
    constructionElements: ['beam_reinforcement', 'beam_formwork', 'beam_concrete', 'beam_curing'],
    materials: ['concrete', 'reinforcement_steel', 'formwork', 'plywood'],
    equipment: ['crane', 'concrete_pump', 'vibrator', 'scaffolding'],
    colorPalette: ['#808080', '#B22222', '#8B4513', '#D2B48C'],
    duration: 10, progressWeight: 5, dependencies: ['Columns'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Slabs', nameAr: 'السقف', nameEn: 'Slabs', order: 7,
    constructionElements: ['slab_formwork', 'slab_reinforcement', 'slab_concrete', 'slab_curing', 'suspended_slab'],
    materials: ['concrete', 'reinforcement_steel', 'formwork', 'steel_deck'],
    equipment: ['crane', 'concrete_pump', 'vibrator', 'scaffolding'],
    colorPalette: ['#808080', '#B22222', '#696969', '#A0522D'],
    duration: 12, progressWeight: 6, dependencies: ['Beams'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Walls', nameAr: 'الجدران', nameEn: 'Walls', order: 8,
    constructionElements: ['block_wall', 'wall_reinforcement', 'wall_plaster_scratch', 'wall_insulation', 'partition_wall'],
    materials: ['block_brick', 'cement_mortar', 'reinforcement_steel', 'insulation_board'],
    equipment: ['mortar_mixer', 'scaffolding', 'elevator', 'conveyor'],
    colorPalette: ['#CD853F', '#DEB887', '#D2B48C', '#F5F5DC'],
    duration: 20, progressWeight: 10, dependencies: ['Slabs'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Roof', nameAr: 'السطح', nameEn: 'Roof', order: 9,
    constructionElements: ['roof_slab', 'roof_insulation', 'roof_screed', 'roof_drainage', 'parapet_wall'],
    materials: ['concrete', 'reinforcement_steel', 'insulation_board', 'waterproofing_membrane', 'gravel'],
    equipment: ['concrete_pump', 'crane', 'compactor', 'waterproofing_torch'],
    colorPalette: ['#808080', '#696969', '#A0522D', '#B8860B'],
    duration: 10, progressWeight: 5, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Waterproofing', nameAr: 'العزل المائي', nameEn: 'Waterproofing', order: 10,
    constructionElements: ['waterproof_membrane', 'drainage_layer', 'protection_board', 'joint_sealant'],
    materials: ['waterproofing_membrane', 'sealant', 'bitumen', 'geotextile'],
    equipment: ['waterproofing_torch', 'roller', 'heat_gun', 'mixer'],
    colorPalette: ['#2F4F4F', '#000080', '#191970', '#1C1C1C'],
    duration: 5, progressWeight: 2, dependencies: ['Roof'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Electrical', nameAr: 'الكهرباء', nameEn: 'Electrical', order: 11,
    constructionElements: ['conduit', 'wiring', 'electrical_panel', 'switch', 'socket', 'junction_box', 'cable_tray'],
    materials: ['copper_wire', 'cable', 'conduit_pipe', 'circuit_breaker', 'panel_board'],
    equipment: ['cable_puller', 'multimeter', 'drill', 'ladder'],
    colorPalette: ['#FFD700', '#DAA520', '#B8860B', '#FFFF00'],
    duration: 12, progressWeight: 5, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Mechanical', nameAr: 'الميكانيكا', nameEn: 'Mechanical', order: 12,
    constructionElements: ['ductwork', 'mechanical_room', 'piping', 'boiler', 'pump_set'],
    materials: ['steel_pipe', 'duct_sheet', 'insulation', 'valve', 'flange'],
    equipment: ['welding_machine', 'pipe_bender', 'hoist', 'lift'],
    colorPalette: ['#C0C0C0', '#A9A9A9', '#808080', '#696969'],
    duration: 10, progressWeight: 3, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Plumbing', nameAr: 'السباكة', nameEn: 'Plumbing', order: 13,
    constructionElements: ['water_pipe', 'drainage_pipe', 'fixture', 'water_tank', 'septic_tank', 'manhole'],
    materials: ['pvc_pipe', 'copper_pipe', 'fitting', 'valve', 'sink', 'toilet'],
    equipment: ['pipe_cutter', 'welding_machine', 'threading_machine', 'pump'],
    colorPalette: ['#4682B4', '#5F9EA0', '#6495ED', '#87CEEB'],
    duration: 12, progressWeight: 5, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'HVAC', nameAr: 'تكييف وتهوية', nameEn: 'HVAC', order: 14,
    constructionElements: ['hvac_unit', 'air_duct', 'ventilation_grille', 'thermostat', 'condenser', 'air_handler'],
    materials: ['duct_sheet', 'refrigerant', 'insulation', 'filter', 'thermostat_wire'],
    equipment: ['welding_machine', 'vacuum_pump', 'gauge_manifold', 'lift'],
    colorPalette: ['#E0E0E0', '#C0C0C0', '#A9A9A9', '#87CEEB'],
    duration: 10, progressWeight: 5, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Fire_Fighting', nameAr: 'مكافحة الحريق', nameEn: 'Fire Fighting', order: 15,
    constructionElements: ['sprinkler_system', 'fire_alarm', 'extinguisher', 'smoke_detector', 'fire_hose', 'fire_pump'],
    materials: ['sprinkler_head', 'alarm_panel', 'detector', 'pipe', 'extinguisher_agent'],
    equipment: ['pipe_threader', 'drill', 'ladder', 'tester'],
    colorPalette: ['#FF0000', '#DC143C', '#B22222', '#8B0000'],
    duration: 8, progressWeight: 3, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Facade', nameAr: 'الواجهة', nameEn: 'Facade', order: 16,
    constructionElements: ['cladding', 'curtain_wall', 'exterior_finish', 'stone_veneer', 'aluminum_composite', 'sun_shading'],
    materials: ['aluminum', 'stone', 'glass', 'cladding_panel', 'sealant', 'anchor'],
    equipment: ['crane', 'scaffolding', 'glass_sucker', 'drill'],
    colorPalette: ['#C0C0C0', '#D2B48C', '#87CEEB', '#8B4513'],
    duration: 14, progressWeight: 6, dependencies: ['Roof'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Windows', nameAr: 'النوافذ', nameEn: 'Windows', order: 17,
    constructionElements: ['window_frame', 'glass_pane', 'window_hardware', 'window_seal', 'window_sill'],
    materials: ['glass', 'aluminum', 'rubber_seal', 'silicone', 'steel_hardware'],
    equipment: ['glass_sucker', 'drill', 'level', 'caulking_gun'],
    colorPalette: ['#87CEEB', '#ADD8E6', '#B0C4DE', '#E0FFFF'],
    duration: 8, progressWeight: 3, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Doors', nameAr: 'الأبواب', nameEn: 'Doors', order: 18,
    constructionElements: ['door_frame', 'door_leaf', 'door_hardware', 'door_handle', 'door_lock', 'threshold'],
    materials: ['wood', 'steel_hardware', 'lock', 'hinge', 'paint'],
    equipment: ['drill', 'screwdriver', 'level', 'saw'],
    colorPalette: ['#8B4513', '#A0522D', '#D2691E', '#CD853F'],
    duration: 6, progressWeight: 2, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Ceilings', nameAr: 'الأسقف المعلقة', nameEn: 'Ceilings', order: 19,
    constructionElements: ['ceiling_grid', 'ceiling_tile', 'ceiling_finish', 'ceiling_access_panel', 'cornice'],
    materials: ['plaster', 'gypsum_board', 'ceiling_grid_metal', 'joint_compound', 'screw'],
    equipment: ['lift', 'drill', 'screwdriver', 'ladder'],
    colorPalette: ['#F5F5DC', '#FAFAD2', '#FFF8DC', '#FFEFD5'],
    duration: 10, progressWeight: 3, dependencies: ['Walls'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Flooring', nameAr: 'الأرضيات', nameEn: 'Flooring', order: 20,
    constructionElements: ['floor_tile', 'floor_base', 'floor_finish', 'screed_layer', 'expansion_joint'],
    materials: ['tiles', 'cement_screed', 'grout', 'adhesive', 'baseboard'],
    equipment: ['tile_cutter', 'mixer', 'level', 'trowel'],
    colorPalette: ['#DEB887', '#D2B48C', '#BC8F8F', '#A0522D'],
    duration: 12, progressWeight: 4, dependencies: ['Ceilings'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Painting', nameAr: 'الدهان', nameEn: 'Painting', order: 21,
    constructionElements: ['primed_surface', 'painted_wall', 'painted_ceiling', 'trim_paint', 'textured_finish'],
    materials: ['paint', 'primer', 'putty', 'sandpaper', 'masking_tape'],
    equipment: ['sprayer', 'roller', 'brush', 'ladder'],
    colorPalette: ['#FFFFFF', '#F5F5F5', '#FFFAF0', '#F0F8FF'],
    duration: 12, progressWeight: 4, dependencies: ['Ceilings', 'Flooring'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Lighting', nameAr: 'الإضاءة', nameEn: 'Lighting', order: 22,
    constructionElements: ['light_fixture', 'lamp', 'light_switch', 'lighting_control', 'emergency_light'],
    materials: ['led_fixture', 'cable', 'switch', 'dimmer', 'sensor'],
    equipment: ['ladder', 'drill', 'tester', 'screwdriver'],
    colorPalette: ['#FFFFE0', '#FFFACD', '#FFF8DC', '#F0E68C'],
    duration: 6, progressWeight: 2, dependencies: ['Electrical'],
    allowedInModes: ['Presentation', 'BIM_Assembly'],
  },
  {
    id: 'Cleaning', nameAr: 'النظافة', nameEn: 'Cleaning', order: 23,
    constructionElements: ['cleaned_floor', 'cleaned_wall', 'cleaned_window', 'waste_removed', 'sanitized_area'],
    materials: ['cleaning_solution', 'garbage_bag', 'mop', 'broom'],
    equipment: ['vacuum_cleaner', 'floor_polisher', 'pressure_washer', 'waste_container'],
    colorPalette: ['#E0FFFF', '#F0FFFF', '#E0F7FA', '#B2EBF2'],
    duration: 5, progressWeight: 1, dependencies: ['Painting', 'Flooring', 'Lighting'],
    allowedInModes: ['Presentation', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Landscape', nameAr: 'المناظر الطبيعية', nameEn: 'Landscape', order: 24,
    constructionElements: ['garden', 'paving', 'fencing', 'irrigation_system', 'planting', 'outdoor_lighting', 'water_feature'],
    materials: ['gravel', 'paving_stone', 'plant', 'topsoil', 'irrigation_pipe'],
    equipment: ['tractor', 'auger', 'tiller', 'compactor'],
    colorPalette: ['#228B22', '#32CD32', '#006400', '#8FBC8F'],
    duration: 14, progressWeight: 3, dependencies: ['Cleaning', 'Painting'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Commissioning', nameAr: 'التشغيل التجريبي', nameEn: 'Commissioning', order: 25,
    constructionElements: ['tested_system', 'certificate', 'inspection_report', 'punch_list', 'final_approval'],
    materials: ['test_equipment', 'documentation', 'sticker'],
    equipment: ['tester', 'calibration_device', 'inspection_drone'],
    colorPalette: ['#32CD32', '#00FF00', '#00FA9A', '#7CFC00'],
    duration: 8, progressWeight: 2, dependencies: ['Cleaning', 'Lighting', 'HVAC', 'Fire_Fighting', 'Plumbing', 'Electrical', 'Mechanical'],
    allowedInModes: ['Presentation', 'BIM_Assembly', 'Equipment'],
  },
  {
    id: 'Completed_Project', nameAr: 'المشروع مكتمل', nameEn: 'Completed Project', order: 26,
    constructionElements: ['completed_building', 'handover_document', 'operation_manual', 'warranty_certificate'],
    materials: [],
    equipment: [],
    colorPalette: ['#FFD700', '#DAA520', '#32CD32', '#1E90FF'],
    duration: 0, progressWeight: 0, dependencies: ['Commissioning'],
    allowedInModes: ['Presentation', 'Clean_Engineering', 'BIM_Assembly'],
  },
];

const MATERIAL_EVOLUTION = [
  { material: 'concrete', appearsAt: 'Foundations', disappearsAt: null, color: '#808080' },
  { material: 'reinforcement_steel', appearsAt: 'Foundations', disappearsAt: null, color: '#B22222' },
  { material: 'block_brick', appearsAt: 'Walls', disappearsAt: null, color: '#CD853F' },
  { material: 'plaster', appearsAt: 'Ceilings', disappearsAt: null, color: '#F5F5DC' },
  { material: 'paint', appearsAt: 'Painting', disappearsAt: null, color: '#FFFFFF' },
  { material: 'tiles', appearsAt: 'Flooring', disappearsAt: null, color: '#DEB887' },
  { material: 'glass', appearsAt: 'Windows', disappearsAt: null, color: '#87CEEB' },
  { material: 'wood', appearsAt: 'Doors', disappearsAt: null, color: '#8B4513' },
  { material: 'aluminum', appearsAt: 'Facade', disappearsAt: null, color: '#C0C0C0' },
  { material: 'stone', appearsAt: 'Facade', disappearsAt: null, color: '#D2B48C' },
];

class ConstructionStageLogic {
  getAllStages() {
    return STAGES;
  }

  getStage(id) {
    return STAGES.find(s => s.id === id) || null;
  }

  getStagesForMode(mode) {
    return STAGES.filter(s => s.allowedInModes.includes(mode));
  }

  getElementsForStage(stageId, mode) {
    const stage = this.getStage(stageId);
    if (!stage) return [];
    if (!stage.allowedInModes.includes(mode)) return [];
    return [...stage.constructionElements];
  }

  getMaterialsForStage(stageId) {
    const stage = this.getStage(stageId);
    return stage ? [...stage.materials] : [];
  }

  getEquipmentForStage(stageId) {
    const stage = this.getStage(stageId);
    return stage ? [...stage.equipment] : [];
  }

  validateStageSequence(stages) {
    if (!Array.isArray(stages) || stages.length === 0) return { valid: false, error: 'No stages provided' };

    const stageMap = {};
    stages.forEach(s => { stageMap[s.id] = s; });

    const errors = [];
    for (const stage of stages) {
      for (const dep of stage.dependencies) {
        if (!stageMap[dep]) {
          errors.push(`Stage "${stage.id}" depends on "${dep}" which is missing`);
        } else if (stageMap[dep].order >= stage.order) {
          errors.push(`Stage "${stage.id}" (order ${stage.order}) depends on "${dep}" (order ${stageMap[dep].order}) but dependency has equal or later order`);
        }
      }
    }

    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const expectedOrder = sorted.map(s => s.order).join(',');
    const actualOrder = stages.map(s => s.order).join(',');

    if (expectedOrder !== actualOrder) {
      errors.push('Stages are not in correct sequential order by order field');
    }

    return { valid: errors.length === 0, errors };
  }

  getDependentStages(stageId) {
    return STAGES.filter(s => s.dependencies.includes(stageId));
  }

  getMaterialEvolution() {
    return MATERIAL_EVOLUTION.map(m => ({ ...m }));
  }

  getActiveMaterialsAtStage(stageId) {
    const stage = this.getStage(stageId);
    if (!stage) return [];
    return MATERIAL_EVOLUTION.filter(m => {
      const appearOrder = (this.getStage(m.appearsAt) || {}).order || 0;
      return appearOrder <= stage.order;
    }).map(m => ({ ...m }));
  }

  getStageProgression(currentStage, progress) {
    const stage = this.getStage(typeof currentStage === 'string' ? currentStage : currentStage.id);
    if (!stage) return null;

    const clampedProgress = Math.max(0, Math.min(1, progress));
    const elementCount = stage.constructionElements.length;
    const visibleCount = Math.floor(clampedProgress * elementCount);
    const visibleElements = stage.constructionElements.slice(0, visibleCount);
    const nextElement = visibleCount < elementCount ? stage.constructionElements[visibleCount] : null;

    return {
      stageId: stage.id,
      progress: clampedProgress,
      visibleElements,
      totalElements: elementCount,
      visibleCount,
      nextElement,
      isComplete: clampedProgress >= 1,
      completionDescription: this._getProgressionDescription(stage, clampedProgress),
    };
  }

  _getProgressionDescription(stage, progress) {
    if (progress <= 0) return `بدء ${stage.nameAr}`;
    if (progress < 0.3) return `جاري بدء ${stage.nameAr}`;
    if (progress < 0.7) return `${stage.nameAr} قيد التنفيذ`;
    if (progress < 1) return `${stage.nameAr} في المراحل النهائية`;
    return `اكتمال ${stage.nameAr}`;
  }

  getCumulativeElements(stageId) {
    const stage = this.getStage(stageId);
    if (!stage) return [];

    const elements = [];
    for (const s of STAGES) {
      if (s.order <= stage.order) {
        elements.push(...s.constructionElements);
      }
    }
    return [...new Set(elements)];
  }

  getTotalProgressWeight() {
    return STAGES.reduce((sum, s) => sum + s.progressWeight, 0);
  }

  calculateProjectProgress(completedStageIds) {
    let weight = 0;
    for (const s of STAGES) {
      if (completedStageIds.includes(s.id)) {
        weight += s.progressWeight;
      }
    }
    return Math.min(100, weight);
  }
}

module.exports = ConstructionStageLogic;
