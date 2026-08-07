import { Briefcase, GraduationCap, Users } from 'lucide-react'
import { Section, Chip, EmptyHint } from './ui'
import type { AncestralIdentityData } from '@/services/ancestralIdentityApiService'

interface Props {
  patterns: AncestralIdentityData['patterns']
}

export function FamilyPatternsSection({ patterns }: Props) {
  const hasAny = patterns.professions.length > 0 || patterns.education.length > 0 || patterns.roles.length > 0

  return (
    <Section title="Family Patterns" icon={<Users className="w-4 h-4" />}>
      {!hasAny && <EmptyHint>Add occupations and education to family members to see recurring patterns.</EmptyHint>}

      {patterns.professions.length > 0 && (
        <PatternGroup
          icon={<Briefcase className="w-4 h-4" />}
          title="Common professions"
          items={patterns.professions}
          variant="gold"
        />
      )}
      {patterns.education.length > 0 && (
        <PatternGroup
          icon={<GraduationCap className="w-4 h-4" />}
          title="Education trends"
          items={patterns.education}
          variant="earth"
        />
      )}
      {patterns.roles.length > 0 && (
        <PatternGroup
          icon={<Users className="w-4 h-4" />}
          title="Cultural roles"
          items={patterns.roles}
          variant="green"
        />
      )}
    </Section>
  )
}

function PatternGroup({
  icon,
  title,
  items,
  variant,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  variant: 'gold' | 'earth' | 'green'
}) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex items-center gap-2 mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#8B7355]">
        <span className="text-[#8B5E3C]">{icon}</span>
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => <Chip key={i} variant={variant}>{item}</Chip>)}
      </div>
    </div>
  )
}
