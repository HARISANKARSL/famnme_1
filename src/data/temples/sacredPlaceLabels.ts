import type { TempleConnectionType } from '@/types';

export type FaithContext = 'Hindu' | 'Christian' | 'Islam' | null;

export const SACRED_PLACE_NOUN: Record<NonNullable<FaithContext>, string> = {
  Hindu: 'Temple',
  Christian: 'Church',
  Islam: 'Mosque',
};

/** Neutral fallback for null / Mixed / Unknown faith contexts */
export const SACRED_PLACE_NOUN_DEFAULT = 'Sacred Place';

export function getSacredPlaceNoun(faith: FaithContext): string {
  return faith ? SACRED_PLACE_NOUN[faith] : SACRED_PLACE_NOUN_DEFAULT;
}

const SACRED_PLACE_NOUN_PLURAL: Record<NonNullable<FaithContext>, string> = {
  Hindu: 'Temples',
  Christian: 'Churches',
  Islam: 'Mosques',
};

export function getSacredPlaceNounPlural(faith: FaithContext): string {
  return faith ? SACRED_PLACE_NOUN_PLURAL[faith] : 'Sacred Places';
}

export function getSacredPlaceNounLower(faith: FaithContext): string {
  return getSacredPlaceNoun(faith).toLowerCase();
}

export function getSacredPlaceNounPluralLower(faith: FaithContext): string {
  return getSacredPlaceNounPlural(faith).toLowerCase();
}

/** "Kul Devata" for Hindu, "Primary Church" for Christian, "Primary Mosque" for Islam */
export function getPrimaryLabel(faith: FaithContext): string {
  if (faith === 'Christian') return 'Primary Church';
  if (faith === 'Islam') return 'Primary Mosque';
  return 'Kul Devata';
}

export const MODAL_TITLE_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu: 'Connect this temple to your family story',
  Christian: 'Connect this church to your family story',
  Islam: 'Connect this mosque to your family story',
};

export const SET_AS_MY_LABEL_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu: 'Set as My Temple',
  Christian: 'Set as My Church',
  Islam: 'Set as My Mosque',
};

export const MODAL_PROMPT_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu: "What role does this temple play in your family's story?",
  Christian: "What role does this church play in your family's story?",
  Islam: "What role does this mosque play in your family's story?",
};

export const NOTES_PLACEHOLDER_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu: "e.g., We've been visiting every Navratri for four generations...",
  Christian: "e.g., Our family has attended Sunday service here since my grandparents' time...",
  Islam: "e.g., Our family has been offering Jummah prayers here for generations...",
};

export const SEARCH_PLACEHOLDER_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu: 'Search temples by name or location...',
  Christian: 'Search churches by name or location...',
  Islam: 'Search mosques and dargahs by name or location...',
};

export const SEARCH_PLACEHOLDER_DEFAULT = 'Search temples, churches, mosques...';

/** Safe accessors that fall back to neutral text for null faith */
export function getModalTitle(faith: FaithContext): string {
  return faith ? MODAL_TITLE_BY_FAITH[faith] : 'Connect this sacred place to your family story';
}
export function getSetAsMyLabel(faith: FaithContext): string {
  return faith ? SET_AS_MY_LABEL_BY_FAITH[faith] : 'Set as My Sacred Place';
}
export function getModalPrompt(faith: FaithContext): string {
  return faith ? MODAL_PROMPT_BY_FAITH[faith] : "What role does this place play in your family's story?";
}
export function getNotesPlaceholder(faith: FaithContext): string {
  return faith ? NOTES_PLACEHOLDER_BY_FAITH[faith] : 'e.g., Our family has been visiting this place for generations...';
}
export function getSearchPlaceholder(faith: FaithContext): string {
  return faith ? SEARCH_PLACEHOLDER_BY_FAITH[faith] : SEARCH_PLACEHOLDER_DEFAULT;
}

export const HERO_LABELS: Record<NonNullable<FaithContext>, { label: string; subtitle: string; anchor: string; worshipVerb: string }> = {
  Hindu:    { label: 'Your Kul Devta',    subtitle: "Your family's primary deity",    anchor: "This temple anchors your family's spiritual roots",     worshipVerb: 'worshipped' },
  Christian:{ label: 'Your Parish Church', subtitle: "Your family's home parish",     anchor: "This church anchors your family's faith community",     worshipVerb: 'prayed' },
  Islam:    { label: 'Your Masjid',       subtitle: "Your family's primary mosque",   anchor: "This mosque anchors your family's faith and practice",  worshipVerb: 'offered prayers' },
};

export const CONNECTION_LABELS_BY_FAITH: Record<NonNullable<FaithContext>, Record<TempleConnectionType, string>> = {
  Hindu: {
    kula_devata: 'Kul Devata',
    birth_temple: 'Birth Temple',
    ceremony_location: 'Ceremony Location',
    ancestral: 'Ancestral Temple',
    regular_visit: 'Regular Visit',
    pilgrimage: 'Pilgrimage',
  },
  Christian: {
    kula_devata: 'Primary Church',
    birth_temple: 'Christening Church',
    ceremony_location: 'Wedding Church',
    ancestral: 'Ancestral Church',
    regular_visit: 'Sunday Service',
    pilgrimage: 'Pilgrimage',
  },
  Islam: {
    kula_devata: 'Primary Mosque',
    birth_temple: 'Local Mosque',
    ceremony_location: 'Nikah Mosque',
    ancestral: 'Ancestral Mosque',
    regular_visit: 'Jummah Visit',
    pilgrimage: 'Hajj / Umrah',
  },
};

export const RITUAL_PROMPTS_BY_FAITH: Record<NonNullable<FaithContext>, Partial<Record<TempleConnectionType, string>>> = {
  Hindu: {
    kula_devata: 'Does your family visit during Navaratri? What rituals do you follow here?',
    birth_temple: 'Was this temple visited during birth or naming ceremonies?',
    ceremony_location: 'Which ceremonies have been held at this temple?',
    regular_visit: 'How often does your family visit, and on what occasions?',
    pilgrimage: 'When did your family first undertake this pilgrimage?',
    ancestral: 'Do you know which ancestor first connected your family to this temple?',
  },
  Christian: {
    kula_devata: 'Does your family attend services here regularly? What occasions bring you?',
    birth_temple: 'Was this church the site of a baptism or christening in your family?',
    ceremony_location: 'Which sacraments or ceremonies took place at this church?',
    regular_visit: 'How often does your family attend, and on which feast days?',
    pilgrimage: 'When did your family first visit this pilgrimage church?',
    ancestral: 'Which ancestor first connected your family to this church?',
  },
  Islam: {
    kula_devata: 'Does your family offer Jummah prayers here? What occasions bring you?',
    birth_temple: 'Was an aqiqah or naming ceremony held near this mosque?',
    ceremony_location: 'Was a nikah or other ceremony held at this mosque?',
    regular_visit: 'How often does your family visit, and during which occasions?',
    pilgrimage: 'When did your family first undertake this pilgrimage?',
    ancestral: 'Which ancestor first connected your family to this mosque?',
  },
};

export const SECTION_TITLE_BY_FAITH: Record<NonNullable<FaithContext>, string> = {
  Hindu:    "Your Family's Spiritual Identity",
  Christian:"Your Family's Church Heritage",
  Islam:    "Your Family's Mosque Heritage",
};

/** Descriptions for each connection type, adapted per faith */
export const CONNECTION_DESCRIPTIONS_BY_FAITH: Record<NonNullable<FaithContext>, Record<TempleConnectionType, string>> = {
  Hindu: {
    kula_devata: "Worshipped across generations \u2014 your family's spiritual anchor",
    birth_temple: 'Where life milestones in your family have been blessed',
    ancestral: "Located in your family's place of origin",
    ceremony_location: "A sacred witness to your family's most important moments",
    regular_visit: 'A place your family returns to, year after year',
    pilgrimage: 'A journey your family has undertaken together',
  },
  Christian: {
    kula_devata: "Your family's home parish \u2014 the heart of your faith community",
    birth_temple: 'Where baptisms and christenings in your family took place',
    ancestral: "The church your ancestors attended in their homeland",
    ceremony_location: 'Where weddings, confirmations, and sacraments were celebrated',
    regular_visit: 'A church your family attends regularly for worship',
    pilgrimage: 'A sacred site your family has journeyed to in faith',
  },
  Islam: {
    kula_devata: "Your family's primary mosque \u2014 where faith is practiced daily",
    birth_temple: 'Where aqiqah or naming ceremonies were held',
    ancestral: "The mosque your ancestors prayed at in their homeland",
    ceremony_location: 'Where nikah or other family ceremonies were held',
    regular_visit: 'A mosque your family attends for Jummah and daily prayers',
    pilgrimage: 'A sacred destination for Hajj, Umrah, or ziyarat',
  },
};

export function getConnectionDescription(faith: FaithContext, type: TempleConnectionType): string {
  if (faith && CONNECTION_DESCRIPTIONS_BY_FAITH[faith]) {
    return CONNECTION_DESCRIPTIONS_BY_FAITH[faith][type];
  }
  return CONNECTION_DESCRIPTIONS_BY_FAITH.Hindu[type];
}
