/**
 * ACEP Vision AI — Shared Forbidden Content Lists
 *
 * Single source of truth for all forbidden content terms.
 * Used by image-engine.js, stable-diffusion.js, and engineering-prompt-builder.js
 * to avoid duplicate definitions.
 */
const FORBIDDEN_CONTENT = {
  terms: [
    'cross', 'crucifix', 'crusade', 'crusader',
    'red cross', 'redcross',
    'alcohol', 'wine', 'beer', 'liquor', 'whisky', 'whiskey', 'vodka', 'champagne',
    'statue', 'idol', 'idolatry', 'sculpture of human', 'statues', 'idols',
    'church', 'churches', 'cathedral',
    'temple', 'synagogue', 'monastery', 'convent',
    'person', 'people', 'human', 'man', 'woman', 'child', 'children', 'baby',
    'boy', 'girl', 'men', 'women', 'crowd', 'pedestrian', 'worker',
    'animal', 'animals', 'dog', 'cat', 'bird', 'birds', 'horse', 'camel',
    'sheep', 'cow', 'goat', 'donkey', 'frog', 'monkey',
    'human face', 'portrait', 'person standing',
    'صليب', 'الصليب', 'صليب أحمر', 'الصليب الأحمر', 'صلبان',
    'خمر', 'مشروبات كحولية', 'كحول', 'نبيذ', 'بيرة',
    'تمثال', 'تماثيل', 'أصنام', 'صنم',
    'كنيسة', 'كنائس', 'كاتدرائية',
    'معبد', 'معابد', 'كنيس', 'دير',
    'إنسان', 'انسان', 'أشخاص', 'اشخاص', 'شخص', 'رجل', 'امرأة', 'امراه', 'طفل', 'أطفال', 'اطفال',
    'عمال', 'عامل', 'ناس', 'بشر',
    'حيوان', 'حيوانات', 'كلب', 'قط', 'حصان', 'جمل', 'خروف', 'بقرة', 'طير', 'طيور', 'عصفور', 'حمام',
    'واجه', 'وجه', 'شخصيات',
  ],
  categories: {
    crosses: ['cross', 'crucifix', 'crusade', 'crusader', 'red cross', 'redcross', 'صليب', 'الصليب', 'صليب أحمر', 'الصليب الأحمر', 'صلبان'],
    alcohol: ['alcohol', 'wine', 'beer', 'liquor', 'whisky', 'whiskey', 'vodka', 'champagne', 'خمر', 'مشروبات كحولية', 'كحول', 'نبيذ', 'بيرة'],
    statues: ['statue', 'idol', 'idolatry', 'sculpture of human', 'statues', 'idols', 'تمثال', 'تماثيل', 'أصنام', 'صنم'],
    temples: ['church', 'churches', 'cathedral', 'temple', 'synagogue', 'monastery', 'convent', 'كنيسة', 'كنائس', 'كاتدرائية', 'معبد', 'معابد', 'كنيس', 'دير'],
    humans: ['person', 'people', 'human', 'man', 'woman', 'child', 'children', 'baby', 'boy', 'girl', 'men', 'women', 'crowd', 'pedestrian', 'worker', 'human face', 'portrait', 'person standing', 'إنسان', 'انسان', 'أشخاص', 'اشخاص', 'شخص', 'رجل', 'امرأة', 'امراه', 'طفل', 'أطفال', 'اطفال', 'عمال', 'عامل', 'ناس', 'بشر', 'واجه', 'وجه', 'شخصيات'],
    animals: ['animal', 'animals', 'dog', 'cat', 'bird', 'birds', 'horse', 'camel', 'sheep', 'cow', 'goat', 'donkey', 'frog', 'monkey', 'حيوان', 'حيوانات', 'كلب', 'قط', 'حصان', 'جمل', 'خروف', 'بقرة', 'طير', 'طيور', 'عصفور', 'حمام'],
  },
};

const FORBIDDEN_TERMS_JOINED = FORBIDDEN_CONTENT.terms.join(', ');
const FORBIDDEN_NEGATIVE = `(${FORBIDDEN_CONTENT.terms.join(':1.4), (')}:1.4)`;

function containsForbiddenContent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FORBIDDEN_CONTENT.terms.some(term => lower.includes(term));
}

module.exports = {
  FORBIDDEN_CONTENT,
  FORBIDDEN_TERMS_JOINED,
  FORBIDDEN_NEGATIVE,
  containsForbiddenContent,
};
