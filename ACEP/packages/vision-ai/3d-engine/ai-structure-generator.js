const { getLogger } = require('../logger');
const log = getLogger({ service: '3D-AI-Structure' });

class AIStructureGenerator {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
  }

  async generate(projectId, projectParams, aiData = {}) {
    log.info(`Generating 3D structure for project ${projectId}`);
    this.elements = [];

    const type = projectParams.type || 'Building';
    const area = projectParams.area || 500;
    const floors = projectParams.floors || 2;
    const style = projectParams.style || 'Modern';

    const dims = this._calculateDimensions(type, area, floors);
    const structure = this._generateStructure(type, dims, floors, style);

    for (const elem of structure) {
      const mesh = this._createMesh(elem);
      if (mesh) {
        this.elements.push({ ...elem, mesh });
        this.scene.addObject(mesh, elem.id);
      }
    }

    log.info(`Generated ${this.elements.length} 3D elements`);
    return this.elements;
  }

  _calculateDimensions(type, area, floors) {
    const totalArea = area;
    const floorArea = totalArea / Math.max(1, floors);
    const width = Math.sqrt(floorArea * 1.2);
    const length = floorArea / width;
    const floorHeight = 3.2;
    const totalHeight = floors * floorHeight;

    return { width, length, floorHeight, totalHeight, floorArea };
  }

  _generateStructure(type, dims, floors, style) {
    const elements = [];
    const { width, length, floorHeight, totalHeight } = dims;
    const baseColor = this._getStyleColor(style);
    const idCounter = { val: 0 };
    const nextId = () => `elem_${++idCounter.val}`;

    const slabThick = 0.3;
    const wallThick = 0.2;

    for (let f = 0; f < floors; f++) {
      const yBase = f * floorHeight;

      const slab = {
        id: nextId(), type: 'slab', name: `Slab F${f + 1}`,
        category: 'Structure', boqCategory: 'Concrete',
        width, length, thickness: slabThick,
        position: [0, yBase, 0], rotation: [0, 0, 0],
        color: [0.5, 0.5, 0.5], opacity: 1,
        floor: f + 1, phase: 'Structure',
        properties: { material: 'Reinforced Concrete', grade: 'C35' },
      };
      elements.push(slab);

      const gridX = Math.max(2, Math.floor(width / 5));
      const gridZ = Math.max(2, Math.floor(length / 5));
      const spacingX = width / gridX;
      const spacingZ = length / gridZ;

      for (let gx = 0; gx <= gridX; gx++) {
        for (let gz = 0; gz <= gridZ; gz++) {
          if (gx > 0 && gx < gridX && gz > 0 && gz < gridZ) continue;
          const col = {
            id: nextId(), type: 'column', name: `Column F${f + 1}-${gx}x${gz}`,
            category: 'Structure', boqCategory: 'Concrete',
            width: 0.4, length: 0.4, height: floorHeight,
            position: [-width / 2 + gx * spacingX, yBase, -length / 2 + gz * spacingZ],
            rotation: [0, 0, 0],
            color: [0.45, 0.45, 0.5], opacity: 1,
            floor: f + 1, phase: 'Structure',
            properties: { material: 'Reinforced Concrete', grade: 'C40', reinforcement: 'T16@150' },
          };
          elements.push(col);
        }
      }

      const numWallsX = Math.floor(width / 4);
      const numWallsZ = Math.floor(length / 4);

      for (let wx = 0; wx < numWallsX; wx++) {
        for (let wz = 0; wz < numWallsZ; wz++) {
          const wxPos = -width / 2 + wx * (width / numWallsX) + (width / numWallsX) / 2;
          const wzPos = -length / 2 + wz * (length / numWallsZ) + (length / numWallsZ) / 2;

          if (wx === 0 || wx === numWallsX - 1) {
            const wall = {
              id: nextId(), type: 'wall', name: `Wall Ext F${f + 1}-${wx}x${wz}`,
              category: 'Architecture', boqCategory: 'Masonry',
              width: wallThick, length: length / numWallsZ, height: floorHeight,
              position: [wxPos, yBase, wzPos],
              rotation: [0, 0, 0],
              color: baseColor, opacity: 1,
              floor: f + 1, phase: 'Finishing',
              properties: { material: 'Concrete Block', thickness: '200mm', insulation: 'Polystyrene 50mm' },
            };
            elements.push(wall);
          }
          if (wz === 0 || wz === numWallsZ - 1) {
            const wall = {
              id: nextId(), type: 'wall', name: `Wall Ext F${f + 1}-${wx}x${wz}`,
              category: 'Architecture', boqCategory: 'Masonry',
              width: width / numWallsX, length: wallThick, height: floorHeight,
              position: [wxPos, yBase, wzPos],
              rotation: [0, 0, 0],
              color: baseColor, opacity: 1,
              floor: f + 1, phase: 'Finishing',
              properties: { material: 'Concrete Block', thickness: '200mm' },
            };
            elements.push(wall);
          }
        }
      }

      const numRoomsPerFloor = Math.max(2, Math.floor(gridX * gridZ * 0.3));
      for (let r = 0; r < numRoomsPerFloor; r++) {
        const rx = -width / 2 + 2 + Math.random() * (width - 4);
        const rz = -length / 2 + 2 + Math.random() * (length - 4);
        const rw = 2 + Math.random() * 3;
        const rl = 2 + Math.random() * 3;
        const rh = floorHeight - slabThick - 0.1;

        const roomTypes = ['Office', 'Meeting Room', 'Lobby', 'Corridor', 'Storage', 'Bathroom', 'Kitchen', 'Living Room', 'Bedroom'];
        const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)];

        const room = {
          id: nextId(), type: 'room', name: `${roomType} F${f + 1}-${r + 1}`,
          category: 'Architecture', boqCategory: 'Finishing',
          width: rw, length: rl, height: rh,
          position: [rx, yBase + slabThick, rz],
          rotation: [0, 0, 0],
          color: [0.7, 0.7, 0.8], opacity: 0.15,
          floor: f + 1, phase: 'Finishing',
          properties: {
            type: roomType, area: (rw * rl).toFixed(1),
            finishing: 'Plaster & Paint', floorFinish: 'Ceramic Tiles',
          },
          roomType,
        };
        elements.push(room);
      }
    }

    if (floors > 1) {
      for (let f = 0; f < floors; f++) {
        const yBase = f * floorHeight + floorHeight / 2;
        const stair = {
          id: nextId(), type: 'stairs', name: `Staircase F${f + 1}`,
          category: 'Architecture', boqCategory: 'Concrete',
          width: 1.5, length: 3, height: floorHeight,
          position: [width / 2 - 2, yBase, length / 2 - 2],
          rotation: [0, 0, 0],
          color: [0.5, 0.5, 0.5], opacity: 1,
          floor: f + 1, phase: 'Structure',
          properties: { material: 'Reinforced Concrete', tread: '300mm', riser: '160mm' },
        };
        elements.push(stair);
      }
    }

    const roof = {
      id: nextId(), type: 'roof', name: 'Roof Slab',
      category: 'Structure', boqCategory: 'Concrete',
      width: width + 0.5, length: length + 0.5, thickness: 0.3,
      position: [0, floors * floorHeight, 0],
      rotation: [0, 0, 0],
      color: [0.4, 0.4, 0.45], opacity: 1,
      floor: floors + 1, phase: 'Structure',
      properties: { material: 'Reinforced Concrete', insulation: '50mm XPS', waterproofing: 'Bituminous Membrane' },
    };
    elements.push(roof);

    return elements;
  }

  _createMesh(elem) {
    try {
      const THREE = require('three');
      let geometry;

      switch (elem.type) {
        case 'slab':
        case 'roof':
          geometry = new THREE.BoxGeometry(elem.width, elem.thickness || 0.3, elem.length);
          break;
        case 'column':
          geometry = new THREE.BoxGeometry(elem.width, elem.height, elem.length);
          break;
        case 'wall':
          geometry = new THREE.BoxGeometry(elem.width, elem.height, elem.length);
          break;
        case 'room':
          geometry = new THREE.BoxGeometry(elem.width, elem.height, elem.length);
          break;
        case 'stairs':
          geometry = new THREE.BoxGeometry(elem.width, elem.height, elem.length);
          break;
        default:
          geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      const color = new THREE.Color(elem.color[0], elem.color[1], elem.color[2]);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: elem.type === 'room' ? 0.1 : 0.7,
        metalness: 0.0,
        transparent: elem.opacity < 1,
        opacity: elem.opacity,
        side: elem.type === 'room' ? THREE.DoubleSide : THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(elem.position[0], elem.position[1], elem.position[2]);
      mesh.rotation.set(elem.rotation[0], elem.rotation[1], elem.rotation[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        id: elem.id,
        type: elem.type,
        name: elem.name,
        category: elem.category,
        boqCategory: elem.boqCategory,
        floor: elem.floor,
        phase: elem.phase,
        properties: elem.properties,
        element: elem,
      };

      return mesh;
    } catch (e) {
      log.error(`Mesh creation failed for ${elem.name}: ${e.message}`);
      return null;
    }
  }

  _getStyleColor(style) {
    const palette = {
      Modern: [0.85, 0.85, 0.88],
      Contemporary: [0.82, 0.84, 0.87],
      Luxury: [0.9, 0.85, 0.8],
      Minimal: [0.88, 0.88, 0.88],
      Classical: [0.85, 0.82, 0.78],
      Islamic: [0.82, 0.78, 0.72],
      Traditional: [0.8, 0.78, 0.75],
    };
    return palette[style] || [0.85, 0.85, 0.88];
  }

  getElementsByFloor(floor) {
    return this.elements.filter(e => e.floor === floor);
  }

  getElementsByCategory(category) {
    return this.elements.filter(e => e.category === category);
  }

  getElementById(id) {
    return this.elements.find(e => e.id === id);
  }

  searchElements(query) {
    const q = query.toLowerCase();
    return this.elements.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      (e.properties?.type || '').toLowerCase().includes(q)
    );
  }
}

module.exports = { AIStructureGenerator };
