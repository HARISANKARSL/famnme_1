import { useMemo } from 'react'
import { Gem, MapPin, BookOpen } from 'lucide-react'
import type { Person, Union } from '@/types'
import { getFamilySpiritualProfile } from '@/services/templeConnectionService'
import { useTheme } from '@/contexts/ThemeContext'

interface Props {
  persons: Person[]
  unions: Union[]
  onOpenTemples?: () => void
}

export function CulturalRootsSection({ persons, unions: _unions, onOpenTemples }: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const profile = useMemo(() => getFamilySpiritualProfile(persons), [persons])

  const hasContent = profile.religion || profile.gotras.length > 0 || profile.nativePlaces.length > 0 || profile.deityAffinities.length > 0

  if (!hasContent) {
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
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#C2A46D' : '#A0764E' }}>
          Your Cultural Roots
        </h3>
        <p className="text-sm text-center py-3" style={{ color: isDark ? '#666666' : '#C4B5A5' }}>
          Add cultural details to family members to see your heritage
        </p>
      </div>
    )
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
        Your Cultural Roots
      </h3>

      <div className="space-y-3">
        {/* Religion */}
        {profile.religion && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(123,143,212,0.15)' : 'rgba(194,120,74,0.1)' }}>
              <BookOpen size={13} style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>Religion</p>
              <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{profile.religion}</p>
            </div>
          </div>
        )}

        {/* Gotras */}
        {profile.gotras.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(123,140,94,0.2)' : 'rgba(123,140,94,0.1)' }}>
              <Gem size={13} style={{ color: isDark ? '#82A370' : '#6B8E5A' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>Gotra{profile.gotras.length > 1 ? 's' : ''}</p>
              <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{profile.gotras.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Deity affinities */}
        {profile.deityAffinities.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(123,143,212,0.15)' : 'rgba(194,120,74,0.08)' }}>
              <Gem size={13} style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>Deity Affinities</p>
              <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>{profile.deityAffinities.slice(0, 3).join(', ')}</p>
            </div>
          </div>
        )}

        {/* Native places */}
        {profile.nativePlaces.length > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(90,126,142,0.2)' : 'rgba(90,126,142,0.1)' }}>
              <MapPin size={13} style={{ color: isDark ? '#7BA3B5' : '#5A7E8E' }} />
            </div>
            <div>
              <p className="text-[11px]" style={{ color: isDark ? '#999999' : '#B8A090' }}>
                Roots in {profile.states.length} State{profile.states.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm font-medium" style={{ color: isDark ? '#F3F2F1' : '#3D2E1F' }}>
                {profile.nativePlaces.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {onOpenTemples && (
        <button
          onClick={onOpenTemples}
          className="mt-4 text-xs font-medium transition-colors"
          style={{ color: isDark ? '#7B8FD4' : '#2F3E8F' }}
        >
          Explore sacred connections
        </button>
      )}
    </div>
  )
}
