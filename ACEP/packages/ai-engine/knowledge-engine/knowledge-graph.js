/**
 * Knowledge Graph — Element Relationship Network
 * Phase 2: Knowledge Graph
 *
 * Every construction element is linked to every other element.
 * Foundation → Columns → Beams → Slabs → Walls → Plaster → Insulation → Paint → Doors → Windows
 */
class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this._build();
  }

  _build() {
    const elements = [
      { id: 'site', name: 'الموقع', category: 'preparation' },
      { id: 'excavation', name: 'الحفر', category: 'civil' },
      { id: 'foundation', name: 'الأساسات', category: 'structural' },
      { id: 'columns', name: 'الأعمدة', category: 'structural' },
      { id: 'beams', name: 'الكمرات', category: 'structural' },
      { id: 'slabs', name: 'الأسقف', category: 'structural' },
      { id: 'shear_walls', name: 'الجدران القص', category: 'structural' },
      { id: 'stairs', name: 'السلالم', category: 'structural' },
      { id: 'masonry', name: 'المباني', category: 'architectural' },
      { id: 'plaster', name: 'اللياسة', category: 'finishing' },
      { id: 'insulation', name: 'العزل', category: 'finishing' },
      { id: 'waterproofing', name: 'العزل المائي', category: 'finishing' },
      { id: 'painting', name: 'الدهانات', category: 'finishing' },
      { id: 'tiling', name: 'البلاط', category: 'finishing' },
      { id: 'ceiling', name: 'الأسقف المعلقة', category: 'finishing' },
      { id: 'doors', name: 'الأبواب', category: 'architectural' },
      { id: 'windows', name: 'النوافذ', category: 'architectural' },
      { id: 'facade', name: 'الواجهات', category: 'architectural' },
      { id: 'electrical', name: 'الكهرباء', category: 'mep' },
      { id: 'lighting', name: 'الإضاءة', category: 'mep' },
      { id: 'plumbing', name: 'السباكة', category: 'mep' },
      { id: 'hvac', name: 'التكييف', category: 'mep' },
      { id: 'fire_alarm', name: 'إنذار الحريق', category: 'safety' },
      { id: 'fire_fighting', name: 'مكافحة الحريق', category: 'safety' },
      { id: 'cctv', name: 'كاميرات المراقبة', category: 'security' },
      { id: 'access_control', name: 'التحكم بالدخول', category: 'security' },
      { id: 'network', name: 'الشبكات', category: 'mep' },
      { id: 'bms', name: 'نظام إدارة المباني', category: 'mep' },
      { id: 'elevator', name: 'المصاعد', category: 'mep' },
      { id: 'landscape', name: 'الزراعة', category: 'external' },
      { id: 'site_works', name: 'أعمال الموقع', category: 'external' },
      { id: 'road', name: 'الطرق', category: 'infrastructure' },
      { id: 'infrastructure', name: 'البنية التحتية', category: 'infrastructure' },
    ];
    for (const el of elements) this.nodes.set(el.id, { ...el, connections: [] });

    const deps = [
      ['site', 'excavation'], ['excavation', 'foundation'],
      ['foundation', 'columns'], ['foundation', 'beams'],
      ['columns', 'beams'], ['beams', 'slabs'],
      ['slabs', 'shear_walls'], ['slabs', 'stairs'],
      ['slabs', 'masonry'], ['shear_walls', 'masonry'],
      ['masonry', 'plaster'], ['plaster', 'insulation'],
      ['plaster', 'waterproofing'], ['insulation', 'painting'],
      ['waterproofing', 'painting'], ['masonry', 'doors'],
      ['masonry', 'windows'], ['masonry', 'facade'],
      ['slabs', 'electrical'], ['plaster', 'electrical'],
      ['electrical', 'lighting'], ['electrical', 'cctv'],
      ['electrical', 'access_control'], ['electrical', 'network'],
      ['electrical', 'fire_alarm'], ['electrical', 'bms'],
      ['plaster', 'plumbing'], ['plumbing', 'fire_fighting'],
      ['slabs', 'hvac'], ['plaster', 'hvac'],
      ['masonry', 'tiling'], ['tiling', 'ceiling'],
      ['slabs', 'elevator'], ['site', 'site_works'],
      ['site_works', 'landscape'], ['site_works', 'road'],
      ['road', 'infrastructure'], ['infrastructure', 'site_works'],
    ];
    for (const [from, to] of deps) {
      this.edges.push({ from, to, type: 'depends_on' });
      this.nodes.get(from)?.connections.push({ target: to, type: 'depends_on' });
      this.nodes.get(to)?.connections.push({ target: from, type: 'required_by' });
    }
  }

  getNode(id) { return this.nodes.get(id) || null; }
  getAllNodes() { return Array.from(this.nodes.values()); }
  getDependencies(id) { return this.edges.filter(e => e.from === id); }
  getDependents(id) { return this.edges.filter(e => e.to === id); }
  getPath(from, to) { return this._bfs(from, to); }

  getItemRelationships(itemCode) {
    const mapping = {
      'EXC': 'excavation', 'FND': 'foundation', 'COL': 'columns', 'BM': 'beams',
      'SLB': 'slabs', 'SWL': 'shear_walls', 'STR': 'stairs', 'BLK': 'masonry',
      'PLS': 'plaster', 'INS': 'insulation', 'WPR': 'waterproofing', 'PNT': 'painting',
      'TLF': 'tiling', 'CLG': 'ceiling', 'DR': 'doors', 'WN': 'windows',
      'FCD': 'facade', 'ELC': 'electrical', 'LGT': 'lighting', 'PLB': 'plumbing',
      'HVAC': 'hvac', 'FPR': 'fire_fighting', 'NET': 'network', 'CCTV': 'cctv',
      'ACC': 'access_control', 'BMS': 'bms', 'ELV': 'elevator', 'LND': 'landscape',
      'EXT': 'site_works', 'RDS': 'road', 'INF': 'infrastructure'
    };
    const prefix = Object.keys(mapping).find(k => itemCode.startsWith(k));
    const nodeId = prefix ? mapping[prefix] : null;
    if (!nodeId) return { node: null, dependencies: [], dependents: [] };
    return { node: this.getNode(nodeId), dependencies: this.getDependencies(nodeId), dependents: this.getDependents(nodeId) };
  }

  _bfs(from, to) {
    const visited = new Set();
    const queue = [[from]];
    while (queue.length > 0) {
      const path = queue.shift();
      const node = path[path.length - 1];
      if (node === to) return path;
      if (!visited.has(node)) {
        visited.add(node);
        const deps = this.getDependencies(node);
        for (const dep of deps) {
          if (!visited.has(dep.to)) queue.push([...path, dep.to]);
        }
      }
    }
    return null;
  }

  getConstructionSequence(type) {
    const order = ['site', 'excavation', 'foundation', 'columns', 'beams', 'slabs', 'shear_walls', 'stairs',
      'masonry', 'plaster', 'insulation', 'waterproofing', 'tiling', 'ceiling', 'painting', 'doors', 'windows',
      'facade', 'electrical', 'plumbing', 'hvac', 'lighting', 'fire_alarm', 'fire_fighting', 'cctv',
      'access_control', 'network', 'bms', 'elevator', 'landscape', 'site_works', 'road', 'infrastructure'];
    return order.map(id => this.getNode(id)).filter(Boolean);
  }
}

module.exports = KnowledgeGraph;
