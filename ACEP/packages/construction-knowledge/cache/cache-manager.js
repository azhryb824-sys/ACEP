class CacheManager {
  constructor(ttlMs = 300000) {
    this.cache = new Map();
    this.ttl = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, customTtl) {
    this.cache.set(key, {
      value,
      expires: Date.now() + (customTtl || this.ttl),
      createdAt: new Date().toISOString(),
    });
    return value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : '0%',
    };
  }

  wrap(key, fetchFn, customTtl) {
    const cached = this.get(key);
    if (cached) return Promise.resolve(cached);
    return Promise.resolve(fetchFn()).then(result => {
      this.set(key, result, customTtl);
      return result;
    });
  }
}

module.exports = { CacheManager };
