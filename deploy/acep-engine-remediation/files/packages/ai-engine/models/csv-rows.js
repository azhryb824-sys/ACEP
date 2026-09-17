"use strict";
const fs = require('fs');
function parseRows(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(v => v !== '')) rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quotation');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length || new Set(rows[0]).size !== rows[0].length) throw new Error('Invalid CSV header');
  if (rows.some(row => row.length !== rows[0].length)) throw new Error('CSV column count mismatch');
  return rows;
}
function readRows(file) { return parseRows(fs.readFileSync(file, 'utf8')).slice(1); }
module.exports = { parseRows, readRows };
