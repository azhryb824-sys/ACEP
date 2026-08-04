const PROJECT_PHASES = [
  { id: 'studies', order: 0, name: 'الدراسات', nameEn: 'Studies', color: '#6366f1' },
  { id: 'design', order: 1, name: 'التصميم', nameEn: 'Design', color: '#8b5cf6' },
  { id: 'foundation', order: 2, name: 'التأسيس', nameEn: 'Foundation', color: '#f59e0b' },
  { id: 'construction', order: 3, name: 'الإنشاء', nameEn: 'Construction', color: '#ef4444' },
  { id: 'structure', order: 4, name: 'التشييد', nameEn: 'Structure', color: '#dc2626' },
  { id: 'masonry', order: 5, name: 'المباني', nameEn: 'Masonry', color: '#ea580c' },
  { id: 'electrical', order: 6, name: 'التركيبات الكهربائية', nameEn: 'Electrical', color: '#facc15' },
  { id: 'mechanical', order: 7, name: 'التركيبات الميكانيكية', nameEn: 'Mechanical', color: '#22d3ee' },
  { id: 'plumbing', order: 8, name: 'السباكة', nameEn: 'Plumbing', color: '#06b6d4' },
  { id: 'fire_fighting', order: 9, name: 'Fire Fighting', nameEn: 'Fire Fighting', color: '#ef4444' },
  { id: 'fire_alarm', order: 10, name: 'Fire Alarm', nameEn: 'Fire Alarm', color: '#f97316' },
  { id: 'low_current', order: 11, name: 'Low Current', nameEn: 'Low Current', color: '#14b8a6' },
  { id: 'finishing', order: 12, name: 'التشطيب', nameEn: 'Finishing', color: '#ec4899' },
  { id: 'furnishing', order: 13, name: 'التأثيث', nameEn: 'Furnishing', color: '#a855f7' },
  { id: 'testing', order: 14, name: 'الاختبارات', nameEn: 'Testing', color: '#3b82f6' },
  { id: 'commissioning', order: 15, name: 'التشغيل', nameEn: 'Commissioning', color: '#10b981' },
  { id: 'handover', order: 16, name: 'التسليم', nameEn: 'Handover', color: '#22c55e' },
  { id: 'maintenance', order: 17, name: 'الصيانة', nameEn: 'Maintenance', color: '#64748b' },
];

function getPhase(id) {
  return PROJECT_PHASES.find(p => p.id === id || p.nameEn.toLowerCase() === id?.toLowerCase());
}

function getPhasesBefore(id) {
  const phase = getPhase(id);
  if (!phase) return [];
  return PROJECT_PHASES.filter(p => p.order < phase.order);
}

function getPhasesAfter(id) {
  const phase = getPhase(id);
  if (!phase) return [];
  return PROJECT_PHASES.filter(p => p.order > phase.order);
}

module.exports = { PROJECT_PHASES, getPhase, getPhasesBefore, getPhasesAfter };
