/**
 * Tamil (தமிழ்) Kinship Terms - ta-IN
 *
 * Tamil kinship terminology is highly specific with distinct terms for
 * paternal vs maternal relatives, elder vs younger siblings, and
 * cross-cousin vs parallel-cousin distinctions.
 * Cross-cousin marriage (mama's children) is traditionally preferred.
 */
import type { KinshipPattern, LocaleConfig } from './types';

const TAMIL_KINSHIP_TERMS: KinshipPattern[] = [
  // ==============================
  // Direct Family (Nuclear)
  // ==============================

  {
    match: {
      relationship: 'parent',
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'அப்பா',
      englishLabel: 'Father',
      romanization: 'appa',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'parent',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'அம்மா',
      englishLabel: 'Mother',
      romanization: 'amma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'male',
    },
    term: {
      label: 'மகன்',
      englishLabel: 'Son',
      romanization: 'magan',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'female',
    },
    term: {
      label: 'மகள்',
      englishLabel: 'Daughter',
      romanization: 'magal',
      confidence: 'high',
    },
  },

  // ==============================
  // Siblings
  // ==============================

  {
    match: {
      relationship: 'sibling',
      gender: 'male',
      elderStatus: 'elder',
    },
    term: {
      label: 'அண்ணா',
      englishLabel: 'Elder Brother',
      romanization: 'anna',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'male',
      elderStatus: 'younger',
    },
    term: {
      label: 'தம்பி',
      englishLabel: 'Younger Brother',
      romanization: 'thambi',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'female',
      elderStatus: 'elder',
    },
    term: {
      label: 'அக்கா',
      englishLabel: 'Elder Sister',
      romanization: 'akka',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'female',
      elderStatus: 'younger',
    },
    term: {
      label: 'தங்கை',
      englishLabel: 'Younger Sister',
      romanization: 'thangai',
      confidence: 'high',
    },
  },

  // ==============================
  // Paternal Uncles & Aunts
  // ==============================

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'elder',
    },
    term: {
      label: 'பெரியப்பா',
      englishLabel: "Father's Elder Brother",
      romanization: 'periappa',
      confidence: 'high',
      description: "Paternal uncle (father's elder brother)",
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'younger',
    },
    term: {
      label: 'சித்தப்பா',
      englishLabel: "Father's Younger Brother",
      romanization: 'chithappa',
      confidence: 'high',
      description: "Paternal uncle (father's younger brother)",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'paternal',
    },
    term: {
      label: 'அத்தை',
      englishLabel: "Father's Sister",
      romanization: 'atthai',
      confidence: 'high',
      description: "Paternal aunt (father's sister)",
    },
  },

  // Spouses of paternal uncles/aunts
  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'elder',
    },
    term: {
      label: 'பெரியம்மா',
      englishLabel: "Father's Elder Brother's Wife",
      romanization: 'periyamma',
      confidence: 'medium',
      description: "Wife of periappa",
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'younger',
    },
    term: {
      label: 'சித்தி',
      englishLabel: "Father's Younger Brother's Wife",
      romanization: 'chithi',
      confidence: 'medium',
      description: "Wife of chithappa",
    },
  },

  // ==============================
  // Maternal Uncles & Aunts
  // ==============================

  {
    match: {
      relationship: 'uncle',
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'மாமா',
      englishLabel: "Mother's Brother",
      romanization: 'mama',
      confidence: 'high',
      description: "Maternal uncle (mother's brother) - special role in Tamil culture",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
      gender: 'female',
      elderStatus: 'elder',
    },
    term: {
      label: 'பெரியம்மா',
      englishLabel: "Mother's Elder Sister",
      romanization: 'periyamma',
      confidence: 'high',
      description: "Maternal aunt (mother's elder sister)",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
      gender: 'female',
      elderStatus: 'younger',
    },
    term: {
      label: 'சின்னம்மா',
      englishLabel: "Mother's Younger Sister",
      romanization: 'chinnamma',
      confidence: 'high',
      description: "Maternal aunt (mother's younger sister)",
    },
  },

  // Spouse of maternal uncle
  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
    },
    term: {
      label: 'மாமி',
      englishLabel: "Mother's Brother's Wife",
      romanization: 'mami',
      confidence: 'medium',
      description: "Wife of mama",
    },
  },

  // ==============================
  // Paternal Cousins (parallel cousins)
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'அண்ணா/தம்பி',
      englishLabel: 'Paternal Cousin (Male)',
      romanization: 'anna/thambi',
      confidence: 'high',
      description: "Son of father's brother - treated as sibling in Tamil culture",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'அக்கா/தங்கை',
      englishLabel: 'Paternal Cousin (Female)',
      romanization: 'akka/thangai',
      confidence: 'high',
      description: "Daughter of father's brother - treated as sibling in Tamil culture",
    },
  },

  // Father's sister's children (cross cousins - marriageable)
  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'அத்தை மகன்',
      englishLabel: "Father's Sister's Son",
      romanization: 'atthai magan',
      confidence: 'medium',
      description: "Cross-cousin (father's sister's son)",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'அத்தை மகள்',
      englishLabel: "Father's Sister's Daughter",
      romanization: 'atthai magal',
      confidence: 'medium',
      description: "Cross-cousin (father's sister's daughter)",
    },
  },

  // ==============================
  // Maternal Cousins (cross cousins - special in Tamil)
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'மாமா மகன்',
      englishLabel: 'Maternal Cousin (Male)',
      romanization: 'mama magan',
      confidence: 'high',
      description: "Son of mother's brother - cross-cousin, traditionally preferred marriage partner",
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'மாமா மகள்',
      englishLabel: 'Maternal Cousin (Female)',
      romanization: 'mama magal',
      confidence: 'high',
      description: "Daughter of mother's brother - cross-cousin",
    },
  },

  // ==============================
  // Grandparents
  // ==============================

  {
    match: {
      relationship: 'grandparent',
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'தாத்தா',
      englishLabel: 'Paternal Grandfather',
      romanization: 'thatha',
      confidence: 'high',
      description: "Father's father",
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'பாட்டி',
      englishLabel: 'Paternal Grandmother',
      romanization: 'paatti',
      confidence: 'high',
      description: "Father's mother",
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'தாத்தா',
      englishLabel: 'Maternal Grandfather',
      romanization: 'thatha',
      confidence: 'high',
      description: "Mother's father",
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'பாட்டி',
      englishLabel: 'Maternal Grandmother',
      romanization: 'paatti',
      confidence: 'high',
      description: "Mother's mother",
    },
  },

  // ==============================
  // Grandchildren
  // ==============================

  {
    match: {
      relationship: 'grandchild',
      gender: 'male',
    },
    term: {
      label: 'பேரன்',
      englishLabel: 'Grandson',
      romanization: 'peran',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'female',
    },
    term: {
      label: 'பேத்தி',
      englishLabel: 'Granddaughter',
      romanization: 'pethi',
      confidence: 'high',
    },
  },

  // ==============================
  // Nephews & Nieces
  // ==============================

  {
    match: {
      relationship: 'nephew',
      gender: 'male',
    },
    term: {
      label: 'அண்ணா/தம்பி மகன்',
      englishLabel: "Brother's Son",
      romanization: 'anna/thambi magan',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'niece',
      gender: 'female',
    },
    term: {
      label: 'அண்ணா/தம்பி மகள்',
      englishLabel: "Brother's Daughter",
      romanization: 'anna/thambi magal',
      confidence: 'high',
    },
  },

  // ==============================
  // Spouse
  // ==============================

  {
    match: {
      relationship: 'spouse',
      gender: 'male',
    },
    term: {
      label: 'கணவர்',
      englishLabel: 'Husband',
      romanization: 'kanavar',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'female',
    },
    term: {
      label: 'மனைவி',
      englishLabel: 'Wife',
      romanization: 'manaivi',
      confidence: 'high',
    },
  },

  // ==============================
  // Second Cousins & Higher Degrees
  // ==============================

  {
    match: {
      relationship: 'cousin',
      degree: 2,
      removed: 0,
      gender: 'male',
    },
    term: {
      label: 'தூர உறவு அண்ணா',
      englishLabel: 'Second Cousin (Male)',
      romanization: 'thoora uravu anna',
      confidence: 'low',
      description: 'Distant cousin (male)',
    },
  },

  {
    match: {
      relationship: 'cousin',
      degree: 2,
      removed: 0,
      gender: 'female',
    },
    term: {
      label: 'தூர உறவு அக்கா',
      englishLabel: 'Second Cousin (Female)',
      romanization: 'thoora uravu akka',
      confidence: 'low',
      description: 'Distant cousin (female)',
    },
  },

  // ==============================
  // Guardian / Step-Parent Terms
  // ==============================

  {
    match: {
      relationship: 'step-parent',
      gender: 'male',
    },
    term: {
      label: 'வளர்ப்பு தந்தை',
      englishLabel: 'Step-Father',
      romanization: 'valarppu thanthai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'female',
    },
    term: {
      label: 'வளர்ப்பு தாய்',
      englishLabel: 'Step-Mother',
      romanization: 'valarppu thaai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'male',
    },
    term: {
      label: 'வளர்ப்பு மகன்',
      englishLabel: 'Step-Son',
      romanization: 'valarppu magan',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'female',
    },
    term: {
      label: 'வளர்ப்பு மகள்',
      englishLabel: 'Step-Daughter',
      romanization: 'valarppu magal',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'male',
    },
    term: {
      label: 'தத்தெடுத்த தந்தை',
      englishLabel: 'Adoptive Father',
      romanization: 'thathedutha thanthai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'female',
    },
    term: {
      label: 'தத்தெடுத்த தாய்',
      englishLabel: 'Adoptive Mother',
      romanization: 'thathedutha thaai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'male',
    },
    term: {
      label: 'தத்தெடுத்த மகன்',
      englishLabel: 'Adopted Son',
      romanization: 'thathedutha magan',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'female',
    },
    term: {
      label: 'தத்தெடுத்த மகள்',
      englishLabel: 'Adopted Daughter',
      romanization: 'thathedutha magal',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'male',
    },
    term: {
      label: 'வளர்ப்புத் தந்தை',
      englishLabel: 'Foster Father',
      romanization: 'valarpputh thanthai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'female',
    },
    term: {
      label: 'வளர்ப்புத் தாய்',
      englishLabel: 'Foster Mother',
      romanization: 'valarpputh thaai',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'male',
    },
    term: {
      label: 'பாதுகாவலர்',
      englishLabel: 'Guardian (Male)',
      romanization: 'paathukaavalar',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'female',
    },
    term: {
      label: 'பாதுகாவலர்',
      englishLabel: 'Guardian (Female)',
      romanization: 'paathukaavalar',
      confidence: 'high',
      description: 'Tamil uses the same term for both genders',
    },
  },

  // ==============================
  // Gender-Neutral Terms
  // ==============================

  {
    match: {
      relationship: 'parent',
      gender: 'other',
    },
    term: {
      label: 'Parent',
      englishLabel: 'Parent',
      confidence: 'medium',
      description: 'Gender-neutral parent term',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'other',
    },
    term: {
      label: 'Child',
      englishLabel: 'Child',
      confidence: 'medium',
      description: 'Gender-neutral child term',
    },
  },

  {
    match: {
      relationship: 'sibling',
      gender: 'other',
    },
    term: {
      label: 'Sibling',
      englishLabel: 'Sibling',
      confidence: 'medium',
      description: 'Gender-neutral sibling term',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      gender: 'other',
    },
    term: {
      label: 'Grandparent',
      englishLabel: 'Grandparent',
      confidence: 'medium',
      description: 'Gender-neutral grandparent term',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'other',
    },
    term: {
      label: 'Grandchild',
      englishLabel: 'Grandchild',
      confidence: 'medium',
      description: 'Gender-neutral grandchild term',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'other',
    },
    term: {
      label: 'Spouse',
      englishLabel: 'Spouse',
      confidence: 'medium',
      description: 'Gender-neutral spouse term',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'other',
    },
    term: {
      label: 'Step-Parent',
      englishLabel: 'Step-Parent',
      confidence: 'medium',
      description: 'Gender-neutral step-parent term',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'other',
    },
    term: {
      label: 'Step-Child',
      englishLabel: 'Step-Child',
      confidence: 'medium',
      description: 'Gender-neutral step-child term',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'other',
    },
    term: {
      label: 'Guardian',
      englishLabel: 'Guardian',
      confidence: 'medium',
      description: 'Gender-neutral guardian term',
    },
  },
];

const groupLabels = {
  childrenGroupLabels: {
    'self':                   { localized: 'குழந்தைகள்',                      english: 'Children' },
    'parent':                 { localized: 'உடன்பிறந்தவர்கள்',                english: 'Siblings' },
    'grandparent.paternal':   { localized: 'அப்பா & பெரியப்பா/சித்தப்பா/அத்தை', english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'அம்மா & மாமா/பெரியம்மா/சின்னம்மா', english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'பெற்றோர் தலைமுறை',                english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'சித்தப்பா/பெரியப்பா பிள்ளைகள்',   english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'அத்தை பிள்ளைகள்',                 english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'மாமா பிள்ளைகள்',                  english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'பெரியம்மா/சின்னம்மா பிள்ளைகள்',   english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'உறவினர் பிள்ளைகள்',               english: 'Cousins' },
    'aunt':                   { localized: 'உறவினர் பிள்ளைகள்',               english: 'Cousins' },
    'sibling':                { localized: 'மருமகன்/மருமகள்',                 english: 'Nephews & Nieces' },
    'child':                  { localized: 'பேரன்/பேத்தி',                    english: 'Grandchildren' },
    'grandchild':             { localized: 'கொள்ளுப்பேரன்/கொள்ளுப்பேத்தி',    english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'சித்தப்பா பிள்ளை குழந்தைகள்',     english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'மாமா பிள்ளை குழந்தைகள்',          english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'உறவினர் குழந்தைகள்',              english: "Cousin's Children" },
    'nephew':                 { localized: 'மருமகன் குழந்தைகள்',              english: "Nephew's Children" },
    'niece':                  { localized: 'மருமகள் குழந்தைகள்',              english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                                english: '' },
    'parent':                 { localized: 'பெற்றோர்',                       english: 'Parents' },
    'grandparent.paternal':   { localized: 'தாத்தா-பாட்டி (அப்பா பக்கம்)',   english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'தாத்தா-பாட்டி (அம்மா பக்கம்)',   english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'தாத்தா-பாட்டி',                  english: 'Grandparents' },
    'uncle.paternal':         { localized: 'பெரியப்பா/சித்தப்பா & மனைவி',    english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'அத்தை & கணவர்',                  english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'மாமா & மாமி',                    english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'பெரியம்மா/சின்னம்மா & கணவர்',    english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'அண்ணா/தம்பி/அக்கா/தங்கை & துணை', english: 'Sibling & Spouse' },
    'child':                  { localized: 'மகன்/மகள் & துணை',               english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'சித்தப்பா பிள்ளை & துணை',        english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'மாமா பிள்ளை & துணை',             english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'உறவினர் & துணை',                 english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'மருமகன் & துணை',                 english: 'Nephew & Spouse' },
    'niece':                  { localized: 'மருமகள் & துணை',                 english: 'Niece & Spouse' },
    'grandchild':             { localized: 'பேரன்/பேத்தி & துணை',            english: 'Grandchild & Spouse' },
  },
};

export const taIN: LocaleConfig = {
  code: 'ta-IN',
  name: 'Tamil',
  nativeName: 'தமிழ்',
  patterns: TAMIL_KINSHIP_TERMS,
  groupLabels,
};
