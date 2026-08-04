import { BaseEngine, IVirtualBuildingEngine, ProjectFacts, VirtualBuilding, BuildingSkeleton, Floor, VirtualSpace, SpaceConnection, StructuralModel, ArchitecturalModel, MEPModel, OutdoorModel, BuildingMetadata, FactType, SpaceType, FinishingLevel } from '@acep/core';
import { KnowledgeGraph, SpacesLibrary, ProjectTypesLibrary } from '@acep/knowledge-base';

export class VirtualBuildingEngine extends BaseEngine implements IVirtualBuildingEngine {
  private knowledgeGraph: KnowledgeGraph;
  private spacesLib: SpacesLibrary;
  private projectTypesLib: ProjectTypesLibrary;

  constructor(kg: KnowledgeGraph, spLib: SpacesLibrary, ptLib: ProjectTypesLibrary) {
    super('VirtualBuildingEngine', '1.0.0');
    this.knowledgeGraph = kg;
    this.spacesLib = spLib;
    this.projectTypesLib = ptLib;
  }

  async initialize(): Promise<void> {
    this.setStatus('initialized');
    this.logger.info('VirtualBuildingEngine initialized');
  }

  async validate(): Promise<boolean> {
    return true;
  }

  async build(facts: ProjectFacts): Promise<VirtualBuilding> {
    this.setStatus('running');
    this.logger.info('Building virtual building model');
    const floors = this.generateFloors(facts);
    const spaces = this.generateSpacesList(facts, floors);
    const structure = this.generateStructureModel(facts, spaces);
    const architecture = this.generateArchitectureModel(facts, spaces);
    const mep = this.generateMEPModel(facts, spaces);
    const outdoor = this.generateOutdoorModel(facts);

    const building: VirtualBuilding = {
      id: `bld-${Date.now()}`,
      projectType: facts.projectType.value as any,
      skeleton: {
        numFloors: facts.floors || 1,
        hasBasement: facts.hasBasement || false,
        hasRoof: true,
        hasParking: false,
        hasGarden: false,
        totalHeight: (facts.floors || 1) * 3.2
      },
      floors,
      spaces,
      structural: structure,
      architectural: architecture,
      mep,
      outdoor,
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        confidence: facts.confidence,
        source: 'user_description',
        faktType: FactType.Derived
      }
    };

    this.setStatus('idle');
    return building;
  }

  async updateBuilding(building: VirtualBuilding, changes: Partial<ProjectFacts>): Promise<VirtualBuilding> {
    this.logger.info('Updating virtual building with changes');
    if (changes.floors) {
      building.skeleton.numFloors = changes.floors;
      building.skeleton.totalHeight = changes.floors * 3.2;
    }
    if (changes.hasBasement !== undefined) {
      building.skeleton.hasBasement = changes.hasBasement;
    }
    building.metadata.updated = new Date().toISOString();
    return building;
  }

  async generateSpaces(facts: ProjectFacts): Promise<unknown> {
    return this.generateSpacesList(facts, this.generateFloors(facts));
  }

  async generateStructure(building: VirtualBuilding): Promise<unknown> {
    return this.generateStructureModel(building as any, building.spaces);
  }

  async generateArchitecture(building: VirtualBuilding): Promise<unknown> {
    return this.generateArchitectureModel(building as any, building.spaces);
  }

  async generateMEP(building: VirtualBuilding): Promise<unknown> {
    return this.generateMEPModel(building as any, building.spaces);
  }

  async generateOutdoor(building: VirtualBuilding): Promise<unknown> {
    return this.generateOutdoorModel(building as any);
  }

  private generateFloors(facts: ProjectFacts): Floor[] {
    const numFloors = facts.floors || 1;
    const floors: Floor[] = [];

    for (let i = 0; i < numFloors; i++) {
      floors.push({
        id: `floor-${i + 1}`,
        number: i + 1,
        name: i === 0 ? 'Ground Floor' : `Floor ${i + 1}`,
        height: 3.0,
        spaces: [],
        area: facts.builtArea?.value ? facts.builtArea.value / numFloors : 100
      });
    }

    if (facts.hasBasement) {
      floors.unshift({
        id: 'floor-b1',
        number: -1,
        name: 'Basement',
        height: 3.0,
        spaces: [],
        area: facts.builtArea?.value ? facts.builtArea.value / numFloors : 100
      });
    }

    floors.push({
      id: 'floor-roof',
      number: numFloors + 1,
      name: 'Roof',
      height: 1.5,
      spaces: [],
      area: (facts.builtArea?.value || 100) / numFloors
    });

    return floors;
  }

  private generateSpacesList(facts: ProjectFacts, floors: Floor[]): VirtualSpace[] {
    const spaces: VirtualSpace[] = [];
    let spaceIndex = 0;

    if (facts.spaces) {
      for (const [spaceType, spaceFact] of Object.entries(facts.spaces)) {
        for (let i = 0; i < spaceFact.count; i++) {
          spaceIndex++;
          const spaceDef = this.spacesLib.get(spaceType);
          const floor = floors.find(f => f.number > 0 && f.number <= (floors.length - 1)) || floors[0];

          const vs: VirtualSpace = {
            id: `space-${spaceType.toLowerCase()}-${i + 1}`,
            type: spaceType as SpaceType,
            name: `${spaceType} ${i + 1}`,
            floor: floor.number,
            area: spaceDef?.typicalArea || 15,
            height: 3.0,
            finishingLevel: spaceFact.finishingLevel || facts.qualityLevel?.level || FinishingLevel.Standard,
            connections: [],
            components: []
          };

          spaces.push(vs);
        }
      }
    }

    return spaces;
  }

  private generateStructureModel(facts: ProjectFacts, spaces: VirtualSpace[]): StructuralModel {
    return {
      foundation: [{ id: 'foundation-1', type: 'Isolated', material: 'Reinforced Concrete', dimensions: { length: 1.5, width: 1.5, height: 0.5 }, quantity: 10 }],
      columns: [{ id: 'col-1', count: 20, dimensions: { width: 0.3, height: 3.0, depth: 0.5 }, material: 'Reinforced Concrete', reinforcementRatio: 0.02 }],
      beams: [{ id: 'beam-1', count: 30, dimensions: { width: 0.3, height: 0.5, length: 5 }, material: 'Reinforced Concrete', reinforcementRatio: 0.015 }],
      slabs: [{ id: 'slab-1', type: 'Flat Slab', area: facts.builtArea?.value || 200, thickness: 0.2, material: 'Reinforced Concrete', reinforcementRatio: 0.012 }],
      shearWalls: [],
      stairs: [{ id: 'stair-1', type: 'Straight', width: 1.2, flightCount: 2, material: 'Reinforced Concrete' }],
      retainingWalls: [],
      expansionJoints: []
    };
  }

  private generateArchitectureModel(facts: ProjectFacts, spaces: VirtualSpace[]): ArchitecturalModel {
    const totalWallArea = (facts.builtArea?.value || 200) * 3;
    return {
      walls: [{ id: 'wall-1', length: 50, height: 3, thickness: 0.2, material: 'Cement Block', finishType: 'Plaster', fireRating: 2, acousticRating: 40, openings: 10 }],
      doors: [{ id: 'door-1', count: spaces.length + 5, width: 0.9, height: 2.1, material: 'Wood', type: 'Hinged', fireRating: 1 }],
      windows: [{ id: 'win-1', count: spaces.length, width: 1.2, height: 1.5, material: 'Aluminum', glassType: 'Double Glazed' }],
      ceilings: spaces.map(s => ({ id: `ceil-${s.id}`, type: 'Suspended', area: s.area, material: 'Gypsum Board', suspended: true })),
      floorFinishes: spaces.map(s => ({ id: `ff-${s.id}`, type: 'Tiles', area: s.area, material: 'Ceramic', description: 'Ceramic Floor Tiles' })),
      waterproofing: [{ id: 'wp-1', location: 'Bathrooms', area: 50, type: 'Liquid Membrane', layers: 2 }],
      paints: [{ id: 'pnt-1', location: 'Walls', area: totalWallArea * 0.8, layers: 2, paintType: 'Water Based', color: 'White' }],
      claddings: []
    };
  }

  private generateMEPModel(facts: ProjectFacts, spaces: VirtualSpace[]): MEPModel {
    return {
      electrical: { hasMainPanel: true, hasSubPanels: true, totalLoad: 50, lightingPoints: spaces.length * 3, powerPoints: spaces.length * 4, cableLength: spaces.length * 15, conduitLength: spaces.length * 12 },
      plumbing: { waterSupplyPoints: spaces.filter(s => s.type === SpaceType.Bathroom || s.type === SpaceType.Kitchen).length * 3, drainagePoints: spaces.filter(s => s.type === SpaceType.Bathroom || s.type === SpaceType.Kitchen).length * 2, pipeLength: spaces.length * 10, fixtures: spaces.filter(s => s.type === SpaceType.Bathroom).length * 3 },
      hvac: { type: 'Split', capacity: spaces.length * 2, units: spaces.length, ductLength: spaces.length * 5, pipeLength: spaces.length * 8 },
      fireFighting: { type: 'Water Based', sprinklers: spaces.length * 2, hoseReels: Math.ceil(spaces.length / 3), extinguishers: Math.ceil(spaces.length / 2), pipeLength: spaces.length * 8, pumpCapacity: 50 },
      fireAlarm: { detectors: spaces.length * 2, manualCallPoints: Math.ceil(spaces.length / 2), alarmBells: Math.ceil(spaces.length / 3), controlPanel: true, cableLength: spaces.length * 10 },
      gas: { hasGas: false, pipeLength: 0, valves: 0, detectors: 0 },
      cctv: { cameras: Math.ceil(spaces.length / 3), cableLength: Math.ceil(spaces.length / 3) * 20, recordingHours: 720 },
      accessControl: { doors: 2, readers: 2, controller: true },
      dataNetwork: { dataPoints: spaces.length * 2, cableLength: spaces.length * 15, racks: 1, switches: 1 },
      publicAddress: { speakers: Math.ceil(spaces.length / 2), amplifier: true, cableLength: spaces.length * 8 },
      bms: { hasBMS: true, points: spaces.length * 2, controller: true },
      solar: { hasSolar: false, panels: 0, capacity: 0, inverterCapacity: 0 },
      drainage: { stormDrainage: true, sanitaryDrainage: true, pipeLength: spaces.length * 8, manholes: Math.ceil(spaces.length / 5) },
      elevator: { count: 1, capacity: 1000, speed: 1.5, hasMachineRoom: true, stops: facts.floors || 2 }
    };
  }

  private generateOutdoorModel(facts: ProjectFacts): OutdoorModel {
    const hasGarden = facts.spaces && Object.keys(facts.spaces).includes('Garden');
    return {
      fences: [{ length: 50, height: 2, material: 'Block' }],
      gates: [{ count: 1, width: 4, height: 2.5, type: 'Sliding', automated: true }],
      parking: [{ spaces: (facts.builtArea?.value || 200) > 200 ? 4 : 2, area: 30, type: 'Open', covered: false }],
      walkways: [{ area: 40, material: 'Interlock', width: 1.2 }],
      landscape: hasGarden ? [{ area: 100, type: 'Garden', trees: 5, grassArea: 80 }] : [],
      irrigation: { hasIrrigation: hasGarden || false, area: hasGarden ? 100 : 0, type: 'Sprinkler', pipeLength: 30 },
      outdoorLighting: { poles: 3, poleHeight: 4, lightType: 'LED', cableLength: 50 },
      waterTanks: [{ capacity: 5000, material: 'Fiberglass', count: 1 }],
      pumpRooms: [{ area: 10, pumps: 2, type: 'Water' }]
    };
  }
}
