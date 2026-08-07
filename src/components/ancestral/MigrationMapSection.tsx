import { MapPin, ArrowRight } from 'lucide-react'
import { Section, EmptyHint } from './ui'
import type { AncestralIdentityData } from '@/services/ancestralIdentityApiService'

interface Props {
  migration: AncestralIdentityData['migration']
}

export function MigrationMapSection({ migration }: Props) {
  if (migration.path.length === 0) {
    return (
      <Section title="Migration Path" icon={<MapPin className="w-4 h-4" />}>
        <EmptyHint>Add birth places to your family members to see their migration story.</EmptyHint>
      </Section>
    )
  }

  return (
    <Section title="Migration Path" icon={<MapPin className="w-4 h-4" />}>
      <div className="relative py-4 px-2 rounded-xl bg-gradient-to-br from-[#F6F2EA] to-[#E8DFCC] dark:from-[#2A241E] dark:to-[#3A342C] border border-[#E2DBCE]/60">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {migration.path.map((place, i) => (
            <div key={`${place}-${i}`} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center shadow-md">
                  <MapPin className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="mt-1 text-[11px] md:text-[12px] font-medium text-[#3D2E1F] dark:text-[#F3E9DC] max-w-[120px] text-center">
                  {place}
                </div>
              </div>
              {i < migration.path.length - 1 && (
                <ArrowRight className="w-4 h-4 text-[#8B7355] shrink-0 mt-[-14px]" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 text-center text-[11px] text-[#8B7355]">
          From earliest known ancestors to present
        </div>
      </div>
    </Section>
  )
}
