/**
 * Gujarati (ગુજરાતી) Kinship Terms - gu-IN
 *
 * Gujarati kinship terminology distinguishes paternal vs maternal relatives.
 * Key terms include kaka (father's brother), fai/foi (father's sister),
 * mama (mother's brother), and masi (mother's sister).
 */
import type { KinshipPattern, LocaleConfig } from './types';

const GUJARATI_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================
  {
    match: { relationship: 'parent', lineage: 'paternal', gender: 'male' },
    term: { label: 'પપ્પા', englishLabel: 'Father', romanization: 'pappa', confidence: 'high' },
  },
  {
    match: { relationship: 'parent', lineage: 'maternal', gender: 'female' },
    term: { label: 'મમ્મી', englishLabel: 'Mother', romanization: 'mammi', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'male' },
    term: { label: 'દીકરો', englishLabel: 'Son', romanization: 'dikro', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'female' },
    term: { label: 'દીકરી', englishLabel: 'Daughter', romanization: 'dikri', confidence: 'high' },
  },

  // ==============================
  // Siblings
  // ==============================
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'elder' },
    term: { label: 'મોટો ભાઈ', englishLabel: 'Elder Brother', romanization: 'moto bhai', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'younger' },
    term: { label: 'નાનો ભાઈ', englishLabel: 'Younger Brother', romanization: 'nano bhai', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'elder' },
    term: { label: 'મોટી બેન', englishLabel: 'Elder Sister', romanization: 'moti ben', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'younger' },
    term: { label: 'નાની બેન', englishLabel: 'Younger Sister', romanization: 'nani ben', confidence: 'high' },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'મોટા કાકા', englishLabel: "Father's Elder Brother", romanization: 'mota kaka', confidence: 'high', description: "Paternal uncle (father's elder brother)" },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'કાકા', englishLabel: "Father's Younger Brother", romanization: 'kaka', confidence: 'high', description: "Paternal uncle (father's younger brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'paternal' },
    term: { label: 'ફોઈ', englishLabel: "Father's Sister", romanization: 'foi', confidence: 'high', description: "Paternal aunt (father's sister)" },
  },
  // Spouses of paternal uncles/aunts
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'મોટી કાકી', englishLabel: "Father's Elder Brother's Wife", romanization: 'moti kaki', confidence: 'medium' },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'કાકી', englishLabel: "Father's Younger Brother's Wife", romanization: 'kaki', confidence: 'medium' },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'maternal', gender: 'male' },
    term: { label: 'મામા', englishLabel: "Mother's Brother", romanization: 'mama', confidence: 'high', description: "Maternal uncle (mother's brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female' },
    term: { label: 'માસી', englishLabel: "Mother's Sister", romanization: 'masi', confidence: 'high', description: "Maternal aunt (mother's sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal' },
    term: { label: 'મામી', englishLabel: "Mother's Brother's Wife", romanization: 'mami', confidence: 'medium', description: "Wife of mama" },
  },

  // ==============================
  // Paternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'કાકાનો દીકરો', englishLabel: 'Paternal Cousin (Male)', romanization: 'kakano dikro', confidence: 'high', description: "Son of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'કાકાની દીકરી', englishLabel: 'Paternal Cousin (Female)', romanization: 'kakani dikri', confidence: 'high', description: "Daughter of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'ફોઈનો દીકરો', englishLabel: "Father's Sister's Son", romanization: 'foino dikro', confidence: 'medium', description: "Son of father's sister (foi)" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'ફોઈની દીકરી', englishLabel: "Father's Sister's Daughter", romanization: 'foini dikri', confidence: 'medium', description: "Daughter of father's sister (foi)" },
  },

  // ==============================
  // Maternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'male' },
    term: { label: 'મામાનો દીકરો', englishLabel: 'Maternal Cousin (Male)', romanization: 'mamano dikro', confidence: 'high', description: "Son of mother's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'female' },
    term: { label: 'મામાની દીકરી', englishLabel: 'Maternal Cousin (Female)', romanization: 'mamani dikri', confidence: 'high', description: "Daughter of mother's brother" },
  },

  // ==============================
  // Grandparents
  // ==============================
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'male' },
    term: { label: 'દાદા', englishLabel: 'Paternal Grandfather', romanization: 'dada', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'female' },
    term: { label: 'દાદી', englishLabel: 'Paternal Grandmother', romanization: 'dadi', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'male' },
    term: { label: 'નાના', englishLabel: 'Maternal Grandfather', romanization: 'nana', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'female' },
    term: { label: 'નાની', englishLabel: 'Maternal Grandmother', romanization: 'nani', confidence: 'high' },
  },

  // ==============================
  // Grandchildren
  // ==============================
  {
    match: { relationship: 'grandchild', gender: 'male' },
    term: { label: 'પૌત્ર', englishLabel: 'Grandson', romanization: 'poutra', confidence: 'high' },
  },
  {
    match: { relationship: 'grandchild', gender: 'female' },
    term: { label: 'પૌત્રી', englishLabel: 'Granddaughter', romanization: 'poutri', confidence: 'high' },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================
  {
    match: { relationship: 'nephew', gender: 'male' },
    term: { label: 'ભત્રીજો', englishLabel: "Brother's Son", romanization: 'bhatrijo', confidence: 'high' },
  },
  {
    match: { relationship: 'niece', gender: 'female' },
    term: { label: 'ભત્રીજી', englishLabel: "Brother's Daughter", romanization: 'bhatriji', confidence: 'high' },
  },

  // ==============================
  // Spouse
  // ==============================
  {
    match: { relationship: 'spouse', gender: 'male' },
    term: { label: 'પતિ', englishLabel: 'Husband', romanization: 'pati', confidence: 'high' },
  },
  {
    match: { relationship: 'spouse', gender: 'female' },
    term: { label: 'પત્ની', englishLabel: 'Wife', romanization: 'patni', confidence: 'high' },
  },

  // ==============================
  // Second Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'male' },
    term: { label: 'દૂરના ભાઈ', englishLabel: 'Second Cousin (Male)', romanization: 'doorna bhai', confidence: 'low', description: 'Distant cousin (male)' },
  },
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'female' },
    term: { label: 'દૂરની બેન', englishLabel: 'Second Cousin (Female)', romanization: 'doorni ben', confidence: 'low', description: 'Distant cousin (female)' },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================
  {
    match: { relationship: 'step-parent', gender: 'male' },
    term: { label: 'ઓરમાન બાપ', englishLabel: 'Step-Father', romanization: 'ormaan baap', confidence: 'high' },
  },
  {
    match: { relationship: 'step-parent', gender: 'female' },
    term: { label: 'ઓરમાન મા', englishLabel: 'Step-Mother', romanization: 'ormaan maa', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'male' },
    term: { label: 'ઓરમાન દીકરો', englishLabel: 'Step-Son', romanization: 'ormaan dikro', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'female' },
    term: { label: 'ઓરમાન દીકરી', englishLabel: 'Step-Daughter', romanization: 'ormaan dikri', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'male' },
    term: { label: 'દત્તક પિતા', englishLabel: 'Adoptive Father', romanization: 'dattak pita', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'female' },
    term: { label: 'દત્તક માતા', englishLabel: 'Adoptive Mother', romanization: 'dattak mata', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'male' },
    term: { label: 'દત્તક દીકરો', englishLabel: 'Adopted Son', romanization: 'dattak dikro', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'female' },
    term: { label: 'દત્તક દીકરી', englishLabel: 'Adopted Daughter', romanization: 'dattak dikri', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'male' },
    term: { label: 'પાલક પિતા', englishLabel: 'Foster Father', romanization: 'palak pita', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'female' },
    term: { label: 'પાલક માતા', englishLabel: 'Foster Mother', romanization: 'palak mata', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'male' },
    term: { label: 'વાલી', englishLabel: 'Guardian (Male)', romanization: 'vali', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'female' },
    term: { label: 'વાલી', englishLabel: 'Guardian (Female)', romanization: 'vali', confidence: 'high', description: 'Gujarati uses the same term for both genders' },
  },

  // ==============================
  // Gender-Neutral Terms
  // ==============================
  {
    match: { relationship: 'parent', gender: 'other' },
    term: { label: 'Parent', englishLabel: 'Parent', confidence: 'medium', description: 'Gender-neutral parent term' },
  },
  {
    match: { relationship: 'child', gender: 'other' },
    term: { label: 'Child', englishLabel: 'Child', confidence: 'medium', description: 'Gender-neutral child term' },
  },
  {
    match: { relationship: 'sibling', gender: 'other' },
    term: { label: 'Sibling', englishLabel: 'Sibling', confidence: 'medium', description: 'Gender-neutral sibling term' },
  },
  {
    match: { relationship: 'grandparent', gender: 'other' },
    term: { label: 'Grandparent', englishLabel: 'Grandparent', confidence: 'medium', description: 'Gender-neutral grandparent term' },
  },
  {
    match: { relationship: 'grandchild', gender: 'other' },
    term: { label: 'Grandchild', englishLabel: 'Grandchild', confidence: 'medium', description: 'Gender-neutral grandchild term' },
  },
  {
    match: { relationship: 'spouse', gender: 'other' },
    term: { label: 'Spouse', englishLabel: 'Spouse', confidence: 'medium', description: 'Gender-neutral spouse term' },
  },
  {
    match: { relationship: 'step-parent', gender: 'other' },
    term: { label: 'Step-Parent', englishLabel: 'Step-Parent', confidence: 'medium', description: 'Gender-neutral step-parent term' },
  },
  {
    match: { relationship: 'step-child', gender: 'other' },
    term: { label: 'Step-Child', englishLabel: 'Step-Child', confidence: 'medium', description: 'Gender-neutral step-child term' },
  },
  {
    match: { relationship: 'guardian', gender: 'other' },
    term: { label: 'Guardian', englishLabel: 'Guardian', confidence: 'medium', description: 'Gender-neutral guardian term' },
  },
];

const groupLabels = {
  childrenGroupLabels: {
    'self':                   { localized: 'સંતાનો',                      english: 'Children' },
    'parent':                 { localized: 'ભાઈ-બેન',                     english: 'Siblings' },
    'grandparent.paternal':   { localized: 'પપ્પા & કાકા/ફોઈ',            english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'મમ્મી & મામા/માસી',            english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'માતા-પિતાની પેઢી',             english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'કાકાના દીકરા-દીકરી',           english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'ફોઈના દીકરા-દીકરી',            english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'મામાના દીકરા-દીકરી',           english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'માસીના દીકરા-દીકરી',           english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'સગાંના સંતાનો',                english: 'Cousins' },
    'aunt':                   { localized: 'સગાંના સંતાનો',                english: 'Cousins' },
    'sibling':                { localized: 'ભત્રીજા-ભત્રીજી',             english: 'Nephews & Nieces' },
    'child':                  { localized: 'પૌત્ર-પૌત્રી',                english: 'Grandchildren' },
    'grandchild':             { localized: 'પ્રપૌત્ર-પ્રપૌત્રી',           english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'કાકાના દીકરાના સંતાનો',        english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'મામાના દીકરાના સંતાનો',        english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'ભાઈના સંતાનો',                 english: "Cousin's Children" },
    'nephew':                 { localized: 'ભત્રીજાના સંતાનો',             english: "Nephew's Children" },
    'niece':                  { localized: 'ભત્રીજીના સંતાનો',             english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                              english: '' },
    'parent':                 { localized: 'માતા-પિતા',                    english: 'Parents' },
    'grandparent.paternal':   { localized: 'દાદા-દાદી',                    english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'નાના-નાની',                    english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'દાદા/નાના',                    english: 'Grandparents' },
    'uncle.paternal':         { localized: 'કાકા & કાકી',                  english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'ફોઈ & ફુઆ',                    english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'મામા & મામી',                  english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'માસી & માસા',                  english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'ભાઈ/બેન & જીવનસાથી',           english: 'Sibling & Spouse' },
    'child':                  { localized: 'દીકરો/દીકરી & જીવનસાથી',       english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'કાકાનો દીકરો & જીવનસાથી',      english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'મામાનો દીકરો & જીવનસાથી',      english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'ભાઈ & જીવનસાથી',               english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'ભત્રીજો & પત્ની',              english: 'Nephew & Spouse' },
    'niece':                  { localized: 'ભત્રીજી & પતિ',               english: 'Niece & Spouse' },
    'grandchild':             { localized: 'પૌત્ર/પૌત્રી & જીવનસાથી',     english: 'Grandchild & Spouse' },
  },
};

export const guIN: LocaleConfig = {
  code: 'gu-IN',
  name: 'Gujarati',
  nativeName: 'ગુજરાતી',
  patterns: GUJARATI_KINSHIP_TERMS,
  groupLabels,
};
