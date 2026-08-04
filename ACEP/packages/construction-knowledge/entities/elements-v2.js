class ElementsV2Generator {
  generate() {
    const elements = [];
    const categories = ['Structural', 'Architectural', 'Electrical', 'Mechanical', 'HVAC', 'Fire Fighting', 'Fire Alarm', 'Low Current', 'Plumbing', 'Landscape', 'Infrastructure', 'Furniture', 'Interior Design', 'Special Equipment'];
    const phases = ['foundation', 'structure', 'masonry', 'finishing', 'electrical', 'mechanical', 'plumbing', 'fire_fighting', 'fire_alarm', 'low_current', 'landscaping'];

    const CAT = {
      S: 'Structural', A: 'Architectural', E: 'Electrical', M: 'Mechanical',
      H: 'HVAC', F: 'Fire Fighting', FA: 'Fire Alarm', LC: 'Low Current',
      P: 'Plumbing', L: 'Landscape', I: 'Infrastructure', FU: 'Furniture',
      ID: 'Interior Design', SE: 'Special Equipment',
    };

    const groups = [
      { prefix: 'COL', category: 'S', name: 'Column', types: ['rc_column', 'steel_column', 'composite_column', 'circular_column', 'rectangular_column', 'l_shape_column', 't_shape_column', 'pedestal', 'column_capital', 'column_bracket'], phases: ['structure'] },
      { prefix: 'BEM', category: 'S', name: 'Beam', types: ['rc_beam', 'steel_beam', 'composite_beam', 'spandrel_beam', 'edge_beam', 'tie_beam', 'plinth_beam', 'grade_beam', 'ring_beam', 'crane_beam', 'transfer_beam', 'lintel_beam', 'bond_beam', 'curved_beam', 'haunched_beam'], phases: ['structure'] },
      { prefix: 'SLB', category: 'S', name: 'Slab', types: ['solid_slab', 'flat_slab', 'ribbed_slab', 'waffle_slab', 'hollow_core_slab', 'precast_slab', 'composite_slab', 'post_tensioned_slab', 'two_way_slab', 'one_way_slab', 'cantilever_slab', 'balcony_slab', 'staircase_landing', 'roof_slab', 'basement_slab'], phases: ['structure'] },
      { prefix: 'FND', category: 'S', name: 'Foundation', types: ['isolated_footing', 'combined_footing', 'strip_footing', 'raft_foundation', 'mat_foundation', 'pile_foundation', 'pile_cap', 'caisson', 'spread_footing', 'strap_footing', 'grade_beam_foundation', 'well_foundation', 'pier_foundation', 'drilled_shaft', 'sheet_pile'], phases: ['foundation', 'structure'] },
      { prefix: 'WAL', category: 'A', name: 'Wall', types: ['load_bearing_wall', 'shear_wall', 'partition_wall', 'curtain_wall', 'retaining_wall', 'basement_wall', 'cavity_wall', 'party_wall', 'fire_wall', 'acoustic_wall', 'glass_wall', 'green_wall', 'movable_wall', 'parapet_wall', 'wing_wall'], phases: ['masonry', 'finishing'] },
      { prefix: 'DR', category: 'A', name: 'Door', types: ['wooden_door', 'steel_door', 'aluminum_door', 'glass_door', 'fire_door', 'sliding_door', 'folding_door', 'revolving_door', 'automatic_door', 'garage_door', 'security_door', 'soundproof_door', 'watertight_door', 'blast_door', 'jail_door', 'french_door', 'pocket_door', 'bi_fold_door', 'rolling_shutter', 'speed_door'], phases: ['finishing'] },
      { prefix: 'WDW', category: 'A', name: 'Window', types: ['fixed_window', 'casement_window', 'sliding_window', 'awning_window', 'hopper_window', 'bay_window', 'bow_window', 'skylight', 'roof_window', 'dormer_window', 'louvered_window', 'jalousie_window', 'projected_window', 'tilt_turn_window', 'double_hung_window', 'single_hung_window', 'glass_block_window', 'clerestory_window', 'transom_window', 'sidelight'], phases: ['finishing'] },
      { prefix: 'STRS', category: 'A', name: 'Stairs', types: ['straight_stair', 'l_shaped_stair', 'u_shaped_stair', 'spiral_stair', 'curved_stair', 'cantilevered_stair', 'monolithic_stair', 'precast_stair', 'steel_stair', 'glass_stair', 'escape_stair', 'fire_escape', 'ramp', 'escalator', 'moving_walkway'], phases: ['structure', 'finishing'] },
      { prefix: 'CEL', category: 'A', name: 'Ceiling', types: ['gypsum_ceiling', 'suspended_ceiling', 'drop_ceiling', 't_bar_ceiling', 'metal_ceiling', 'wood_ceiling', 'acoustic_ceiling', 'stretch_ceiling', 'pop_ceiling', 'vaulted_ceiling', 'coffered_ceiling', 'tray_ceiling', 'coved_ceiling', 'exposed_ceiling', 'green_ceiling'], phases: ['finishing'] },
      { prefix: 'FAC', category: 'A', name: 'Facade', types: ['glass_facade', 'stone_facade', 'aluminum_cladding', 'composite_panel', 'brick_veneer', 'precast_facade', 'curtain_wall_facade', 'ventilated_facade', 'green_facade', 'metal_facade', 'wood_facade', 'acm_panel', 'etfe_facade', 'terracotta_facade', 'grc_facade'], phases: ['finishing'] },
      { prefix: 'FLR', category: 'A', name: 'Flooring', types: ['ceramic_tile', 'porcelain_tile', 'marble_floor', 'granite_floor', 'wood_floor', 'laminate_floor', 'vinyl_floor', 'epoxy_floor', 'concrete_floor', 'polished_concrete', 'terrazzo', 'carpet', 'rubber_floor', 'sports_floor', 'anti_static_floor', 'raised_floor', 'stone_floor', 'mosaic_floor', 'hydronic_floor', 'industrial_floor'], phases: ['finishing'] },
      { prefix: 'RUF', category: 'A', name: 'Roof', types: ['flat_roof', 'pitched_roof', 'gable_roof', 'hip_roof', 'mansard_roof', 'green_roof', 'solar_roof', 'skillion_roof', 'butterfly_roof', 'sawtooth_roof', 'barrel_vault_roof', 'domed_roof', 'pyramid_roof', 'curved_roof', 'folding_roof'], phases: ['structure', 'finishing'] },
      { prefix: 'INS', category: 'A', name: 'Insulation', types: ['thermal_insulation', 'acoustic_insulation', 'fire_insulation', 'xps_insulation', 'eps_insulation', 'mineral_wool', 'fiberglass', 'polyurethane_foam', 'spray_foam', 'cellulose_insulation', 'aerogel', 'vacuum_insulation_panel', 'reflective_insulation', 'cork_insulation', 'hemp_insulation'], phases: ['finishing'] },
      { prefix: 'WPR', category: 'A', name: 'Waterproofing', types: ['bituminous_membrane', 'liquid_membrane', 'cementitious_coating', 'bentonite_waterproofing', 'pvc_membrane', 'tpo_membrane', 'epdm_membrane', 'sheet_membrane', 'crystalline_waterproofing', 'polyurethane_coating', 'acrylic_coating', 'silicate_sealer', 'hydrophobic_injection', 'clay_liner', 'drainage_board'], phases: ['finishing'] },
      { prefix: 'CAB', category: 'E', name: 'Cable', types: ['power_cable_hv', 'power_cable_mv', 'power_cable_lv', 'control_cable', 'instrumentation_cable', 'fiber_optic', 'coaxial_cable', 'speaker_cable', 'fire_resistant_cable', 'armored_cable', 'submersible_cable', 'solar_cable', 'welding_cable', 'elevator_cable', 'heating_cable'], phases: ['electrical'] },
      { prefix: 'COND', category: 'E', name: 'Conduit', types: ['pvc_conduit', 'steel_conduit', 'flexible_conduit', 'liquidtight_conduit', 'emt_conduit', 'rmc_conduit', 'imc_conduit', 'hf_conduit', 'pvc_coated_conduit', 'aluminum_conduit', 'brass_conduit', 'non_metallic_conduit', 'corrugated_conduit', 'split_conduit', 'underground_conduit'], phases: ['electrical'] },
      { prefix: 'SWG', category: 'E', name: 'Switchgear', types: ['main_distribution_board', 'sub_distribution_board', 'mcc_panel', 'pcc_panel', 'vfd_panel', 'plc_panel', 'ats_panel', 'lighting_panel', 'emergency_panel', 'breaker_panel', 'capacitor_bank', 'surge_protection', 'meter_panel', 'transfer_switch', 'busbar_trunking'], phases: ['electrical'] },
      { prefix: 'LTG', category: 'E', name: 'Lighting', types: ['led_downlight', 'led_strip', 'track_lighting', 'pendant_light', 'chandelier', 'wall_sconce', 'floodlight', 'street_light', 'emergency_light', 'exit_sign', 'motion_sensor_light', 'dimmable_light', 'rgb_light', 'solar_light', 'landscape_light', 'recessed_light', 'surface_mount_light', 'high_bay_light', 'linear_light', 'decorative_light'], phases: ['electrical', 'finishing'] },
      { prefix: 'DCT', category: 'M', name: 'Duct', types: ['rectangular_duct', 'round_duct', 'flexible_duct', 'spiral_duct', 'insulated_duct', 'kitchen_exhaust', 'parking_exhaust', 'fresh_air_duct', 'return_air_duct', 'supply_air_duct', 'fire_damper', 'volume_damper', 'motorized_damper', 'duct_heater', 'diffuser'], phases: ['mechanical'] },
      { prefix: 'ACP', category: 'H', name: 'AC Unit', types: ['split_ac', 'window_ac', 'cassette_ac', 'ducted_ac', 'vrf_system', 'chiller', 'air_cooled_chiller', 'water_cooled_chiller', 'roof_top_unit', 'package_unit', 'ahu', 'fcu', 'heat_pump', 'evaporative_cooler', 'precision_ac'], phases: ['mechanical'] },
      { prefix: 'PMP', category: 'P', name: 'Pump', types: ['water_pump', 'sewage_pump', 'drainage_pump', 'fire_pump', 'jockey_pump', 'booster_pump', 'submersible_pump', 'circulation_pump', 'vacuum_pump', 'dosing_pump', 'well_pump', 'pressure_pump', 'sump_pump', 'condensate_pump', 'slurry_pump'], phases: ['plumbing'] },
      { prefix: 'PIP', category: 'P', name: 'Pipe', types: ['pvc_pipe', 'upvc_pipe', 'ppr_pipe', 'pe_pipe', 'hdpe_pipe', 'steel_pipe', 'galvanized_pipe', 'copper_pipe', 'cast_iron_pipe', 'cpvc_pipe', 'abs_pipe', 'pex_pipe', 'pb_pipe', 'composite_pipe', 'concrete_pipe', 'ductile_iron_pipe', 'grp_pipe', 'stainless_steel_pipe', 'double_wall_pipe', 'flexible_pipe'], phases: ['plumbing'] },
      { prefix: 'FIX', category: 'P', name: 'Fixture', types: ['toilet', 'urinal', 'sink', 'lavatory', 'bidet', 'bathtub', 'shower', 'bidet_shower', 'kitchen_sink', 'floor_drain', 'roof_drain', 'cleanout', 'water_heater', 'water_tank', 'septic_tank', 'grease_trap', 'interceptor', 'backflow_preventer', 'pressure_reducer', 'expansion_tank'], phases: ['plumbing', 'finishing'] },
      { prefix: 'FSP', category: 'F', name: 'Fire Sprinkler', types: ['pendent_sprinkler', 'upright_sprinkler', 'sidewall_sprinkler', 'concealed_sprinkler', 'esfr_sprinkler', 'dry_sprinkler', 'deluge_valve', 'preaction_valve', 'fire_hose_cabinet', 'fire_hydrant', 'fire_extinguisher', 'fire_blanket', 'standpipe', 'siamese_connection', 'fire_department_connection'], phases: ['fire_fighting'] },
      { prefix: 'FAD', category: 'FA', name: 'Fire Alarm', types: ['smoke_detector', 'heat_detector', 'flame_detector', 'gas_detector', 'manual_call_point', 'sounder', 'strobe_light', 'voice_evacuation', 'fire_alarm_panel', 'repeater_panel', 'addressable_module', 'isolator_module', 'beam_detector', 'duct_detector', 'aspirating_detector', 'linear_heat', 'vess_detector', 'spark_detector', 'emergency_telephone', 'fire_door_controller'], phases: ['fire_alarm'] },
      { prefix: 'SEC', category: 'LC', name: 'Security', types: ['cctv_camera', 'ip_camera', 'analog_camera', 'speed_dome', 'bullet_camera', 'doorbell', 'access_control', 'card_reader', 'biometric_reader', 'magnetic_lock', 'electric_strike', 'motion_sensor', 'glass_break_detector', 'intrusion_panel', 'siren', 'intercom', 'video_door_phone', 'gate_operator', 'barrier_gate', 'parking_system'], phases: ['low_current'] },
      { prefix: 'NET', category: 'LC', name: 'Network', types: ['patch_panel', 'network_switch', 'router', 'access_point', 'server_rack', 'patch_cable', 'fiber_patch', 'keystone_jack', 'faceplate', 'structured_cabling', 'backbone_cable', 'patching_field', 'network_ups', 'pdu', 'kvm_switch'], phases: ['low_current'] },
      { prefix: 'AV', category: 'LC', name: 'AV', types: ['speaker', 'subwoofer', 'amplifier', 'projector', 'projection_screen', 'led_screen', 'soundbar', 'microphone', 'audio_processor', 'video_matrix', 'hdmi_cable', 'speaker_cable_av', 'wall_mount', 'ceiling_mount', 'av_rack'], phases: ['low_current'] },
      { prefix: 'FUR', category: 'FU', name: 'Furniture', types: ['sofa', 'chair', 'table', 'desk', 'bed', 'wardrobe', 'cabinet', 'shelf', 'bookcase', 'dresser', 'nightstand', 'dining_table', 'coffee_table', 'side_table', 'console_table', 'bench', 'stool', 'bar_stool', 'recliner', 'ottoman', 'filing_cabinet', 'credenza', 'locker', 'workstation', 'partition_screen'], phases: ['finishing'] },
      { prefix: 'LND', category: 'L', name: 'Landscape', types: ['tree', 'shrub', 'plant', 'flower_bed', 'lawn_area', 'paving_stone', 'garden_path', 'fountain', 'water_feature', 'pergola', 'garden_furniture', 'lighting_pole', 'irrigation_system', 'sprinkler_head', 'drip_line', 'retaining_wall_landscape', 'garden_step', 'deck', 'gazebo', 'arbor'], phases: ['landscaping'] },
      { prefix: 'INF', category: 'I', name: 'Infrastructure', types: ['road_pavement', 'sidewalk', 'curb', 'gutter', 'manhole', 'catch_basin', 'storm_drain', 'sewer_pipe', 'water_main', 'fire_hydrant_infra', 'traffic_light', 'street_sign', 'guardrail', 'sound_barrier', 'retaining_wall_infra', 'culvert', 'drainage_ditch', 'embankment', 'cut_and_fill', 'geotextile'], phases: ['foundation', 'structure'] },
      { prefix: 'EQP', category: 'SE', name: 'Equipment', types: ['elevator', 'escalator', 'dumbwaiter', 'parking_lift', 'stage_lift', 'crane', 'overhead_crane', 'hoist', 'conveyor_belt', 'forklift_charging', 'compactor', 'baler', 'industrial_fan', 'air_compressor', 'boiler', 'generator', 'ups_system', 'transformer', 'rectifier', 'battery_bank'], phases: ['electrical', 'mechanical', 'finishing'] },
    ];

    let id = 0;
    for (const group of groups) {
      for (const type of group.types) {
        id++;
        const variants = ['standard', 'heavy', 'light', 'premium', 'economy'];
        const boqCategories = {
          S: 'Concrete', A: 'Finishing', E: 'Electrical', M: 'Mechanical',
          H: 'HVAC', F: 'Fire Fighting', P: 'Plumbing',
          FA: 'Fire Alarm', LC: 'Low Current', L: 'Landscaping',
          I: 'Infrastructure', FU: 'Furniture', ID: 'Finishing', SE: 'Equipment',
        };
        elements.push({
          id: `${type}`,
          baseId: group.prefix,
          name: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          nameEn: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          category: CAT[group.category],
          boqCategory: boqCategories[group.category] || 'General',
          unit: this._getUnit(type, group.category),
          phases: group.phases,
          variants,
          codeRefs: this._getCodeRefs(CAT[group.category]),
          complexity: this._getComplexity(type),
        });
      }
    }

    return elements;
  }

  _getUnit(type, cat) {
    if (cat === 'E' || cat === 'P' || cat === 'P' || cat === 'LC') return type.includes('cable') || type.includes('pipe') || type.includes('conduit') || type.includes('duct') || type.includes('cable') ? 'm' : 'no.';
    if (cat === 'S' || cat === 'A') return type.includes('slab') || type.includes('wall') || type.includes('floor') || type.includes('roof') || type.includes('ceiling') || type.includes('facade') || type.includes('insulation') || type.includes('waterproofing') ? 'm²' : type.includes('beam') || type.includes('column') || type.includes('foundation') ? 'm³' : 'no.';
    if (cat === 'FU') return 'no.';
    if (cat === 'L') return type.includes('tree') || type.includes('shrub') || type.includes('plant') ? 'no.' : 'm²';
    if (cat === 'I') return type.includes('pipe') || type.includes('road') || type.includes('curb') || type.includes('gutter') || type.includes('drain') || type.includes('cable') || type.includes('fence') ? 'm' : 'no.';
    if (cat === 'H') return 'ton';
    if (cat === 'SE') return 'no.';
    return type.includes('door') || type.includes('window') || type.includes('stair') || type.includes('sprinkler') || type.includes('detector') || type.includes('camera') || type.includes('panel') || type.includes('extinguisher') || type.includes('furniture') || type.includes('fixture') || type.includes('pump') || type.includes('light') || type.includes('switch') || type.includes('speaker') || type.includes('alarm') || type.includes('unit') || type.includes('cabinet') || type.includes('table') || type.includes('chair') || type.includes('sofa') || type.includes('bed') ? 'no.' : 'm²';
  }

  _getCodeRefs(category) {
    const map = {
      'Structural': ['ACI 318', 'SBC 301', 'AISC 360', 'ASTM A36'],
      'Architectural': ['SBC 304', 'ASTM C90', 'ASTM C926', 'ASTM C1396'],
      'Electrical': ['NEC 2020', 'IEC 61439', 'SBC 401'],
      'Mechanical': ['ASHRAE 90.1', 'ASHRAE 62.1', 'SMACNA'],
      'HVAC': ['ASHRAE 90.1', 'ASHRAE 62.1', 'SMACNA'],
      'Fire Fighting': ['NFPA 13', 'NFPA 10', 'SBC 801'],
      'Fire Alarm': ['NFPA 72', 'SBC 801'],
      'Low Current': ['SBC 402', 'TIA/EIA 568'],
      'Plumbing': ['IPC', 'SBC 401'],
      'Landscape': ['SBC 304', 'ASTM C1028'],
      'Infrastructure': ['SBC 301', 'ACI 318', 'ASTM D6163'],
      'Furniture': ['SBC 304', 'NFPA 80'],
      'Interior Design': ['SBC 304', 'ASTM C1396'],
      'Special Equipment': ['ASME A17.1', 'IEC 61439'],
    };
    return map[category] || ['SBC 304'];
  }

  _getComplexity(type) {
    if (type.includes('foundation') || type.includes('tunnel') || type.includes('caisson') || type.includes('pile')) return 8;
    if (type.includes('curtain_wall') || type.includes('revolving') || type.includes('escalator') || type.includes('elevator') || type.includes('chiller') || type.includes('vrf')) return 7;
    if (type.includes('slab') || type.includes('beam') || type.includes('column')) return 5;
    if (type.includes('door') || type.includes('window') || type.includes('floor') || type.includes('ceiling')) return 3;
    return 4;
  }
}

module.exports = { ElementsV2Generator };
