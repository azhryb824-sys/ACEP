const CODES = {
  'SBC 301': { code: 'SBC 301', name: 'Saudi Building Code - Structural', organization: 'SBC', year: 2018, category: 'structural' },
  'SBC 304': { code: 'SBC 304', name: 'Saudi Building Code - Architectural', organization: 'SBC', year: 2018, category: 'architectural' },
  'SBC 401': { code: 'SBC 401', name: 'Saudi Building Code - Electrical', organization: 'SBC', year: 2018, category: 'electrical' },
  'SBC 402': { code: 'SBC 402', name: 'Saudi Building Code - Low Current', organization: 'SBC', year: 2018, category: 'low_current' },
  'SBC 601': { code: 'SBC 601', name: 'Saudi Building Code - Energy Conservation', organization: 'SBC', year: 2018, category: 'mechanical' },
  'SBC 801': { code: 'SBC 801', name: 'Saudi Building Code - Fire Protection', organization: 'SBC', year: 2018, category: 'fire' },
  'ACI 318': { code: 'ACI 318', name: 'Building Code Requirements for Structural Concrete', organization: 'ACI', year: 2019, category: 'structural' },
  'ACI 530': { code: 'ACI 530', name: 'Building Code Requirements for Masonry', organization: 'ACI', year: 2013, category: 'structural' },
  'ASTM A36': { code: 'ASTM A36', name: 'Standard Specification for Carbon Structural Steel', organization: 'ASTM', year: 2021, category: 'structural' },
  'ASTM C90': { code: 'ASTM C90', name: 'Standard Specification for Loadbearing Concrete Masonry Units', organization: 'ASTM', year: 2022, category: 'masonry' },
  'ASTM C926': { code: 'ASTM C926', name: 'Standard Specification for Application of Portland Cement Plaster', organization: 'ASTM', year: 2022, category: 'finishing' },
  'ASTM C1028': { code: 'ASTM C1028', name: 'Standard Test Method for Static Coefficient of Friction of Ceramic Tile', organization: 'ASTM', year: 2018, category: 'finishing' },
  'ASTM C1396': { code: 'ASTM C1396', name: 'Standard Specification for Gypsum Board', organization: 'ASTM', year: 2023, category: 'finishing' },
  'ASTM D6163': { code: 'ASTM D6163', name: 'Standard Specification for Styrene Butadiene Modified Bitumen Sheet', organization: 'ASTM', year: 2021, category: 'waterproofing' },
  'ASTM E119': { code: 'ASTM E119', name: 'Standard Test Methods for Fire Tests of Building Construction', organization: 'ASTM', year: 2022, category: 'fire' },
  'ASTM E330': { code: 'ASTM E330', name: 'Standard Test Method for Structural Performance of Exterior Windows', organization: 'ASTM', year: 2022, category: 'architectural' },
  'ASTM E779': { code: 'ASTM E779', name: 'Standard Test Method for Determining Air Leakage Rate by Fan Pressurization', organization: 'ASTM', year: 2019, category: 'mechanical' },
  'NFPA 10': { code: 'NFPA 10', name: 'Standard for Portable Fire Extinguishers', organization: 'NFPA', year: 2022, category: 'fire' },
  'NFPA 13': { code: 'NFPA 13', name: 'Standard for the Installation of Sprinkler Systems', organization: 'NFPA', year: 2022, category: 'fire' },
  'NFPA 72': { code: 'NFPA 72', name: 'National Fire Alarm and Signaling Code', organization: 'NFPA', year: 2022, category: 'fire' },
  'NFPA 80': { code: 'NFPA 80', name: 'Standard for Fire Doors and Other Opening Protectives', organization: 'NFPA', year: 2022, category: 'fire' },
  'NFPA 101': { code: 'NFPA 101', name: 'Life Safety Code', organization: 'NFPA', year: 2021, category: 'fire' },
  'IBC 1011': { code: 'IBC 1011', name: 'International Building Code - Stairways', organization: 'ICC', year: 2021, category: 'architectural' },
  'IBC 1014': { code: 'IBC 1014', name: 'International Building Code - Handrails', organization: 'ICC', year: 2021, category: 'architectural' },
  'IBC 1504': { code: 'IBC 1504', name: 'International Building Code - Roof', organization: 'ICC', year: 2021, category: 'structural' },
  'IEC 61439': { code: 'IEC 61439', name: 'Low-voltage switchgear and controlgear assemblies', organization: 'IEC', year: 2020, category: 'electrical' },
  'NEC 2020': { code: 'NEC 2020', name: 'National Electrical Code', organization: 'NFPA', year: 2020, category: 'electrical' },
  'ASHRAE 90.1': { code: 'ASHRAE 90.1', name: 'Energy Standard for Buildings', organization: 'ASHRAE', year: 2022, category: 'mechanical' },
  'ASHRAE 62.1': { code: 'ASHRAE 62.1', name: 'Ventilation for Acceptable Indoor Air Quality', organization: 'ASHRAE', year: 2022, category: 'mechanical' },
  'AISC 360': { code: 'AISC 360', name: 'Specification for Structural Steel Buildings', organization: 'AISC', year: 2022, category: 'structural' },
  'ASME A17.1': { code: 'ASME A17.1', name: 'Safety Code for Elevators and Escalators', organization: 'ASME', year: 2022, category: 'mechanical' },
  'SMACNA': { code: 'SMACNA', name: 'HVAC Duct Construction Standards', organization: 'SMACNA', year: 2021, category: 'mechanical' },
  'TIA/EIA 568': { code: 'TIA/EIA 568', name: 'Commercial Building Telecommunications Cabling Standard', organization: 'TIA', year: 2021, category: 'low_current' },
  'IPC': { code: 'IPC', name: 'International Plumbing Code', organization: 'ICC', year: 2021, category: 'plumbing' },
};

function getCode(code) {
  return CODES[code] || Object.values(CODES).find(c => c.code === code);
}

function getCodesByCategory(category) {
  return Object.values(CODES).filter(c => c.category === category);
}

function getAllCodes() {
  return Object.values(CODES);
}

module.exports = { CODES, getCode, getCodesByCategory, getAllCodes };
