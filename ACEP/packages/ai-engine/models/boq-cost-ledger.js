/** Scoped BOQ arithmetic. No staffing/duration heuristics or price-scope inference. */
const SCOPES = new Set(['supply_only', 'installed']);
const MARKUP_KEYS = ['indirect', 'contingency', 'profit', 'tax'];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
const validMoney = value => Number.isFinite(value) && value >= 0 &&
  Number.isSafeInteger(Math.round(value * 100));

function validatePricingOptions(pricing) {
  if (pricing === undefined) return {};
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing)) throw new RangeError('pricing must be an object');
  for (const key of Object.keys(pricing)) if (!['defaultPriceScope', 'markups'].includes(key)) throw new RangeError('Unknown pricing option: ' + key);
  if (pricing.defaultPriceScope !== undefined && !SCOPES.has(pricing.defaultPriceScope)) throw new RangeError('defaultPriceScope must be supply_only or installed');
  const supplied = pricing.markups;
  if (supplied !== undefined && (!supplied || typeof supplied !== 'object' || Array.isArray(supplied))) throw new RangeError('markups must be an object of numeric rates');
  for (const [key, rate] of Object.entries(supplied || {})) {
    if (!MARKUP_KEYS.includes(key) || !Number.isFinite(rate) || rate < 0 || rate > 1) throw new RangeError('Invalid markup: ' + key);
  }
  return { ...(pricing.defaultPriceScope !== undefined ? { defaultPriceScope: pricing.defaultPriceScope } : {}),
    ...(supplied !== undefined ? { markups: { ...supplied } } : {}) };
}

function priceBOQ(items, options, lookupSupplyPrice) {
  const supplied = validatePricingOptions({ ...(options.defaultPriceScope !== undefined ? { defaultPriceScope: options.defaultPriceScope } : {}),
    ...(options.markups !== undefined ? { markups: options.markups } : {}) }).markups;
  const rates = { ...options.defaultMarkups };
  for (const [key, rate] of Object.entries(supplied || {})) {
    if (!MARKUP_KEYS.includes(key) || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new RangeError('Invalid markup: ' + key);
    }
    rates[key] = rate;
  }
  const explicitMarkups = MARKUP_KEYS.every(key => supplied && own(supplied, key));
  const issues = [], lines = [];
  const sums = { materials: 0, installed: 0, labor: 0, equipment: 0, unclassified: 0, quoted: 0 };
  const scopeSummary = { installedItems: 0, supplyOnlyItems: 0, unknownItems: 0 };
  const issue = (index, item, reason) => issues.push({ index, code: item?.code || null, reason });

  for (const [index, item] of items.entries()) {
    if (!item || typeof item !== 'object' || item.insufficient ||
        !Number.isFinite(item.quantity) || item.quantity < 0) {
      issue(index, item, 'insufficient_or_invalid_quantity'); continue;
    }
    const scopeMissing = item.priceScope == null || item.priceScope === 'unknown';
    const scope = scopeMissing ? options.defaultPriceScope : item.priceScope;
    if (scope === 'installed') scopeSummary.installedItems++;
    else if (scope === 'supply_only') scopeSummary.supplyOnlyItems++;
    else scopeSummary.unknownItems++;
    if (item.currency !== undefined && item.currency !== 'SAR') {
      issue(index, item, 'unsupported_currency'); continue;
    }
    if ((item.taxIncluded !== undefined && item.taxIncluded !== false) ||
        (item.overheadsIncluded !== undefined && item.overheadsIncluded !== false)) {
      issue(index, item, 'inclusive_quote_requires_separate_review'); continue;
    }
    let price = item.unitPrice, priceSource = item.priceSource || 'explicit_BOQ';
    if (price === undefined || price === null) {
      // Material supply observations cannot become installed work rates.
      const match = scope === 'supply_only' ? lookupSupplyPrice(item) : null;
      if (match) { price = match.price; priceSource = match.source; }
    }
    if (!validMoney(price) || !validMoney(item.quantity * price)) {
      issue(index, item, 'missing_invalid_or_unsafe_compatible_price'); continue;
    }
    const quoted = item.quantity * price;
    sums.quoted += quoted;
    lines.push({ index, code: item.code || null, priceScope: scope || 'unknown',
      quantity: item.quantity, unitPrice: price, quotedCost: money(quoted), priceSource,
      priceScopeSource: scopeMissing ? 'caller_default' : 'item' });
    if (!SCOPES.has(scope)) {
      sums.unclassified += quoted;
      issue(index, item, 'price_scope_required'); continue;
    }
    if (scope === 'installed') {
      sums.installed += quoted;
      if (item.installation !== undefined) issue(index, item, 'installation_already_included');
      continue;
    }
    sums.materials += quoted;
    const installation = item.installation;
    if (!installation || typeof installation !== 'object' || Array.isArray(installation) ||
        !own(installation, 'labor') || !own(installation, 'equipment')) {
      issue(index, item, 'installation_costs_required'); continue;
    }
    if (installation.currency !== undefined && installation.currency !== 'SAR') {
      issue(index, item, 'unsupported_installation_currency'); continue;
    }
    if (Object.keys(installation).some(key => !['labor', 'equipment', 'currency'].includes(key)) ||
        !validMoney(installation.labor) || !validMoney(installation.equipment)) {
      issue(index, item, 'invalid_installation_costs'); continue;
    }
    // These are whole-line totals in SAR, not rates to multiply by quantity.
    sums.labor += installation.labor;
    sums.equipment += installation.equipment;
  }
  const knownDirect = sums.materials + sums.installed + sums.labor + sums.equipment;
  if (![...Object.values(sums), knownDirect].every(validMoney)) issue(-1, null, 'unsafe_aggregate');
  let direct = null, indirect = null, contingency = null, profit = null, taxes = null, total = null;
  if (!issues.length) {
    direct = money(knownDirect);
    indirect = money(direct * rates.indirect);
    contingency = money(direct * rates.contingency);
    profit = money((direct + indirect + contingency) * rates.profit);
    taxes = money((direct + indirect + contingency + profit) * rates.tax);
    total = money(direct + indirect + contingency + profit + taxes);
    if (![direct, indirect, contingency, profit, taxes, total].every(validMoney)) {
      issue(-1, null, 'unsafe_aggregate');
      direct = indirect = contingency = profit = taxes = total = null;
    }
  }
  const percentage = (value, denominator) => denominator === null ? null :
    denominator === 0 ? 0 : Math.round(value / denominator * 100);
  const breakdown = {};
  for (const key of ['materials', 'installed', 'labor', 'equipment', 'unclassified']) {
    breakdown[key] = { cost: validMoney(sums[key]) ? money(sums[key]) : null,
      percentage: key === 'unclassified' ? null : percentage(sums[key], direct) };
  }
  for (const [key, value] of Object.entries({ indirect, contingency, profit, taxes })) {
    breakdown[key] = { cost: value, percentage: value === null ? null : percentage(value, total) };
  }
  return {
    directCost: direct, indirectCost: indirect, contingency, profit, taxes, totalCost: total,
    status: issues.length ? 'incomplete' : explicitMarkups && lines.every(line => line.priceSource === 'explicit_BOQ') ? 'priced_estimate' : 'heuristic_estimate',
    pricingIssues: issues, scopeSummary, lines, breakdown,
    pricedBOQSubtotal: validMoney(sums.quoted) ? money(sums.quoted) : null,
    pricedMaterialSubtotal: validMoney(sums.materials) ? money(sums.materials) : null,
    knownDirectSubtotal: validMoney(knownDirect) ? money(knownDirect) : null,
    requiresCostScopeReview: issues.some(x => /scope|installation|inclusive/.test(x.reason)),
    requiresInputReview: issues.length > 0,
    markupAssumptions: { rates, source: explicitMarkups ? 'explicit_inputs' : 'heuristic_defaults_with_optional_overrides' },
    estimateBasis: 'scoped_BOQ_and_explicit_line_installation_totals',
    currency: 'SAR', confidence: 0, confidenceCalibrated: false,
  };
}
module.exports = { priceBOQ, validatePricingOptions };
