/**
 * MemoryPromptWidget — Religion-aware festival prompt or random interview question
 *
 * Uses detectFamilyReligion() to automatically determine the family's religion
 * from tree data (explicit field → family majority → surname → gotra → caste).
 * Shows only festivals matching the detected religion.
 */

import { useMemo } from 'react'
import { BookOpen, Camera, Gem } from 'lucide-react'
import { getActiveFestivalBundle } from '@/data/festivals'
import { INTERVIEW_TEMPLATES } from '@/data/interviewTemplates'
import { detectFamilyReligion } from '@/services/religionDetectionService'
import type { Person } from '@/types'

interface Props {
  persons: Person[]
  onAddMemory?: () => void
}

function getDailyIndex(max: number): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return day % max
}

export function MemoryPromptWidget({ persons, onAddMemory }: Props) {
  const detectedReligion = useMemo(() => detectFamilyReligion(persons), [persons])

  const content = useMemo(() => {
    // Check for active festival filtered by detected religion
    const festival = getActiveFestivalBundle(detectedReligion)
    if (festival) {
      const promptIdx = getDailyIndex(festival.prompts.length)
      return {
        type: 'festival' as const,
        emoji: festival.emoji,
        title: festival.festivalName,
        banner: festival.banner,
        question: festival.prompts[promptIdx].question,
      }
    }

    // Fallback: random interview template question
    const templateIdx = getDailyIndex(INTERVIEW_TEMPLATES.length)
    const template = INTERVIEW_TEMPLATES[templateIdx]
    const questionIdx = getDailyIndex(template.questions.length)
    return {
      type: 'interview' as const,
      emoji: '💬',
      title: template.title,
      banner: template.description,
      question: template.questions[questionIdx].question,
    }
  }, [detectedReligion])

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{content.emoji}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{content.title}</p>
          <p className="text-xs text-[#8B7355] mt-0.5">{content.banner}</p>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#F9FAFB] dark:bg-[#1e1e1e] rounded-lg p-3 border border-[#E2E8F0]/50">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Gem className="w-3 h-3 text-[#2F3E8F]" />
          <span className="text-[10px] text-[#2F3E8F] font-semibold uppercase tracking-wider">Today's Prompt</span>
        </div>
        <p className="text-sm text-[#3D2E1F] dark:text-[#f5f5f5] italic">"{content.question}"</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAddMemory}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#2F3E8F] text-white text-xs font-medium rounded-lg hover:bg-[#3B4DA6] transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Write a Story
        </button>
        <button
          onClick={onAddMemory}
          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#E2E8F0] text-[#8B7355] text-xs font-medium rounded-lg hover:bg-[#F4F6FA] transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Photo
        </button>
      </div>
    </div>
  )
}
