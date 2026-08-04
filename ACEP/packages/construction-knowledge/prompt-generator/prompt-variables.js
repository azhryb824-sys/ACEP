const PROJECT_TYPES = {
  apartment: {
    name: { en: 'Apartment', ar: 'شقة' },
    subtypes: ['Studio', '1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4 Bedrooms', '5 Bedrooms', 'Penthouse', 'Duplex', 'Loft'],
    defaultArea: [40, 60, 80, 100, 120, 150, 180, 220, 300, 400],
    styles: ['Modern', 'Contemporary', 'Minimalist', 'Scandinavian', 'Classical', 'Luxury Modern', 'Industrial', 'Arabic', 'Islamic'],
  },
  villa: {
    name: { en: 'Villa', ar: 'فيلا' },
    subtypes: ['Single Floor', 'Two Floors', 'Three Floors', 'With Basement', 'With Roof Terrace', 'Corner Villa', 'Twin Villa', 'Compound Villa'],
    defaultArea: [150, 200, 250, 300, 350, 400, 500, 600, 800, 1000],
    styles: ['Modern', 'Contemporary', 'Classical', 'Neo Classical', 'Arabic', 'Islamic', 'Mediterranean', 'Luxury Modern', 'Minimalist', 'High Tech'],
  },
  building: {
    name: { en: 'Residential Building', ar: 'عمارة سكنية' },
    subtypes: ['4 Floors', '5 Floors', '6 Floors', '8 Floors', '10 Floors', '12 Floors', '15 Floors', 'Mixed Use', 'Commercial Residential'],
    defaultArea: [300, 400, 600, 800, 1000, 1500, 2000, 3000, 5000],
    styles: ['Modern', 'Contemporary', 'Classical', 'Arabic', 'Islamic', 'Luxury Modern', 'Minimalist', 'High Tech'],
  },
  tower: {
    name: { en: 'Tower', ar: 'برج' },
    subtypes: ['Office Tower', 'Residential Tower', 'Mixed Use Tower', 'Hotel Tower', 'Commercial Tower', 'Glass Tower', 'Landmark Tower'],
    defaultArea: [5000, 10000, 15000, 20000, 30000, 50000, 80000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Neo Classical', 'Minimalist', 'Luxury Modern', 'Deconstructivist', 'Parametric'],
  },
  mosque: {
    name: { en: 'Mosque', ar: 'مسجد' },
    subtypes: ['Neighborhood Mosque', 'Friday Mosque', 'Grand Mosque', 'Prayer Room', 'Open Air Mosque', 'Historic Style Mosque'],
    defaultArea: [100, 200, 300, 400, 500, 800, 1000, 1500, 2000, 3000, 5000],
    styles: ['Islamic', 'Arabic', 'Ottoman', 'Andalusian', 'Mamluk', 'Modern Islamic', 'Contemporary Islamic', 'Moroccan'],
  },
  school: {
    name: { en: 'School', ar: 'مدرسة' },
    subtypes: ['Primary School', 'Secondary School', 'High School', 'International School', 'Kindergarten', 'University Building', 'College', 'Institute'],
    defaultArea: [500, 1000, 2000, 3000, 5000, 8000, 10000, 15000, 20000],
    styles: ['Modern', 'Contemporary', 'Minimalist', 'Functional', 'Educational', 'High Tech'],
  },
  hospital: {
    name: { en: 'Hospital', ar: 'مستشفى' },
    subtypes: ['Clinic', 'Medical Center', 'General Hospital', 'Specialist Hospital', 'Teaching Hospital', 'Maternity Hospital', 'Children Hospital', 'Rehabilitation Center'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
    styles: ['Modern', 'Contemporary', 'Functional', 'Minimalist', 'High Tech', 'Healthcare Design'],
  },
  hotel: {
    name: { en: 'Hotel', ar: 'فندق' },
    subtypes: ['Boutique Hotel', 'Business Hotel', 'Resort Hotel', 'Luxury Hotel', 'Budget Hotel', 'Extended Stay', 'Serviced Apartments', 'Hotel Residence'],
    defaultArea: [1000, 2000, 5000, 10000, 15000, 20000, 30000, 50000],
    styles: ['Modern', 'Contemporary', 'Luxury Modern', 'Classical', 'Neo Classical', 'Arabic', 'Islamic', 'Mediterranean', 'High Tech', 'Minimalist'],
  },
  mall: {
    name: { en: 'Mall', ar: 'مول' },
    subtypes: ['Shopping Center', 'Retail Complex', 'Supermarket', 'Hypermarket', 'Commercial Plaza', 'Outlet Mall', 'Entertainment Center'],
    defaultArea: [2000, 5000, 10000, 20000, 30000, 50000, 80000, 100000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Minimalist', 'Parametric', 'Luxury Modern'],
  },
  factory: {
    name: { en: 'Factory', ar: 'مصنع' },
    subtypes: ['Food Factory', 'Pharmaceutical Factory', 'Packaging Factory', 'Assembly Plant', 'Warehouse Factory', 'Chemical Plant', 'Manufacturing Unit', 'Industrial Shed'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000, 50000],
    styles: ['Industrial', 'Functional', 'Modern', 'High Tech', 'Minimalist'],
  },
  warehouse: {
    name: { en: 'Warehouse', ar: 'مستودع' },
    subtypes: ['Storage Warehouse', 'Cold Storage', 'Logistics Center', 'Distribution Hub', 'Dry Warehouse', 'Refrigerated Warehouse', 'Auto Storage'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000],
    styles: ['Industrial', 'Functional', 'Modern', 'Minimalist'],
  },
  office: {
    name: { en: 'Office Building', ar: 'مبنى مكاتب' },
    subtypes: ['Corporate Office', 'Business Center', 'Government Office', 'Co Working Space', 'Medical Office', 'Bank', 'Headquarters'],
    defaultArea: [200, 500, 1000, 2000, 5000, 10000, 20000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Minimalist', 'Classical', 'Neo Classical', 'Luxury Modern'],
  },
  gas_station: {
    name: { en: 'Gas Station', ar: 'محطة وقود' },
    subtypes: ['Standard Station', 'Truck Station', 'Station with Mart', 'Station with Car Wash', 'Station with Restaurant', 'Service Station'],
    defaultArea: [200, 300, 500, 800, 1000, 1500],
    styles: ['Modern', 'Contemporary', 'Minimalist', 'Commercial'],
  },
  road: {
    name: { en: 'Road', ar: 'طريق' },
    subtypes: ['Local Road', 'Collector Road', 'Arterial Road', 'Highway', 'Expressway', 'Ring Road', 'Bridge Approach', 'Tunnel Approach'],
    defaultArea: [1000, 2000, 5000, 10000],
    styles: ['Infrastructure', 'Modern', 'Standard'],
  },
  bridge: {
    name: { en: 'Bridge', ar: 'جسر' },
    subtypes: ['Beam Bridge', 'Arch Bridge', 'Suspension Bridge', 'Cable Stayed Bridge', 'Truss Bridge', 'Culvert', 'Flyover', 'Footbridge', 'Viaduct', 'Box Girder Bridge'],
    defaultArea: [500, 1000, 2000, 5000, 10000],
    styles: ['Infrastructure', 'Modern', 'Structural', 'High Tech'],
  },
  tunnel: {
    name: { en: 'Tunnel', ar: 'نفق' },
    subtypes: ['Road Tunnel', 'Rail Tunnel', 'Pedestrian Tunnel', 'Utility Tunnel', 'Bored Tunnel', 'Cut and Cover Tunnel', 'Underpass'],
    defaultArea: [1000, 2000, 5000],
    styles: ['Infrastructure', 'Modern', 'Structural'],
  },
  water_plant: {
    name: { en: 'Water Treatment Plant', ar: 'محطة مياه' },
    subtypes: ['Water Treatment', 'Desalination Plant', 'Sewage Treatment', 'Pumping Station', 'Water Reservoir', 'Filtration Plant', 'Distribution Center'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000],
    styles: ['Industrial', 'Functional', 'Modern'],
  },
  power_plant: {
    name: { en: 'Power Plant', ar: 'محطة كهرباء' },
    subtypes: ['Solar Power Plant', 'Gas Power Plant', 'Diesel Generator Station', 'Wind Farm', 'Substation', 'Transformer Yard', 'Cogeneration Plant'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 50000],
    styles: ['Industrial', 'Functional', 'Modern', 'High Tech'],
  },
  sports: {
    name: { en: 'Sports Facility', ar: 'منشأة رياضية' },
    subtypes: ['Stadium', 'Sports Hall', 'Football Field', 'Basketball Court', 'Swimming Pool', 'Tennis Court', 'Gymnasium', 'Sports Complex', 'Track Field'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000, 50000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Minimalist', 'Parametric'],
  },
  agricultural: {
    name: { en: 'Agricultural Building', ar: 'مبنى زراعي' },
    subtypes: ['Greenhouse', 'Farm Building', 'Barn', 'Stable', 'Poultry Farm', 'Livestock Shed', 'Agricultural Warehouse', 'Irrigation Station'],
    defaultArea: [200, 500, 1000, 2000, 5000],
    styles: ['Functional', 'Rustic', 'Modern', 'Minimalist'],
  },
  railway: {
    name: { en: 'Railway Station', ar: 'محطة قطار' },
    subtypes: ['Train Station', 'Metro Station', 'Light Rail Station', 'Railway Platform', 'Terminal Station', 'Underground Station', 'Transit Hub'],
    defaultArea: [1000, 2000, 5000, 10000, 20000, 50000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Minimalist', 'Parametric'],
  },
  airport: {
    name: { en: 'Airport', ar: 'مطار' },
    subtypes: ['Terminal Building', 'Control Tower', 'Hangar', 'Runway', 'Airport Lounge', 'Cargo Terminal', 'Heliport'],
    defaultArea: [5000, 10000, 20000, 50000, 100000, 200000],
    styles: ['Modern', 'Contemporary', 'High Tech', 'Parametric', 'Minimalist'],
  },
  parking: {
    name: { en: 'Parking Structure', ar: 'موقف سيارات' },
    subtypes: ['Multi Story Parking', 'Basement Parking', 'Open Parking Lot', 'Automated Parking', 'Parking Garage', 'Car Park Building'],
    defaultArea: [500, 1000, 2000, 5000, 10000, 20000],
    styles: ['Modern', 'Functional', 'Minimalist', 'Industrial'],
  },
};

const CONSTRUCTION_PHASES = [
  { id: 'pre_construction', name: { en: 'Before Construction', ar: 'قبل التنفيذ' } },
  { id: 'excavation', name: { en: 'Excavation', ar: 'الحفر' } },
  { id: 'foundation', name: { en: 'Foundations', ar: 'الأساسات' } },
  { id: 'structure', name: { en: 'Structure', ar: 'الهيكل' } },
  { id: 'masonry', name: { en: 'Masonry', ar: 'المباني' } },
  { id: 'plastering', name: { en: 'Plastering', ar: 'اللياسة' } },
  { id: 'electrical', name: { en: 'Electrical Rough In', ar: 'الكهرباء' } },
  { id: 'plumbing', name: { en: 'Plumbing Rough In', ar: 'السباكة' } },
  { id: 'hvac', name: { en: 'HVAC Installation', ar: 'التكييف' } },
  { id: 'gypsum', name: { en: 'Gypsum Works', ar: 'الجبس' } },
  { id: 'painting', name: { en: 'Painting', ar: 'الدهانات' } },
  { id: 'tiling', name: { en: 'Tiling & Flooring', ar: 'السيراميك' } },
  { id: 'facade', name: { en: 'Facade Works', ar: 'الواجهات' } },
  { id: 'finishing', name: { en: 'Final Finishing', ar: 'التشطيب النهائي' } },
  { id: 'handover', name: { en: 'Handover', ar: 'التسليم' } },
];

const FINISHING_LEVELS = [
  { id: 'economic', name: { en: 'Economic', ar: 'اقتصادي' } },
  { id: 'standard', name: { en: 'Standard', ar: 'متوسط' } },
  { id: 'luxury', name: { en: 'Luxury', ar: 'فاخر' } },
  { id: 'ultra_luxury', name: { en: 'Ultra Luxury', ar: 'فاخر جداً' } },
  { id: 'ultra_luxury_plus', name: { en: 'Ultra Luxury Plus', ar: 'فاخر جداً+' } },
];

const ARCHITECTURAL_STYLES = [
  { id: 'modern', name: { en: 'Modern', ar: 'حديث' } },
  { id: 'contemporary', name: { en: 'Contemporary', ar: 'معاصر' } },
  { id: 'minimalist', name: { en: 'Minimalist', ar: 'بسيط' } },
  { id: 'scandinavian', name: { en: 'Scandinavian', ar: 'اسكندنافي' } },
  { id: 'industrial', name: { en: 'Industrial', ar: 'صناعي' } },
  { id: 'classical', name: { en: 'Classical', ar: 'كلاسيكي' } },
  { id: 'neo_classical', name: { en: 'Neo Classical', ar: 'نيو كلاسيك' } },
  { id: 'arabic', name: { en: 'Arabic', ar: 'عربي' } },
  { id: 'islamic', name: { en: 'Islamic', ar: 'إسلامي' } },
  { id: 'luxury_modern', name: { en: 'Luxury Modern', ar: 'لوكس مودرن' } },
  { id: 'high_tech', name: { en: 'High Tech', ar: 'هاي تك' } },
  { id: 'mediterranean', name: { en: 'Mediterranean', ar: 'متوسطي' } },
  { id: 'parametric', name: { en: 'Parametric', ar: 'بارامتري' } },
  { id: 'deconstructivist', name: { en: 'Deconstructivist', ar: 'تفكيكي' } },
  { id: 'ottoman', name: { en: 'Ottoman', ar: 'عثماني' } },
  { id: 'andalusian', name: { en: 'Andalusian', ar: 'أندلسي' } },
  { id: 'mamluk', name: { en: 'Mamluk', ar: 'مملوكي' } },
  { id: 'moroccan', name: { en: 'Moroccan', ar: 'مغربي' } },
  { id: 'rustic', name: { en: 'Rustic', ar: 'ريفي' } },
  { id: 'art_deco', name: { en: 'Art Deco', ar: 'أرت ديكو' } },
];

const FLOOR_RANGES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60];

const LIGHTING_CONDITIONS = [
  { id: 'daylight', name: { en: 'Daylight', ar: 'نهار' } },
  { id: 'golden_hour', name: { en: 'Golden Hour', ar: 'غروب' } },
  { id: 'night', name: { en: 'Night', ar: 'ليل' } },
  { id: 'interior_lighting', name: { en: 'Interior Lighting', ar: 'إضاءة داخلية' } },
  { id: 'architectural_lighting', name: { en: 'Architectural Lighting', ar: 'إضاءة معمارية' } },
  { id: 'overcast', name: { en: 'Overcast', ar: 'غائم' } },
  { id: 'sunrise', name: { en: 'Sunrise', ar: 'شروق' } },
];

const CAMERA_ANGLES = [
  { id: 'front', name: { en: 'Front View', ar: 'واجهة' } },
  { id: 'top', name: { en: 'Top View', ar: 'من الأعلى' } },
  { id: 'eye_level', name: { en: 'Eye Level', ar: 'مستوى النظر' } },
  { id: 'wide_angle', name: { en: 'Wide Angle', ar: 'زاوية واسعة' } },
  { id: 'drone', name: { en: 'Drone View', ar: 'تصوير جوي' } },
  { id: 'corner', name: { en: 'Corner View', ar: 'زاوية' } },
  { id: 'interior', name: { en: 'Interior View', ar: 'داخلي' } },
  { id: 'birdseye', name: { en: 'Bird Eye View', ar: 'عصفوري' } },
  { id: 'aerial_45', name: { en: '45° Aerial', ar: '45 درجة جوي' } },
  { id: 'street_level', name: { en: 'Street Level', ar: 'مستوى الشارع' } },
  { id: 'close_up', name: { en: 'Close Up Detail', ar: 'تفصيل قريب' } },
];

const QUALITY_TAGS = [
  'Photorealistic', 'Ultra Realistic', '8K Resolution', 'HDR',
  'Professional Architectural Photography', 'Professional Lighting',
  'Ultra Detailed', 'Cinematic Lighting', 'Award Winning Architecture',
  'Hyper Realistic', 'V Ray Render', 'Architectural Visualization',
  'High Resolution', 'Detailed Textures', 'Realistic Materials',
];

const CONSTRAINT_TAGS = [
  'No People', 'No Vehicles', 'No Animals', 'No Logos',
  'No Text', 'No Watermarks', 'No Labels',
  'Correct Architectural Proportions', 'Correct Perspective',
  'Realistic Materials', 'Realistic Lighting',
  'Construction Visualization', 'Architectural Accuracy',
];

const MATERIALS = {
  flooring: ['Marble', 'Porcelain', 'Ceramic', 'Wood', 'Laminate', 'Vinyl', 'Epoxy', 'Terrazzo', 'Granite', 'Carpet', 'Polished Concrete', 'Rubber', 'Stone', 'Mosaic'],
  walls: ['White Paint', 'Textured Paint', 'Wallpaper', 'Stone Cladding', 'Wood Paneling', 'Gypsum Board', 'Glass', 'Aluminum Composite Panel', 'Brick', 'Concrete', 'Stucco', 'Marble Cladding', 'Granite Cladding', '3D Panels'],
  ceilings: ['Gypsum Ceiling', 'Suspended Ceiling', 'Pop Ceiling', 'T Bar Ceiling', 'Wood Ceiling', 'Metal Ceiling', 'Stretch Ceiling', 'Exposed Concrete', 'Acoustic Ceiling', 'Decorative Gypsum', 'Coffered Ceiling', 'Tray Ceiling'],
  facades: ['Glass Facade', 'Stone Facade', 'Aluminum Cladding', 'Composite Panel', 'Brick Veneer', 'Precast Concrete', 'Curtain Wall', 'Stucco Finish', 'Wood Facade', 'Metal Facade', 'Terracotta', 'GRC Panels', 'ETFE System', 'Green Wall'],
  structural: ['Reinforced Concrete', 'Structural Steel', 'Composite', 'Precast Concrete', 'Post Tensioned Concrete', 'Load Bearing Masonry', 'Steel Frame', 'Concrete Block', 'Timber Frame', 'Cold Formed Steel'],
};

const ARCHITECTURAL_FEATURES = {
  general: ['Large Windows', 'Balcony', 'Terrace', 'Roof Garden', 'Courtyard', 'Atrium', 'Skylight', 'Canopy', 'Pergola', 'Water Feature', 'Fountain', 'Swimming Pool', 'Rooftop Terrace', 'Private Garden', 'Arcade', 'Colonnade', 'Dome', 'Minaret', 'Archways', 'Mashrabiya'],
  residential: ['Living Room', 'Dining Room', 'Kitchen', 'Master Bedroom', 'Walk in Closet', 'Bathroom', 'Guest Room', 'Home Office', 'Laundry Room', 'Maid Room', 'Driver Room', 'Storage Room', 'Majlis', 'Family Room', 'Study Room', 'Prayer Room', 'Balcony', 'Terrace'],
  commercial: ['Reception Area', 'Lobby', 'Conference Room', 'Open Office', 'Executive Office', 'Meeting Room', 'Break Room', 'Cafeteria', 'Showroom', 'Retail Space', 'Food Court', 'Waiting Area'],
  religious: ['Prayer Hall', 'Mihrab', 'Minbar', 'Minaret', 'Dome', 'Ablution Area', 'Courtyard', 'Prayer Niche', 'Qibla Wall', 'Women Prayer Area', 'Library', 'Islamic Arches', 'Geometric Patterns', 'Arabic Calligraphy'],
  industrial: ['Production Hall', 'Assembly Line', 'Storage Area', 'Loading Dock', 'Control Room', 'Laboratory', 'Clean Room', 'Warehouse', 'Workshop'],
};

module.exports = {
  PROJECT_TYPES,
  CONSTRUCTION_PHASES,
  FINISHING_LEVELS,
  ARCHITECTURAL_STYLES,
  FLOOR_RANGES,
  LIGHTING_CONDITIONS,
  CAMERA_ANGLES,
  QUALITY_TAGS,
  CONSTRAINT_TAGS,
  MATERIALS,
  ARCHITECTURAL_FEATURES,
};
