const PROJECT_TYPES_V2 = {
  'residential': {
    name: 'سكني', nameEn: 'Residential', children: {
      'villa': { name: 'فيلا', nameEn: 'Villa', complexity: 5, variants: ['villa_single', 'villa_duplex', 'villa_twin', 'villa_mansion'] },
      'duplex': { name: 'دوبلكس', nameEn: 'Duplex', complexity: 4 },
      'apartment': { name: 'شقة', nameEn: 'Apartment', complexity: 4, variants: ['apt_studio', 'apt_1br', 'apt_2br', 'apt_3br', 'apt_penthouse', 'apt_loft'] },
      'penthouse': { name: 'بنتهاوس', nameEn: 'Penthouse', complexity: 6 },
      'residential_tower': { name: 'برج سكني', nameEn: 'Residential Tower', complexity: 8 },
      'compound': { name: 'مجمع سكني', nameEn: 'Residential Compound', complexity: 7 },
      'student_housing': { name: 'سكن طلابي', nameEn: 'Student Housing', complexity: 5 },
      'staff_housing': { name: 'سكن عمال', nameEn: 'Staff Housing', complexity: 4 },
      'elderly_home': { name: 'دار مسنين', nameEn: 'Elderly Home', complexity: 6 },
      'orphanage': { name: 'دار أيتام', nameEn: 'Orphanage', complexity: 5 },
      'resort_villa': { name: 'فيلا منتجع', nameEn: 'Resort Villa', complexity: 6 },
      'townhouse': { name: 'تاون هاوس', nameEn: 'Townhouse', complexity: 4 },
      'row_housing': { name: 'مساكن صفية', nameEn: 'Row Housing', complexity: 4 },
      'residential_complex': { name: 'مجمع سكني متكامل', nameEn: 'Residential Complex', complexity: 7 },
    }
  },
  'religious': {
    name: 'ديني', nameEn: 'Religious', children: {
      'neighborhood_mosque': { name: 'مسجد حي', nameEn: 'Neighborhood Mosque', complexity: 3 },
      'friday_mosque': { name: 'جامع', nameEn: 'Friday Mosque', complexity: 7 },
      'grand_mosque': { name: 'مسجد كبير', nameEn: 'Grand Mosque', complexity: 9 },
      'prayer_hall': { name: 'مصلى', nameEn: 'Prayer Hall', complexity: 2 },
      'church': { name: 'كنيسة', nameEn: 'Church', complexity: 7 },
      'temple': { name: 'معبد', nameEn: 'Temple', complexity: 7 },
      'islamic_center': { name: 'مركز إسلامي', nameEn: 'Islamic Center', complexity: 6 },
      'quran_center': { name: 'مركز تحفيظ قرآن', nameEn: 'Quran Center', complexity: 3 },
      'cultural_center': { name: 'مركز ثقافي ديني', nameEn: 'Religious Cultural Center', complexity: 5 },
    }
  },
  'healthcare': {
    name: 'صحي', nameEn: 'Healthcare', children: {
      'clinic': { name: 'عيادة', nameEn: 'Clinic', complexity: 5 },
      'medical_center': { name: 'مركز طبي', nameEn: 'Medical Center', complexity: 7 },
      'general_hospital': { name: 'مستشفى عام', nameEn: 'General Hospital', complexity: 9 },
      'specialized_hospital': { name: 'مستشفى تخصصي', nameEn: 'Specialized Hospital', complexity: 10 },
      'maternity_hospital': { name: 'مستشفى ولادة', nameEn: 'Maternity Hospital', complexity: 8 },
      'children_hospital': { name: 'مستشفى أطفال', nameEn: 'Children Hospital', complexity: 8 },
      'psychiatric_hospital': { name: 'مستشفى نفسي', nameEn: 'Psychiatric Hospital', complexity: 7 },
      'rehabilitation_center': { name: 'مركز تأهيل', nameEn: 'Rehabilitation Center', complexity: 6 },
      'dental_center': { name: 'مركز أسنان', nameEn: 'Dental Center', complexity: 5 },
      'dialysis_center': { name: 'مركز غسيل كلوي', nameEn: 'Dialysis Center', complexity: 6 },
      'laboratory': { name: 'مختبر طبي', nameEn: 'Medical Laboratory', complexity: 7 },
      'pharmacy': { name: 'صيدلية', nameEn: 'Pharmacy', complexity: 3 },
      'emergency_center': { name: 'مركز طوارئ', nameEn: 'Emergency Center', complexity: 7 },
      'blood_bank': { name: 'بنك دم', nameEn: 'Blood Bank', complexity: 7 },
      'radiology_center': { name: 'مركز أشعة', nameEn: 'Radiology Center', complexity: 6 },
    }
  },
  'educational': {
    name: 'تعليمي', nameEn: 'Educational', children: {
      'nursery': { name: 'حضانة', nameEn: 'Nursery', complexity: 3 },
      'kindergarten': { name: 'روضة أطفال', nameEn: 'Kindergarten', complexity: 3 },
      'primary_school': { name: 'مدرسة ابتدائية', nameEn: 'Primary School', complexity: 4 },
      'middle_school': { name: 'مدرسة متوسطة', nameEn: 'Middle School', complexity: 4 },
      'secondary_school': { name: 'مدرسة ثانوية', nameEn: 'Secondary School', complexity: 5 },
      'high_school': { name: 'مدرسة ثانوية شاملة', nameEn: 'High School', complexity: 5 },
      'university': { name: 'جامعة', nameEn: 'University', complexity: 9 },
      'college': { name: 'كلية', nameEn: 'College', complexity: 7 },
      'institute': { name: 'معهد', nameEn: 'Institute', complexity: 6 },
      'training_center': { name: 'مركز تدريب', nameEn: 'Training Center', complexity: 4 },
      'research_center': { name: 'مركز أبحاث', nameEn: 'Research Center', complexity: 8 },
      'library': { name: 'مكتبة', nameEn: 'Library', complexity: 6 },
      'special_education': { name: 'مركز تربية خاصة', nameEn: 'Special Education Center', complexity: 5 },
      'technical_college': { name: 'كلية تقنية', nameEn: 'Technical College', complexity: 7 },
      'language_center': { name: 'مركز لغات', nameEn: 'Language Center', complexity: 3 },
    }
  },
  'commercial': {
    name: 'تجاري', nameEn: 'Commercial', children: {
      'mall': { name: 'مول تجاري', nameEn: 'Shopping Mall', complexity: 8 },
      'retail_shop': { name: 'محل تجاري', nameEn: 'Retail Shop', complexity: 2 },
      'supermarket': { name: 'سوبرماركت', nameEn: 'Supermarket', complexity: 5 },
      'hypermarket': { name: 'هايبرماركت', nameEn: 'Hypermarket', complexity: 7 },
      'restaurant': { name: 'مطعم', nameEn: 'Restaurant', complexity: 4 },
      'cafe': { name: 'كافيه', nameEn: 'Cafe', complexity: 3 },
      'bakery': { name: 'مخبز', nameEn: 'Bakery', complexity: 3 },
      'office_tower': { name: 'برج مكاتب', nameEn: 'Office Tower', complexity: 8 },
      'business_center': { name: 'مركز أعمال', nameEn: 'Business Center', complexity: 6 },
      'coworking': { name: 'مساحة عمل مشتركة', nameEn: 'Co-working Space', complexity: 4 },
      'hotel': { name: 'فندق', nameEn: 'Hotel', complexity: 8 },
      'resort': { name: 'منتجع', nameEn: 'Resort', complexity: 7 },
      'motel': { name: 'مبيت', nameEn: 'Motel', complexity: 4 },
      'hostel': { name: 'نزل شبابي', nameEn: 'Hostel', complexity: 3 },
      'banquet_hall': { name: 'قاعة مناسبات', nameEn: 'Banquet Hall', complexity: 5 },
      'exhibition_center': { name: 'مركز معارض', nameEn: 'Exhibition Center', complexity: 8 },
      'conference_center': { name: 'مركز مؤتمرات', nameEn: 'Conference Center', complexity: 7 },
      'cinema': { name: 'سينما', nameEn: 'Cinema', complexity: 6 },
      'car_showroom': { name: 'معرض سيارات', nameEn: 'Car Showroom', complexity: 5 },
      'gas_station': { name: 'محطة وقود', nameEn: 'Gas Station', complexity: 5 },
      'car_wash': { name: 'غسيل سيارات', nameEn: 'Car Wash', complexity: 3 },
    }
  },
  'industrial': {
    name: 'صناعي', nameEn: 'Industrial', children: {
      'factory': { name: 'مصنع', nameEn: 'Factory', complexity: 8 },
      'food_factory': { name: 'مصنع غذائي', nameEn: 'Food Factory', complexity: 8 },
      'pharmaceutical_factory': { name: 'مصنع أدوية', nameEn: 'Pharmaceutical Factory', complexity: 9 },
      'chemical_plant': { name: 'مصنع كيماويات', nameEn: 'Chemical Plant', complexity: 9 },
      'steel_factory': { name: 'مصنع حديد', nameEn: 'Steel Factory', complexity: 8 },
      'cement_factory': { name: 'مصنع أسمنت', nameEn: 'Cement Factory', complexity: 8 },
      'plastic_factory': { name: 'مصنع بلاستيك', nameEn: 'Plastic Factory', complexity: 7 },
      'textile_factory': { name: 'مصنع نسيج', nameEn: 'Textile Factory', complexity: 7 },
      'furniture_factory': { name: 'مصنع أثاث', nameEn: 'Furniture Factory', complexity: 6 },
      'electronics_factory': { name: 'مصنع إلكترونيات', nameEn: 'Electronics Factory', complexity: 8 },
      'warehouse': { name: 'مستودع', nameEn: 'Warehouse', complexity: 4 },
      'cold_storage': { name: 'مستودع تبريد', nameEn: 'Cold Storage', complexity: 6 },
      'workshop': { name: 'ورشة', nameEn: 'Workshop', complexity: 3 },
      'maintenance_center': { name: 'مركز صيانة', nameEn: 'Maintenance Center', complexity: 5 },
      'distribution_center': { name: 'مركز توزيع', nameEn: 'Distribution Center', complexity: 6 },
      'data_center': { name: 'مركز بيانات', nameEn: 'Data Center', complexity: 9 },
      'laboratory_industrial': { name: 'مختبر صناعي', nameEn: 'Industrial Laboratory', complexity: 7 },
    }
  },
  'infrastructure': {
    name: 'بنية تحتية', nameEn: 'Infrastructure', children: {
      'road': { name: 'طريق', nameEn: 'Road', complexity: 6 },
      'highway': { name: 'طريق سريع', nameEn: 'Highway', complexity: 8 },
      'bridge': { name: 'جسر', nameEn: 'Bridge', complexity: 9 },
      'tunnel': { name: 'نفق', nameEn: 'Tunnel', complexity: 10 },
      'airport': { name: 'مطار', nameEn: 'Airport', complexity: 10 },
      'airport_terminal': { name: 'صالة مطار', nameEn: 'Airport Terminal', complexity: 9 },
      'airport_runway': { name: 'مدرج مطار', nameEn: 'Airport Runway', complexity: 8 },
      'seaport': { name: 'ميناء بحري', nameEn: 'Seaport', complexity: 9 },
      'railway': { name: 'سكة حديد', nameEn: 'Railway', complexity: 8 },
      'train_station': { name: 'محطة قطار', nameEn: 'Train Station', complexity: 8 },
      'metro': { name: 'مترو', nameEn: 'Metro', complexity: 10 },
      'metro_station': { name: 'محطة مترو', nameEn: 'Metro Station', complexity: 8 },
      'water_treatment_plant': { name: 'محطة معالجة مياه', nameEn: 'Water Treatment Plant', complexity: 8 },
      'desalination_plant': { name: 'محطة تحلية', nameEn: 'Desalination Plant', complexity: 9 },
      'water_tower': { name: 'برج مياه', nameEn: 'Water Tower', complexity: 5 },
      'power_plant': { name: 'محطة كهرباء', nameEn: 'Power Plant', complexity: 9 },
      'solar_farm': { name: 'محطة طاقة شمسية', nameEn: 'Solar Farm', complexity: 7 },
      'wind_farm': { name: 'محطة طاقة رياح', nameEn: 'Wind Farm', complexity: 8 },
      'substation': { name: 'محطة تحويل', nameEn: 'Electrical Substation', complexity: 6 },
      'dam': { name: 'سد', nameEn: 'Dam', complexity: 9 },
      'canal': { name: 'قناة مائية', nameEn: 'Canal', complexity: 6 },
      'pipeline': { name: 'خط أنابيب', nameEn: 'Pipeline', complexity: 7 },
    }
  },
  'government': {
    name: 'حكومي', nameEn: 'Government', children: {
      'government_building': { name: 'مبنى حكومي', nameEn: 'Government Building', complexity: 6 },
      'municipality': { name: 'بلدية', nameEn: 'Municipality', complexity: 5 },
      'courthouse': { name: 'محكمة', nameEn: 'Courthouse', complexity: 7 },
      'police_station': { name: 'مركز شرطة', nameEn: 'Police Station', complexity: 5 },
      'fire_station': { name: 'مركز دفاع مدني', nameEn: 'Fire Station', complexity: 6 },
      'prison': { name: 'سجن', nameEn: 'Prison', complexity: 8 },
      'embassy': { name: 'سفارة', nameEn: 'Embassy', complexity: 7 },
      'post_office': { name: 'مكتب بريد', nameEn: 'Post Office', complexity: 3 },
      'border_post': { name: 'منفذ حدودي', nameEn: 'Border Post', complexity: 6 },
    }
  },
  'sports': {
    name: 'رياضي', nameEn: 'Sports', children: {
      'stadium': { name: 'ملعب', nameEn: 'Stadium', complexity: 9 },
      'sports_hall': { name: 'صالة رياضية', nameEn: 'Sports Hall', complexity: 6 },
      'gym': { name: 'نادي رياضي', nameEn: 'Gym', complexity: 4 },
      'swimming_pool': { name: 'مسبح', nameEn: 'Swimming Pool', complexity: 5 },
      'sports_complex': { name: 'مجمع رياضي', nameEn: 'Sports Complex', complexity: 8 },
      'indoor_arena': { name: 'صالة مغلقة', nameEn: 'Indoor Arena', complexity: 7 },
      'tennis_court': { name: 'ملعب تنس', nameEn: 'Tennis Court', complexity: 3 },
      'football_field': { name: 'ملعب كرة قدم', nameEn: 'Football Field', complexity: 4 },
      'golf_course': { name: 'ملعب غولف', nameEn: 'Golf Course', complexity: 8 },
      'equestrian_center': { name: 'مركز فروسية', nameEn: 'Equestrian Center', complexity: 7 },
      'shooting_range': { name: 'ميدان رماية', nameEn: 'Shooting Range', complexity: 6 },
    }
  },
  'agricultural': {
    name: 'زراعي', nameEn: 'Agricultural', children: {
      'farm': { name: 'مزرعة', nameEn: 'Farm', complexity: 3 },
      'greenhouse': { name: 'بيت محمي', nameEn: 'Greenhouse', complexity: 4 },
      'livestock_farm': { name: 'مزرعة مواشي', nameEn: 'Livestock Farm', complexity: 5 },
      'poultry_farm': { name: 'مزرعة دواجن', nameEn: 'Poultry Farm', complexity: 5 },
      'fishery': { name: 'مزرعة أسماك', nameEn: 'Fishery', complexity: 5 },
      'packing_house': { name: 'مصنع تعبئة', nameEn: 'Packing House', complexity: 5 },
      'silo': { name: 'صومعة غلال', nameEn: 'Grain Silo', complexity: 6 },
      'agricultural_warehouse': { name: 'مستودع زراعي', nameEn: 'Agricultural Warehouse', complexity: 3 },
    }
  },
};

function flattenProjectTypes(tree, parentKey = '') {
  const result = {};
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (value.children) {
      Object.assign(result, flattenProjectTypes(value.children, fullKey));
      result[key] = { id: key, name: value.name, nameEn: value.nameEn, category: parentKey || key, isCategory: true, complexity: 3 };
    } else {
      result[fullKey] = { id: fullKey, name: value.name, nameEn: value.nameEn, category: parentKey, complexity: value.complexity || 5, variants: value.variants || [] };
    }
  }
  return result;
}

const FLAT_PROJECT_TYPES_V2 = flattenProjectTypes(PROJECT_TYPES_V2);
const PROJECT_TYPES_V2_COUNT = Object.keys(FLAT_PROJECT_TYPES_V2).length;

function getProjectTypeV2(id) {
  return FLAT_PROJECT_TYPES_V2[id] || Object.values(FLAT_PROJECT_TYPES_V2).find(p => p.nameEn?.toLowerCase() === id?.toLowerCase() || p.id === id);
}

function getProjectTypesByCategoryV2(category) {
  return Object.values(FLAT_PROJECT_TYPES_V2).filter(p => p.category === category && !p.isCategory);
}

function getAllProjectTypesV2() {
  return Object.values(FLAT_PROJECT_TYPES_V2).filter(p => !p.isCategory);
}

function getHierarchy() {
  return PROJECT_TYPES_V2;
}

module.exports = { PROJECT_TYPES_V2, FLAT_PROJECT_TYPES_V2, PROJECT_TYPES_V2_COUNT, getProjectTypeV2, getProjectTypesByCategoryV2, getAllProjectTypesV2, getHierarchy };
