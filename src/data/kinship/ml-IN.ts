/**
 * Malayalam (മലയാളം) Kinship Terms - ml-IN
 *
 * Malayalam kinship terminology has distinct terms for paternal vs maternal
 * relatives. Notable terms include chettan/chechi for elder brother/sister,
 * vallyachan for father's elder brother, and ammaavan for mother's brother.
 */
import type { KinshipPattern, LocaleConfig } from './types';

const MALAYALAM_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================
  {
    match: { relationship: 'parent', lineage: 'paternal', gender: 'male' },
    term: { label: 'അച്ഛൻ', englishLabel: 'Father', romanization: 'achan', confidence: 'high' },
  },
  {
    match: { relationship: 'parent', lineage: 'maternal', gender: 'female' },
    term: { label: 'അമ്മ', englishLabel: 'Mother', romanization: 'amma', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'male' },
    term: { label: 'മകൻ', englishLabel: 'Son', romanization: 'makan', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'female' },
    term: { label: 'മകൾ', englishLabel: 'Daughter', romanization: 'makal', confidence: 'high' },
  },

  // ==============================
  // Siblings
  // ==============================
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'elder' },
    term: { label: 'ചേട്ടൻ', englishLabel: 'Elder Brother', romanization: 'chettan', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'younger' },
    term: { label: 'അനിയൻ', englishLabel: 'Younger Brother', romanization: 'aniyan', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'elder' },
    term: { label: 'ചേച്ചി', englishLabel: 'Elder Sister', romanization: 'chechi', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'younger' },
    term: { label: 'അനിയത്തി', englishLabel: 'Younger Sister', romanization: 'aniyathi', confidence: 'high' },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'വല്യച്ഛൻ', englishLabel: "Father's Elder Brother", romanization: 'vallyachan', confidence: 'high', description: "Paternal uncle (father's elder brother)" },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'ചെറിയച്ഛൻ', englishLabel: "Father's Younger Brother", romanization: 'cheriyachan', confidence: 'high', description: "Paternal uncle (father's younger brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'paternal' },
    term: { label: 'അമ്മായി', englishLabel: "Father's Sister", romanization: 'ammaayi', confidence: 'high', description: "Paternal aunt (father's sister)" },
  },
  // Spouses of paternal uncles
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'വല്യമ്മ', englishLabel: "Father's Elder Brother's Wife", romanization: 'vallyamma', confidence: 'medium' },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'ചെറിയമ്മ', englishLabel: "Father's Younger Brother's Wife", romanization: 'cheriyamma', confidence: 'medium' },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'maternal', gender: 'male' },
    term: { label: 'അമ്മാവൻ', englishLabel: "Mother's Brother", romanization: 'ammaavan', confidence: 'high', description: "Maternal uncle (mother's brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female', elderStatus: 'elder' },
    term: { label: 'വല്യമ്മ', englishLabel: "Mother's Elder Sister", romanization: 'vallyamma', confidence: 'high', description: "Maternal aunt (mother's elder sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female', elderStatus: 'younger' },
    term: { label: 'ചെറിയമ്മ', englishLabel: "Mother's Younger Sister", romanization: 'cheriyamma', confidence: 'high', description: "Maternal aunt (mother's younger sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal' },
    term: { label: 'അമ്മായി', englishLabel: "Mother's Brother's Wife", romanization: 'ammaayi', confidence: 'medium', description: "Wife of ammaavan" },
  },

  // ==============================
  // Paternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'ഇളയച്ഛൻ/വല്യച്ഛൻ മകൻ', englishLabel: 'Paternal Cousin (Male)', romanization: 'ilayachan/vallyachan makan', confidence: 'high', description: "Son of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'ഇളയച്ഛൻ/വല്യച്ഛൻ മകൾ', englishLabel: 'Paternal Cousin (Female)', romanization: 'ilayachan/vallyachan makal', confidence: 'high', description: "Daughter of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'അമ്മായി മകൻ', englishLabel: "Father's Sister's Son", romanization: 'ammaayi makan', confidence: 'medium', description: "Cross-cousin (father's sister's son)" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'അമ്മായി മകൾ', englishLabel: "Father's Sister's Daughter", romanization: 'ammaayi makal', confidence: 'medium', description: "Cross-cousin (father's sister's daughter)" },
  },

  // ==============================
  // Maternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'male' },
    term: { label: 'അമ്മാവൻ മകൻ', englishLabel: 'Maternal Cousin (Male)', romanization: 'ammaavan makan', confidence: 'high', description: "Son of mother's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'female' },
    term: { label: 'അമ്മാവൻ മകൾ', englishLabel: 'Maternal Cousin (Female)', romanization: 'ammaavan makal', confidence: 'high', description: "Daughter of mother's brother" },
  },

  // ==============================
  // Grandparents
  // ==============================
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'male' },
    term: { label: 'അപ്പൂപ്പൻ', englishLabel: 'Paternal Grandfather', romanization: 'appooppan', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'female' },
    term: { label: 'അമ്മൂമ്മ', englishLabel: 'Paternal Grandmother', romanization: 'ammooma', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'male' },
    term: { label: 'മുത്തച്ഛൻ', englishLabel: 'Maternal Grandfather', romanization: 'muthachan', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'female' },
    term: { label: 'മുത്തശ്ശി', englishLabel: 'Maternal Grandmother', romanization: 'muthashi', confidence: 'high' },
  },

  // ==============================
  // Grandchildren
  // ==============================
  {
    match: { relationship: 'grandchild', gender: 'male' },
    term: { label: 'പേരക്കുട്ടി', englishLabel: 'Grandson', romanization: 'perakkutty', confidence: 'high' },
  },
  {
    match: { relationship: 'grandchild', gender: 'female' },
    term: { label: 'പേരക്കുട്ടി', englishLabel: 'Granddaughter', romanization: 'perakkutty', confidence: 'high', description: 'Malayalam uses the same term for both genders' },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================
  {
    match: { relationship: 'nephew', gender: 'male' },
    term: { label: 'അനന്തരവൻ', englishLabel: "Brother's/Sister's Son", romanization: 'anantharavan', confidence: 'high' },
  },
  {
    match: { relationship: 'niece', gender: 'female' },
    term: { label: 'അനന്തരവൾ', englishLabel: "Brother's/Sister's Daughter", romanization: 'anantharaval', confidence: 'high' },
  },

  // ==============================
  // Spouse
  // ==============================
  {
    match: { relationship: 'spouse', gender: 'male' },
    term: { label: 'ഭർത്താവ്', englishLabel: 'Husband', romanization: 'bharthaav', confidence: 'high' },
  },
  {
    match: { relationship: 'spouse', gender: 'female' },
    term: { label: 'ഭാര്യ', englishLabel: 'Wife', romanization: 'bhaarya', confidence: 'high' },
  },

  // ==============================
  // Second Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'male' },
    term: { label: 'ദൂരബന്ധു', englishLabel: 'Second Cousin (Male)', romanization: 'doorabandhu', confidence: 'low', description: 'Distant cousin (male)' },
  },
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'female' },
    term: { label: 'ദൂരബന്ധു', englishLabel: 'Second Cousin (Female)', romanization: 'doorabandhu', confidence: 'low', description: 'Distant cousin (female)' },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================
  {
    match: { relationship: 'step-parent', gender: 'male' },
    term: { label: 'വളർത്തച്ഛൻ', englishLabel: 'Step-Father', romanization: 'valarthachan', confidence: 'high' },
  },
  {
    match: { relationship: 'step-parent', gender: 'female' },
    term: { label: 'വളർത്തമ്മ', englishLabel: 'Step-Mother', romanization: 'valarthamma', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'male' },
    term: { label: 'വളർത്തു മകൻ', englishLabel: 'Step-Son', romanization: 'valarthu makan', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'female' },
    term: { label: 'വളർത്തു മകൾ', englishLabel: 'Step-Daughter', romanization: 'valarthu makal', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'male' },
    term: { label: 'ദത്തച്ഛൻ', englishLabel: 'Adoptive Father', romanization: 'dathachan', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'female' },
    term: { label: 'ദത്തമ്മ', englishLabel: 'Adoptive Mother', romanization: 'dathamma', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'male' },
    term: { label: 'ദത്തുപുത്രൻ', englishLabel: 'Adopted Son', romanization: 'dathuputhran', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'female' },
    term: { label: 'ദത്തുപുത്രി', englishLabel: 'Adopted Daughter', romanization: 'dathuputhri', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'male' },
    term: { label: 'പോറ്റച്ഛൻ', englishLabel: 'Foster Father', romanization: 'pottachan', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'female' },
    term: { label: 'പോറ്റമ്മ', englishLabel: 'Foster Mother', romanization: 'pottamma', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'male' },
    term: { label: 'രക്ഷാകർത്താവ്', englishLabel: 'Guardian (Male)', romanization: 'rakshaakarthaav', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'female' },
    term: { label: 'രക്ഷാകർത്രി', englishLabel: 'Guardian (Female)', romanization: 'rakshaakarthri', confidence: 'high' },
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
    'self':                   { localized: 'മക്കൾ',                            english: 'Children' },
    'parent':                 { localized: 'സഹോദരങ്ങൾ',                       english: 'Siblings' },
    'grandparent.paternal':   { localized: 'അച്ഛൻ & വല്യച്ഛൻ/ചെറിയച്ഛൻ/അമ്മായി', english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'അമ്മ & അമ്മാവൻ/വല്യമ്മ/ചെറിയമ്മ',  english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'മാതാപിതാക്കളുടെ തലമുറ',            english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'വല്യച്ഛൻ/ചെറിയച്ഛൻ മക്കൾ',        english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'അമ്മായി മക്കൾ',                    english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'അമ്മാവൻ മക്കൾ',                    english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'വല്യമ്മ/ചെറിയമ്മ മക്കൾ',           english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'ബന്ധുക്കളുടെ മക്കൾ',               english: 'Cousins' },
    'aunt':                   { localized: 'ബന്ധുക്കളുടെ മക്കൾ',               english: 'Cousins' },
    'sibling':                { localized: 'അനന്തരവർ',                         english: 'Nephews & Nieces' },
    'child':                  { localized: 'പേരക്കുട്ടികൾ',                    english: 'Grandchildren' },
    'grandchild':             { localized: 'കൊച്ചുമക്കൾ',                      english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'ചെറിയച്ഛൻ മകന്റെ മക്കൾ',          english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'അമ്മാവൻ മകന്റെ മക്കൾ',             english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'ബന്ധു മക്കൾ',                      english: "Cousin's Children" },
    'nephew':                 { localized: 'അനന്തരവന്റെ മക്കൾ',                english: "Nephew's Children" },
    'niece':                  { localized: 'അനന്തരവളുടെ മക്കൾ',                english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                                  english: '' },
    'parent':                 { localized: 'മാതാപിതാക്കൾ',                     english: 'Parents' },
    'grandparent.paternal':   { localized: 'അപ്പൂപ്പൻ-അമ്മൂമ്മ',               english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'മുത്തച്ഛൻ-മുത്തശ്ശി',              english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'അപ്പൂപ്പൻ/മുത്തച്ഛൻ',              english: 'Grandparents' },
    'uncle.paternal':         { localized: 'വല്യച്ഛൻ/ചെറിയച്ഛൻ & ഭാര്യ',      english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'അമ്മായി & ഭർത്താവ്',               english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'അമ്മാവൻ & അമ്മായി',                english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'വല്യമ്മ/ചെറിയമ്മ & ഭർത്താവ്',      english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'ചേട്ടൻ/അനിയൻ/ചേച്ചി/അനിയത്തി & ഇണ', english: 'Sibling & Spouse' },
    'child':                  { localized: 'മകൻ/മകൾ & ഇണ',                     english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'ചെറിയച്ഛൻ മകൻ & ഇണ',               english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'അമ്മാവൻ മകൻ & ഇണ',                 english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'ബന്ധു & ഇണ',                        english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'അനന്തരവൻ & ഭാര്യ',                 english: 'Nephew & Spouse' },
    'niece':                  { localized: 'അനന്തരവൾ & ഭർത്താവ്',              english: 'Niece & Spouse' },
    'grandchild':             { localized: 'പേരക്കുട്ടി & ഇണ',                 english: 'Grandchild & Spouse' },
  },
};

export const mlIN: LocaleConfig = {
  code: 'ml-IN',
  name: 'Malayalam',
  nativeName: 'മലയാളം',
  patterns: MALAYALAM_KINSHIP_TERMS,
  groupLabels,
};
