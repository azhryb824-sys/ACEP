'use strict';
// Explicit JSON snapshots: no executable serialization and no inference-time fitting.
const units = Object.freeze({area:'m2',cost:'SAR',duration:'month',concrete:'m3',steel:'ton'});
function exportProfile(model, profiles, audit, validate) {
  const value = {schemaVersion:1,model,units,profiles,audit,accuracyValidated:false};
  return readProfile(value,model,validate);
}
function readProfile(value, model, validate) {
  const v = typeof value === 'string' ? JSON.parse(value) : JSON.parse(JSON.stringify(value));
  if (!v || v.schemaVersion!==1 || v.model!==model || !v.units || Object.keys(units).some(k=>v.units[k]!==units[k])) throw new TypeError('Incompatible training snapshot');
  if (!v.profiles || typeof v.profiles!=='object' || Array.isArray(v.profiles) || !Object.keys(v.profiles).length) throw new TypeError('Empty training snapshot');
  const profiles=Object.create(null);
  for (const [type,s] of Object.entries(v.profiles)) {
    if (!type.trim() || ['__proto__','constructor','prototype'].includes(type) || !validate(s)) throw new TypeError('Invalid training profile: '+type);
    profiles[type]=s;
  }
  return {...v,profiles,audit:{...(v.audit||{}),sourceVerified:false,accuracyValidated:false},accuracyValidated:false};
}
module.exports={exportProfile,readProfile};
