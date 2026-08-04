const PROJECT_TYPES = {
  Apartment: { id: 'apartment', name: 'شقق', nameEn: 'Apartment', category: 'residential', complexity: 4 },
  Villa: { id: 'villa', name: 'فلل', nameEn: 'Villa', category: 'residential', complexity: 5 },
  Building: { id: 'building', name: 'عمائر', nameEn: 'Building', category: 'residential', complexity: 6 },
  Tower: { id: 'tower', name: 'أبراج', nameEn: 'Tower', category: 'residential', complexity: 9 },
  Mosque: { id: 'mosque', name: 'مساجد', nameEn: 'Mosque', category: 'religious', complexity: 7 },
  School: { id: 'school', name: 'مدارس', nameEn: 'School', category: 'educational', complexity: 6 },
  University: { id: 'university', name: 'جامعات', nameEn: 'University', category: 'educational', complexity: 9 },
  Hospital: { id: 'hospital', name: 'مستشفيات', nameEn: 'Hospital', category: 'healthcare', complexity: 10 },
  Hotel: { id: 'hotel', name: 'فنادق', nameEn: 'Hotel', category: 'commercial', complexity: 8 },
  Mall: { id: 'mall', name: 'مولات', nameEn: 'Mall', category: 'commercial', complexity: 8 },
  CommercialCenter: { id: 'commercial_center', name: 'مراكز تجارية', nameEn: 'Commercial Center', category: 'commercial', complexity: 7 },
  Factory: { id: 'factory', name: 'مصانع', nameEn: 'Factory', category: 'industrial', complexity: 8 },
  Warehouse: { id: 'warehouse', name: 'مستودعات', nameEn: 'Warehouse', category: 'industrial', complexity: 4 },
  Office: { id: 'office', name: 'مباني مكاتب', nameEn: 'Office Building', category: 'commercial', complexity: 6 },
  Restaurant: { id: 'restaurant', name: 'مطاعم', nameEn: 'Restaurant', category: 'commercial', complexity: 4 },
  GasStation: { id: 'gas_station', name: 'محطات وقود', nameEn: 'Gas Station', category: 'commercial', complexity: 5 },
  Airport: { id: 'airport', name: 'مطارات', nameEn: 'Airport', category: 'transportation', complexity: 10 },
  TrainStation: { id: 'train_station', name: 'محطات قطارات', nameEn: 'Train Station', category: 'transportation', complexity: 9 },
  SportsFacility: { id: 'sports_facility', name: 'منشآت رياضية', nameEn: 'Sports Facility', category: 'recreational', complexity: 8 },
  GovernmentBuilding: { id: 'government', name: 'منشآت حكومية', nameEn: 'Government Building', category: 'government', complexity: 7 },
  Infrastructure: { id: 'infrastructure', name: 'مشاريع البنية التحتية', nameEn: 'Infrastructure', category: 'infrastructure', complexity: 8 },
  Road: { id: 'road', name: 'مشاريع الطرق', nameEn: 'Road', category: 'infrastructure', complexity: 6 },
  Bridge: { id: 'bridge', name: 'مشاريع الجسور', nameEn: 'Bridge', category: 'infrastructure', complexity: 9 },
  Tunnel: { id: 'tunnel', name: 'مشاريع الأنفاق', nameEn: 'Tunnel', category: 'infrastructure', complexity: 10 },
  WaterStation: { id: 'water_station', name: 'محطات المياه', nameEn: 'Water Station', category: 'infrastructure', complexity: 7 },
  PowerStation: { id: 'power_station', name: 'محطات الكهرباء', nameEn: 'Power Station', category: 'infrastructure', complexity: 8 },
};

const CATEGORIES = {
  residential: { name: 'سكني', nameEn: 'Residential' },
  religious: { name: 'ديني', nameEn: 'Religious' },
  educational: { name: 'تعليمي', nameEn: 'Educational' },
  healthcare: { name: 'صحي', nameEn: 'Healthcare' },
  commercial: { name: 'تجاري', nameEn: 'Commercial' },
  industrial: { name: 'صناعي', nameEn: 'Industrial' },
  transportation: { name: 'نقل', nameEn: 'Transportation' },
  recreational: { name: 'ترفيهي', nameEn: 'Recreational' },
  government: { name: 'حكومي', nameEn: 'Government' },
  infrastructure: { name: 'بنية تحتية', nameEn: 'Infrastructure' },
};

function getProjectType(id) {
  return Object.values(PROJECT_TYPES).find(p => p.id === id || p.nameEn.toLowerCase() === id?.toLowerCase());
}

function getProjectTypesByCategory(category) {
  return Object.values(PROJECT_TYPES).filter(p => p.category === category);
}

function getAllProjectTypes() {
  return Object.values(PROJECT_TYPES);
}

module.exports = { PROJECT_TYPES, CATEGORIES, getProjectType, getProjectTypesByCategory, getAllProjectTypes };
