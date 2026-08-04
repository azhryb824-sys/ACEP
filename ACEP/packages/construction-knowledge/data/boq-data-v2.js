class BoqV2Generator {
  generate() {
    const items = [];
    const sections = {};
    let id = 0;

    const divisions = {
      'D02': { name: 'Site Work', cat: 'General' },
      'D03': { name: 'Concrete', cat: 'Concrete' },
      'D04': { name: 'Masonry', cat: 'Masonry' },
      'D05': { name: 'Metals', cat: 'Metals' },
      'D06': { name: 'Wood & Plastics', cat: 'Timber' },
      'D07': { name: 'Thermal & Moisture', cat: 'Insulation' },
      'D08': { name: 'Doors & Windows', cat: 'Finishing' },
      'D09': { name: 'Finishes', cat: 'Finishing' },
      'D10': { name: 'Specialties', cat: 'Special' },
      'D11': { name: 'Equipment', cat: 'Equipment' },
      'D12': { name: 'Furnishings', cat: 'Furniture' },
      'D13': { name: 'Special Construction', cat: 'Special' },
      'D14': { name: 'Conveying Systems', cat: 'Equipment' },
      'D15': { name: 'Mechanical', cat: 'Mechanical' },
      'D21': { name: 'Fire Suppression', cat: 'Fire Fighting' },
      'D22': { name: 'Plumbing', cat: 'Plumbing' },
      'D23': { name: 'HVAC', cat: 'HVAC' },
      'D26': { name: 'Electrical', cat: 'Electrical' },
      'D27': { name: 'Communications', cat: 'Low Current' },
      'D28': { name: 'Electronic Safety', cat: 'Fire Alarm' },
      'D31': { name: 'Earthwork', cat: 'Earthwork' },
      'D32': { name: 'Landscaping', cat: 'Landscaping' },
      'D33': { name: 'Utilities', cat: 'Infrastructure' },
      'D34': { name: 'Transportation', cat: 'Infrastructure' },
      'D35': { name: 'Waterway', cat: 'Infrastructure' },
    };

    const formulas = {
      'Concrete': [
        { desc: '{thickness}mm thick {grade} concrete {element}', unit: 'm³', pattern: (p) => ({ qty: p.vol, rate: p.vol * 580 }), mat: 'concrete' },
        { desc: '{yield} MPa concrete {element}', unit: 'm³', pattern: (p) => ({ qty: p.vol, rate: p.vol * 620 }), mat: 'concrete' },
        { desc: 'Steel reinforcement {diam}mm in {element}', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 4800 }), mat: 'rebar' },
        { desc: 'Formwork for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 85 }), mat: 'timber' },
        { desc: 'Curing compound for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 12 }), mat: 'concrete' },
        { desc: 'Waterproof admixture for {element}', unit: 'm³', pattern: (p) => ({ qty: p.vol, rate: p.vol * 45 }), mat: 'concrete' },
        { desc: 'Expansion joint in {element}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 95 }), mat: 'joint' },
        { desc: 'Construction joint in {element}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 55 }), mat: 'joint' },
        { desc: 'Waterstop at {element}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 120 }), mat: 'waterstop' },
        { desc: 'Grouting of {element} joints', unit: 'm³', pattern: (p) => ({ qty: p.vol * 0.02, rate: p.vol * 1200 }), mat: 'grout' },
        { desc: 'Precast {element} installation', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2500 }), mat: 'concrete' },
        { desc: 'Post tensioning of {element}', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 8500 }), mat: 'strand' },
      ],
      'Finishing': [
        { desc: 'Cement plaster to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 45 }), mat: 'plaster' },
        { desc: 'Gypsum plaster to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 55 }), mat: 'gypsum' },
        { desc: 'Ceramic tile {element} {grade}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 95 }), mat: 'tile' },
        { desc: 'Porcelain tile {element} {grade}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 145 }), mat: 'tile' },
        { desc: 'Marble cladding to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 420 }), mat: 'marble' },
        { desc: 'Granite cladding to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 380 }), mat: 'granite' },
        { desc: 'Paint {type} to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 25 }), mat: 'paint' },
        { desc: 'Wallpaper to {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 65 }), mat: 'wallpaper' },
        { desc: 'Skirting {type} for {element}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 35 }), mat: 'tile' },
        { desc: 'Cornice for {element}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 40 }), mat: 'gypsum' },
        { desc: 'Suspended ceiling {type} for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 120 }), mat: 'gypsum' },
        { desc: 'Acoustic ceiling for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 150 }), mat: 'acoustic' },
        { desc: 'False ceiling {type} for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 130 }), mat: 'gypsum' },
        { desc: 'Expanded metal lath for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 55 }), mat: 'metal' },
        { desc: 'Glass mosaic tile for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 180 }), mat: 'tile' },
        { desc: 'Stone cladding for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 320 }), mat: 'stone' },
        { desc: 'Stucco finish for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 65 }), mat: 'plaster' },
        { desc: 'Vinyl flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 85 }), mat: 'vinyl' },
        { desc: 'Laminate flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 110 }), mat: 'laminate' },
        { desc: 'Wood flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 250 }), mat: 'timber' },
        { desc: 'Polished concrete floor for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 95 }), mat: 'concrete' },
        { desc: 'Epoxy flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 130 }), mat: 'epoxy' },
        { desc: 'Carpet installation for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 90 }), mat: 'carpet' },
        { desc: 'Rubber flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 115 }), mat: 'rubber' },
        { desc: 'Anti static flooring for {element}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 195 }), mat: 'vinyl' },
      ],
      'Electrical': [
        { desc: '{size}mm² cable {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 45 }), mat: 'cable' },
        { desc: '{size}A circuit breaker {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'breaker' },
        { desc: '{w}W LED light fixture {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 250 }), mat: 'light' },
        { desc: 'Socket outlet {type} {ip}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 65 }), mat: 'accessory' },
        { desc: 'Light switch {type} {gang}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 45 }), mat: 'accessory' },
        { desc: 'PVC conduit {size}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 25 }), mat: 'conduit' },
        { desc: 'Steel conduit {size}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 55 }), mat: 'conduit' },
        { desc: 'Cable tray {size}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 85 }), mat: 'cable_tray' },
        { desc: 'Main distribution board {way}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 4500 }), mat: 'panel' },
        { desc: 'Sub distribution board {way}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2800 }), mat: 'panel' },
        { desc: 'MCC panel {feeder}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 12000 }), mat: 'panel' },
        { desc: 'Busbar trunking {rating}A', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 1800 }), mat: 'busbar' },
        { desc: 'Emergency light {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 350 }), mat: 'light' },
        { desc: 'Exit sign {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'light' },
        { desc: 'Earth electrode {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 450 }), mat: 'grounding' },
        { desc: 'Surge protection device {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 950 }), mat: 'spd' },
        { desc: 'Generator {kva}kVA', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kva * 850 }), mat: 'generator' },
        { desc: 'UPS {kva}kVA', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kva * 1200 }), mat: 'ups' },
        { desc: 'Transformer {kva}kVA', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kva * 150 }), mat: 'transformer' },
        { desc: 'Lighting dimmer {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 220 }), mat: 'accessory' },
        { desc: 'Photocell sensor', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'sensor' },
        { desc: 'Motion sensor {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 250 }), mat: 'sensor' },
      ],
      'Plumbing': [
        { desc: '{diam}mm PVC pipe {schedule}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 35 }), mat: 'pvc_pipe' },
        { desc: '{diam}mm PPR pipe {schedule}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 65 }), mat: 'ppr_pipe' },
        { desc: '{diam}mm HDPE pipe SDR{sdr}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 85 }), mat: 'hdpe_pipe' },
        { desc: '{diam}mm steel pipe schedule{sch}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 150 }), mat: 'steel_pipe' },
        { desc: '{diam}mm copper pipe type{type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 220 }), mat: 'copper_pipe' },
        { desc: 'Water closet {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'fixture' },
        { desc: 'Lavatory {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 850 }), mat: 'fixture' },
        { desc: 'Urinal {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 950 }), mat: 'fixture' },
        { desc: 'Kitchen sink {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 750 }), mat: 'fixture' },
        { desc: 'Floor drain {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'drain' },
        { desc: 'Roof drain {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 280 }), mat: 'drain' },
        { desc: 'Water heater {capacity}L', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 8 }), mat: 'water_heater' },
        { desc: 'Water tank {capacity}L', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 3 }), mat: 'water_tank' },
        { desc: 'Pump {flow}m³/h {head}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * (p.flow * 250 + p.head * 18) }), mat: 'pump' },
        { desc: 'Backflow preventer {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1800 }), mat: 'valve' },
        { desc: 'Pressure reducing valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'valve' },
        { desc: 'Gate valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 350 }), mat: 'valve' },
        { desc: 'Globe valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 450 }), mat: 'valve' },
        { desc: 'Ball valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 280 }), mat: 'valve' },
        { desc: 'Flexible connector {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 150 }), mat: 'connector' },
        { desc: 'Expansion joint {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 650 }), mat: 'joint' },
        { desc: 'Water meter {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'meter' },
      ],
      'HVAC': [
        { desc: 'Ductwork {size}mm x {size}mm {gauge}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 180 }), mat: 'duct' },
        { desc: 'Flexible duct {diam}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 65 }), mat: 'duct' },
        { desc: 'Insulated duct {size}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 240 }), mat: 'insulated_duct' },
        { desc: 'Diffuser {size}mm x {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 320 }), mat: 'diffuser' },
        { desc: 'Grille {size}mm x {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 250 }), mat: 'grille' },
        { desc: 'Fire damper {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'damper' },
        { desc: 'Volume damper {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 680 }), mat: 'damper' },
        { desc: 'Motorized damper {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1500 }), mat: 'damper' },
        { desc: 'Air handling unit {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 2.5 }), mat: 'ahu' },
        { desc: 'Fan coil unit {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 1.8 }), mat: 'fcu' },
        { desc: 'Split AC unit {capacity}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 4500 }), mat: 'ac_unit' },
        { desc: 'Cassette AC unit {capacity}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 5200 }), mat: 'ac_unit' },
        { desc: 'VRF outdoor unit {capacity}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 6800 }), mat: 'vrf' },
        { desc: 'VRF indoor unit {capacity}BTU', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 0.35 }), mat: 'vrf' },
        { desc: 'Chiller {capacity}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 8500 }), mat: 'chiller' },
        { desc: 'Cooling tower {capacity}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 1200 }), mat: 'cooling_tower' },
        { desc: 'Exhaust fan {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 0.85 }), mat: 'fan' },
        { desc: 'Fresh air fan {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 1.2 }), mat: 'fan' },
        { desc: 'Heat recovery ventilator {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 3.5 }), mat: 'hrv' },
        { desc: 'Thermostat {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 280 }), mat: 'thermostat' },
      ],
      'Fire Fighting': [
        { desc: '{diam}mm fire main pipe {schedule}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 180 }), mat: 'steel_pipe' },
        { desc: 'Pendant sprinkler {temp}°C', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 45 }), mat: 'sprinkler' },
        { desc: 'Upright sprinkler {temp}°C', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 48 }), mat: 'sprinkler' },
        { desc: 'Sidewall sprinkler {temp}°C', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 52 }), mat: 'sprinkler' },
        { desc: 'ESFR sprinkler {temp}°C', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 95 }), mat: 'sprinkler' },
        { desc: 'Concealed sprinkler {temp}°C', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 75 }), mat: 'sprinkler' },
        { desc: 'Fire hose cabinet {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 3200 }), mat: 'hose_cabinet' },
        { desc: 'Fire hydrant {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 5500 }), mat: 'hydrant' },
        { desc: 'Fire extinguisher {capacity}kg', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 85 }), mat: 'extinguisher' },
        { desc: 'Deluge valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 8500 }), mat: 'deluge_valve' },
        { desc: 'Pre-action valve {size}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 7500 }), mat: 'preaction_valve' },
        { desc: 'Fire pump {flow}gpm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.flow * 12 }), mat: 'fire_pump' },
        { desc: 'Jockey pump {flow}gpm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 6500 }), mat: 'jockey_pump' },
        { desc: 'Fire main {diam}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 250 }), mat: 'pipe' },
        { desc: 'Standpipe {diam}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 220 }), mat: 'pipe' },
        { desc: 'Siamese connection {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2800 }), mat: 'siamese' },
      ],
      'Fire Alarm': [
        { desc: 'Smoke detector {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'detector' },
        { desc: 'Heat detector {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 150 }), mat: 'detector' },
        { desc: 'Flame detector {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 850 }), mat: 'detector' },
        { desc: 'Gas detector {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 750 }), mat: 'detector' },
        { desc: 'Manual call point', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 120 }), mat: 'mcp' },
        { desc: 'Sounder beacon', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 220 }), mat: 'sounder' },
        { desc: 'Strobe light', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 250 }), mat: 'strobe' },
        { desc: 'Voice evacuation speaker', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 380 }), mat: 'speaker' },
        { desc: 'Fire alarm panel {zone} zones', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.zone * 350 }), mat: 'panel' },
        { desc: 'Repeater panel', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 3500 }), mat: 'panel' },
        { desc: 'Addressable module', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 85 }), mat: 'module' },
        { desc: 'Isolator module', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 95 }), mat: 'module' },
        { desc: 'Beam detector {range}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'detector' },
        { desc: 'Duct detector', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 650 }), mat: 'detector' },
        { desc: 'Aspirating detector', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2800 }), mat: 'detector' },
        { desc: 'Emergency telephone', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 550 }), mat: 'phone' },
      ],
      'Low Current': [
        { desc: 'Cat{a} UTP cable', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 8 }), mat: 'cable' },
        { desc: 'Cat{a} FTP cable', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 12 }), mat: 'cable' },
        { desc: 'Cat{a} STP cable', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 16 }), mat: 'cable' },
        { desc: 'Fiber optic cable {mode} core', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 35 }), mat: 'fiber' },
        { desc: 'Patch panel {port} port', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.port * 8 }), mat: 'patch_panel' },
        { desc: 'Network switch {port} port gigabit', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.port * 45 }), mat: 'switch' },
        { desc: 'Access point {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'access_point' },
        { desc: 'Router {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2500 }), mat: 'router' },
        { desc: 'Server rack {u}U', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.u * 180 }), mat: 'rack' },
        { desc: 'CCTV camera {type} {resolution}MP', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.resolution * 350 }), mat: 'camera' },
        { desc: 'Speed dome camera {resolution}MP', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.resolution * 550 }), mat: 'camera' },
        { desc: 'Access control reader {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1800 }), mat: 'access_control' },
        { desc: 'Magnetic lock {kg}kg', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kg * 1.5 }), mat: 'maglock' },
        { desc: 'Electric strike {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 850 }), mat: 'electric_strike' },
        { desc: 'Intercom station {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 750 }), mat: 'intercom' },
        { desc: 'Video door phone', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1800 }), mat: 'door_phone' },
        { desc: 'Speaker {type} {w}W', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.w * 3.5 }), mat: 'speaker' },
        { desc: 'Subwoofer {size}"', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.size * 85 }), mat: 'speaker' },
        { desc: 'Amplifier {w}W', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.w * 2.8 }), mat: 'amplifier' },
        { desc: 'Projector {lumens} lumens', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.lumens * 0.002 }), mat: 'projector' },
        { desc: 'Projection screen {size}"', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.size * 15 }), mat: 'screen' },
      ],
      'Masonry': [
        { desc: '{type} block wall {thickness}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 85 }), mat: 'block' },
        { desc: 'Brick wall {thickness}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 95 }), mat: 'brick' },
        { desc: 'Glass block wall', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 280 }), mat: 'glass_block' },
        { desc: 'Stone wall {thickness}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 350 }), mat: 'stone' },
        { desc: 'Lintel for opening {span}m', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 180 }), mat: 'concrete' },
      ],
      'Metals': [
        { desc: 'Steel column {section} {weight}kg/m', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 5500 }), mat: 'structural_steel' },
        { desc: 'Steel beam {section} {weight}kg/m', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 5200 }), mat: 'structural_steel' },
        { desc: 'Steel truss {span}m', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 6000 }), mat: 'structural_steel' },
        { desc: 'Steel decking {gauge}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 180 }), mat: 'steel_deck' },
        { desc: 'Steel stair', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 8500 }), mat: 'structural_steel' },
        { desc: 'Handrail {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 350 }), mat: 'steel' },
        { desc: 'Metal railing {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 450 }), mat: 'steel' },
        { desc: 'Steel grating {type}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 280 }), mat: 'steel_grating' },
        { desc: 'Expanded metal mesh', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 95 }), mat: 'expanded_metal' },
        { desc: 'Steel plate {thickness}mm', unit: 'ton', pattern: (p) => ({ qty: p.ton, rate: p.ton * 4800 }), mat: 'steel_plate' },
      ],
      'Timber': [
        { desc: 'Timber door frame', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 450 }), mat: 'timber' },
        { desc: 'Timber window frame', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 650 }), mat: 'timber' },
        { desc: 'Timber roof truss', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 3500 }), mat: 'timber' },
        { desc: 'Plywood sheathing', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 65 }), mat: 'plywood' },
        { desc: 'Formwork plywood', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 55 }), mat: 'plywood' },
      ],
      'Landscaping': [
        { desc: 'Tree planting {species}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 850 }), mat: 'tree' },
        { desc: 'Shrub planting {species}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 180 }), mat: 'shrub' },
        { desc: 'Lawn sodding', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 45 }), mat: 'sod' },
        { desc: 'Paving stone {type}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 120 }), mat: 'paving' },
        { desc: 'Irrigation pipe {diam}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 25 }), mat: 'irrigation_pipe' },
        { desc: 'Sprinkler head {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 65 }), mat: 'sprinkler_head' },
        { desc: 'Garden lighting {w}W', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.w * 5 }), mat: 'light' },
        { desc: 'Pergola {size}m x {size}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 8500 }), mat: 'timber' },
        { desc: 'Fountain {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 15000 }), mat: 'fountain' },
        { desc: 'Retaining wall {type} {height}m', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * p.height * 550 }), mat: 'block' },
      ],
      'Infrastructure': [
        { desc: 'Road pavement {thickness}mm', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 280 }), mat: 'asphalt' },
        { desc: 'Sidewalk paving {type}', unit: 'm²', pattern: (p) => ({ qty: p.area, rate: p.area * 95 }), mat: 'paving' },
        { desc: 'Concrete curb {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 120 }), mat: 'concrete' },
        { desc: 'Concrete gutter {size}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 150 }), mat: 'concrete' },
        { desc: 'Storm drain pipe {diam}mm', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 420 }), mat: 'concrete_pipe' },
        { desc: 'Manhole {diam}mm depth{depth}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.depth * 2500 }), mat: 'precast' },
        { desc: 'Catch basin {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 4500 }), mat: 'precast' },
        { desc: 'Water main {diam}mm ductile iron', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * p.diam * 2.5 }), mat: 'ductile_iron' },
        { desc: 'Sewer pipe {diam}mm PVC', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * p.diam * 1.2 }), mat: 'pvc_pipe' },
        { desc: 'Guardrail {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 320 }), mat: 'steel' },
        { desc: 'Sound barrier {height}m', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * p.height * 850 }), mat: 'acoustic' },
        { desc: 'Traffic light assembly', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 8500 }), mat: 'traffic_light' },
        { desc: 'Street light {height}m LED', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.height * 850 }), mat: 'light' },
        { desc: 'Culvert {size}m x {size}m', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 3200 }), mat: 'concrete' },
        { desc: 'Drainage ditch {type}', unit: 'm', pattern: (p) => ({ qty: p.len, rate: p.len * 180 }), mat: 'concrete' },
      ],
      'Furniture': [
        { desc: 'Executive desk {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 4500 }), mat: 'furniture' },
        { desc: 'Office workstation', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2800 }), mat: 'furniture' },
        { desc: 'Meeting table {size}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.size * 2500 }), mat: 'furniture' },
        { desc: 'Office chair {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1200 }), mat: 'furniture' },
        { desc: 'Visitor chair', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 650 }), mat: 'furniture' },
        { desc: 'Filing cabinet {drawer} drawer', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.drawer * 350 }), mat: 'furniture' },
        { desc: 'Bookshelf {size}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.size * 1200 }), mat: 'furniture' },
        { desc: 'Reception sofa {type}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 3500 }), mat: 'furniture' },
        { desc: 'Coffee table', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 1500 }), mat: 'furniture' },
        { desc: 'Wardrobe {size}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.size * 1800 }), mat: 'furniture' },
        { desc: 'Bed {size}', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2500 }), mat: 'furniture' },
        { desc: 'Dining table {seats} seats', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.seats * 450 }), mat: 'furniture' },
        { desc: 'Dining chair', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 450 }), mat: 'furniture' },
        { desc: 'Recliner chair', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * 2800 }), mat: 'furniture' },
      ],
      'Equipment': [
        { desc: 'Passenger elevator {capacity}person', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 8500 }), mat: 'elevator' },
        { desc: 'Freight elevator {capacity}kg', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 12 }), mat: 'elevator' },
        { desc: 'Escalator {height}m rise', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.height * 25000 }), mat: 'escalator' },
        { desc: 'Generator set {kva}kVA', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kva * 850 }), mat: 'generator' },
        { desc: 'UPS system {kva}kVA', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.kva * 1200 }), mat: 'ups' },
        { desc: 'Overhead crane {ton}ton', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.ton * 15000 }), mat: 'crane' },
        { desc: 'Boiler {capacity}kW', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.capacity * 45 }), mat: 'boiler' },
        { desc: 'Air compressor {cfm}CFM', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.cfm * 12 }), mat: 'compressor' },
        { desc: 'Industrial fan {diam}mm', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.diam * 2.5 }), mat: 'fan' },
        { desc: 'Conveyor belt {length}m', unit: 'no.', pattern: (p) => ({ qty: p.count, rate: p.count * p.length * 8500 }), mat: 'conveyor' },
      ],
    };

    const elements = [
      'footing', 'column', 'beam', 'slab', 'wall', 'foundation', 'stair',
      'roof', 'basement_wall', 'retaining_wall', 'balcony', 'canopy',
      'corridor_wall', 'room', 'hall', 'corridor', 'facade', 'roof_deck',
      'lobby', 'entrance', 'atrium', 'parking_area', 'ramp', 'terrace',
      'courtyard', 'garden', 'pool', 'fountain_basin',
    ];

    const types = ['standard', 'premium', 'economy', 'heavy_duty', 'decorative', 'commercial', 'residential', 'industrial', 'medical', 'educational', 'sports', 'religious', 'hospitality', 'retail', 'warehouse'];
    const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Premium', 'Standard', 'Economy'];
    const sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
    const cableSizes = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500];
    const amps = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];
    const catVersions = ['5e', '6', '6a', '7', '7a', '8'];
    const thicknesses = [6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400, 500];

    // Generate items for each division
    for (const [divCode, div] of Object.entries(divisions)) {
      const formulaSet = formulas[div.cat] || formulas['Finishing'];
      const subCodes = {};
      let subCounters = {};

      // Determine how many items to generate per division
      // target: 10,000+ total across all divisions
      const itemsPerDivision = Math.max(50, Math.floor(10000 / Object.keys(divisions).length));

      // Use elements relevant to this category
      const relevantElements = elements.filter((el, i) => {
        if (div.cat === 'Concrete') return true;
        if (div.cat === 'Finishing') return ['wall', 'ceiling', 'floor', 'room', 'hall', 'corridor', 'facade', 'stair', 'balcony', 'terrace'].includes(el);
        if (div.cat === 'Electrical') return ['column', 'wall', 'room', 'hall', 'corridor', 'parking_area', 'facade', 'roof', 'basement_wall'].includes(el);
        if (div.cat === 'Plumbing') return ['wall', 'room', 'basement_wall', 'roof', 'corridor', 'garden', 'pool'].includes(el);
        if (div.cat === 'HVAC') return ['wall', 'room', 'corridor', 'hall', 'atrium', 'parking_area'].includes(el);
        if (div.cat === 'Fire Fighting') return ['room', 'corridor', 'hall', 'parking_area', 'atrium', 'basement_wall'].includes(el);
        if (div.cat === 'Fire Alarm') return ['room', 'corridor', 'hall', 'parking_area', 'atrium', 'lobby'].includes(el);
        if (div.cat === 'Low Current') return ['room', 'corridor', 'hall', 'lobby', 'parking_area', 'atrium'].includes(el);
        if (div.cat === 'Masonry') return ['wall', 'facade', 'retaining_wall'].includes(el);
        return true;
      });

      let generated = 0;
      let attempts = 0;
      const maxAttempts = itemsPerDivision * 20;

      while (generated < itemsPerDivision && attempts < maxAttempts) {
        attempts++;
        const formula = formulaSet[Math.floor(Math.random() * formulaSet.length)];
        const element = relevantElements[Math.floor(Math.random() * relevantElements.length)] || elements[Math.floor(Math.random() * elements.length)];
        const grade = grades[Math.floor(Math.random() * grades.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const cableSize = cableSizes[Math.floor(Math.random() * cableSizes.length)];
        const amp = amps[Math.floor(Math.random() * amps.length)];
        const catVersion = catVersions[Math.floor(Math.random() * catVersions.length)];
        const thickness = thicknesses[Math.floor(Math.random() * thicknesses.length)];

        // Generate parameters for formula
        const vol = Math.round((Math.random() * 100 + 5) * 100) / 100;
        const area = Math.round((Math.random() * 500 + 20) * 100) / 100;
        const len = Math.round((Math.random() * 200 + 5) * 100) / 100;
        const count = Math.floor(Math.random() * 50 + 1);
        const ton = Math.round((Math.random() * 20 + 0.5) * 100) / 100;
        const params = { vol, area, len, count, ton, size, cableSize, amp, catVersion, thickness, grade, type, element };
        const result = formula.pattern(params);

        // Create description
        let desc = formula.desc
          .replace(/\{element\}/g, element.replace(/_/g, ' '))
          .replace(/\{type\}/g, type)
          .replace(/\{grade\}/g, grade)
          .replace(/\{thickness\}/g, thickness)
          .replace(/\{size\}/g, size)
          .replace(/\{diam\}/g, size)
          .replace(/\{temp\}/g, Math.floor(Math.random() * 150 + 50))
          .replace(/\{capacity\}/g, Math.floor(Math.random() * 50 + 2))
          .replace(/\{schedule\}/g, () => 'Schedule ' + Math.floor(Math.random() * 80 + 10))
          .replace(/\{yield\}/g, [20, 25, 30, 35, 40, 45, 50, 55, 60][Math.floor(Math.random() * 9)])
          .replace(/\{section\}/g, ['HEA', 'HEB', 'IPE', 'UPE', 'HSS', 'W', 'S'][Math.floor(Math.random() * 7)] + size)
          .replace(/\{weight\}/g, Math.floor(Math.random() * 200 + 20))
          .replace(/\{span\}/g, Math.floor(Math.random() * 30 + 5))
          .replace(/\{height\}/g, Math.floor(Math.random() * 15 + 2))
          .replace(/\{length\}/g, Math.floor(Math.random() * 50 + 5))
          .replace(/\{gauge\}/g, [22, 24, 26, 28, 30][Math.floor(Math.random() * 5)])
          .replace(/\{w\}/g, [5, 7, 9, 12, 15, 18, 20, 24, 30, 36, 48, 60, 100, 150, 200, 300, 500][Math.floor(Math.random() * 17)])
          .replace(/\{flow\}/g, Math.floor(Math.random() * 500 + 10))
          .replace(/\{head\}/g, Math.floor(Math.random() * 80 + 5))
          .replace(/\{capacity\}/g, Math.floor(Math.random() * 100 + 2))
          .replace(/\{cfm\}/g, Math.floor(Math.random() * 5000 + 100))
          .replace(/\{kva\}/g, [10, 15, 25, 50, 75, 100, 150, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 2000][Math.floor(Math.random() * 18)])
          .replace(/\{port\}/g, [8, 12, 16, 24, 48][Math.floor(Math.random() * 5)])
          .replace(/\{resolution\}/g, [2, 4, 5, 8, 12, 16, 20, 32][Math.floor(Math.random() * 8)])
          .replace(/\{kg\}/g, [150, 300, 500, 600, 800, 1000, 1200][Math.floor(Math.random() * 7)])
          .replace(/\{luggage\}/g, Math.floor(Math.random() * 10 + 2))
          .replace(/\{u\}/g, [6, 12, 18, 24, 36, 42, 48][Math.floor(Math.random() * 7)])
          .replace(/\{mode\}/g, ['single', 'multi'][Math.floor(Math.random() * 2)])
          .replace(/\{a\}/g, catVersion)
          .replace(/\{sch\}/g, [10, 20, 30, 40, 80, 120, 160][Math.floor(Math.random() * 7)])
          .replace(/\{drawer\}/g, [2, 3, 4, 5][Math.floor(Math.random() * 4)])
          .replace(/\{seats\}/g, [2, 4, 6, 8, 10, 12][Math.floor(Math.random() * 6)])
          .replace(/\{lumens\}/g, [2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000][Math.floor(Math.random() * 9)])
          .replace(/\{sdr\}/g, [7.4, 9, 11, 13.6, 17, 21, 26, 32.5, 41][Math.floor(Math.random() * 9)])
          .replace(/\{species\}/g, ['Olive', 'Palm', 'Oak', 'Maple', 'Pine', 'Ficus', 'Conocarpus', 'Jacaranda', 'Acacia', 'Cyprus'][Math.floor(Math.random() * 10)])
          .replace(/\{range\}/g, Math.floor(Math.random() * 100 + 10))
          .replace(/\{zone\}/g, [4, 8, 12, 16, 24, 32, 48, 64][Math.floor(Math.random() * 8)])
          .replace(/\{rating\}/g, [63, 100, 160, 200, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000][Math.floor(Math.random() * 16)])
          .replace(/\{way\}/g, [6, 8, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72][Math.floor(Math.random() * 13)])
          .replace(/\{ip\}/g, () => 'IP' + [20, 44, 54, 55, 65, 66, 67, 68][Math.floor(Math.random() * 8)])
          .replace(/\{[^}]+\}/g, 'Std');

        // generate standard code
        const sectionKeys = ['S', 'A', 'E', 'M', 'P', 'F', 'FA', 'LC', 'L', 'I', 'FU', 'H'];
        let codeKey = divCode;
        let seq = (subCodes[divCode] || 0) + 1;
        subCodes[divCode] = seq;
        const code = `${divCode}.${String(seq).padStart(4, '0')}.${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

        const phases = {
          concrete: 'structure', finishing: 'finishing', electrical: 'electrical',
          plumbing: 'plumbing', hvac: 'mechanical', fire: 'fire_fighting',
          landscaping: 'landscaping', infrastructure: 'foundation',
        };

        id++;

        items.push({
          id: `BOQ-${String(id).padStart(5, '0')}`,
          code,
          category: div.cat,
          description: desc,
          unit: formula.unit,
          unitRate: Math.round(result.rate / result.qty * 100) / 100,
          totalRate: Math.round(result.rate * 100) / 100,
          estimatedQuantity: Math.round(result.qty * 100) / 100,
          estimatedCost: Math.round(result.rate * 100) / 100,
          materialCategory: formula.mat || 'general',
          phase: phases[div.cat.toLowerCase()] || 'general',
          confidence: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
          wasteFactor: Math.round((0.02 + Math.random() * 0.08) * 100) / 100,
          division: div.name,
          divisionCode: divCode,
          referenceCodes: [`${divCode}-${Math.floor(Math.random() * 20) + 1}`],
          formula: formula.desc,
        });
        generated++;
      }
    }

    console.log(`BOQ V2 Generator: ${items.length} items created`);
    return { items, divisions };
  }
}

module.exports = { BoqV2Generator };
