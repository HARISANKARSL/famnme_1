/**
 * Chip-tag configuration for the Institutions UI.
 *
 * Tags are optional labels a user attaches to a linked institution
 * (zero, one, or many). `family_main` is the primary/legacy alias for
 * connectionType='kula_devata' — picking it surfaces the institution in
 * the Heritage Summary Strip on the dashboard home.
 */

import type { TempleTag, TempleConnectionType } from '@/types'
import { Crown, Baby, HeartHandshake, Flame, Calendar, Mountain } from 'lucide-react'
import type { ComponentType } from 'react'

export interface TagMeta {
  value: TempleTag
  label: string
  description: string
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

export const TAG_CONFIG: TagMeta[] = [
  { value: 'family_main', label: "Family's main", description: 'Your kula devata / home church / family mosque', Icon: Crown },
  { value: 'birth',       label: 'Birth place',    description: 'Where you were blessed as a newborn',                Icon: Baby },
  { value: 'ceremony',    label: 'Ceremonies',     description: 'Weddings, naming, major family rituals',             Icon: HeartHandshake },
  { value: 'ancestral',   label: 'Ancestral',      description: "Ancestors' place of worship",                        Icon: Flame },
  { value: 'regular',     label: 'Regular',        description: 'Where you visit regularly',                          Icon: Calendar },
  { value: 'pilgrimage',  label: 'Pilgrimage',     description: 'A sacred destination',                               Icon: Mountain },
]

export function tagLabel(tag: TempleTag): string {
  return TAG_CONFIG.find(t => t.value === tag)?.label ?? tag
}

export function tagMeta(tag: TempleTag): TagMeta | undefined {
  return TAG_CONFIG.find(t => t.value === tag)
}

// Tag ⇄ legacy connectionType mapping. The production backend still requires
// connectionType, so callers derive it from the selected tags (or fall back
// to 'regular_visit' when no tag is picked).
const TAG_TO_CONNECTION: Record<TempleTag, TempleConnectionType> = {
  family_main: 'kula_devata',
  birth: 'birth_temple',
  ceremony: 'ceremony_location',
  ancestral: 'ancestral',
  regular: 'regular_visit',
  pilgrimage: 'pilgrimage',
}

export function deriveConnectionType(tags: TempleTag[] | undefined | null): TempleConnectionType {
  const first = tags?.[0]
  return (first && TAG_TO_CONNECTION[first]) || 'regular_visit'
}

/**
 * Faith-aware noun phrase used in hero titles, empty states, search
 * placeholders, etc. Single-faith selections speak in singular nouns; multi-
 * faith or unspecified speak in the inclusive "temple, church, or mosque".
 */
export function getSacredPlaceNoun(
  faithLabel: string | null | undefined,
  form: 'singular' | 'the-singular' | 'list' = 'singular',
): string {
  if (!faithLabel || faithLabel === 'Unknown') {
    return form === 'list' ? 'temple, church, or mosque' : 'sacred place'
  }
  // Multi-faith is stored as "Hindu,Christian" etc.
  if (faithLabel.includes(',')) {
    return form === 'list' ? 'temple, church, or mosque' : 'sacred place'
  }
  if (faithLabel === 'Hindu')                                   return 'temple'
  if (faithLabel === 'Christian')                               return 'church'
  if (faithLabel === 'Islam' || faithLabel === 'Muslim')        return 'mosque'
  return form === 'list' ? 'temple, church, or mosque' : 'sacred place'
}

/** Produces the hero headline: "Find your temple" / "Find your church" /
 *  "Find your mosque" / "Find your temple, church, or mosque". */
export function getFindHeadline(faithLabel: string | null | undefined): string {
  if (!faithLabel || faithLabel === 'Unknown' || faithLabel.includes(',')) {
    return 'Find your temple, church, or mosque'
  }
  const noun = getSacredPlaceNoun(faithLabel)
  return `Find your ${noun}`
}
