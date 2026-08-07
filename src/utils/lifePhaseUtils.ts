/**
 * Life Phase Utilities — calculate life phases from DOB
 */

export interface LifePhase {
  id: string;
  label: string;
  startAge: number;
  endAge: number;
}

export const LIFE_PHASES: LifePhase[] = [
  { id: 'childhood', label: 'Childhood', startAge: 0, endAge: 17 },
  { id: 'young-adult', label: 'Young Adulthood', startAge: 18, endAge: 29 },
  { id: 'adulthood', label: 'Adulthood', startAge: 30, endAge: 59 },
  { id: 'elder', label: 'Elder Years', startAge: 60, endAge: 999 },
];

export function getPhaseForAge(age: number): LifePhase {
  return LIFE_PHASES.find(p => age >= p.startAge && age <= p.endAge) || LIFE_PHASES[LIFE_PHASES.length - 1];
}

export function getAgeAtDate(dob: string, date: string): number | null {
  const birth = new Date(dob);
  const target = new Date(date);
  if (isNaN(birth.getTime()) || isNaN(target.getTime())) return null;
  let age = target.getFullYear() - birth.getFullYear();
  const monthDiff = target.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}
