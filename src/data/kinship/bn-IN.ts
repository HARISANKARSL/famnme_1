/**
 * Bengali (বাংলা) Kinship Terms - bn-IN
 *
 * Bengali kinship terminology is highly specific with distinct terms for
 * paternal vs maternal relatives. Bengali distinguishes between
 * father's elder brother (jethu) and younger brother (kaka),
 * and has unique terms like pishi (father's sister) and mashi (mother's sister).
 */
import type { KinshipPattern, LocaleConfig } from './types';

const BENGALI_KINSHIP_TERMS: KinshipPattern[] = [
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
      label: 'বাবা',
      englishLabel: 'Father',
      romanization: 'baba',
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
      label: 'মা',
      englishLabel: 'Mother',
      romanization: 'ma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'male',
    },
    term: {
      label: 'ছেলে',
      englishLabel: 'Son',
      romanization: 'chhele',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'child',
      gender: 'female',
    },
    term: {
      label: 'মেয়ে',
      englishLabel: 'Daughter',
      romanization: 'meye',
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
      label: 'দাদা',
      englishLabel: 'Elder Brother',
      romanization: 'dada',
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
      label: 'ভাই',
      englishLabel: 'Younger Brother',
      romanization: 'bhai',
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
      label: 'দিদি',
      englishLabel: 'Elder Sister',
      romanization: 'didi',
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
      label: 'বোন',
      englishLabel: 'Younger Sister',
      romanization: 'bon',
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
      label: 'জেঠু',
      englishLabel: "Father's Elder Brother",
      romanization: 'jethu',
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
      label: 'কাকা',
      englishLabel: "Father's Younger Brother",
      romanization: 'kaka',
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
      label: 'পিসি',
      englishLabel: "Father's Sister",
      romanization: 'pishi',
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
      label: 'জেঠিমা',
      englishLabel: "Father's Elder Brother's Wife",
      romanization: 'jethima',
      confidence: 'medium',
      description: "Wife of jethu",
    },
  },

  {
    match: {
      relationship: 'uncle',
      lineage: 'paternal',
      elderStatus: 'younger',
    },
    term: {
      label: 'কাকিমা',
      englishLabel: "Father's Younger Brother's Wife",
      romanization: 'kakima',
      confidence: 'medium',
      description: "Wife of kaka",
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
      label: 'মামা',
      englishLabel: "Mother's Brother",
      romanization: 'mama',
      confidence: 'high',
      description: "Maternal uncle (mother's brother)",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
      gender: 'female',
    },
    term: {
      label: 'মাসি',
      englishLabel: "Mother's Sister",
      romanization: 'mashi',
      confidence: 'high',
      description: "Maternal aunt (mother's sister)",
    },
  },

  // Spouses of maternal uncles/aunts
  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
    },
    term: {
      label: 'মামি',
      englishLabel: "Mother's Brother's Wife",
      romanization: 'mami',
      confidence: 'medium',
      description: "Wife of mama",
    },
  },

  {
    match: {
      relationship: 'aunt',
      lineage: 'maternal',
    },
    term: {
      label: 'মেসো',
      englishLabel: "Mother's Sister's Husband",
      romanization: 'mesho',
      confidence: 'medium',
      description: "Husband of mashi",
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
      label: 'জেঠতুতো/কাকাতুতো ভাই',
      englishLabel: 'Paternal Cousin (Male)',
      romanization: 'jethtuto/kakatuto bhai',
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
      label: 'জেঠতুতো/কাকাতুতো বোন',
      englishLabel: 'Paternal Cousin (Female)',
      romanization: 'jethtuto/kakatuto bon',
      confidence: 'high',
      description: "Daughter of father's brother",
    },
  },

  // Father's sister's children
  {
    match: {
      relationship: 'cousin',
      degree: 1,
      removed: 0,
      lineage: 'paternal',
      gender: 'male',
    },
    term: {
      label: 'পিসতুতো ভাই',
      englishLabel: "Father's Sister's Son",
      romanization: 'pishtuto bhai',
      confidence: 'medium',
      description: "Son of father's sister (pishi)",
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
      label: 'পিসতুতো বোন',
      englishLabel: "Father's Sister's Daughter",
      romanization: 'pishtuto bon',
      confidence: 'medium',
      description: "Daughter of father's sister (pishi)",
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
      label: 'মামাতো ভাই',
      englishLabel: 'Maternal Cousin (Male)',
      romanization: 'mamato bhai',
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
      label: 'মামাতো বোন',
      englishLabel: 'Maternal Cousin (Female)',
      romanization: 'mamato bon',
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
      label: 'ঠাকুরদা',
      englishLabel: 'Paternal Grandfather',
      romanization: 'thakurda',
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
      label: 'ঠাকুমা',
      englishLabel: 'Paternal Grandmother',
      romanization: 'thakuma',
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
      label: 'দাদু',
      englishLabel: 'Maternal Grandfather',
      romanization: 'dadu',
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
      label: 'দিদিমা',
      englishLabel: 'Maternal Grandmother',
      romanization: 'didima',
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
      label: 'নাতি',
      englishLabel: 'Grandson',
      romanization: 'nati',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'grandchild',
      gender: 'female',
    },
    term: {
      label: 'নাতনি',
      englishLabel: 'Granddaughter',
      romanization: 'natni',
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
      label: 'ভাইপো',
      englishLabel: "Brother's Son",
      romanization: 'bhaipo',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'niece',
      gender: 'female',
    },
    term: {
      label: 'ভাইঝি',
      englishLabel: "Brother's Daughter",
      romanization: 'bhaijhi',
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
      label: 'স্বামী',
      englishLabel: 'Husband',
      romanization: 'swami',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'spouse',
      gender: 'female',
    },
    term: {
      label: 'স্ত্রী',
      englishLabel: 'Wife',
      romanization: 'stri',
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
      label: 'দূর সম্পর্কের ভাই',
      englishLabel: 'Second Cousin (Male)',
      romanization: 'door somporker bhai',
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
      label: 'দূর সম্পর্কের বোন',
      englishLabel: 'Second Cousin (Female)',
      romanization: 'door somporker bon',
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
      label: 'সৎ বাবা',
      englishLabel: 'Step-Father',
      romanization: 'shot baba',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-parent',
      gender: 'female',
    },
    term: {
      label: 'সৎ মা',
      englishLabel: 'Step-Mother',
      romanization: 'shot ma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'male',
    },
    term: {
      label: 'সৎ ছেলে',
      englishLabel: 'Step-Son',
      romanization: 'shot chhele',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'step-child',
      gender: 'female',
    },
    term: {
      label: 'সৎ মেয়ে',
      englishLabel: 'Step-Daughter',
      romanization: 'shot meye',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'male',
    },
    term: {
      label: 'পালক বাবা',
      englishLabel: 'Adoptive Father',
      romanization: 'palok baba',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adoptive-parent',
      gender: 'female',
    },
    term: {
      label: 'পালক মা',
      englishLabel: 'Adoptive Mother',
      romanization: 'palok ma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'male',
    },
    term: {
      label: 'দত্তক পুত্র',
      englishLabel: 'Adopted Son',
      romanization: 'dotok putro',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'adopted-child',
      gender: 'female',
    },
    term: {
      label: 'দত্তক কন্যা',
      englishLabel: 'Adopted Daughter',
      romanization: 'dotok konna',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'male',
    },
    term: {
      label: 'পোষ্য বাবা',
      englishLabel: 'Foster Father',
      romanization: 'poshyo baba',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'foster-parent',
      gender: 'female',
    },
    term: {
      label: 'পোষ্য মা',
      englishLabel: 'Foster Mother',
      romanization: 'poshyo ma',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'male',
    },
    term: {
      label: 'অভিভাবক',
      englishLabel: 'Guardian (Male)',
      romanization: 'obhibhabok',
      confidence: 'high',
    },
  },

  {
    match: {
      relationship: 'guardian',
      gender: 'female',
    },
    term: {
      label: 'অভিভাবিকা',
      englishLabel: 'Guardian (Female)',
      romanization: 'obhibhabika',
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
    'self':                   { localized: 'সন্তান',                      english: 'Children' },
    'parent':                 { localized: 'ভাইবোন',                      english: 'Siblings' },
    'grandparent.paternal':   { localized: 'বাবা & জেঠু/কাকা/পিসি',       english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'মা & মামা/মাসি',              english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'বাবা-মায়ের প্রজন্ম',          english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'জেঠতুতো/কাকাতুতো ভাইবোন',     english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'পিসতুতো ভাইবোন',              english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'মামাতো ভাইবোন',               english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'মাসিতুতো ভাইবোন',             english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'আত্মীয়ের সন্তান',             english: 'Cousins' },
    'aunt':                   { localized: 'আত্মীয়ের সন্তান',             english: 'Cousins' },
    'sibling':                { localized: 'ভাইপো/ভাইঝি',                 english: 'Nephews & Nieces' },
    'child':                  { localized: 'নাতি/নাতনি',                  english: 'Grandchildren' },
    'grandchild':             { localized: 'প্রপৌত্র/প্রপৌত্রী',           english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'কাকাতুতো ভাইয়ের সন্তান',      english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'মামাতো ভাইয়ের সন্তান',        english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'ভাইয়ের সন্তান',               english: "Cousin's Children" },
    'nephew':                 { localized: 'ভাইপোর সন্তান',               english: "Nephew's Children" },
    'niece':                  { localized: 'ভাইঝির সন্তান',               english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                             english: '' },
    'parent':                 { localized: 'বাবা-মা',                     english: 'Parents' },
    'grandparent.paternal':   { localized: 'ঠাকুরদা-ঠাকুমা',              english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'দাদু-দিদিমা',                 english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'ঠাকুরদা/দাদু',                english: 'Grandparents' },
    'uncle.paternal':         { localized: 'জেঠু/কাকা & স্ত্রী',          english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'পিসি & স্বামী',               english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'মামা & মামি',                 english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'মাসি & মেসো',                 english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'দাদা/ভাই/দিদি/বোন & সঙ্গী',   english: 'Sibling & Spouse' },
    'child':                  { localized: 'ছেলে/মেয়ে & সঙ্গী',           english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'কাকাতুতো ভাই & সঙ্গী',        english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'মামাতো ভাই & সঙ্গী',          english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'ভাই & সঙ্গী',                 english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'ভাইপো & স্ত্রী',              english: 'Nephew & Spouse' },
    'niece':                  { localized: 'ভাইঝি & স্বামী',              english: 'Niece & Spouse' },
    'grandchild':             { localized: 'নাতি/নাতনি & সঙ্গী',          english: 'Grandchild & Spouse' },
  },
};

export const bnIN: LocaleConfig = {
  code: 'bn-IN',
  name: 'Bengali',
  nativeName: 'বাংলা',
  patterns: BENGALI_KINSHIP_TERMS,
  groupLabels,
};
