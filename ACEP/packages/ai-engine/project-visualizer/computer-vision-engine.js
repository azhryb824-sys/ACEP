class ComputerVisionEngine {
  analyzeImage(imageData) {
    const type = this.classifyImage(imageData);
    const mockResults = {
      interior: {
        objects: [
          { type: 'wall', confidence: 0.97, boundingBox: { x: 0, y: 0, width: 800, height: 600 } },
          { type: 'window', confidence: 0.94, boundingBox: { x: 200, y: 100, width: 150, height: 200 } },
          { type: 'door', confidence: 0.91, boundingBox: { x: 600, y: 150, width: 100, height: 250 } },
          { type: 'light_fixture', confidence: 0.88, boundingBox: { x: 350, y: 20, width: 60, height: 60 } }
        ],
        dimensions: { width: 800, height: 600 },
        colors: [
          { hex: '#F5F5F5', name: 'white', percentage: 45 },
          { hex: '#8B7355', name: 'brown', percentage: 22 },
          { hex: '#B0C4DE', name: 'light_blue', percentage: 15 }
        ],
        lighting: { type: 'artificial', brightness: 0.72 },
        detectedFeatures: ['walls', 'ceiling', 'floor', 'furniture', 'windows']
      },
      exterior: {
        objects: [
          { type: 'building', confidence: 0.96, boundingBox: { x: 100, y: 50, width: 500, height: 500 } },
          { type: 'facade', confidence: 0.93, boundingBox: { x: 120, y: 70, width: 460, height: 460 } },
          { type: 'entrance', confidence: 0.87, boundingBox: { x: 320, y: 350, width: 80, height: 150 } }
        ],
        dimensions: { width: 800, height: 600 },
        colors: [
          { hex: '#C0C0C0', name: 'silver', percentage: 30 },
          { hex: '#696969', name: 'gray', percentage: 25 },
          { hex: '#2F4F4F', name: 'dark_slate', percentage: 18 }
        ],
        lighting: { type: 'natural', brightness: 0.85 },
        detectedFeatures: ['facade', 'entrance', 'windows', 'roof', 'balcony']
      },
      drone: {
        objects: [
          { type: 'site', confidence: 0.95, boundingBox: { x: 50, y: 30, width: 700, height: 540 } },
          { type: 'excavation_area', confidence: 0.89, boundingBox: { x: 150, y: 100, width: 300, height: 250 } },
          { type: 'material_storage', confidence: 0.84, boundingBox: { x: 500, y: 350, width: 200, height: 150 } },
          { type: 'crane', confidence: 0.82, boundingBox: { x: 380, y: 80, width: 40, height: 200 } }
        ],
        dimensions: { width: 800, height: 600 },
        colors: [
          { hex: '#8B4513', name: 'brown', percentage: 35 },
          { hex: '#D2B48C', name: 'tan', percentage: 20 },
          { hex: '#228B22', name: 'green', percentage: 15 }
        ],
        lighting: { type: 'natural', brightness: 0.9 },
        detectedFeatures: ['site_boundary', 'equipment', 'material_piles', 'excavation']
      },
      facade: {
        objects: [
          { type: 'window', confidence: 0.95, boundingBox: { x: 50, y: 60, width: 120, height: 180 } },
          { type: 'window', confidence: 0.94, boundingBox: { x: 220, y: 60, width: 120, height: 180 } },
          { type: 'window', confidence: 0.94, boundingBox: { x: 390, y: 60, width: 120, height: 180 } },
          { type: 'balcony', confidence: 0.88, boundingBox: { x: 50, y: 350, width: 120, height: 80 } },
          { type: 'entrance', confidence: 0.91, boundingBox: { x: 300, y: 400, width: 160, height: 200 } }
        ],
        dimensions: { width: 800, height: 600 },
        colors: [
          { hex: '#DEB887', name: 'beige', percentage: 40 },
          { hex: '#A0522D', name: 'sienna', percentage: 20 },
          { hex: '#2F4F4F', name: 'dark_slate', percentage: 12 }
        ],
        lighting: { type: 'natural', brightness: 0.8 },
        detectedFeatures: ['regular_window_grid', 'balconies', 'parapet', 'cornice']
      },
      landscape: {
        objects: [
          { type: 'terrain', confidence: 0.97, boundingBox: { x: 0, y: 250, width: 800, height: 350 } },
          { type: 'tree', confidence: 0.92, boundingBox: { x: 100, y: 100, width: 100, height: 200 } },
          { type: 'tree', confidence: 0.91, boundingBox: { x: 350, y: 80, width: 120, height: 220 } },
          { type: 'path', confidence: 0.85, boundingBox: { x: 250, y: 300, width: 80, height: 200 } }
        ],
        dimensions: { width: 800, height: 600 },
        colors: [
          { hex: '#228B22', name: 'green', percentage: 45 },
          { hex: '#8B4513', name: 'brown', percentage: 15 },
          { hex: '#87CEEB', name: 'sky_blue', percentage: 20 }
        ],
        lighting: { type: 'natural', brightness: 0.88 },
        detectedFeatures: ['vegetation', 'pathways', 'topography', 'water_features']
      },
      detail: {
        objects: [
          { type: 'material_surface', confidence: 0.93, boundingBox: { x: 0, y: 0, width: 400, height: 400 } },
          { type: 'texture_pattern', confidence: 0.88, boundingBox: { x: 50, y: 50, width: 300, height: 300 } },
          { type: 'finish_layer', confidence: 0.85, boundingBox: { x: 100, y: 100, width: 200, height: 200 } }
        ],
        dimensions: { width: 400, height: 400 },
        colors: [
          { hex: '#D3D3D3', name: 'light_gray', percentage: 50 },
          { hex: '#808080', name: 'gray', percentage: 30 }
        ],
        lighting: { type: 'controlled', brightness: 0.95 },
        detectedFeatures: ['surface_texture', 'material_grain', 'edge_pattern']
      }
    };
    return mockResults[type] || mockResults.interior;
  }

  analyzeRoom(imageData) {
    const imageInfo = this.analyzeImage(imageData);
    const isInterior = imageInfo.detectedFeatures.includes('walls');
    if (!isInterior) {
      return {
        walls: { detected: false, count: 0, surfaces: [] },
        floor: { detected: false, material: null, condition: null },
        ceiling: { detected: false, height: null, type: null },
        openings: [],
        columns: [],
        fixtures: [],
        furniture: [],
        services: []
      };
    }
    return {
      walls: {
        detected: true,
        count: 4,
        surfaces: [
          { id: 'wall_1', type: 'exterior', material: 'concrete', condition: 'good', roughness: 0.3 },
          { id: 'wall_2', type: 'partition', material: 'drywall', condition: 'fair', roughness: 0.2 },
          { id: 'wall_3', type: 'partition', material: 'drywall', condition: 'good', roughness: 0.2 },
          { id: 'wall_4', type: 'exterior', material: 'concrete', condition: 'good', roughness: 0.3 }
        ]
      },
      floor: {
        detected: true,
        material: 'concrete',
        condition: 'rough',
        level: 'ground',
        area: 45,
        surfaceType: 'slab'
      },
      ceiling: {
        detected: true,
        height: 3.2,
        type: 'flat',
        material: 'concrete',
        condition: 'good',
        hasFixtures: true
      },
      openings: [
        { type: 'door', position: { x: 0.8, y: 0, z: 0 }, width: 1.0, height: 2.2, direction: 'inward' },
        { type: 'window', position: { x: 2.5, y: 1.0, z: 0 }, width: 1.5, height: 1.8, glazing: 'double' },
        { type: 'window', position: { x: 5.5, y: 1.0, z: 0 }, width: 1.5, height: 1.8, glazing: 'double' }
      ],
      columns: [
        { id: 'col_1', type: 'rectangular', width: 0.4, depth: 0.4, material: 'reinforced_concrete', position: { x: 2.0, y: 0, z: 0 } },
        { id: 'col_2', type: 'rectangular', width: 0.4, depth: 0.4, material: 'reinforced_concrete', position: { x: 5.0, y: 0, z: 0 } }
      ],
      fixtures: [
        { type: 'lighting', subtype: 'recessed', count: 4, positions: [{ x: 1.5, y: 3.0, z: 0 }, { x: 4.0, y: 3.0, z: 0 }] },
        { type: 'electrical', subtype: 'outlet', count: 6, positions: [{ x: 0.5, y: 0.3, z: 0 }, { x: 5.5, y: 0.3, z: 0 }] },
        { type: 'switch', subtype: 'light_switch', count: 2, positions: [{ x: 0.8, y: 1.2, z: 0 }, { x: 5.0, y: 1.2, z: 0 }] }
      ],
      furniture: [
        { type: 'table', position: { x: 3.5, y: 0, z: 0 }, dimensions: { width: 1.8, depth: 0.9, height: 0.75 } },
        { type: 'chair', count: 4, positions: [{ x: 3.0, y: 0, z: 0.5 }, { x: 4.0, y: 0, z: 0.5 }] }
      ],
      services: [
        { type: 'hvac', subtype: 'vent', count: 2, positions: [{ x: 1.5, y: 3.0, z: 0 }, { x: 4.5, y: 3.0, z: 0 }] },
        { type: 'plumbing', subtype: 'pipe', material: 'pvc', diameter: 0.1, positions: [{ x: 0.3, y: 0, z: 0 }] }
      ]
    };
  }

  detectChanges(imageBefore, imageAfter) {
    const before = this.analyzeImage(imageBefore);
    const after = this.analyzeImage(imageAfter);
    const changes = [];
    const beforeObjects = before.objects.map(o => o.type);
    const afterObjects = after.objects.map(o => o.type);

    for (const obj of after.objects) {
      if (!beforeObjects.includes(obj.type)) {
        changes.push({ element: obj.type, type: 'added', confidence: obj.confidence });
      }
    }
    for (const obj of before.objects) {
      if (!afterObjects.includes(obj.type)) {
        changes.push({ element: obj.type, type: 'removed', confidence: obj.confidence });
      }
    }
    for (const objA of after.objects) {
      const match = before.objects.find(objB => objB.type === objA.type);
      if (match && (match.boundingBox.x !== objA.boundingBox.x || match.boundingBox.y !== objA.boundingBox.y)) {
        changes.push({ element: objA.type, type: 'modified', confidence: Math.min(objA.confidence, match.confidence) });
      }
    }

    const beforeDim = before.dimensions;
    const afterDim = after.dimensions;
    const areaBefore = beforeDim.width * beforeDim.height;
    const areaAfter = afterDim.width * afterDim.height;
    const similarityScore = changes.length === 0 ? 1 : Math.max(0, 1 - (changes.length * 0.15));

    return {
      changes,
      similarityScore: Math.round(similarityScore * 100) / 100,
      dimensions: {
        before: beforeDim,
        after: afterDim,
        ratio: { width: afterDim.width / beforeDim.width, height: afterDim.height / beforeDim.height },
        areaChange: ((areaAfter - areaBefore) / areaBefore * 100).toFixed(1) + '%'
      }
    };
  }

  extractDimensions(imageData, referenceObject) {
    const imageInfo = this.analyzeImage(imageData);
    const refObj = imageInfo.objects.find(o => o.type === referenceObject);
    if (!refObj) {
      return {
        estimated: false,
        message: 'Reference object not found in image',
        imageDimensions: imageInfo.dimensions,
        scale: null,
        measurements: []
      };
    }
    const pixelWidth = refObj.boundingBox.width;
    const referenceWidth = 1.0;
    const scale = referenceWidth / pixelWidth;
    const measurements = imageInfo.objects.map(obj => ({
      type: obj.type,
      pixelDimensions: { width: obj.boundingBox.width, height: obj.boundingBox.height },
      estimatedDimensions: {
        width: parseFloat((obj.boundingBox.width * scale).toFixed(2)),
        height: parseFloat((obj.boundingBox.height * scale).toFixed(2))
      }
    }));
    return {
      estimated: true,
      referenceObject: { type: referenceObject, assumedWidthMeters: referenceWidth },
      imageDimensions: imageInfo.dimensions,
      scale: parseFloat(scale.toFixed(4)),
      measurements
    };
  }

  classifyImage(imageData) {
    if (!imageData || typeof imageData !== 'string') return 'interior';
    const length = imageData.length;
    if (length < 1000) return 'detail';
    const hash = imageData.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const categories = ['interior', 'exterior', 'drone', 'facade', 'landscape', 'detail'];
    return categories[hash % categories.length];
  }

  analyzeSitePhoto(imageData) {
    const imageType = this.classifyImage(imageData);
    const siteData = {
      interior: {
        progress: 65,
        activities: [
          { name: 'Wall finishing', status: 'in_progress', completion: 70 },
          { name: 'Electrical wiring', status: 'completed', completion: 100 },
          { name: 'Plumbing', status: 'completed', completion: 100 },
          { name: 'Floor tiling', status: 'in_progress', completion: 40 }
        ],
        safetyIssues: [
          { type: 'exposed_wires', severity: 'high', location: 'south_wall', status: 'active' },
          { type: 'wet_floor', severity: 'medium', location: 'bathroom', status: 'active' }
        ],
        materials: [
          { name: 'Ceramic tiles', quantity: 150, unit: 'boxes', location: 'staging_area' },
          { name: 'Paint buckets', quantity: 8, unit: 'units', location: 'storage_room' }
        ]
      },
      exterior: {
        progress: 40,
        activities: [
          { name: 'Scaffolding setup', status: 'completed', completion: 100 },
          { name: 'Facade cladding', status: 'in_progress', completion: 35 },
          { name: 'Window installation', status: 'pending', completion: 0 }
        ],
        safetyIssues: [
          { type: 'scaffolding_instability', severity: 'critical', location: 'north_facade', status: 'active' },
          { type: 'missing_harness', severity: 'high', location: 'roof_area', status: 'resolved' }
        ],
        materials: [
          { name: 'Cladding panels', quantity: 200, unit: 'sq_meters', location: 'ground_storage' }
        ]
      },
      drone: {
        progress: 25,
        activities: [
          { name: 'Site preparation', status: 'completed', completion: 100 },
          { name: 'Excavation', status: 'in_progress', completion: 60 },
          { name: 'Foundation pouring', status: 'pending', completion: 0 }
        ],
        safetyIssues: [
          { type: 'open_excavation', severity: 'high', location: 'north_sector', status: 'active' },
          { type: 'unstable_soil', severity: 'medium', location: 'east_boundary', status: 'monitoring' }
        ],
        materials: [
          { name: 'Rebar steel', quantity: 5000, unit: 'kg', location: 'warehouse' },
          { name: 'Concrete mix', quantity: 80, unit: 'cubic_meters', location: 'batch_plant' }
        ]
      },
      facade: {
        progress: 55,
        activities: [
          { name: 'Stone cladding', status: 'in_progress', completion: 60 },
          { name: 'Window frame installation', status: 'completed', completion: 100 },
          { name: 'Balcony railing', status: 'in_progress', completion: 30 }
        ],
        safetyIssues: [
          { type: 'falling_debris', severity: 'high', location: 'work_zone_below', status: 'active' }
        ],
        materials: [
          { name: 'Granite panels', quantity: 120, unit: 'sq_meters', location: 'hoist_area' },
          { name: 'Steel rails', quantity: 40, unit: 'units', location: '1st_floor' }
        ]
      },
      landscape: {
        progress: 20,
        activities: [
          { name: 'Grading', status: 'in_progress', completion: 45 },
          { name: 'Tree planting', status: 'pending', completion: 0 },
          { name: 'Pathway construction', status: 'pending', completion: 0 }
        ],
        safetyIssues: [],
        materials: [
          { name: 'Topsoil', quantity: 300, unit: 'cubic_meters', location: 'stockpile_a' },
          { name: 'Paving stones', quantity: 2000, unit: 'units', location: 'pallet_b' }
        ]
      },
      detail: {
        progress: 85,
        activities: [
          { name: 'Paint touch-up', status: 'in_progress', completion: 80 },
          { name: 'Hardware installation', status: 'completed', completion: 100 }
        ],
        safetyIssues: [],
        materials: [
          { name: 'Paint (white)', quantity: 2, unit: 'gallons', location: 'workshop' }
        ]
      }
    };
    return siteData[imageType] || siteData.interior;
  }

  generatePointCloud(points) {
    if (!Array.isArray(points) || points.length === 0) {
      points = [];
      for (let i = 0; i < 1000; i++) {
        points.push({
          x: parseFloat((Math.random() * 10 - 5).toFixed(3)),
          y: parseFloat((Math.random() * 10 - 5).toFixed(3)),
          z: parseFloat((Math.random() * 10 - 5).toFixed(3)),
          color: { r: Math.floor(Math.random() * 256), g: Math.floor(Math.random() * 256), b: Math.floor(Math.random() * 256) }
        });
      }
    }
    const bounds = points.reduce((acc, p) => ({
      minX: Math.min(acc.minX, p.x), maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y), maxY: Math.max(acc.maxY, p.y),
      minZ: Math.min(acc.minZ, p.z), maxZ: Math.max(acc.maxZ, p.z)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
    return {
      pointCount: points.length,
      bounds: {
        x: { min: bounds.minX, max: bounds.maxX, range: parseFloat((bounds.maxX - bounds.minX).toFixed(3)) },
        y: { min: bounds.minY, max: bounds.maxY, range: parseFloat((bounds.maxY - bounds.minY).toFixed(3)) },
        z: { min: bounds.minZ, max: bounds.maxZ, range: parseFloat((bounds.maxZ - bounds.minZ).toFixed(3)) }
      },
      density: parseFloat((points.length / ((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) * (bounds.maxZ - bounds.minZ))).toFixed(2)),
      points: points.slice(0, 100),
      format: 'xyz_rgb',
      suggestedDisplay: { pointSize: 0.02, colorMode: 'rgb' }
    };
  }

  detectSceneElements(imageData) {
    const siteData = this.analyzeSitePhoto(imageData);
    const imageInfo = this.analyzeImage(imageData);
    const siteProgress = siteData.progress;

    let phase;
    if (siteProgress < 15) phase = 'excavation';
    else if (siteProgress < 40) phase = 'foundation';
    else if (siteProgress < 65) phase = 'structure';
    else if (siteProgress < 85) phase = 'finishing';
    else phase = 'completion';

    const workers = [];
    if (siteProgress > 10 && siteProgress < 90) {
      const workerCount = Math.max(1, Math.floor(siteProgress / 15));
      for (let i = 0; i < workerCount; i++) {
        workers.push({
          id: `worker_${i + 1}`,
          detected: true,
          activity: siteData.activities[i]?.name || 'general_labor',
          position: { x: parseFloat((2 + Math.random() * 4).toFixed(1)), y: 0, z: parseFloat((Math.random() * 3).toFixed(1)) },
          equipment: ['helmet', 'vest', 'boots']
        });
      }
    }

    const detectedEquipment = [];
    if (phase === 'excavation' || phase === 'foundation') {
      detectedEquipment.push(
        { type: 'excavator', count: 1, status: 'operational' },
        { type: 'dump_truck', count: 2, status: 'active' }
      );
    }
    if (phase === 'structure') {
      detectedEquipment.push(
        { type: 'crane', count: 1, status: 'operational' },
        { type: 'concrete_pump', count: 1, status: 'active' }
      );
    }
    if (phase === 'finishing') {
      detectedEquipment.push(
        { type: 'scaffolding', count: 3, status: 'erected' },
        { type: 'mixer', count: 1, status: 'operational' }
      );
    }

    return {
      phase,
      progress: siteProgress,
      workers: {
        detected: workers.length > 0,
        count: workers.length,
        details: workers,
        ppeCompliance: workers.length > 0 ? parseFloat((100 - Math.random() * 15).toFixed(1)) : 0
      },
      equipment: {
        detected: detectedEquipment.length > 0,
        items: detectedEquipment
      },
      materials: {
        detected: siteData.materials.length > 0,
        items: siteData.materials
      },
      siteCondition: {
        safetyIssues: siteData.safetyIssues.length,
        criticalIssues: siteData.safetyIssues.filter(s => s.severity === 'critical').length,
        overall: siteData.safetyIssues.length === 0 ? 'safe' : 'caution'
      },
      environmental: {
        weather: 'clear',
        visibility: 'good',
        timeOfDay: imageInfo.lighting.brightness > 0.7 ? 'day' : 'night'
      },
      analysis: {
        summary: `Site is in ${phase} phase at ${siteProgress}% completion with ${workers.length} workers and ${detectedEquipment.length} equipment types detected.`,
        recommendations: siteData.safetyIssues.length > 0
          ? ['Address safety issues before proceeding', 'Continue monitoring site progress']
          : ['Progress is on track', 'Continue current operations']
      }
    };
  }
}

module.exports = ComputerVisionEngine;
