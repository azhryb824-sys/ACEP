class EngineeringGraph {
  constructor() {
    this.nodes = new Map();
    this._initDependencyGraph();
  }

  _initDependencyGraph() {
    this.dependencyChains = [
      ['بلاط', 'غراء بلاط', 'روبة', 'تسوية', 'تنظيف'],
      ['خرسانة', 'حديد تسليح', 'شدات خشبية', 'صب خرسانة', 'معالجة خرسانة'],
      ['دهان', 'معجون', 'برايمر', 'وجه أول', 'وجه ثاني'],
      ['أساسات', 'خرسانة عادية', 'حديد أساسات', 'صب أساسات'],
      ['كهرباء', 'تمديدات كهرباء', 'لوحات توزيع', 'قواطع كهرباء', 'إنارة'],
      ['سباكة', 'مواسير مياه', 'خلاطات', 'توصيلات صحية'],
      ['تكييف', 'مجاري هواء', 'عزل حراري', 'جريلات تكييف'],
    ];
  }

  registerItem(code, description, phase, deps = []) {
    const node = {
      code,
      description,
      phase,
      dependencies: [],
      dependents: [],
      requiredBefore: [],
      requiredAfter: [],
      alternativeOf: [],
    };
    if (deps.length > 0) {
      node.requiredBefore = [...deps];
    }
    this.nodes.set(code, node);
    return node;
  }

  buildGraph(items) {
    this.nodes.clear();
    for (const item of items) {
      this.registerItem(item.code, item.description, item.phase, item.dependencies || []);
    }

    for (const [nodeCode, node] of this.nodes) {
      for (const [otherCode, otherNode] of this.nodes) {
        if (this._dependsOn(nodeCode, otherCode)) {
          node.dependencies.push(otherNode);
          otherNode.dependents.push(node);
        }
      }
    }

    for (const chain of this.dependencyChains) {
      for (let i = 0; i < chain.length - 1; i++) {
        const current = chain[i];
        const next = chain[i + 1];
        if (this.nodes.has(current) && this.nodes.has(next)) {
          const nextNode = this.nodes.get(next);
          if (!nextNode.requiredBefore.includes(current)) {
            nextNode.requiredBefore.push(current);
          }
          const currNode = this.nodes.get(current);
          if (!currNode.requiredAfter.includes(next)) {
            currNode.requiredAfter.push(next);
          }
        }
      }
    }
  }

  _dependsOn(codeA, codeB) {
    return this.dependencyChains.some((chain) => {
      const idxA = chain.indexOf(codeA);
      const idxB = chain.indexOf(codeB);
      return idxA !== -1 && idxB !== -1 && idxB < idxA;
    });
  }

  getDependencies(code) {
    const node = this.nodes.get(code);
    if (!node) return [];
    return node.dependencies.map((n) => n.code);
  }

  getDependents(code) {
    const node = this.nodes.get(code);
    if (!node) return [];
    return node.dependents.map((n) => n.code);
  }

  getPath(fromCode, toCode) {
    if (!this.nodes.has(fromCode) || !this.nodes.has(toCode)) return [];
    const visited = new Set();
    const queue = [[fromCode]];
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      if (current === toCode) return path;
      if (!visited.has(current)) {
        visited.add(current);
        const node = this.nodes.get(current);
        for (const dep of node.dependencies) {
          if (!visited.has(dep.code)) {
            queue.push([...path, dep.code]);
          }
        }
        for (const dep of node.dependents) {
          if (!visited.has(dep.code)) {
            queue.push([...path, dep.code]);
          }
        }
      }
    }
    return [];
  }

  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (code) => {
      visited.add(code);
      recursionStack.add(code);
      const node = this.nodes.get(code);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep.code)) {
            dfs(dep.code);
          } else if (recursionStack.has(dep.code)) {
            cycles.push([...recursionStack]);
          }
        }
      }
      recursionStack.delete(code);
    };

    for (const code of this.nodes.keys()) {
      if (!visited.has(code)) {
        dfs(code);
      }
    }
    return cycles;
  }

  getMissingDependencies(items) {
    const existingCodes = new Set(items.map((i) => i.code));
    const missing = [];
    for (const item of items) {
      for (const depCode of item.dependencies || []) {
        if (!existingCodes.has(depCode)) {
          missing.push({ item: item.code, missing: depCode });
        }
      }
    }
    return missing;
  }

  getExecutionOrder(items) {
    this.buildGraph(items);
    const visited = new Set();
    const order = [];

    const dfs = (code) => {
      if (visited.has(code)) return;
      visited.add(code);
      const node = this.nodes.get(code);
      if (node) {
        for (const dep of node.dependencies) {
          dfs(dep.code);
        }
        order.push(code);
      }
    };

    for (const code of this.nodes.keys()) {
      dfs(code);
    }
    return order;
  }

  validateSequence(items) {
    const order = this.getExecutionOrder(items);
    const codeIndex = {};
    order.forEach((code, idx) => {
      codeIndex[code] = idx;
    });

    const errors = [];
    for (const item of items) {
      const idx = codeIndex[item.code];
      if (idx === undefined) continue;
      for (const depCode of item.dependencies || []) {
        const depIdx = codeIndex[depCode];
        if (depIdx !== undefined && depIdx > idx) {
          errors.push({
            item: item.code,
            dependency: depCode,
            message: `${item.code} يجب أن يأتي قبل ${depCode}`,
          });
        }
      }
    }
    return errors;
  }

  getItemRelationships(code) {
    const node = this.nodes.get(code);
    if (!node) return null;
    return {
      dependencies: node.dependencies.map((n) => n.code),
      dependents: node.dependents.map((n) => n.code),
      requiredBefore: node.requiredBefore,
      requiredAfter: node.requiredAfter,
      alternativeOf: node.alternativeOf,
    };
  }

  suggestAdditionalItems(items) {
    const existingCodes = new Set(items.map((i) => i.code));
    const suggestions = [];

    for (const chain of this.dependencyChains) {
      let chainHasItem = false;
      for (const link of chain) {
        if (existingCodes.has(link)) {
          chainHasItem = true;
          break;
        }
      }
      if (chainHasItem) {
        for (const link of chain) {
          if (!existingCodes.has(link)) {
            suggestions.push({
              suggestedCode: link,
              reason: `مطلوب كجزء من سلسلة: ${chain.join(' ← ')}`,
              chain,
            });
          }
        }
      }
    }
    return suggestions;
  }
}

module.exports = EngineeringGraph;
