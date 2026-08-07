/**
 * Cultural Milestone Definitions
 *
 * Milestone life events by religion, gender, and approximate age.
 */

export interface CulturalMilestone {
  name: string;
  localName?: string;
  religion: string;
  gender?: 'male' | 'female' | 'any';
  ageInDays?: number; // Approximate age when event occurs
  ageInYears?: number;
  description: string;
}

export const CULTURAL_MILESTONES: CulturalMilestone[] = [
  // Hindu milestones
  { name: 'Namkaran', localName: 'नामकरण', religion: 'Hindu', gender: 'any', ageInDays: 12, description: 'Naming ceremony, typically on the 12th day after birth' },
  { name: 'Annaprashan', localName: 'अन्नप्राशन', religion: 'Hindu', gender: 'any', ageInDays: 180, description: 'First solid food ceremony, around 6 months' },
  { name: 'Mundan', localName: 'मुंडन', religion: 'Hindu', gender: 'any', ageInYears: 1, description: 'First head-shaving ceremony' },
  { name: 'Upanayana', localName: 'उपनयन', religion: 'Hindu', gender: 'male', ageInYears: 8, description: 'Sacred thread ceremony (Janeu) marking initiation' },
  { name: 'Vidyarambha', localName: 'विद्यारम्भ', religion: 'Hindu', gender: 'any', ageInYears: 5, description: 'Beginning of formal education' },

  // Christian milestones
  { name: 'Baptism', religion: 'Christian', gender: 'any', ageInDays: 30, description: 'Infant baptism ceremony' },
  { name: 'First Communion', religion: 'Christian', gender: 'any', ageInYears: 7, description: 'First reception of the Eucharist' },
  { name: 'Confirmation', religion: 'Christian', gender: 'any', ageInYears: 14, description: 'Confirmation of faith' },

  // Muslim milestones
  { name: 'Aqiqah', religion: 'Muslim', gender: 'any', ageInDays: 7, description: 'Naming and sacrifice ceremony on the 7th day' },
  { name: 'Bismillah', religion: 'Muslim', gender: 'any', ageInYears: 4, description: 'Beginning of Quran recitation' },

  // Sikh milestones
  { name: 'Naam Karan', religion: 'Sikh', gender: 'any', ageInDays: 14, description: 'Naming ceremony at Gurdwara' },
  { name: 'Dastar Bandi', religion: 'Sikh', gender: 'male', ageInYears: 11, description: 'First turban tying ceremony' },
  { name: 'Amrit Sanchar', religion: 'Sikh', gender: 'any', ageInYears: 15, description: 'Baptism into the Khalsa' },

  // Jain milestones
  { name: 'Naam Karan', religion: 'Jain', gender: 'any', ageInDays: 12, description: 'Naming ceremony' },

  // Parsi milestones
  { name: 'Navjote', religion: 'Parsi', gender: 'any', ageInYears: 7, description: 'Initiation ceremony with sacred girdle (kusti)' },
];
