/**
 * Marathi (मराठी) Kinship Terms - mr-IN
 *
 * Marathi kinship terminology distinguishes paternal vs maternal relatives
 * with specific terms like kaka (father's brother), atya (father's sister),
 * mama (mother's brother), and mavshi (mother's sister).
 */
import type { KinshipPattern, LocaleConfig } from './types';

const MARATHI_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================
  {
    match: { relationship: 'parent', lineage: 'paternal', gender: 'male' },
    term: { label: 'वडील', englishLabel: 'Father', romanization: 'vadil', confidence: 'high' },
  },
  {
    match: { relationship: 'parent', lineage: 'maternal', gender: 'female' },
    term: { label: 'आई', englishLabel: 'Mother', romanization: 'aai', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'male' },
    term: { label: 'मुलगा', englishLabel: 'Son', romanization: 'mulga', confidence: 'high' },
  },
  {
    match: { relationship: 'child', gender: 'female' },
    term: { label: 'मुलगी', englishLabel: 'Daughter', romanization: 'mulgi', confidence: 'high' },
  },

  // ==============================
  // Siblings
  // ==============================
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'elder' },
    term: { label: 'दादा', englishLabel: 'Elder Brother', romanization: 'dada', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'male', elderStatus: 'younger' },
    term: { label: 'भाऊ', englishLabel: 'Younger Brother', romanization: 'bhau', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'elder' },
    term: { label: 'ताई', englishLabel: 'Elder Sister', romanization: 'tai', confidence: 'high' },
  },
  {
    match: { relationship: 'sibling', gender: 'female', elderStatus: 'younger' },
    term: { label: 'बहीण', englishLabel: 'Younger Sister', romanization: 'bahin', confidence: 'high' },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'मोठे काका', englishLabel: "Father's Elder Brother", romanization: 'mothe kaka', confidence: 'high', description: "Paternal uncle (father's elder brother)" },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'काका', englishLabel: "Father's Younger Brother", romanization: 'kaka', confidence: 'high', description: "Paternal uncle (father's younger brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'paternal' },
    term: { label: 'आत्या', englishLabel: "Father's Sister", romanization: 'atya', confidence: 'high', description: "Paternal aunt (father's sister)" },
  },
  // Spouses of paternal uncles/aunts
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'elder' },
    term: { label: 'मोठी काकू', englishLabel: "Father's Elder Brother's Wife", romanization: 'mothi kaku', confidence: 'medium' },
  },
  {
    match: { relationship: 'uncle', lineage: 'paternal', elderStatus: 'younger' },
    term: { label: 'काकू', englishLabel: "Father's Younger Brother's Wife", romanization: 'kaku', confidence: 'medium' },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================
  {
    match: { relationship: 'uncle', lineage: 'maternal', gender: 'male' },
    term: { label: 'मामा', englishLabel: "Mother's Brother", romanization: 'mama', confidence: 'high', description: "Maternal uncle (mother's brother)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal', gender: 'female' },
    term: { label: 'मावशी', englishLabel: "Mother's Sister", romanization: 'mavshi', confidence: 'high', description: "Maternal aunt (mother's sister)" },
  },
  {
    match: { relationship: 'aunt', lineage: 'maternal' },
    term: { label: 'मामी', englishLabel: "Mother's Brother's Wife", romanization: 'mami', confidence: 'medium', description: "Wife of mama" },
  },

  // ==============================
  // Paternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'चुलत भाऊ', englishLabel: 'Paternal Cousin (Male)', romanization: 'chulat bhau', confidence: 'high', description: "Son of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'चुलत बहीण', englishLabel: 'Paternal Cousin (Female)', romanization: 'chulat bahin', confidence: 'high', description: "Daughter of father's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'male' },
    term: { label: 'आत्येचा मुलगा', englishLabel: "Father's Sister's Son", romanization: 'atyecha mulga', confidence: 'medium', description: "Son of father's sister (atya)" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'paternal', gender: 'female' },
    term: { label: 'आत्येची मुलगी', englishLabel: "Father's Sister's Daughter", romanization: 'atyechi mulgi', confidence: 'medium', description: "Daughter of father's sister (atya)" },
  },

  // ==============================
  // Maternal Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'male' },
    term: { label: 'मामेभाऊ', englishLabel: 'Maternal Cousin (Male)', romanization: 'mamebhau', confidence: 'high', description: "Son of mother's brother" },
  },
  {
    match: { relationship: 'cousin', degree: 1, removed: 0, lineage: 'maternal', gender: 'female' },
    term: { label: 'मामेबहीण', englishLabel: 'Maternal Cousin (Female)', romanization: 'mamebahin', confidence: 'high', description: "Daughter of mother's brother" },
  },

  // ==============================
  // Grandparents
  // ==============================
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'male' },
    term: { label: 'आजोबा', englishLabel: 'Paternal Grandfather', romanization: 'ajoba', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'paternal', gender: 'female' },
    term: { label: 'आजी', englishLabel: 'Paternal Grandmother', romanization: 'aji', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'male' },
    term: { label: 'आजोबा', englishLabel: 'Maternal Grandfather', romanization: 'ajoba', confidence: 'high' },
  },
  {
    match: { relationship: 'grandparent', lineage: 'maternal', gender: 'female' },
    term: { label: 'आजी', englishLabel: 'Maternal Grandmother', romanization: 'aji', confidence: 'high' },
  },

  // ==============================
  // Grandchildren
  // ==============================
  {
    match: { relationship: 'grandchild', gender: 'male' },
    term: { label: 'नातू', englishLabel: 'Grandson', romanization: 'natu', confidence: 'high' },
  },
  {
    match: { relationship: 'grandchild', gender: 'female' },
    term: { label: 'नात', englishLabel: 'Granddaughter', romanization: 'nat', confidence: 'high' },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================
  {
    match: { relationship: 'nephew', gender: 'male' },
    term: { label: 'पुतण्या', englishLabel: "Brother's Son", romanization: 'putanya', confidence: 'high' },
  },
  {
    match: { relationship: 'niece', gender: 'female' },
    term: { label: 'पुतणी', englishLabel: "Brother's Daughter", romanization: 'putani', confidence: 'high' },
  },

  // ==============================
  // Spouse
  // ==============================
  {
    match: { relationship: 'spouse', gender: 'male' },
    term: { label: 'नवरा', englishLabel: 'Husband', romanization: 'navra', confidence: 'high' },
  },
  {
    match: { relationship: 'spouse', gender: 'female' },
    term: { label: 'बायको', englishLabel: 'Wife', romanization: 'bayko', confidence: 'high' },
  },

  // ==============================
  // Second Cousins
  // ==============================
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'male' },
    term: { label: 'लांबचे चुलत भाऊ', englishLabel: 'Second Cousin (Male)', romanization: 'lambche chulat bhau', confidence: 'low', description: 'Distant cousin (male)' },
  },
  {
    match: { relationship: 'cousin', degree: 2, removed: 0, gender: 'female' },
    term: { label: 'लांबची चुलत बहीण', englishLabel: 'Second Cousin (Female)', romanization: 'lambchi chulat bahin', confidence: 'low', description: 'Distant cousin (female)' },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================
  {
    match: { relationship: 'step-parent', gender: 'male' },
    term: { label: 'सावत्र वडील', englishLabel: 'Step-Father', romanization: 'savatra vadil', confidence: 'high' },
  },
  {
    match: { relationship: 'step-parent', gender: 'female' },
    term: { label: 'सावत्र आई', englishLabel: 'Step-Mother', romanization: 'savatra aai', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'male' },
    term: { label: 'सावत्र मुलगा', englishLabel: 'Step-Son', romanization: 'savatra mulga', confidence: 'high' },
  },
  {
    match: { relationship: 'step-child', gender: 'female' },
    term: { label: 'सावत्र मुलगी', englishLabel: 'Step-Daughter', romanization: 'savatra mulgi', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'male' },
    term: { label: 'दत्तक वडील', englishLabel: 'Adoptive Father', romanization: 'dattak vadil', confidence: 'high' },
  },
  {
    match: { relationship: 'adoptive-parent', gender: 'female' },
    term: { label: 'दत्तक आई', englishLabel: 'Adoptive Mother', romanization: 'dattak aai', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'male' },
    term: { label: 'दत्तक मुलगा', englishLabel: 'Adopted Son', romanization: 'dattak mulga', confidence: 'high' },
  },
  {
    match: { relationship: 'adopted-child', gender: 'female' },
    term: { label: 'दत्तक मुलगी', englishLabel: 'Adopted Daughter', romanization: 'dattak mulgi', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'male' },
    term: { label: 'पालक वडील', englishLabel: 'Foster Father', romanization: 'palak vadil', confidence: 'high' },
  },
  {
    match: { relationship: 'foster-parent', gender: 'female' },
    term: { label: 'पालक आई', englishLabel: 'Foster Mother', romanization: 'palak aai', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'male' },
    term: { label: 'पालक', englishLabel: 'Guardian (Male)', romanization: 'palak', confidence: 'high' },
  },
  {
    match: { relationship: 'guardian', gender: 'female' },
    term: { label: 'पालक', englishLabel: 'Guardian (Female)', romanization: 'palak', confidence: 'high', description: 'Marathi uses the same term for both genders' },
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
    'self':                   { localized: 'मुले',                         english: 'Children' },
    'parent':                 { localized: 'भावंडे',                       english: 'Siblings' },
    'grandparent.paternal':   { localized: 'वडील & काका/आत्या',            english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'आई & मामा/मावशी',             english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'आई-वडिलांची पिढी',             english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'चुलत भावंडे',                  english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'आत्येची मुले',                 english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'मामेभावंडे',                   english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'मावशीची मुले',                 english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'नातेवाईकांची मुले',             english: 'Cousins' },
    'aunt':                   { localized: 'नातेवाईकांची मुले',             english: 'Cousins' },
    'sibling':                { localized: 'पुतण्या/पुतणी',                english: 'Nephews & Nieces' },
    'child':                  { localized: 'नातवंडे',                      english: 'Grandchildren' },
    'grandchild':             { localized: 'पणतू/पणती',                    english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'चुलत भावाची मुले',              english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'मामेभावाची मुले',               english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'भावाची मुले',                   english: "Cousin's Children" },
    'nephew':                 { localized: 'पुतण्याची मुले',                english: "Nephew's Children" },
    'niece':                  { localized: 'पुतणीची मुले',                  english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                              english: '' },
    'parent':                 { localized: 'आई-वडील',                      english: 'Parents' },
    'grandparent.paternal':   { localized: 'आजोबा-आजी (वडिलांकडचे)',       english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'आजोबा-आजी (आईकडचे)',          english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'आजोबा-आजी',                   english: 'Grandparents' },
    'uncle.paternal':         { localized: 'काका & काकू',                  english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'आत्या & काका',                 english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'मामा & मामी',                  english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'मावशी & काका',                 english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'दादा/भाऊ/ताई/बहीण & जोडीदार',  english: 'Sibling & Spouse' },
    'child':                  { localized: 'मुलगा/मुलगी & जोडीदार',        english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'चुलत भाऊ & जोडीदार',           english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'मामेभाऊ & जोडीदार',            english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'भाऊ & जोडीदार',                english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'पुतण्या & बायको',              english: 'Nephew & Spouse' },
    'niece':                  { localized: 'पुतणी & नवरा',                 english: 'Niece & Spouse' },
    'grandchild':             { localized: 'नातू/नात & जोडीदार',           english: 'Grandchild & Spouse' },
  },
};

export const mrIN: LocaleConfig = {
  code: 'mr-IN',
  name: 'Marathi',
  nativeName: 'मराठी',
  patterns: MARATHI_KINSHIP_TERMS,
  groupLabels,
};
