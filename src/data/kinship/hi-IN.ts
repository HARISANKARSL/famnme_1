/**
 * Hindi (हिन्दी) Kinship Terms - hi-IN
 */
import type { LocaleConfig } from './types';
import { HINDI_KINSHIP_TERMS } from '@/data/indianKinshipTerms';

const groupLabels = {
  childrenGroupLabels: {
    'self':                   { localized: 'बच्चे',                  english: 'Children' },
    'parent':                 { localized: 'भाई-बहन',                english: 'Siblings' },
    'grandparent.paternal':   { localized: 'पिता & चाचा-बुआ',       english: 'Father & Paternal Uncles/Aunts' },
    'grandparent.maternal':   { localized: 'माता & मामा-मौसी',       english: 'Mother & Maternal Uncles/Aunts' },
    'grandparent':            { localized: 'माता-पिता की पीढ़ी',      english: "Parents' Generation" },
    'uncle.paternal':         { localized: 'चचेरे भाई-बहन',         english: 'Paternal Cousins' },
    'aunt.paternal':          { localized: 'फुफेरे भाई-बहन',        english: "Father's Sister's Children" },
    'uncle.maternal':         { localized: 'ममेरे भाई-बहन',         english: 'Maternal Cousins' },
    'aunt.maternal':          { localized: 'मौसेरे भाई-बहन',        english: "Mother's Sister's Children" },
    'uncle':                  { localized: 'भतीजे-भतीजी',           english: 'Cousins' },
    'aunt':                   { localized: 'भतीजे-भतीजी',           english: 'Cousins' },
    'sibling':                { localized: 'भतीजे-भतीजी',           english: 'Nephews & Nieces' },
    'child':                  { localized: 'पोते-पोती',             english: 'Grandchildren' },
    'grandchild':             { localized: 'परपोते-परपोती',          english: 'Great-Grandchildren' },
    'cousin.paternal':        { localized: 'चचेरे भाई के बच्चे',    english: "Paternal Cousin's Children" },
    'cousin.maternal':        { localized: 'ममेरे भाई के बच्चे',    english: "Maternal Cousin's Children" },
    'cousin':                 { localized: 'भाई के बच्चे',          english: "Cousin's Children" },
    'nephew':                 { localized: 'भतीजे के बच्चे',        english: "Nephew's Children" },
    'niece':                  { localized: 'भतीजी के बच्चे',        english: "Niece's Children" },
  },
  parentPairLabels: {
    'self':                   { localized: '',                       english: '' },
    'parent':                 { localized: 'माता-पिता',             english: 'Parents' },
    'grandparent.paternal':   { localized: 'दादा-दादी',             english: 'Paternal Grandparents' },
    'grandparent.maternal':   { localized: 'नाना-नानी',             english: 'Maternal Grandparents' },
    'grandparent':            { localized: 'दादा/नाना',             english: 'Grandparents' },
    'uncle.paternal':         { localized: 'चाचा-चाची',             english: 'Paternal Uncle & Wife' },
    'aunt.paternal':          { localized: 'बुआ-फूफा',              english: 'Paternal Aunt & Husband' },
    'uncle.maternal':         { localized: 'मामा-मामी',             english: 'Maternal Uncle & Wife' },
    'aunt.maternal':          { localized: 'मौसी-मौसा',             english: 'Maternal Aunt & Husband' },
    'sibling':                { localized: 'भाई/बहन',               english: 'Sibling & Spouse' },
    'child':                  { localized: 'बेटा/बेटी',             english: 'Son/Daughter & Spouse' },
    'cousin.paternal':        { localized: 'चचेरे भाई',             english: 'Paternal Cousin & Spouse' },
    'cousin.maternal':        { localized: 'ममेरे भाई',             english: 'Maternal Cousin & Spouse' },
    'cousin':                 { localized: 'भाई',                   english: 'Cousin & Spouse' },
    'nephew':                 { localized: 'भतीजा',                 english: 'Nephew & Spouse' },
    'niece':                  { localized: 'भतीजी',                 english: 'Niece & Spouse' },
    'grandchild':             { localized: 'पोता/पोती',             english: 'Grandchild & Spouse' },
  },
};

export const hiIN: LocaleConfig = {
  code: 'hi-IN',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  patterns: HINDI_KINSHIP_TERMS,
  groupLabels,
};
