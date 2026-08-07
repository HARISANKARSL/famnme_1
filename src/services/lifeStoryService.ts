import type { Person, Union } from '@/types';

interface LifeStoryContext {
  person: Person;
  parents: Person[];
  spouses: Array<{ spouse: Person; union: Union }>;
  children: Person[];
  siblings: Person[];
  lifeEvents?: Array<{ eventType: string; eventDate?: string | null; location?: string | null; description?: string | null }>;
}

function yearOf(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  try { return new Date(dateStr).getFullYear(); } catch { return null; }
}

function fullName(p: Person): string {
  return `${p.firstName} ${p.lastName || ''}`.trim();
}

/** Join a list with commas and "and" before the last item */
function naturalList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function generateLifeStory(ctx: LifeStoryContext): string {
  const paragraphs: string[] = [];
  const { person, parents, spouses, children, siblings, lifeEvents } = ctx;
  const name = person.firstName;
  const he = person.gender === 'male' ? 'he' : person.gender === 'female' ? 'she' : 'they';
  const He = he.charAt(0).toUpperCase() + he.slice(1);
  const his = person.gender === 'male' ? 'his' : person.gender === 'female' ? 'her' : 'their';
  const His = his.charAt(0).toUpperCase() + his.slice(1);
  const isDeceased = !person.isLiving || !!person.deathDate;
  // Use past tense for deceased, present for living
  const was = isDeceased ? 'was' : 'is';
  const had = isDeceased ? 'had' : 'has';
  const grew = isDeceased ? 'grew' : 'has grown';

  const birthYear = yearOf(person.birthDate);
  const deathYear = yearOf(person.deathDate);

  // ── Paragraph 1: Opening / Birth ──────────────────────────────────────────

  const sentences: string[] = [];

  if (birthYear) {
    const place = person.birthPlace;
    if (place) {
      sentences.push(`${name} was born on ${formatDate(person.birthDate!)} in ${place}.`);
    } else {
      sentences.push(`${name} was born in ${birthYear}.`);
    }

    if (parents.length === 2) {
      const father = parents.find(p => p.gender === 'male');
      const mother = parents.find(p => p.gender === 'female');
      if (father && mother) {
        sentences.push(`${He} ${grew} up as the child of ${fullName(father)} and ${fullName(mother)}.`);
      } else {
        sentences.push(`${He} ${was} raised by ${naturalList(parents.map(fullName))}.`);
      }
    } else if (parents.length === 1) {
      sentences.push(`${He} ${was} raised by ${his} parent, ${fullName(parents[0])}.`);
    }
  } else {
    // No birth date
    sentences.push(`${name} ${person.lastName || ''} ${was} a cherished member of this family.`.replace(/\s+/g, ' ').trim());
    if (parents.length > 0) {
      sentences.push(`${He} ${was} the child of ${naturalList(parents.map(fullName))}.`);
    }
  }

  if (sentences.length > 0) paragraphs.push(sentences.join(' '));

  // ── Paragraph 2: Siblings ─────────────────────────────────────────────────

  if (siblings.length > 0) {
    const siblingNames = naturalList(siblings.map(s => s.firstName));
    if (siblings.length === 1) {
      paragraphs.push(`${name} ${had} one sibling, ${siblingNames}.`);
    } else {
      paragraphs.push(`${He} ${grew} up alongside ${his} ${siblings.length} siblings: ${siblingNames}.`);
    }
  }

  // ── Paragraph 3: Marriage(s) ──────────────────────────────────────────────

  for (const { spouse, union } of spouses) {
    const parts: string[] = [];
    const mYear = yearOf(union.startDate);

    if (mYear && union.marriagePlace) {
      parts.push(`${name} married ${fullName(spouse)} in ${mYear} at ${union.marriagePlace}.`);
    } else if (mYear) {
      parts.push(`${name} married ${fullName(spouse)} in ${mYear}.`);
    } else {
      parts.push(`${name} married ${fullName(spouse)}.`);
    }

    if (union.ceremonyType) {
      const desc: Record<string, string> = {
        'arranged': 'an arranged marriage, following family tradition',
        'love': 'a love marriage',
        'inter-caste': 'an inter-caste union, bridging two communities',
        'inter-religion': 'an inter-faith union, bringing together two traditions',
      };
      const label = desc[union.ceremonyType] || `a ${union.ceremonyType} ceremony`;
      parts.push(`Theirs was ${label}.`);
    }

    paragraphs.push(parts.join(' '));
  }

  // ── Paragraph 4: Children ─────────────────────────────────────────────────

  if (children.length > 0) {
    const childNames = naturalList(children.map(c => c.firstName));
    const isCouple = spouses.length > 0;
    const subject = isCouple ? 'Together, they' : He;
    const hadPlural = isCouple ? (isDeceased ? 'had' : 'have') : had;

    if (children.length === 1) {
      paragraphs.push(`${subject} ${hadPlural} one child, ${childNames}.`);
    } else {
      paragraphs.push(`${subject} were blessed with ${children.length} children: ${childNames}.`);
    }
  }

  // ── Paragraph 5: Life Events ──────────────────────────────────────────────

  if (lifeEvents && lifeEvents.length > 0) {
    const eventSentences: string[] = [];

    for (const event of lifeEvents) {
      const eYear = yearOf(event.eventDate);
      const yearPhrase = eYear ? `In ${eYear}, ` : '';
      const loc = event.location;
      const desc = event.description;
      const type = event.eventType.toLowerCase();

      if (type === 'education' || type.includes('vidya')) {
        if (desc && loc) {
          eventSentences.push(`${yearPhrase}${he} pursued ${his} studies in ${desc} at ${loc}.`);
        } else if (desc) {
          eventSentences.push(`${yearPhrase}${he} studied ${desc}.`);
        } else if (loc) {
          eventSentences.push(`${yearPhrase}${he} pursued ${his} education in ${loc}.`);
        }
      } else if (type === 'career' || type.includes('job') || type.includes('work')) {
        if (desc && loc) {
          eventSentences.push(`${yearPhrase}${he} worked as ${desc} in ${loc}.`);
        } else if (desc) {
          eventSentences.push(`${yearPhrase}${he} built a career as ${desc}.`);
        }
      } else if (type.includes('military') || type.includes('service')) {
        eventSentences.push(`${yearPhrase}${he} served in the military${desc ? ` (${desc})` : ''}.`);
      } else if (type.includes('immigration') || type.includes('migration')) {
        if (loc) {
          eventSentences.push(`${yearPhrase}${he} relocated to ${loc}${desc ? `, ${desc}` : ''}.`);
        }
      } else if (type.includes('retirement')) {
        eventSentences.push(`${yearPhrase}${he} retired${desc ? ` from ${desc}` : ''}${loc ? ` in ${loc}` : ''}.`);
      } else if (type.includes('award') || type.includes('honour') || type.includes('honor')) {
        eventSentences.push(`${yearPhrase}${he} received ${desc || 'a notable recognition'}${loc ? ` in ${loc}` : ''}.`);
      } else if (desc) {
        eventSentences.push(`${yearPhrase}${desc}${loc ? ` (${loc})` : ''}.`);
      }
    }

    // Capitalize first letter of each sentence properly
    const cleaned = eventSentences.map(s => s.charAt(0).toUpperCase() + s.slice(1));
    if (cleaned.length > 0) {
      paragraphs.push(cleaned.join(' '));
    }
  }

  // ── Paragraph 6: Occupation (fallback if no career events) ────────────────

  if (person.occupation && !lifeEvents?.some(e => e.eventType.toLowerCase().includes('career'))) {
    paragraphs.push(`${name}'s occupation ${was} ${person.occupation}.`);
  }

  // ── Paragraph 7: Death ────────────────────────────────────────────────────

  if (isDeceased && deathYear) {
    const parts: string[] = [];
    parts.push(`${name} passed away in ${deathYear}`);
    if (person.deathPlace) parts[0] += ` in ${person.deathPlace}`;
    if (birthYear) {
      const age = deathYear - birthYear;
      if (age > 0) parts[0] += `, at the age of ${age}`;
    }
    parts[0] += '.';

    if (children.length > 0 || spouses.length > 0) {
      parts.push(`${His} memory lives on through ${his} family.`);
    }

    paragraphs.push(parts.join(' '));
  }

  // ── Paragraph 8: Cultural heritage ────────────────────────────────────────

  const culturalParts: string[] = [];
  if (person.religion) culturalParts.push(person.religion);
  if (person.caste) culturalParts.push(`from the ${person.caste} community`);
  if (person.gotra) culturalParts.push(`of the ${person.gotra} gotra`);
  if (person.nativePlace) culturalParts.push(`with roots in ${person.nativePlace}`);

  if (culturalParts.length > 0) {
    const joined = culturalParts.join(', ');
    // Capitalize first word
    paragraphs.push(`${name} ${was} ${joined.charAt(0).toLowerCase() + joined.slice(1)}.`);
  }

  return paragraphs.join('\n\n');
}

/** Format a date string as "Month Day, Year" */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}
