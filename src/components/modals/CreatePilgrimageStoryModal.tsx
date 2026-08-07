/**
 * CreatePilgrimageStoryModal
 *
 * Guided 4-step wizard to create a structured Temple Pilgrimage story.
 * Steps: 1) Pick temple, 2) The Journey, 3) The Rituals, 4) The Legacy → Preview & Save
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchTemples } from '@/data/temples';
import type { Temple } from '@/data/temples/types';
import { createStory, addSlide } from '@/services/storyApiService';

interface CreatePilgrimageStoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  treeId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
}

const STEPS = [
  { label: 'The Temple', hint: 'Which temple did your family visit?' },
  { label: 'The Journey', hint: 'How did your family travel? Who came?' },
  { label: 'The Rituals', hint: 'What rituals or prayers were performed?' },
  { label: 'The Moment', hint: 'One specific memory — a sight, sound, or feeling' },
  { label: 'The Legacy', hint: 'What does this temple mean to your family?' },
];

export function CreatePilgrimageStoryModal({
  open,
  onClose,
  onCreated,
  treeId,
  currentUserId: _currentUserId,
  currentUserName,
  currentUserAvatar,
}: CreatePilgrimageStoryModalProps) {
  const [step, setStep] = useState(0);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [templeSearch, setTempleSearch] = useState('');
  const [templeResults, setTempleResults] = useState<Temple[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '', '']); // 4 text answers (steps 1-4)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const stepIndex = step; // 0 = temple, 1-4 = text steps
  const currentAnswer = stepIndex > 0 ? answers[stepIndex - 1] : '';
  const canProceed = stepIndex === 0 ? !!selectedTemple : currentAnswer.trim().length >= 10;

  function handleSearchChange(q: string) {
    setTempleSearch(q);
    if (q.length >= 2) setTempleResults(searchTemples(q, 6));
    else setTempleResults([]);
  }

  function handleSelectTemple(t: Temple) {
    setSelectedTemple(t);
    setTempleSearch(t.name);
    setTempleResults([]);
  }

  function handleAnswerChange(value: string) {
    const next = [...answers];
    next[stepIndex - 1] = value;
    setAnswers(next);
  }

  async function handleSave() {
    if (!selectedTemple) return;
    setSaving(true);
    setError('');
    try {
      const story = await createStory(treeId, {
        title: `Pilgrimage to ${selectedTemple.name}`,
        authorName: currentUserName,
        authorAvatarUrl: currentUserAvatar,
      });

      const slideLabels = [
        { caption: 'The Journey', body: answers[0] },
        { caption: 'The Rituals', body: answers[1] },
        { caption: 'The Moment', body: answers[2] },
        { caption: 'The Legacy', body: answers[3] },
      ];

      for (const slide of slideLabels) {
        if (slide.body.trim()) {
          await addSlide(story.storyId, {
            captionText: `**${slide.caption}**\n\n${slide.body}`,
            captionPosition: 'bottom',
          });
        }
      }

      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setStep(0);
    setSelectedTemple(null);
    setTempleSearch('');
    setTempleResults([]);
    setAnswers(['', '', '', '']);
    setError('');
    onClose();
  }

  const isLastStep = step === STEPS.length - 1;
  const stepInfo = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#1E1E1E] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Landmark className="w-4 h-4 text-[#2F3E8F] dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Pilgrimage Story</p>
            <p className="text-[11px] text-[#8B7355] dark:text-[#888]">Step {step + 1} of {STEPS.length}</p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#E2E8F0]/40 dark:bg-[#2a2a2a]">
          <div
            className="h-full bg-[#E8EDFF]0 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className={`flex-1 min-h-0 px-4 py-5 space-y-3 ${step === 0 ? 'overflow-visible' : 'overflow-y-auto overscroll-contain'}`}>
          <div>
            <p className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] mb-1">{stepInfo.label}</p>
            <p className="text-[12px] text-[#8B7355] dark:text-[#888]">{stepInfo.hint}</p>
          </div>

          {step === 0 ? (
            <div className="relative">
              <input
                type="text"
                value={templeSearch}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Search temple name..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] focus:outline-none focus:border-blue-400"
              />
              {templeResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1c1c1c] border border-[#E2E8F0] dark:border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden">
                  {templeResults.map(t => (
                    <button
                      key={t.templeId}
                      onClick={() => handleSelectTemple(t)}
                      className="w-full text-left px-3 py-2 text-[12px] text-[#3D2E1F] dark:text-[#ddd] hover:bg-[#E8EDFF] dark:hover:bg-blue-900/20 border-b border-[#E2E8F0]/40 last:border-0"
                    >
                      <span className="font-medium">{t.name}</span>
                      {t.location && <span className="text-[#8B7355] dark:text-[#888] ml-1">· {t.location}</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedTemple && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E8EDFF] dark:bg-blue-900/20 border border-[#2F3E8F]/30/60">
                  <Landmark className="w-3.5 h-3.5 text-[#2F3E8F] shrink-0" />
                  <span className="text-[12px] text-blue-800 dark:text-blue-300 font-medium">{selectedTemple.name}</span>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={currentAnswer}
              onChange={e => handleAnswerChange(e.target.value)}
              placeholder={`Write about ${stepInfo.label.toLowerCase()}...`}
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] focus:outline-none focus:border-blue-400 resize-none"
            />
          )}

          {/* Preview on last step */}
          {isLastStep && selectedTemple && (
            <div className="mt-2 p-3 rounded-xl bg-[#E8EDFF] dark:bg-[#1a1a1a] border border-[#2F3E8F]/20 space-y-2">
              <p className="text-[11px] font-semibold text-[#25327A] uppercase tracking-wide">Story Preview</p>
              <p className="text-[13px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5]">Pilgrimage to {selectedTemple.name}</p>
              {STEPS.slice(1).map((s, i) => answers[i]?.trim() ? (
                <div key={s.label} className="space-y-0.5">
                  <p className="text-[10px] font-semibold text-[#8B7355] dark:text-[#888] uppercase tracking-wide">{s.label}</p>
                  <p className="text-[12px] text-[#5A4A3A] dark:text-[#ccc] line-clamp-2">{answers[i]}</p>
                </div>
              ) : null)}
            </div>
          )}

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {isLastStep ? (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canProceed || saving}
              className="bg-[#2F3E8F] hover:bg-[#3B4DA6] text-white gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />}
              Save Story
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              className="bg-[#2F3E8F] hover:bg-[#3B4DA6] text-white gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
