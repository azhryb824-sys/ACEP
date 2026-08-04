class SearchManager {
  constructor(scene, structureGenerator, navigator) {
    this.scene = scene;
    this.structure = structureGenerator;
    this.navigator = navigator;
    this._results = [];
  }

  search(query) {
    if (!query || query.length < 1) return [];
    const results = this.structure.searchElements(query);
    this._results = results;
    return results;
  }

  focusOnResult(index) {
    const result = this._results[index];
    if (result && this.navigator) {
      this.navigator.focusOn(result.id);
      return result;
    }
    return null;
  }

  focusFirst() {
    return this.focusOnResult(0);
  }

  focusNext() {
    return this.focusOnResult((this._currentIndex + 1) % this._results.length);
  }
}

module.exports = { SearchManager };
