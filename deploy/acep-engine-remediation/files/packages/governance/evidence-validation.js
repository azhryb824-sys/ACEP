'use strict';
const fs = require('fs');
const crypto = require('crypto');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
function validDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false; const d = new Date(value); return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value; }
function validateSource(source) {
  return source && typeof source.owner === 'string' && source.owner.length > 1 &&
    typeof source.license === 'string' && source.license.length > 1 && /^[a-f0-9]{64}$/.test(source.sha256 || '') &&
    typeof source.reference === 'string' && source.reference.length > 3;
}
function signedReview(payload, review, trustedPublicKeys) {
  const trust = trustedPublicKeys?.[review?.reviewerId];
  const key = trust?.publicKey;
  if (!trust?.roles?.includes(review?.role) || !key || !review.signature || review.payloadSha256 !== sha256(JSON.stringify(payload))) return false;
  try { return crypto.verify(null, Buffer.from(JSON.stringify({ payloadSha256: review.payloadSha256, reviewerId: review.reviewerId, role: review.role })), key, Buffer.from(review.signature, 'base64')); } catch { return false; }
}
function validatePriceBook(book, now = new Date()) {
  const errors = [];
  if (book.schemaVersion !== 1 || book.currency !== 'SAR' || !book.city) errors.push('invalid_price_book_identity');
  if (!validDate(book.asOf) || !validDate(book.validUntil) || book.asOf > book.validUntil || book.asOf > now.toISOString().slice(0,10) || book.validUntil < now.toISOString().slice(0,10)) errors.push('stale_or_invalid_price_dates');
  if (!Array.isArray(book.rates) || !book.rates.length || book.rates.length > 100000) errors.push('rates_required');
  const keys = new Set();
  for (const row of book.rates || []) {
    const key = row.itemCode + ':' + row.unit;
    if (!row.itemCode || !['m','m2','m3','ton','kg','each','day','hour','lump_sum'].includes(row.unit) || !Number.isFinite(row.rateSar) || row.rateSar <= 0 || keys.has(key) || !validateSource(row.source) || !row.scope || typeof row.vatIncluded !== 'boolean') errors.push('invalid_or_duplicate_rate:' + key);
    keys.add(key);
  }
  return { valid: !errors.length, errors, suitableForProcurement: false, reviewRequired: true };
}
function validateStandardsRegister(register) {
  const errors = [];
  for (const item of register.standards || []) {
    if (!item.code || !item.edition || !item.clause || !item.jurisdiction || !item.applicability || !validateSource(item.source)) errors.push('incomplete_standard_reference');
  }
  if (!register.standards?.length) errors.push('standards_required');
  return { valid: !errors.length, errors, complianceVerified: false, reviewRequired: true };
}
function readFrozenManifest(file) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!manifest.dataSha256 || !manifest.policySha256 || !manifest.trainingProjectIdsSha256) throw new Error('Frozen data, policy and training exclusion hashes are required');
  return manifest;
}
module.exports = { sha256, validDate, validateSource, signedReview, validatePriceBook, validateStandardsRegister, readFrozenManifest };
