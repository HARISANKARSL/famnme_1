import type { ReactNode } from 'react'
import { Gem, Languages, PartyPopper, Utensils, Flower } from 'lucide-react'
import { Section, EmptyHint } from './ui'
import type { AncestralIdentityData } from '@/services/ancestralIdentityApiService'

interface Props {
  culture: AncestralIdentityData['culture']
}

export function CulturalContextSection({ culture }: Props) {
  const hasAny =
    culture.language ||
    culture.festivals.length > 0 ||
    culture.traditions.length > 0 ||
    culture.food.length > 0

  return (
    <Section title="Cultural Context" icon={<Gem className="w-4 h-4" />}>
      {!hasAny && <EmptyHint>Add religion, native place, or language to see cultural context.</EmptyHint>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {culture.language && (
          <CulturalCard
            icon={<Languages className="w-4 h-4" />}
            title="Language"
            items={[culture.language]}
            note={culture.languageNotes}
          />
        )}
        {culture.festivals.length > 0 && (
          <CulturalCard
            icon={<PartyPopper className="w-4 h-4" />}
            title="Festivals"
            items={culture.festivals}
          />
        )}
        {culture.traditions.length > 0 && (
          <CulturalCard
            icon={<Flower className="w-4 h-4" />}
            title="Traditions"
            items={culture.traditions}
          />
        )}
        {culture.food.length > 0 && (
          <CulturalCard
            icon={<Utensils className="w-4 h-4" />}
            title="Food & Cuisine"
            items={culture.food}
          />
        )}
      </div>
    </Section>
  )
}

function CulturalCard({ icon, title, items, note }: {
  icon: ReactNode
  title: string
  items: string[]
  note?: string
}) {
  return (
    <div className="rounded-xl border border-[#E2DBCE] dark:border-[#3A342C] bg-[#F6F2EA]/60 dark:bg-[#1F1C18]/60 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-[#8B5E3C]">{icon}</div>
        <h4 className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3E9DC]">
          {title}
        </h4>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] md:text-[12px] font-medium bg-white dark:bg-[#2A241E] text-[#3D2E1F] dark:text-[#F3E9DC] border border-[#E2DBCE] dark:border-[#3A342C]"
          >
            {item}
          </span>
        ))}
      </div>
      {note && (
        <p className="mt-2 text-[12px] leading-relaxed text-[#6B5842] dark:text-[#A8A19A]">
          {note}
        </p>
      )}
    </div>
  )
}
