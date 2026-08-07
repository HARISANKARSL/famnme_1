import { useMemo } from 'react'
import { ArrowRight, Camera, Users, BookOpen, UserPlus } from 'lucide-react'
import type { SuggestionsResult, Suggestion } from '@/services/neo4jDataService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  suggestions: SuggestionsResult | null
  totalMembers: number
  onPersonClick?: (personId: string) => void
  onOpenMemories?: () => void
  onOpenAllPeople?: () => void
}

interface Prompt {
  id: string
  icon: typeof Camera
  color: string
  bgColor: string
  title: string
  subtitle: string
  action?: () => void
}

export function SmartPromptsSection({
  suggestions,
  totalMembers,
  onPersonClick,
  onOpenMemories,
  onOpenAllPeople,
}: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const getPromptColor = (color: string) => {
    if (!isDark) return color
    switch (color) {
      case '#2F3E8F': return '#7B8FD4'
      case '#5A7E8E': return '#7BA3B5'
      case '#6B8E5A': return '#82A370'
      default: return color
    }
  }

  const getPromptBgColor = (color: string) => {
    if (!isDark) return color
    if (color.includes('194,120,74')) return 'rgba(123, 143, 212, 0.15)'
    if (color.includes('90,126,142')) return 'rgba(123, 163, 181, 0.15)'
    if (color.includes('107,142,90')) return 'rgba(130, 163, 112, 0.15)'
    if (color.includes('194,112,112')) return 'rgba(212, 123, 123, 0.15)'
    return color
  }

  const prompts = useMemo(() => {
    const items: Prompt[] = []

    if (!suggestions) return items

    const stats = suggestions.stats as Record<string, number>
    const topSuggestions = suggestions.suggestions.slice(0, 3)

    // Top personalized suggestion
    if (topSuggestions.length > 0) {
      const top = topSuggestions[0] as Suggestion
      items.push({
        id: 'top-suggestion',
        icon: UserPlus,
        color: getPromptColor('#2F3E8F'),
        bgColor: getPromptBgColor('rgba(194,120,74,0.08)'),
        title: top.message || `Complete ${top.personName}'s profile`,
        subtitle: 'This will strengthen your family tree',
        action: top.personId ? () => onPersonClick?.(top.personId) : undefined,
      })
    }

    // Photo prompt
    if ((stats.missingPhoto ?? 0) > 5) {
      items.push({
        id: 'photos-prompt',
        icon: Camera,
        color: getPromptColor('#5A7E8E'),
        bgColor: getPromptBgColor('rgba(90,126,142,0.08)'),
        title: `Upload photos for ${stats.missingPhoto} members`,
        subtitle: 'Photos bring your family story to life',
        action: onOpenAllPeople,
      })
    }

    // Memories prompt
    if (totalMembers > 3) {
      items.push({
        id: 'memories-prompt',
        icon: BookOpen,
        color: getPromptColor('#6B8E5A'),
        bgColor: getPromptBgColor('rgba(107,142,90,0.08)'),
        title: "Document your family's origin story",
        subtitle: 'Memories preserve what names cannot',
        action: onOpenMemories,
      })
    }

    // Parents prompt
    if ((stats.missingParents ?? 0) > 3) {
      items.push({
        id: 'parents-prompt',
        icon: Users,
        color: getPromptColor('#2F3E8F'),
        bgColor: getPromptBgColor('rgba(194,112,112,0.08)'),
        title: `${stats.missingParents} members are missing parents`,
        subtitle: 'Extend your lineage further back',
        action: onOpenAllPeople,
      })
    }

    return items.slice(0, 3)
  }, [suggestions, totalMembers, onPersonClick, onOpenMemories, onOpenAllPeople, isDark])

  if (prompts.length === 0) return null

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
        What You Can Do Next
      </h3>

      <div className="space-y-2">
        {prompts.map(prompt => {
          const Icon = prompt.icon
          return (
            <button
              key={prompt.id}
              onClick={prompt.action}
              disabled={!prompt.action}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left hover:shadow-sm disabled:hover:shadow-none"
              style={{
                background: prompt.bgColor,
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${prompt.color}30` }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${prompt.color}15` }}
              >
                <Icon size={16} style={{ color: prompt.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{prompt.title}</p>
                <p className="text-xs mt-0.5" style={{ color: isDark ? '#B8A090' : '#8B7355' }}>{prompt.subtitle}</p>
              </div>
              <ArrowRight size={14} style={{ color: prompt.color }} className="shrink-0 opacity-50" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
