"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cadParser = exports.CADParserService = void 0;
// ─── Layer naming conventions in construction CAD ───
const LAYER_MAP = {
    'A-ANNO': { element: 'Annotation', category: 'Documentation' },
    'A-COLS': { element: 'Column Grid', category: 'Structure' },
    'A-DIMS': { element: 'Dimensions', category: 'Documentation' },
    'A-DOOR': { element: 'Doors', category: 'Architecture' },
    'A-GLAZ': { element: 'Glazing/Windows', category: 'Architecture' },
    'A-WALL': { element: 'Walls', category: 'Architecture' },
    'A-ROOM': { element: 'Rooms', category: 'Architecture' },
    'A-FLOR': { element: 'Floor Finishes', category: 'Finishing' },
    'A-CLNG': { element: 'Ceilings', category: 'Finishing' },
    'S-COLS': { element: 'Structural Columns', category: 'Structure' },
    'S-BEAM': { element: 'Beams', category: 'Structure' },
    'S-SLAB': { element: 'Slabs', category: 'Structure' },
    'S-FOOT': { element: 'Foundations', category: 'Structure' },
    'S-REBAR': { element: 'Reinforcement', category: 'Structure' },
    'P-PIPE': { element: 'Plumbing Pipes', category: 'MEP' },
    'P-FIXT': { element: 'Plumbing Fixtures', category: 'MEP' },
    'E-COND': { element: 'Electrical Conduit', category: 'MEP' },
    'E-LITE': { element: 'Lighting', category: 'MEP' },
    'E-POWR': { element: 'Power Outlets', category: 'MEP' },
    'M-DUCT': { element: 'HVAC Ductwork', category: 'MEP' },
    'M-EQPM': { element: 'Mechanical Equipment', category: 'MEP' },
    'F-FIRE': { element: 'Fire Protection', category: 'Safety' },
    'L-SITE': { element: 'Site Plan', category: 'Site' },
    'L-TOPO': { element: 'Topography', category: 'Site' },
};
class CADParserService {
    initialized = false;
    async initialize() {
        this.initialized = true;
    }
    parseDWG(data) {
        this.ensureInitialized();
        if (typeof data === 'object' && !Buffer.isBuffer(data)) {
            return this._fromJson(data);
        }
        const text = typeof data === 'string' ? data : data.toString('utf8');
        return text.includes('DXF') || text.includes('SECTION') ? this._dxfParse(text) : this._mockCad(data);
    }
    extractElements(cad) {
        this.ensureInitialized();
        const grouped = {};
        for (const layer of cad.layers) {
            const mapped = LAYER_MAP[layer.name] || { element: 'Unknown', category: 'Other' };
            const key = mapped.category;
            if (!grouped[key])
                grouped[key] = { name: key, count: 0, estimatedArea: 0 };
            grouped[key].count += layer.entityCount;
            grouped[key].estimatedArea += layer.estimatedArea;
        }
        return grouped;
    }
    convertToBuildingModel(cad, area = 500, floors = 2) {
        this.ensureInitialized();
        const layersByName = {};
        for (const l of cad.layers)
            layersByName[l.name] = l;
        const slabArea = layersByName['S-SLAB']?.estimatedArea || area * 0.9;
        const colCount = Math.max(1, Math.round((layersByName['S-COLS']?.entityCount || area / 25) / floors));
        return {
            slabs: Array.from({ length: floors }, (_, i) => ({
                level: i + 1,
                area: slabArea,
                thickness: floors > 10 ? 0.25 : floors > 5 ? 0.2 : 0.15,
            })),
            columns: [{ count: colCount, material: 'Reinforced Concrete', estimatedLoad: Math.round(area * floors * 1.2) }],
            walls: [{ length: Math.round(Math.sqrt(area) * 4 * floors), height: 3, type: 'Concrete Block' }],
            openings: [
                { type: 'Door', count: Math.round(area / 20), dimensions: '1.0x2.2m' },
                { type: 'Window', count: Math.round(area / 15), dimensions: '1.2x1.5m' },
            ],
        };
    }
    isInitialized() { return this.initialized; }
    _fromJson(json) {
        return {
            layers: json.layers || [],
            entities: json.entities || [],
        };
    }
    _dxfParse(text) {
        const layers = [];
        const entities = [];
        const layerRx = /LAYER\s*\d+\s*[\s\S]*?2\s*\n([^\n]+)/g;
        let m;
        while ((m = layerRx.exec(text)) !== null) {
            const name = m[1].trim();
            const mapped = LAYER_MAP[name] || { element: 'Unknown', category: 'Other' };
            layers.push({ name, entityCount: Math.round(Math.random() * 50 + 5), color: '#808080', estimatedArea: name.includes('SLAB') ? 400 : 0 });
        }
        return { layers, entities };
    }
    _mockCad(_data) {
        const layerNames = ['A-WALL', 'A-DOOR', 'A-GLAZ', 'A-DIMS', 'S-COLS', 'S-SLAB', 'S-BEAM', 'S-FOOT', 'P-PIPE', 'E-COND', 'E-LITE', 'M-DUCT'];
        const layers = layerNames.map((name, i) => ({
            name,
            entityCount: 10 + Math.round(Math.random() * 90),
            color: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#800000', '#008000', '#000080', '#FFA500', '#A52A2A'][i],
            estimatedArea: name === 'S-SLAB' ? 450 : name === 'A-WALL' ? 350 : name === 'A-DOOR' ? 25 : name === 'A-GLAZ' ? 60 : Math.round(Math.random() * 200),
        }));
        return { layers, entities: [] };
    }
    ensureInitialized() {
        if (!this.initialized)
            throw new Error('CADParserService not initialized. Call initialize() first.');
    }
}
exports.CADParserService = CADParserService;
exports.cadParser = new CADParserService();
//# sourceMappingURL=index.js.map