import { useMemo } from 'react'
import { Users, Heart, GitBranch, Clock } from 'lucide-react'
import type { TreeStatistics } from '@/services/neo4jDataService'
import type { Person } from '@/types'
import { useTheme } from '@/contexts/ThemeContext'
import type { Relationship } from '@/services/elkLayoutService'

interface Props {
  statistics: TreeStatistics | null
  persons: Person[]
  unions: Array<{ unionId: string }>
  relationships?: Relationship[]
}

export function FamilyInsightsSection({ statistics, persons, unions, relationships = [] }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const validPersons = useMemo(() => {
    return persons.filter(p => p.firstName && p.firstName.trim() !== '')
  }, [persons])

  const validUnions = useMemo(() => {
    if (!relationships || relationships.length === 0) return unions;
    return unions.filter(u => {
      const partnerIds = relationships
        .filter(r => r.type === 'PARTNER_IN' && r.toId === u.unionId)
        .map(r => r.fromId);
      
      // If we don't have at least 2 partners, then the spouse is missing/placeholder
      if (partnerIds.length < 2) return false;
      
      // If any partner is a placeholder (does not exist in validPersons or is deleted/proxy), don't count
      const hasPlaceholder = partnerIds.some(pid => {
        const p = validPersons.find(x => x.personId === pid);
        if (!p) return true;
        const isProxy = (p as any).isProxy || (p.personId && p.personId.includes('_proxy_'));
        return isProxy || p.isDeleted === true;
      });
      
      return !hasPlaceholder;
    });
  }, [unions, relationships, validPersons]);

  // Fallback client-side stats while API loads
  const fallback = useMemo(() => {
    const totalMembers = validPersons.length
    const generations = totalMembers > 0 ? Math.max(1, Math.ceil(Math.log2(totalMembers + 1))) : 0
    const marriages = validUnions.length
    const living = validPersons.filter(p => p.isLiving !== false && !p.deathDate).length
    const deceased = totalMembers - living
    return { totalMembers, generations, marriages, living, deceased }
  }, [validPersons, validUnions])

  const memberCount = fallback.totalMembers
  const genCount = statistics?.generationCount ?? fallback.generations
  const marriageCount = fallback.marriages
  const livingCount = fallback.living
  const deceasedCount = fallback.deceased

  if (memberCount === 0) return null

  const oldestPerson = statistics?.oldestLivingPerson
  const avgAge = statistics?.averageAgeAtDeath

  const getInsightColor = (color: string) => {
    if (!isDark) return color
    switch (color) {
      case '#2F3E8F': return '#7B8FD4'
      case '#C47A8A': return '#D49AA6'
      case '#7B8C5E': return '#9AB07E'
      case '#8B7355': return '#C2A46D'
      case '#5A7E8E': return '#7BA3B5'
      default: return color
    }
  }

  const insights = [
    {
      icon: Users,
      color: getInsightColor('#2F3E8F'),
      text: (
        <>
          Your family has grown to <strong>{memberCount} members</strong> across <strong>{genCount} generation{genCount !== 1 ? 's' : ''}</strong>
        </>
      ),
    },
    {
      icon: Heart,
      color: getInsightColor('#C47A8A'),
      text: (
        <>
          <strong>{marriageCount} union{marriageCount !== 1 ? 's' : ''}</strong> have shaped your lineage
        </>
      ),
    },
    {
      icon: GitBranch,
      color: getInsightColor('#7B8C5E'),
      text: (
        <>
          <strong>{livingCount} living</strong> and <strong>{deceasedCount} remembered</strong> family members
        </>
      ),
    },
  ]

  if (oldestPerson) {
    insights.push({
      icon: Clock,
      color: getInsightColor('#8B7355'),
      text: (
        <>
          Oldest living member: <strong>{oldestPerson.firstName} {oldestPerson.lastName}</strong>
          {oldestPerson.birthDate && (
            <>, born {new Date(oldestPerson.birthDate).getFullYear()}</>
          )}
        </>
      ),
    })
  }

  if (avgAge && avgAge > 0) {
    insights.push({
      icon: Clock,
      color: getInsightColor('#5A7E8E'),
      text: (
        <>Average lifespan in your family: <strong>{Math.round(avgAge)} years</strong></>
      ),
    })
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #1A1A1E 0%, #121214 100%)'
          : 'linear-gradient(180deg, #FFFFFF 0%, #FDFBF8 100%)',
        boxShadow: isDark
          ? '0 4px 20px rgba(0, 0, 0, 0.4)'
          : '0 4px 20px rgba(139, 111, 78, 0.08)',
        border: isDark ? '1px solid #2a2a30' : '1px solid #EDE4DA',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
        Family Insights
      </h3>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${insight.color}18` }}
              >
                <Icon size={15} style={{ color: insight.color }} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#B8A090' : '#6B5A4A' }}>
                {insight.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
