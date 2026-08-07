/**
 * Temporal Validation Service
 *
 * Pure functions for validating date consistency in family relationships.
 * All checks return WARNINGS (not errors) — historical data may be approximate.
 */

export interface TemporalWarning {
  code: string;
  message: string;
  severity: 'warning' | 'info';
  field: string;
}

interface DateFields {
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving?: boolean;
}

interface UnionDateFields {
  startDate?: string | null;
  endDate?: string | null;
}

// Minimum plausible age gap between parent and child (years)
const MIN_PARENT_AGE = 12;
// Maximum plausible age gap between parent and child (years)
const MAX_PARENT_AGE = 75;
// Maximum plausible human lifespan (years)
const MAX_LIFESPAN = 130;
// Minimum plausible marriage age (years)
const MIN_MARRIAGE_AGE = 12;

function getYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function yearDiff(date1: string, date2: string): number | null {
  const y1 = getYear(date1);
  const y2 = getYear(date2);
  if (y1 === null || y2 === null) return null;
  return y2 - y1;
}

/**
 * Validate a single person's dates (birth, death)
 */
export function validatePersonDates(person: DateFields): TemporalWarning[] {
  const warnings: TemporalWarning[] = [];

  if (person.birthDate && person.deathDate) {
    const diff = yearDiff(person.birthDate, person.deathDate);
    if (diff !== null) {
      if (diff < 0) {
        warnings.push({
          code: 'DEATH_BEFORE_BIRTH',
          message: 'Death date is before birth date',
          severity: 'warning',
          field: 'deathDate',
        });
      } else if (diff > MAX_LIFESPAN) {
        warnings.push({
          code: 'IMPLAUSIBLE_LIFESPAN',
          message: `Lifespan of ${diff} years exceeds ${MAX_LIFESPAN} years`,
          severity: 'warning',
          field: 'deathDate',
        });
      }
    }
  }

  if (person.birthDate && person.isLiving) {
    const birthYear = getYear(person.birthDate);
    if (birthYear !== null) {
      const age = new Date().getFullYear() - birthYear;
      if (age > MAX_LIFESPAN) {
        warnings.push({
          code: 'IMPLAUSIBLE_LIVING_AGE',
          message: `Person marked as living would be ${age} years old`,
          severity: 'info',
          field: 'isLiving',
        });
      }
    }
  }

  return warnings;
}

/**
 * Validate child-parent date consistency
 */
export function validateChildParentDates(
  child: DateFields,
  parent: DateFields,
  parentLabel: string = 'parent'
): TemporalWarning[] {
  const warnings: TemporalWarning[] = [];

  if (child.birthDate && parent.birthDate) {
    const ageGap = yearDiff(parent.birthDate, child.birthDate);
    if (ageGap !== null) {
      if (ageGap < MIN_PARENT_AGE) {
        warnings.push({
          code: 'PARENT_TOO_YOUNG',
          message: `${parentLabel} would have been ${ageGap} years old at child's birth (minimum ${MIN_PARENT_AGE})`,
          severity: 'warning',
          field: 'birthDate',
        });
      } else if (ageGap > MAX_PARENT_AGE) {
        warnings.push({
          code: 'PARENT_TOO_OLD',
          message: `${parentLabel} would have been ${ageGap} years old at child's birth (maximum ${MAX_PARENT_AGE})`,
          severity: 'warning',
          field: 'birthDate',
        });
      }
    }
  }

  if (child.birthDate && parent.deathDate) {
    const diff = yearDiff(parent.deathDate, child.birthDate);
    if (diff !== null && diff > 1) {
      warnings.push({
        code: 'CHILD_BORN_AFTER_PARENT_DEATH',
        message: `Child born ${diff} years after ${parentLabel}'s death`,
        severity: 'warning',
        field: 'birthDate',
      });
    }
  }

  return warnings;
}

/**
 * Validate union (marriage/partnership) dates against partners
 */
export function validateUnionDates(
  union: UnionDateFields,
  partner1: DateFields,
  partner2?: DateFields,
  partner1Name: string = 'Partner 1',
  partner2Name: string = 'Partner 2'
): TemporalWarning[] {
  const warnings: TemporalWarning[] = [];

  // End date before start date
  if (union.startDate && union.endDate) {
    const diff = yearDiff(union.startDate, union.endDate);
    if (diff !== null && diff < 0) {
      warnings.push({
        code: 'UNION_END_BEFORE_START',
        message: 'Marriage end date is before start date',
        severity: 'warning',
        field: 'endDate',
      });
    }
  }

  // Check each partner
  const partners = [
    { data: partner1, name: partner1Name },
    ...(partner2 ? [{ data: partner2, name: partner2Name }] : []),
  ];

  for (const partner of partners) {
    if (union.startDate && partner.data.birthDate) {
      const ageAtMarriage = yearDiff(partner.data.birthDate, union.startDate);
      if (ageAtMarriage !== null) {
        if (ageAtMarriage < 0) {
          warnings.push({
            code: 'MARRIAGE_BEFORE_BIRTH',
            message: `Marriage date is before ${partner.name}'s birth`,
            severity: 'warning',
            field: 'startDate',
          });
        } else if (ageAtMarriage < MIN_MARRIAGE_AGE) {
          warnings.push({
            code: 'MARRIAGE_TOO_YOUNG',
            message: `${partner.name} would have been ${ageAtMarriage} years old at marriage`,
            severity: 'info',
            field: 'startDate',
          });
        }
      }
    }

    if (union.startDate && partner.data.deathDate) {
      const diff = yearDiff(partner.data.deathDate, union.startDate);
      if (diff !== null && diff > 0) {
        warnings.push({
          code: 'MARRIAGE_AFTER_DEATH',
          message: `Marriage date is ${diff} years after ${partner.name}'s death`,
          severity: 'warning',
          field: 'startDate',
        });
      }
    }
  }

  return warnings;
}

/**
 * Validate sibling date consistency
 */
export function validateSiblingDates(
  newSibling: DateFields,
  existingSiblings: Array<DateFields & { firstName?: string; lastName?: string }>
): TemporalWarning[] {
  const warnings: TemporalWarning[] = [];

  if (!newSibling.birthDate) return warnings;

  const newYear = getYear(newSibling.birthDate);
  if (newYear === null) return warnings;

  for (const sibling of existingSiblings) {
    if (!sibling.birthDate) continue;
    const sibYear = getYear(sibling.birthDate);
    if (sibYear === null) continue;

    const gap = Math.abs(newYear - sibYear);
    const sibName = [sibling.firstName, sibling.lastName].filter(Boolean).join(' ') || 'a sibling';

    // Same exact birth date but not marked as multiple birth
    if (gap === 0 && newSibling.birthDate === sibling.birthDate) {
      warnings.push({
        code: 'SAME_BIRTHDATE_AS_SIBLING',
        message: `Same birth date as ${sibName} — are they twins/multiples?`,
        severity: 'info',
        field: 'birthDate',
      });
    }

    // Very large age gap between siblings
    if (gap > 30) {
      warnings.push({
        code: 'LARGE_SIBLING_AGE_GAP',
        message: `${gap}-year age gap with ${sibName} is unusually large`,
        severity: 'info',
        field: 'birthDate',
      });
    }
  }

  return warnings;
}
