import { GitBranch } from 'lucide-react'
import { Section, FactRow, Chip, EmptyHint } from './ui'
import type { AncestralIdentityData } from '@/services/ancestralIdentityApiService'

interface Props {
  lineage: AncestralIdentityData['lineage']
}

export function LineageSection({ lineage }: Props) {
  const hasData = lineage.oldestAncestor || lineage.generations > 1 || lineage.spread.length > 0

  return (
    <Section title="Lineage Insights" icon={<GitBranch className="w-4 h-4" />}>
      {!hasData && <EmptyHint>Add ancestors to your tree to see your lineage unfold.</EmptyHint>}

      {lineage.oldestAncestor && (
        <FactRow
          label="Oldest known"
          value={
            <div>
              <div className="font-medium">{lineage.oldestAncestor.name}</div>
              {(lineage.oldestAncestor.birthYear || lineage.oldestAncestor.place) && (
                <div className="text-[12px] text-[#8B7355] mt-0.5">
                  {[lineage.oldestAncestor.birthYear, lineage.oldestAncestor.place].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          }
        />
      )}

      {lineage.generations > 0 && (
        <FactRow
          label="Generations"
          value={
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-semibold text-[#3D2E1F] dark:text-[#F3E9DC]">
                {lineage.generations}
              </span>
              <span className="text-[12px] text-[#8B7355]">known in your tree</span>
            </div>
          }
        />
      )}

      {lineage.spread.length > 0 && (
        <FactRow
          label="Family spread"
          value={
            <div className="flex flex-wrap gap-1.5">
              {lineage.spread.slice(0, 8).map((place, i) => (
                <Chip key={i} variant="green">{place}</Chip>
              ))}
            </div>
          }
        />
      )}
    </Section>
  )
}
