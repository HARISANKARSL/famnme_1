/**
 * MoveChildrenPrompt - Modal to confirm and choose which children of a single-parent family
 * should be moved to the newly created spouse union.
 */

import { Users, Check } from 'lucide-react'
import type { Person, Union } from '@/types'
import { useState } from 'react'

interface MoveChildrenPromptProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedChildIds: string[]) => void
  referencePerson: Person
  newSpouse: Person
  existingChildren: Person[]
  singleParentUnion: Union
}

export function MoveChildrenPrompt({
  isOpen,
  onClose,
  onConfirm,
  referencePerson,
  newSpouse,
  existingChildren,
}: MoveChildrenPromptProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    existingChildren.map((c) => c.personId)
  )

  if (!isOpen) return null

  const spouseFullName = `${newSpouse.firstName} ${newSpouse.lastName || ''}`.trim()
  const referenceFullName = `${referencePerson.firstName} ${referencePerson.lastName || ''}`.trim()

  const handleToggleChild = (childId: string) => {
    setSelectedIds((prev) =>
      prev.includes(childId)
        ? prev.filter((id) => id !== childId)
        : [...prev, childId]
    )
  }

  const handleToggleAll = () => {
    if (selectedIds.length === existingChildren.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(existingChildren.map((c) => c.personId))
    }
  }

  const handleMoveClick = () => {
    if (selectedIds.length === 0) {
      onClose()
    } else {
      onConfirm(selectedIds)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 transition-all duration-300">
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0] dark:border-[#2a2a2a] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center gap-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-[#2a2a2a]/20 dark:to-[#3a3a3a]/20">
          <div className="p-3 bg-[#E8EDFF] dark:bg-[#25327A]/30 rounded-xl">
            <Users className="w-6 h-6 text-[#2F3E8F]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-[#f5f5f5]">
              Associate Children
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Select which children belong to the new union with {spouseFullName}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            You just added <span className="font-semibold text-[#2F3E8F]">{spouseFullName}</span> as the spouse of <span className="font-semibold">{referenceFullName}</span>.
            Choose the children of <span className="font-semibold">{referenceFullName}</span> who should also be associated with <span className="font-semibold">{spouseFullName}</span>:
          </div>

          {/* Select All Toggle */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Children List ({selectedIds.length}/{existingChildren.length} selected)
            </span>
            <button
              onClick={handleToggleAll}
              className="text-xs font-medium text-[#2F3E8F] hover:underline"
            >
              {selectedIds.length === existingChildren.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Children List */}
          <div className="border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-[#2a2a2a]">
            {existingChildren.map((child) => {
              const isSelected = selectedIds.includes(child.personId)
              const childName = `${child.firstName} ${child.lastName || ''}`.trim()
              return (
                <div
                  key={child.personId}
                  onClick={() => handleToggleChild(child.personId)}
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${
                    isSelected ? 'bg-blue-50/30 dark:bg-[#25327A]/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center font-semibold text-xs text-gray-600 dark:text-gray-300">
                      {child.firstName?.[0] || '?'}
                    </div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {childName}
                      </span>
                      <p className="text-xs text-gray-400 capitalize">
                        {child.gender || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-[#2F3E8F] bg-[#2F3E8F] text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Please note:</strong> The selected children will be moved to the union between {referenceFullName} and {spouseFullName}. Unselected children will remain in the single-parent family.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-[#222]/30 border-t border-gray-100 dark:border-[#2a2a2a] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl transition-all border border-gray-200 dark:border-[#3a3a3a]"
          >
            Skip
          </button>
          <button
            onClick={handleMoveClick}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#2F3E8F] hover:bg-[#25327A] rounded-xl transition-all shadow-md shadow-blue-500/10"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}
