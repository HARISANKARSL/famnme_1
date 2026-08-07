/**
 * Religion Detection Service
 *
 * Multi-signal inference to detect a family's religion from tree data.
 * Priority: explicit religion field → family majority → surname → gotra → caste
 */

import type { Person } from '@/types';

// ============================================================================
// Surname → Religion map (~200 surnames)
// ============================================================================

const SURNAME_RELIGION_MAP: Record<string, string> = {
  // Hindu — South Indian
  pillai: 'Hindu', nair: 'Hindu', menon: 'Hindu', kurup: 'Hindu', panicker: 'Hindu',
  warrier: 'Hindu', iyer: 'Hindu', iyengar: 'Hindu', mudaliar: 'Hindu', thevar: 'Hindu',
  nadar: 'Hindu', gounder: 'Hindu', chettiar: 'Hindu', reddy: 'Hindu', rao: 'Hindu',
  naidu: 'Hindu', raju: 'Hindu', hegde: 'Hindu', shetty: 'Hindu', bhat: 'Hindu',
  kamath: 'Hindu', pai: 'Hindu', prabhu: 'Hindu', gowda: 'Hindu', amma: 'Hindu',
  namboodiri: 'Hindu', namboothiri: 'Hindu', unni: 'Hindu', namiar: 'Hindu',
  // Hindu — North Indian
  sharma: 'Hindu', gupta: 'Hindu', verma: 'Hindu', mishra: 'Hindu',
  pandey: 'Hindu', tiwari: 'Hindu', dubey: 'Hindu', trivedi: 'Hindu', shukla: 'Hindu',
  joshi: 'Hindu', kulkarni: 'Hindu', deshmukh: 'Hindu', patil: 'Hindu', pawar: 'Hindu',
  thakur: 'Hindu', chauhan: 'Hindu', rajput: 'Hindu', yadav: 'Hindu', chouhan: 'Hindu',
  agarwal: 'Hindu', maheshwari: 'Hindu', bansal: 'Hindu', goel: 'Hindu',
  chaudhary: 'Hindu', deshpande: 'Hindu', jog: 'Hindu', phadke: 'Hindu', gokhale: 'Hindu',
  saxena: 'Hindu', kapoor: 'Hindu', malhotra: 'Hindu', khanna: 'Hindu', chopra: 'Hindu',
  // Hindu — Bengali
  chatterjee: 'Hindu', banerjee: 'Hindu', mukherjee: 'Hindu', ganguly: 'Hindu',
  dasgupta: 'Hindu', bose: 'Hindu', ghosh: 'Hindu', sen: 'Hindu', roy: 'Hindu',
  das: 'Hindu', dutta: 'Hindu', sarkar: 'Hindu', chakraborty: 'Hindu', bhattacharya: 'Hindu',
  // Muslim
  khan: 'Muslim', ahmed: 'Muslim', sheikh: 'Muslim', syed: 'Muslim',
  ali: 'Muslim', hussain: 'Muslim', ansari: 'Muslim', qureshi: 'Muslim', malik: 'Muslim',
  mirza: 'Muslim', begum: 'Muslim', shaikh: 'Muslim', nawab: 'Muslim', hashmi: 'Muslim',
  siddiqui: 'Muslim', faruqi: 'Muslim', rizvi: 'Muslim', baig: 'Muslim', pasha: 'Muslim',
  sultan: 'Muslim', molla: 'Muslim', kazi: 'Muslim', mappila: 'Muslim', thangal: 'Muslim',
  // Christian
  george: 'Christian', thomas: 'Christian', joseph: 'Christian', mathew: 'Christian',
  abraham: 'Christian', john: 'Christian', jacob: 'Christian', david: 'Christian',
  samuel: 'Christian', daniel: 'Christian', alexander: 'Christian', philip: 'Christian',
  varghese: 'Christian', kurian: 'Christian', cherian: 'Christian', pothen: 'Christian',
  fernandes: 'Christian', dsouza: 'Christian', rodrigues: 'Christian', pereira: 'Christian',
  mascarenhas: 'Christian', pinto: 'Christian', dsilva: 'Christian', lobo: 'Christian',
  dmello: 'Christian', sequeira: 'Christian', noronha: 'Christian', gonsalves: 'Christian',
  // Sikh
  singh: 'Sikh', kaur: 'Sikh',
  bedi: 'Sikh', sodhi: 'Sikh', bhalla: 'Sikh', trehan: 'Sikh',
  sandhu: 'Sikh', sidhu: 'Sikh', dhillon: 'Sikh', gill: 'Sikh', grewal: 'Sikh',
  bajwa: 'Sikh', brar: 'Sikh', cheema: 'Sikh', virk: 'Sikh', sahni: 'Sikh',
  // Jain
  jain: 'Jain', shah: 'Jain', mehta: 'Jain', doshi: 'Jain', oswal: 'Jain',
  lodha: 'Jain', sanghvi: 'Jain', zaveri: 'Jain',
  // Buddhist
  ambedkar: 'Buddhist', kamble: 'Buddhist', gaikwad: 'Buddhist', jadhav: 'Buddhist',
  // Parsi
  irani: 'Parsi', mistry: 'Parsi', wadia: 'Parsi', tata: 'Parsi', godrej: 'Parsi',
  daruwalla: 'Parsi', engineer: 'Parsi', batliwala: 'Parsi', contractor: 'Parsi',
};

// Castes that strongly indicate religion
const CASTE_RELIGION_MAP: Record<string, string> = {
  nair: 'Hindu', namboodiri: 'Hindu', ezhava: 'Hindu', thiyya: 'Hindu',
  brahmin: 'Hindu', kshatriya: 'Hindu', vaishya: 'Hindu', rajput: 'Hindu',
  maratha: 'Hindu', jat: 'Hindu', lingayat: 'Hindu', vokkaligas: 'Hindu',
  mappila: 'Muslim', moplah: 'Muslim',
  'latin catholic': 'Christian', 'syrian christian': 'Christian',
  mazhabi: 'Sikh', ramgarhia: 'Sikh',
  mahar: 'Buddhist', matang: 'Buddhist',
};

// ============================================================================
// Detection functions
// ============================================================================

/**
 * Infer religion from a surname.
 */
export function inferReligionFromSurname(surname: string): string | null {
  if (!surname) return null;
  return SURNAME_RELIGION_MAP[surname.trim().toLowerCase()] || null;
}

/**
 * Detect religion for a single person using multiple signals.
 * Priority: explicit religion → surname → gotra → caste
 */
export function detectPersonReligion(person: Person): string | null {
  // 1. Explicit religion field
  if (person.religion) return person.religion;

  // 2. Surname inference
  if (person.lastName) {
    const fromSurname = inferReligionFromSurname(person.lastName);
    if (fromSurname) return fromSurname;
  }

  // 3. Gotra → Hindu or Jain (gotra is specific to these religions)
  if (person.gotra) return 'Hindu';

  // 4. Caste inference
  if (person.caste) {
    const casteLower = person.caste.trim().toLowerCase();
    if (CASTE_RELIGION_MAP[casteLower]) return CASTE_RELIGION_MAP[casteLower];
  }

  return null;
}

/**
 * Detect the family's religion from tree data.
 * Uses the home person first, then family majority, then surname scan.
 */
export function detectFamilyReligion(persons: Person[]): string | null {
  if (!persons || persons.length === 0) return null;

  // 1. Home person's religion (highest priority)
  const homePerson = persons.find(p => p.isHomePerson);
  if (homePerson) {
    const homeReligion = detectPersonReligion(homePerson);
    if (homeReligion) return homeReligion;
  }

  // 2. Family majority — count explicit religion fields
  const religionCounts = new Map<string, number>();
  for (const person of persons) {
    if (person.religion) {
      const r = person.religion;
      religionCounts.set(r, (religionCounts.get(r) || 0) + 1);
    }
  }
  if (religionCounts.size > 0) {
    // Return the religion with the most members (min 2 to be confident)
    let maxReligion = '';
    let maxCount = 0;
    for (const [religion, count] of religionCounts) {
      if (count > maxCount) { maxCount = count; maxReligion = religion; }
    }
    if (maxCount >= 2) return maxReligion;
  }

  // 3. Surname scan — try all persons' last names
  for (const person of persons) {
    if (person.lastName) {
      const fromSurname = inferReligionFromSurname(person.lastName);
      if (fromSurname) return fromSurname;
    }
  }

  // 4. Gotra/caste scan
  for (const person of persons) {
    if (person.gotra) return 'Hindu';
    if (person.caste) {
      const casteLower = person.caste.trim().toLowerCase();
      if (CASTE_RELIGION_MAP[casteLower]) return CASTE_RELIGION_MAP[casteLower];
    }
  }

  return null;
}
