'use strict';
const fs = require('fs');
// Deliberately restricted to reviewed byte-aligned dtypes supported by this runner.
const SIZES = { BOOL:1, U8:1, I8:1, U16:2, I16:2, F16:2, BF16:2, U32:4, I32:4, F32:4, U64:8, I64:8, F64:8 };
function inspectSafetensors(filePath) {
  const fd = fs.openSync(filePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const stats = fs.fstatSync(fd);
    if (!stats.isFile() || stats.size < 32) throw new Error('Invalid safetensors file');
    const length = Buffer.alloc(8); fs.readSync(fd, length, 0, 8, 0);
    const n = length.readBigUInt64LE();
    if (n < 2n || n > 100n * 1024n * 1024n || n > BigInt(stats.size - 8)) throw new Error('Invalid safetensors header length');
    const headerBytes = Buffer.alloc(Number(n));
    if (fs.readSync(fd, headerBytes, 0, headerBytes.length, 8) !== headerBytes.length || headerBytes[0] !== 123) throw new Error('Invalid safetensors header');
    const source = new TextDecoder('utf-8', { fatal:true }).decode(headerBytes);
    const header = JSON.parse(source);
    // JSON.parse accepts duplicate keys; the safetensors format explicitly forbids them.
    const objects = []; const tokens = /"(?:[^"\\]|\\.)*"|[{}]/g; let match;
    while ((match = tokens.exec(source))) {
      if (match[0] === '{') objects.push(new Set());
      else if (match[0] === '}') objects.pop();
      else if (/^\s*:/.test(source.slice(tokens.lastIndex))) {
        const key = JSON.parse(match[0]), keys = objects.at(-1);
        if (keys.has(key)) throw new Error('Duplicate safetensors key'); keys.add(key);
      }
    }
    if (header.__metadata__ && (Array.isArray(header.__metadata__) || typeof header.__metadata__ !== 'object' || Object.values(header.__metadata__).some(v => typeof v !== 'string'))) throw new Error('Invalid safetensors metadata');
    const tensors = Object.entries(header).filter(([name]) => name !== '__metadata__');
    const dataLength = stats.size - 8 - Number(n); const ranges = [];
    if (!tensors.length || dataLength <= 0) throw new Error('Safetensors artifact contains no tensor data');
    for (const [name, t] of tensors) {
      if (!t || !Object.hasOwn(SIZES,t.dtype) || !Array.isArray(t.shape) || t.shape.some(d => !Number.isSafeInteger(d) || d < 0) || !Array.isArray(t.data_offsets) || t.data_offsets.length !== 2) throw new Error('Invalid tensor metadata: ' + name);
      const [start,end] = t.data_offsets;
      const bytes = t.shape.reduce((a,b) => a * BigInt(b), BigInt(SIZES[t.dtype]));
      if (![start,end].every(Number.isSafeInteger) || start < 0 || end < start || end > dataLength || BigInt(end-start) !== bytes) throw new Error('Invalid tensor shape or offsets: ' + name);
      ranges.push([start,end]);
    }
    ranges.sort((a,b) => a[0]-b[0] || a[1]-b[1]); let cursor = 0;
    for (const [start,end] of ranges) { if (start !== cursor) throw new Error('Safetensors data has gaps or overlapping tensors'); cursor = end; }
    if (cursor !== dataLength) throw new Error('Safetensors data contains unindexed bytes');
    return { sizeBytes:stats.size, tensorCount:tensors.length };
  } finally { fs.closeSync(fd); }
}
module.exports = { inspectSafetensors };
