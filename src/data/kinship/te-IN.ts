/**
 * Telugu (తెలుగు) Kinship Terms - te-IN
 *
 * Telugu kinship terminology distinguishes between paternal and maternal
 * relatives, elder and younger siblings, and has specific terms for
 * cross-cousin and parallel-cousin relationships.
 */
import type { KinshipPattern, LocaleConfig } from './types';

const TELUGU_KINSHIP_TERMS: KinshipPattern[] = [
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
      label: 'నాన్న',
      englishLabel: 'Father',
      romanization: 'nanna',
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
      label: 'అమ్మ',
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
      label: 'కొడుకు',
      englishLabel: 'Son',
      romanization: 'koduku',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'female',
    },
    term: {
      label: 'కూతురు',
      englishLabel: 'Daughter',
      romanization: 'kuthuru',
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
      label: 'అన్నయ్య',
      englishLabel: 'Elder Brother',
      romanization: 'annayya',
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
      label: 'తమ్ముడు',
      englishLabel: 'Younger Brother',
      romanization: 'thammudu',
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
      label: 'అక్క',
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
      label: 'చెల్లి',
      englishLabel: 'Younger Sister',
      romanization: 'chelli',
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
      label: 'పెద్దనాన్న',
      englishLabel: "Father's Elder Brother",
      romanization: 'pedda nanna',
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
      label: 'చిన్ననాన్న',
      englishLabel: "Father's Younger Brother",
      romanization: 'chinna nanna',
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
      label: 'అత్త',
      englishLabel: "Father's Sister",
      romanization: 'atta',
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
      label: 'పెద్దమ్మ',
      englishLabel: "Father's Elder Brother's Wife",
      romanization: 'peddamma',
      confidence: 'medium',
      description: "Wife of pedda nanna",
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'younger',
    },
    term: {
      label: 'పిన్ని',
      englishLabel: "Father's Younger Brother's Wife",
      romanization: 'pinni',
      confidence: 'medium',
      description: "Wife of chinna nanna",
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
      label: 'మామయ్య',
      englishLabel: "Mother's Brother",
      romanization: 'mamayya',
      confidence: 'high',
      description: "Maternal uncle (mother's brother)",
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
      label: 'పెద్దమ్మ',
      englishLabel: "Mother's Elder Sister",
      romanization: 'peddamma',
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
      label: 'పిన్ని',
      englishLabel: "Mother's Younger Sister",
      romanization: 'pinni',
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
      label: 'అత్త',
      englishLabel: "Mother's Brother's Wife",
      romanization: 'atta',
      confidence: 'medium',
      description: "Wife of mamayya",
    },
  },

  // ==============================
  // Paternal Cousins
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
      label: 'బాబాయి కొడుకు',
      englishLabel: 'Paternal Cousin (Male)',
      romanization: 'babai koduku',
      confidence: 'high',
      description: "Son of father's brother",
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
      label: 'బాబాయి కూతురు',
      englishLabel: 'Paternal Cousin (Female)',
      romanization: 'babai kuthuru',
      confidence: 'high',
      description: "Daughter of father's brother",
    },
  },

  // Father's sister's children (cross cousins)
  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'అత్త కొడుకు',
      englishLabel: "Father's Sister's Son",
      romanization: 'atta koduku',
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
      label: 'అత్త కూతురు',
      englishLabel: "Father's Sister's Daughter",
      romanization: 'atta kuthuru',
      confidence: 'medium',
      description: "Cross-cousin (father's sister's daughter)",
    },
  },

  // ==============================
  // Maternal Cousins
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
      label: 'మేనమామ కొడుకు',
      englishLabel: 'Maternal Cousin (Male)',
      romanization: 'menamama koduku',
      confidence: 'high',
      description: "Son of mother's brother",
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
      label: 'మేనమామ కూతురు',
      englishLabel: 'Maternal Cousin (Female)',
      romanization: 'menamama kuthuru',
      confidence: 'high',
      description: "Daughter of mother's brother",
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
      label: 'తాత',
      englishLabel: 'Paternal Grandfather',
      romanization: 'thatha',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'paternal',
      gender: 'female',
    },
    term: {
      label: 'నానమ్మ',
      englishLabel: 'Paternal Grandmother',
      romanization: 'nanamma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'male',
    },
    term: {
      label: 'తాత',
      englishLabel: 'Maternal Grandfather',
      romanization: 'thatha',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandparent',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'అమ్మమ్మ',
      englishLabel: 'Maternal Grandmother',
      romanization: 'ammamma',
      confidence: 'high',
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
      label: 'మనవడు',
      englishLabel: 'Grandson',
      romanization: 'manavadu',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'female',
    },
    term: {
      label: 'మనవరాలు',
      englishLabel: 'Granddaughter',
      romanization: 'manavaralu',
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
      label: 'మేనల్లుడు',
      englishLabel: "Brother's/Sister's Son",
      romanization: 'menaludu',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'niece',
      gender: 'female',
    },
    term: {
      label: 'మేనకోడలు',
      englishLabel: "Brother's/Sister's Daughter",
      romanization: 'menakodalu',
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
      label: 'భర్త',
      englishLabel: 'Husband',
      romanization: 'bhartha',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'female',
    },
    term: {
      label: 'భార్య',
      englishLabel: 'Wife',
      romanization: 'bharya',
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
      label: 'దూరపు బంధువు',
      englishLabel: 'Second Cousin (Male)',
      romanization: 'doorapu bandhuvu',
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
      label: 'దూరపు బంధువు',
      englishLabel: 'Second Cousin (Female)',
      romanization: 'doorapu bandhuvu',
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
      label: 'సవతి తండ్రి',
      englishLabel: 'Step-Father',
      romanization: 'savathi thandri',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'female',
    },
    term: {
      label: 'సవతి తల్లి',
      englishLabel: 'Step-Mother',
      romanization: 'savathi thalli',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'male',
    },
    term: {
      label: 'సవతి కొడుకు',
      englishLabel: 'Step-Son',
      romanization: 'savathi koduku',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'female',
    },
    term: {
      label: 'సవతి కూతురు',
      englishLabel: 'Step-Daughter',
      romanization: 'savathi kuthuru',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'male',
    },
    term: {
      label: 'దత్తత తండ్రి',
      englishLabel: 'Adoptive Father',
      romanization: 'daththatha thandri',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'female',
    },
    term: {
      label: 'దత్తత తల్లి',
      englishLabel: 'Adoptive Mother',
      romanization: 'daththatha thalli',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'male',
    },
    term: {
      label: 'దత్తత కొడుకు',
      englishLabel: 'Adopted Son',
      romanization: 'daththatha koduku',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'female',
    },
    term: {
      label: 'దత్తత కూతురు',
      englishLabel: 'Adopted Daughter',
      romanization: 'daththatha kuthuru',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'male',
    },
    term: {
      label: 'పెంపుడు తండ్రి',
      englishLabel: 'Foster Father',
      romanization: 'pempudu thandri',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'female',
    },
    term: {
      label: 'పెంపుడు తల్లి',
      englishLabel: 'Foster Mother',
      romanization: 'pempudu thalli',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'male',
    },
    term: {
      label: 'సంరక్షకుడు',
      englishLabel: 'Guardian (Male)',
      romanization: 'samrakshakudu',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'female',
    },
    term: {
      label: 'సంరక్షకురాలు',
      englishLabel: 'Guardian (Female)',
      romanization: 'samrakshakuralu',
      confidence: 'high',
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
    'self':                   { localized: 'పిల్లలు',                     english: 'Children' },
    'parent':                 { localized: 'అన్నదమ్ములు/అక్కచెల్లెళ్ళు',    english: 'Siblings' },
    'grandparent.paternal':   { localized: 'నాన్న & పెద్దనాన్న/చిన్ననాన్న/అత్త', english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'అమ్మ & మామయ్య/పెద్దమ్మ/పిన్ని', english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'తల్లిదండ్రుల తరం',             english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'బాబాయి పిల్లలు',               english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'అత్త పిల్లలు',                english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'మామయ్య పిల్లలు',               english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'పిన్ని/పెద్దమ్మ పిల్లలు',      english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'బంధువుల పిల్లలు',              english: 'Cousins' },
    'aunt':                   { localized: 'బంధువుల పిల్లలు',              english: 'Cousins' },
    'sibling':                { localized: 'మేనల్లుళ్ళు/మేనకోడళ్ళు',        english: 'Nephews & Nieces' },
    'child':                  { localized: 'మనవళ్ళు/మనవరాళ్ళు',            english: 'Grandchildren' },
    'grandchild':             { localized: 'మునిమనవళ్ళు',                  english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'బాబాయి పిల్లల పిల్లలు',        english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'మామయ్య పిల్లల పిల్లలు',        english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'బంధువు పిల్లలు',               english: "Cousin's Children" },
    'nephew':                 { localized: 'మేనల్లుడి పిల్లలు',            english: "Nephew's Children" },
    'niece':                  { localized: 'మేనకోడలి పిల్లలు',             english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                             english: '' },
    'parent':                 { localized: 'తల్లిదండ్రులు',                english: 'Parents' },
    'grandparent.paternal':   { localized: 'తాత-నానమ్మ',                  english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'తాత-అమ్మమ్మ',                 english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'తాత-నానమ్మ/అమ్మమ్మ',          english: 'Grandparents' },
    'uncle.paternal':         { localized: 'పెద్దనాన్న/చిన్ననాన్న & భార్య', english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'అత్త & భర్త',                 english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'మామయ్య & అత్త',               english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'పిన్ని/పెద్దమ్మ & భర్త',       english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'అన్నయ్య/తమ్ముడు/అక్క/చెల్లి & జీవిత భాగస్వామి', english: 'Sibling & Spouse' },
    'child':                  { localized: 'కొడుకు/కూతురు & జీవిత భాగస్వామి', english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'బాబాయి పిల్లలు & జీవిత భాగస్వామి', english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'మామయ్య పిల్లలు & జీవిత భాగస్వామి', english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'బంధువు & జీవిత భాగస్వామి',      english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'మేనల్లుడు & భార్య',            english: 'Nephew & Spouse' },
    'niece':                  { localized: 'మేనకోడలు & భర్త',              english: 'Niece & Spouse' },
    'grandchild':             { localized: 'మనవడు/మనవరాలు & జీవిత భాగస్వామి', english: 'Grandchild & Spouse' },
  },
};

export const teIN: LocaleConfig = {
  code: 'te-IN',
  name: 'Telugu',
  nativeName: 'తెలుగు',
  patterns: TELUGU_KINSHIP_TERMS,
  groupLabels,
};
