const PROMPT_TEMPLATES = {
  exterior: [
    '{style} {projectType}, {subtype}, {area}m², {floors} Floors, {phase} Stage, {finishing} Finishing, {archStyle} Architecture, {facadeMaterial} Facade, {roofType} Roof, {windows} Windows, {lighting}, {qualityTags}, {constraintTags}, Construction Visualization',
    'Professional architectural exterior view of a {style} {projectType}, Total area {area}m², {subtype}, {floors} floors, Currently at {phase} construction stage, {finishing} finishing quality, {archStyle} architectural style, {facadeMaterial} facade, {roofType} roofing, {landscape} landscaping, {lighting}, {qualityTags}, {constraintTags}',
    '{qualityTags} exterior rendering of a {style} {projectType}, {subtype}, {area}m² built up area, {floors} story building, {archStyle} design, Main facade features {facadeMaterial}, {windows} fenestration, {entranceType} entrance, Surrounding {landscape}, {lighting}, {constraintTags}',
    'Architectural photograph of {style} {projectType}, {subtype}, {area}m², {floors} floors, {archStyle} style, {finishing} interior and exterior finishes, {facadeMaterial} cladding, {roofType} roof design, Professional architectural photography, {qualityTags}, {constraintTags}',
    '{archStyle} {projectType} design, {subtype}, Total built area {area}m² over {floors} floors, {finishing} finishes, {phase} under construction, Features {facadeMaterial} facade, {windows}, {architecturalFeatures}, {lighting}, {qualityTags}, {constraintTags}, Architectural visualization',
  ],
  interior: [
    'Interior view of {style} {projectType}, {subtype}, {area}m², {roomType}, {finishing} Finishing, {wallMaterial} Walls, {floorMaterial} Flooring, {ceilingType} Ceiling, {lighting}, {qualityTags}, {constraintTags}, Interior Design Visualization',
    '{qualityTags} interior of a {finishing} {roomType} in a {style} {projectType}, {archStyle} design, {floorMaterial} flooring, {wallMaterial} wall finish, {ceilingType} ceiling, {furnitureStyle} furniture, {lighting}, {constraintTags}',
    'Professional interior photography of {roomType}, {style} {projectType}, {finishing} finishing level, {wallMaterial} walls, {floorMaterial} floor, {ceilingType} ceiling, Decorative {lighting}, {qualityTags}, {constraintTags}',
    '{finishing} {roomType} interior, {archStyle} style, {wallMaterial} wall cladding, {floorMaterial} flooring material, {ceilingType} with integrated lighting, {furnitureStyle} furnishings, {lighting}, {qualityTags}, {constraintTags}',
    'Interior architectural visualization, {style} {projectType} {roomType}, {area}m² project, {finishing} finishes, {wallMaterial}, {floorMaterial}, {ceilingType}, Modern furniture, Accent lighting, {qualityTags}, {constraintTags}',
  ],
  construction: [
    '{phase} construction stage of {style} {projectType}, {subtype}, {area}m², {floors} floors, {archStyle} design, {structuralSystem} structural system, Construction materials visible, {lighting}, {qualityTags}, {constraintTags}, Documentary construction photography',
    'Construction site photograph, {style} {projectType} at {phase} stage, {subtype}, Total area {area}m², {floors} floors, {structuralSystem} structure, {finishing} finishes being installed, {lighting}, {qualityTags}, {constraintTags}, Real construction documentation',
    '{phase} works in progress for {style} {projectType}, {subtype}, {area}m² building, {structuralSystem} frame, MEP rough in visible, {weatherCondition} weather, {lighting}, {qualityTags}, {constraintTags}',
    'Documentary style construction photo, {style} {projectType} during {phase}, {subtype}, {floors} story building, {structuralSystem} under construction, Workers safety equipment visible, {lighting}, {qualityTags}, {constraintTags}',
  ],
  facade: [
    'Detailed facade view of {style} {projectType}, {subtype}, {area}m², {floors} floors, {archStyle} architecture, {facadeMaterial} cladding system, {windows} fenestration, {lighting}, {qualityTags}, {constraintTags}',
    '{archStyle} facade design, {style} {projectType}, {subtype}, {facadeMaterial} exterior finish, {windows} system, Entrance with {entranceType}, {lighting}, {qualityTags}, {constraintTags}, Architectural facade photography',
    'Front elevation view, {style} {projectType}, {subtype}, {facadeMaterial} facade, {roofType} roof, {landscape} landscape setting, Symmetrical composition, {lighting}, {qualityTags}, {constraintTags}',
  ],
  aerial: [
    'Aerial drone view of {style} {projectType}, {subtype}, {area}m² site, {floors} floors, {archStyle} architecture, {facadeMaterial} roof and facade, Surrounding {landscape}, {lighting}, {qualityTags}, {constraintTags}',
    'Top down aerial photography, {style} {projectType} complex, {subtype}, Total site area {area}m², {floors} levels, Building layout visible, {landscape} surroundings, {lighting}, {qualityTags}, {constraintTags}',
    'Bird eye view of {style} {projectType}, {subtype}, {archStyle} design, {roofType} roofscape, {landscape} integration, {lighting}, {qualityTags}, {constraintTags}',
  ],
  night: [
    'Night view of {style} {projectType}, {subtype}, {area}m², {floors} floors, {archStyle} architecture, {facadeMaterial} facade illuminated, Architectural lighting design, Interior lights visible through {windows}, Night sky, {qualityTags}, {constraintTags}',
    'Evening architectural photography, {style} {projectType}, {subtype}, {archStyle} style, Dramatic lighting on {facadeMaterial} facade, Warm interior glow, Landscape lighting, Twilight sky, {qualityTags}, {constraintTags}',
    'Night exterior rendering, {style} {projectType}, {subtype}, Accent lighting on {facadeMaterial}, Landscape illumination, Moonlight, Starry sky, {qualityTags}, {constraintTags}',
  ],
};

const PHASE_SPECIFIC_MAPPINGS = {
  pre_construction: { phase: 'Before Construction', structuralSystem: 'Proposed', lighting: 'Daylight', quality: 'Documentary' },
  excavation: { phase: 'Excavation', structuralSystem: 'Temporary Works', lighting: 'Daylight' },
  foundation: { phase: 'Foundation', structuralSystem: 'Foundation System', features: ['Rebar Cage', 'Formwork', 'Waterproofing'] },
  structure: { phase: 'Structural Frame', features: ['Rebar', 'Formwork', 'Concrete Pouring'] },
  masonry: { phase: 'Masonry Walls', features: ['Blockwork', 'Mortar Joints', 'Wall Openings'] },
  plastering: { phase: 'Plaster Works', features: ['Scratch Coat', 'Render', 'Screed'] },
  electrical: { phase: 'Electrical Rough In', features: ['Conduits', 'Cables', 'Back Boxes', 'Panel Boards'] },
  plumbing: { phase: 'Plumbing Rough In', features: ['Pipework', 'Drainage', 'Water Supply Lines'] },
  hvac: { phase: 'HVAC Installation', features: ['Ductwork', 'Vents', 'AC Units', 'Insulated Pipes'] },
  gypsum: { phase: 'Gypsum Works', features: ['Gypsum Board', 'Metal Studs', 'Cornice', 'False Ceiling'] },
  painting: { phase: 'Painting Stage', features: ['Primer', 'Paint Finish', 'Trim'] },
  tiling: { phase: 'Tiling Works', features: ['Floor Tiles', 'Wall Tiles', 'Grouting', 'Skirting'] },
  facade: { phase: 'Facade Cladding', features: ['Stone Cladding', 'Aluminum Panels', 'Glass Installation'] },
  finishing: { phase: 'Final Finishing', features: ['Lighting Fixtures', 'Sanitary Ware', 'Joinery', 'Decor Elements'] },
  handover: { phase: 'Completed', features: ['Final Building', 'Landscaping', 'Ready for Occupancy'] },
};

const AREA_DESCRIPTORS = {
  small: [40, 60, 80, 100, 120],
  medium: [150, 180, 220, 300, 400, 600],
  large: [800, 1000, 1500, 2000, 3000],
  xlarge: [5000, 8000, 10000, 15000, 20000],
  massive: [30000, 50000, 80000, 100000, 200000],
};

module.exports = {
  PROMPT_TEMPLATES,
  PHASE_SPECIFIC_MAPPINGS,
  AREA_DESCRIPTORS,
};
