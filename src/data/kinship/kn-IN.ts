/**
 * Kannada (ಕನ್ನಡ) Kinship Terms - kn-IN
 *
 * Kannada kinship terminology distinguishes paternal vs maternal relatives,
 * elder vs younger siblings, and has specific terms like doddappa/chikkappa
 * for father's elder/younger brothers.
 */
import type { KinshipPattern, LocaleConfig } from './types';

const KANNADA_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================
  {
    match: { relationship: 'parent', lineage: 'paternal', gender: 'male' },
    term: { label: 'ಅಪ್ಪ', englishLabel: 'Father', romanization: 'appa', confidence: 'high' },
  },
  {
    match: { relationship: 'parent', lineage: 'maternal', gender: 'female' },
    term: { label: 'ಅಮ್ಮ', englishLabel: 'Mother', romanization: 'amma', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'male' },
    term: { label: 'ಮಗ', englishLabel: 'Son', romanization: 'maga', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'female' },
    term: { label: 'ಮಗಳು', englishLabel: 'Daughter', romanization: 'magalu', confidence: 'high' },
  },

  // ==============================
  // Siblings
  // ==============================
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'elder' },
    term: { label: 'ಅಣ್ಣ', englishLabel: 'Elder Brother', romanization: 'anna', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'younger' },
    term: { label: 'ತಮ್ಮ', englishLabel: 'Younger Brother', romanization: 'thamma', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'elder' },
    term: { label: 'ಅಕ್ಕ', englishLabel: 'Elder Sister', romanization: 'akka', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'younger' },
    term: { label: 'ತಂಗಿ', englishLabel: 'Younger Sister', romanization: 'thangi', confidence: 'high' },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'ದೊಡ್ಡಪ್ಪ', englishLabel: "Father's Elder Brother", romanization: 'doddappa', confidence: 'high', description: "Paternal uncle (father's elder brother)" },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'ಚಿಕ್ಕಪ್ಪ', englishLabel: "Father's Younger Brother", romanization: 'chikkappa', confidence: 'high', description: "Paternal uncle (father's younger brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'paternal' },
    term: { label: 'ಅತ್ತೆ', englishLabel: "Father's Sister", romanization: 'atthe', confidence: 'high', description: "Paternal aunt (father's sister)" },
  },
  // Spouses of paternal uncles
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'ದೊಡ್ಡಮ್ಮ', englishLabel: "Father's Elder Brother's Wife", romanization: 'doddamma', confidence: 'medium' },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'ಚಿಕ್ಕಮ್ಮ', englishLabel: "Father's Younger Brother's Wife", romanization: 'chikkamma', confidence: 'medium' },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'maternal', gender: 'male' },
    term: { label: 'ಮಾಮ', englishLabel: "Mother's Brother", romanization: 'mama', confidence: 'high', description: "Maternal uncle (mother's brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female', elderStatus: 'elder' },
    term: { label: 'ದೊಡ್ಡಮ್ಮ', englishLabel: "Mother's Elder Sister", romanization: 'doddamma', confidence: 'high', description: "Maternal aunt (mother's elder sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female', elderStatus: 'younger' },
    term: { label: 'ಚಿಕ್ಕಮ್ಮ', englishLabel: "Mother's Younger Sister", romanization: 'chikkamma', confidence: 'high', description: "Maternal aunt (mother's younger sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal' },
    term: { label: 'ಅತ್ತೆ', englishLabel: "Mother's Brother's Wife", romanization: 'atthe', confidence: 'medium', description: "Wife of mama" },
  },

  // ==============================
  // Paternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'ದೊಡ್ಡಪ್ಪ/ಚಿಕ್ಕಪ್ಪ ಮಗ', englishLabel: 'Paternal Cousin (Male)', romanization: 'doddappa/chikkappa maga', confidence: 'high', description: "Son of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'ದೊಡ್ಡಪ್ಪ/ಚಿಕ್ಕಪ್ಪ ಮಗಳು', englishLabel: 'Paternal Cousin (Female)', romanization: 'doddappa/chikkappa magalu', confidence: 'high', description: "Daughter of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'ಅತ್ತೆ ಮಗ', englishLabel: "Father's Sister's Son", romanization: 'atthe maga', confidence: 'medium', description: "Cross-cousin (father's sister's son)" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'ಅತ್ತೆ ಮಗಳು', englishLabel: "Father's Sister's Daughter", romanization: 'atthe magalu', confidence: 'medium', description: "Cross-cousin (father's sister's daughter)" },
  },

  // ==============================
  // Maternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'male' },
    term: { label: 'ಮಾಮ ಮಗ', englishLabel: 'Maternal Cousin (Male)', romanization: 'mama maga', confidence: 'high', description: "Son of mother's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'female' },
    term: { label: 'ಮಾಮ ಮಗಳು', englishLabel: 'Maternal Cousin (Female)', romanization: 'mama magalu', confidence: 'high', description: "Daughter of mother's brother" },
  },

  // ==============================
  // Grandparents
  // ==============================
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'male' },
    term: { label: 'ತಾತ', englishLabel: 'Paternal Grandfather', romanization: 'thatha', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'female' },
    term: { label: 'ಅಜ್ಜಿ', englishLabel: 'Paternal Grandmother', romanization: 'ajji', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'male' },
    term: { label: 'ತಾತ', englishLabel: 'Maternal Grandfather', romanization: 'thatha', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'female' },
    term: { label: 'ಅಜ್ಜಿ', englishLabel: 'Maternal Grandmother', romanization: 'ajji', confidence: 'high' },
  },

  // ==============================
  // Grandchildren
  // ==============================
  {
    match: { relationship: 'grandchild', gender: 'male' },
    term: { label: 'ಮೊಮ್ಮಗ', englishLabel: 'Grandson', romanization: 'mommaga', confidence: 'high' },
  },
  {
    match: { relationship: 'grandchild', gender: 'female' },
    term: { label: 'ಮೊಮ್ಮಗಳು', englishLabel: 'Granddaughter', romanization: 'mommagalu', confidence: 'high' },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================
  {
    match: { relationship: 'nephew', gender: 'male' },
    term: { label: 'ಅಳಿಯ', englishLabel: "Brother's/Sister's Son", romanization: 'aliya', confidence: 'high' },
  },
  {
    match: { relationship: 'niece', gender: 'female' },
    term: { label: 'ಸೊಸೆ', englishLabel: "Brother's/Sister's Daughter", romanization: 'sose', confidence: 'high' },
  },

  // ==============================
  // Spouse
  // ==============================
  {
    match: { relationship: 'spouse', gender: 'male' },
    term: { label: 'ಗಂಡ', englishLabel: 'Husband', romanization: 'ganda', confidence: 'high' },
  },
  {
    match: { relationship: 'spouse', gender: 'female' },
    term: { label: 'ಹೆಂಡತಿ', englishLabel: 'Wife', romanization: 'hendathi', confidence: 'high' },
  },

  // ==============================
  // Second Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'male' },
    term: { label: 'ದೂರದ ಬಂಧು', englishLabel: 'Second Cousin (Male)', romanization: 'doorada bandhu', confidence: 'low', description: 'Distant cousin (male)' },
  },
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'female' },
    term: { label: 'ದೂರದ ಬಂಧು', englishLabel: 'Second Cousin (Female)', romanization: 'doorada bandhu', confidence: 'low', description: 'Distant cousin (female)' },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================
  {
    match: { relationship: 'step-parent', gender: 'male' },
    term: { label: 'ಮಲತಂದೆ', englishLabel: 'Step-Father', romanization: 'malathande', confidence: 'high' },
  },
  {
    match: { relationship: 'step-parent', gender: 'female' },
    term: { label: 'ಮಲತಾಯಿ', englishLabel: 'Step-Mother', romanization: 'malathayi', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'male' },
    term: { label: 'ಮಲಮಗ', englishLabel: 'Step-Son', romanization: 'malamaga', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'female' },
    term: { label: 'ಮಲಮಗಳು', englishLabel: 'Step-Daughter', romanization: 'malamagalu', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'male' },
    term: { label: 'ದತ್ತು ತಂದೆ', englishLabel: 'Adoptive Father', romanization: 'datthu thande', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'female' },
    term: { label: 'ದತ್ತು ತಾಯಿ', englishLabel: 'Adoptive Mother', romanization: 'datthu thayi', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'male' },
    term: { label: 'ದತ್ತು ಮಗ', englishLabel: 'Adopted Son', romanization: 'datthu maga', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'female' },
    term: { label: 'ದತ್ತು ಮಗಳು', englishLabel: 'Adopted Daughter', romanization: 'datthu magalu', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'male' },
    term: { label: 'ಸಾಕು ತಂದೆ', englishLabel: 'Foster Father', romanization: 'saaku thande', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'female' },
    term: { label: 'ಸಾಕು ತಾಯಿ', englishLabel: 'Foster Mother', romanization: 'saaku thayi', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'male' },
    term: { label: 'ಪೋಷಕ', englishLabel: 'Guardian (Male)', romanization: 'poshaka', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'female' },
    term: { label: 'ಪೋಷಕಿ', englishLabel: 'Guardian (Female)', romanization: 'poshaki', confidence: 'high' },
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
    'self':                   { localized: 'ಮಕ್ಕಳು',                          english: 'Children' },
    'parent':                 { localized: 'ಸಹೋದರ-ಸಹೋದರಿಯರು',                english: 'Siblings' },
    'grandparent.paternal':   { localized: 'ಅಪ್ಪ & ದೊಡ್ಡಪ್ಪ/ಚಿಕ್ಕಪ್ಪ/ಅತ್ತೆ',  english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'ಅಮ್ಮ & ಮಾಮ/ದೊಡ್ಡಮ್ಮ/ಚಿಕ್ಕಮ್ಮ',    english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'ಹೆತ್ತವರ ತಲೆಮಾರು',                 english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'ದೊಡ್ಡಪ್ಪ/ಚಿಕ್ಕಪ್ಪ ಮಕ್ಕಳು',        english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'ಅತ್ತೆ ಮಕ್ಕಳು',                    english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'ಮಾಮ ಮಕ್ಕಳು',                      english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'ದೊಡ್ಡಮ್ಮ/ಚಿಕ್ಕಮ್ಮ ಮಕ್ಕಳು',        english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'ಬಂಧುಗಳ ಮಕ್ಕಳು',                   english: 'Cousins' },
    'aunt':                   { localized: 'ಬಂಧುಗಳ ಮಕ್ಕಳು',                   english: 'Cousins' },
    'sibling':                { localized: 'ಅಳಿಯ/ಸೊಸೆ',                       english: 'Nephews & Nieces' },
    'child':                  { localized: 'ಮೊಮ್ಮಕ್ಕಳು',                      english: 'Grandchildren' },
    'grandchild':             { localized: 'ಮರಿಮೊಮ್ಮಕ್ಕಳು',                   english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'ಚಿಕ್ಕಪ್ಪ ಮಗನ ಮಕ್ಕಳು',             english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'ಮಾಮ ಮಗನ ಮಕ್ಕಳು',                  english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'ಬಂಧು ಮಕ್ಕಳು',                     english: "Cousin's Children" },
    'nephew':                 { localized: 'ಅಳಿಯನ ಮಕ್ಕಳು',                    english: "Nephew's Children" },
    'niece':                  { localized: 'ಸೊಸೆಯ ಮಕ್ಕಳು',                    english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                                 english: '' },
    'parent':                 { localized: 'ಹೆತ್ತವರು',                         english: 'Parents' },
    'grandparent.paternal':   { localized: 'ತಾತ-ಅಜ್ಜಿ (ಅಪ್ಪ ಕಡೆ)',            english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'ತಾತ-ಅಜ್ಜಿ (ಅಮ್ಮ ಕಡೆ)',            english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'ತಾತ-ಅಜ್ಜಿ',                       english: 'Grandparents' },
    'uncle.paternal':         { localized: 'ದೊಡ್ಡಪ್ಪ/ಚಿಕ್ಕಪ್ಪ & ಹೆಂಡತಿ',      english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'ಅತ್ತೆ & ಗಂಡ',                     english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'ಮಾಮ & ಅತ್ತೆ',                     english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'ದೊಡ್ಡಮ್ಮ/ಚಿಕ್ಕಮ್ಮ & ಗಂಡ',          english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'ಅಣ್ಣ/ತಮ್ಮ/ಅಕ್ಕ/ತಂಗಿ & ಸಂಗಾತಿ',    english: 'Sibling & Spouse' },
    'child':                  { localized: 'ಮಗ/ಮಗಳು & ಸಂಗಾತಿ',                english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'ಚಿಕ್ಕಪ್ಪ ಮಗ & ಸಂಗಾತಿ',            english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'ಮಾಮ ಮಗ & ಸಂಗಾತಿ',                 english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'ಬಂಧು & ಸಂಗಾತಿ',                   english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'ಅಳಿಯ & ಹೆಂಡತಿ',                   english: 'Nephew & Spouse' },
    'niece':                  { localized: 'ಸೊಸೆ & ಗಂಡ',                      english: 'Niece & Spouse' },
    'grandchild':             { localized: 'ಮೊಮ್ಮಗ/ಮೊಮ್ಮಗಳು & ಸಂಗಾತಿ',        english: 'Grandchild & Spouse' },
  },
};

export const knIN: LocaleConfig = {
  code: 'kn-IN',
  name: 'Kannada',
  nativeName: 'ಕನ್ನಡ',
  patterns: KANNADA_KINSHIP_TERMS,
  groupLabels,
};
