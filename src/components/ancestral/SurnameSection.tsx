import { useState } from 'react'
import { Feather, ChevronDown, ChevronUp } from 'lucide-react'
import { Section, FactRow, Chip, EmptyHint } from './ui'
import type { AncestralIdentityData } from '@/services/ancestralIdentityApiService'

interface Props {
  surname: AncestralIdentityData['surname']
}

export function SurnameSection({ surname }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!surname) {
    return (
      <Section title="Surname Intelligence" icon={<Feather className="w-4 h-4" />}>
        <EmptyHint>Add a surname to your profile to see the meaning and origin of your family name.</EmptyHint>
      </Section>
    )
  }

  return (
    <Section title="Surname Intelligence" icon={<Feather className="w-4 h-4" />}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[22px] md:text-[26px] font-serif font-semibold text-[#3D2E1F] dark:text-[#F3E9DC]">
          {surname.name}
        </span>
        {surname.originRegion && <Chip variant="earth">{surname.originRegion}</Chip>}
      </div>

      {surname.meaning && (
        <FactRow label="Meaning" value={surname.meaning} />
      )}
      {surname.originRegion && (
        <FactRow label="Origin" value={surname.originRegion} />
      )}
      {surname.communityNotes.length > 0 && (
        <FactRow
          label="Communities"
          value={
            <div className="flex flex-wrap gap-1.5">
              {surname.communityNotes.map((c, i) => <Chip key={i}>{c}</Chip>)}
            </div>
          }
        />
      )}
      {surname.historicalNotes && (
        <FactRow label="History" value={surname.historicalNotes} />
      )}

      {surname.learnMore && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8B5E3C] hover:text-[#5C4A2E] transition-colors"
          >
            {expanded ? 'Show less' : 'Learn more'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expanded && (
            <p className="mt-2 text-[13px] md:text-[14px] leading-relaxed text-[#5C4A2E] dark:text-[#C9BDA8]">
              {surname.learnMore}
            </p>
          )}
        </>
      )}
    </Section>
  )
}
