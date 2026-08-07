/**
 * InterviewCapture — Full-screen elder-friendly guided interview flow
 *
 * Flow: Template selection → Question/Answer loop → Person picker → Save
 * Audio recordings auto-transcribe via AI and appear in the textarea.
 * On save: creates structured Interview entity with per-answer media uploads.
 */

import { useState, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Mic, MicOff, Camera, Home, Heart, Train, Gem, Briefcase, Users, MessageCircle, Star, Check, Loader2, Search } from 'lucide-react';
import { INTERVIEW_TEMPLATES } from '@/data/interviewTemplates';
import type { InterviewTemplate } from '@/data/interviewTemplates';
import { createInterview, uploadAnswerAudio, uploadAnswerPhoto } from '@/services/interviewApiService';
import { resolveBackendUrl } from '@/config/api';

interface InterviewCaptureProps {
  treeId: string;
  persons: Array<{ personId: string; firstName: string; lastName: string; profilePhotoUrl?: string | null }>;
  onClose: () => void;
  onComplete: () => void;
}

const ICON_MAP: Record<string, typeof Home> = {
  home: Home, heart: Heart, train: Train, sparkles: Gem,
  briefcase: Briefcase, users: Users, 'message-circle': MessageCircle, star: Star,
};

type Step = 'templates' | 'questions' | 'person-picker';

export function InterviewCapture({ treeId, persons, onClose, onComplete }: InterviewCaptureProps) {
  const [step, setStep] = useState<Step>('templates');
  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { text: string; audioBlob?: Blob; photoFile?: File }>>({});
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personSearch, setPersonSearch] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const question = template?.questions[questionIdx];
  const answer = question ? answers[question.id] : undefined;

  const updateAnswer = (qId: string, update: Partial<{ text: string; audioBlob: Blob; photoFile: File }>) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...{ text: '' }, ...prev[qId], ...update } }));
  };

  // Transcribe audio blob via backend AI
  const transcribeAudioBlob = async (blob: Blob, questionId: string) => {
    setTranscribing(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      const token = localStorage.getItem('auth_token');
      const apiBase = resolveBackendUrl('/api');
      const res = await fetch(`${apiBase}/tree/${treeId}/memories/ai-transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ audioBase64: base64, mimeType: 'audio/webm' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription) {
          const currentText = answers[questionId]?.text || '';
          const separator = currentText.trim() ? '\n\n' : '';
          updateAnswer(questionId, { text: currentText + separator + data.transcription });
        }
      }
    } catch (err) {
      console.error('Audio transcription failed:', err);
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = useCallback(async () => {
    if (!question) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        updateAnswer(question.id, { audioBlob: blob });
        stream.getTracks().forEach(t => t.stop());
        transcribeAudioBlob(blob, question.id);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* mic not available */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, answers]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }, []);

  const handleSubmit = async () => {
    if (!template || !selectedPersonId) return;
    setSubmitting(true);
    try {
      const selectedPerson = persons.find(p => p.personId === selectedPersonId);

      setSubmitProgress('Saving interview...');
      const result = await createInterview(treeId, {
        templateId: template.id,
        templateTitle: template.title,
        intervieweeName: selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : undefined,
        intervieweePersonId: selectedPersonId,
        answers: template.questions.map((q, idx) => ({
          questionId: q.id,
          questionText: q.question,
          answerText: answers[q.id]?.text || '',
          sortOrder: idx,
        })),
      });

      // Fetch created answers to get their IDs
      const { fetchInterview: fetchFullInterview } = await import('@/services/interviewApiService');
      const fullInterview = await fetchFullInterview(result.interviewId);
      const createdAnswers = fullInterview.answers;

      // Upload audio and photo files per answer
      for (const q of template.questions) {
        const a = answers[q.id];
        const createdAnswer = createdAnswers.find(ca => ca.questionId === q.id);
        if (!createdAnswer) continue;

        if (a?.audioBlob) {
          setSubmitProgress(`Uploading audio for Q${createdAnswer.sortOrder + 1}...`);
          await uploadAnswerAudio(result.interviewId, createdAnswer.answerId, a.audioBlob);
        }
        if (a?.photoFile) {
          setSubmitProgress(`Uploading photo for Q${createdAnswer.sortOrder + 1}...`);
          await uploadAnswerPhoto(result.interviewId, createdAnswer.answerId, a.photoFile);
        }
      }

      onComplete();
    } catch (err) {
      console.error('Failed to save interview:', err);
    } finally {
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  // Filter persons for person picker
  const filteredPersons = persons.filter(p => {
    if (!personSearch.trim()) return true;
    const q = personSearch.toLowerCase();
    return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q);
  });

  // ============================================================================
  // Template selection screen
  // ============================================================================
  if (step === 'templates') {
    return (
      <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0a0a0a] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <X className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Interview an Elder</h1>
            <p className="text-sm text-[#8B7355] dark:text-[#999] mt-0.5">Choose a topic to guide the conversation</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {INTERVIEW_TEMPLATES.map(t => {
              const Icon = ICON_MAP[t.icon] || Star;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTemplate(t); setStep('questions'); setQuestionIdx(0); }}
                  className="flex items-start gap-4 p-5 rounded-2xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:border-[#2F3E8F]/40 hover:bg-[#2F3E8F]/[0.02] transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#2F3E8F]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{t.title}</p>
                    <p className="text-[13px] text-[#8B7355] dark:text-[#999] mt-1">{t.description}</p>
                    <p className="text-[11px] text-[#B8A090] dark:text-[#666] mt-2">{t.questions.length} questions</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Person picker (final step before save)
  // ============================================================================
  if (step === 'person-picker') {
    return (
      <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0a0a0a] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <button onClick={() => setStep('questions')} className="p-2 -ml-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <ChevronLeft className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
          </button>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Who are you interviewing?</p>
            <p className="text-[11px] text-[#B8A090] dark:text-[#666]">Select the family member</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <X className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={personSearch}
              onChange={e => setPersonSearch(e.target.value)}
              placeholder="Search family members..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-[#E2E8F0]/60 dark:border-[#2a2a2a] rounded-xl bg-white dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] focus:border-[#2F3E8F] focus:ring-1 focus:ring-[#2F3E8F] outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-1.5 max-w-lg mx-auto">
            {filteredPersons.map(p => (
              <button
                key={p.personId}
                onClick={() => setSelectedPersonId(p.personId)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  selectedPersonId === p.personId
                    ? 'bg-[#2F3E8F]/10 border-2 border-[#2F3E8F]'
                    : 'border-2 border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#E8EDFF] overflow-hidden flex-shrink-0">
                  {p.profilePhotoUrl ? (
                    <img src={resolveBackendUrl(p.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-sm text-[#2F3E8F] font-medium">
                      {p.firstName[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-[#f5f5f5] truncate">{p.firstName} {p.lastName}</p>
                </div>
                {selectedPersonId === p.personId && (
                  <Check className="w-5 h-5 text-[#2F3E8F] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex justify-between">
          <button
            onClick={() => setStep('questions')}
            className="h-12 px-6 rounded-xl text-[15px] font-medium text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPersonId || submitting}
            className="h-12 px-8 rounded-xl text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
          >
            {submitting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{submitProgress || 'Saving...'}</span>
            ) : 'Save Interview'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Question flow
  // ============================================================================
  if (!template) return null;
  const totalQ = template.questions.length;
  const isLast = questionIdx === totalQ - 1;
  const progress = ((questionIdx + 1) / totalQ) * 100;

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
        <button onClick={() => { if (questionIdx > 0) setQuestionIdx(i => i - 1); else setStep('templates'); }}
          className="p-2 -ml-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <ChevronLeft className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <p className="text-[13px] font-medium text-[#8B7355] dark:text-[#999]">{template.title}</p>
          <p className="text-[11px] text-[#B8A090] dark:text-[#666]">Question {questionIdx + 1} of {totalQ}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
          <X className="w-5 h-5 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#E2E8F0]/40 dark:bg-[#2a2a2a]">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #2F3E8F, #25327A)' }} />
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          <p className="text-[22px] sm:text-[26px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] leading-relaxed text-center mb-8">
            {question?.question}
          </p>

          <textarea
            value={answer?.text || ''}
            onChange={(e) => updateAnswer(question!.id, { text: e.target.value })}
            placeholder={question?.placeholder || 'Type your answer or record your voice...'}
            className="w-full min-h-[150px] p-4 text-[18px] leading-relaxed rounded-2xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-[#f9f9f9] dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] dark:placeholder:text-[#555] focus:border-[#2F3E8F] focus:ring-1 focus:ring-[#2F3E8F] outline-none resize-none"
          />

          {transcribing && (
            <div className="flex items-center justify-center gap-2 mt-3 text-[13px] text-[#2F3E8F]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcribing your voice...
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {question?.answerModes.includes('voice') && (
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={transcribing}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  recording
                    ? 'bg-red-500 text-white animate-pulse'
                    : transcribing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 text-[#2F3E8F] hover:bg-[#2F3E8F]/20'
                }`}
              >
                {recording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            )}
            {question?.answerModes.includes('photo') && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 text-[#2F3E8F] hover:bg-[#2F3E8F]/20 transition-all"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && question) updateAnswer(question.id, { photoFile: f });
                  }}
                />
              </>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex flex-col items-center gap-2 mt-4">
            {answer?.audioBlob && !transcribing && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Voice recorded & transcribed
                </span>
                <audio controls className="h-8 w-64" src={URL.createObjectURL(answer.audioBlob)} />
              </div>
            )}
            {answer?.photoFile && (
              <div className="flex items-center gap-2">
                <img src={URL.createObjectURL(answer.photoFile)} alt="Attached" className="w-12 h-12 rounded-lg object-cover border border-[#E2E8F0]" />
                <span className="text-[12px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Photo attached
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a] flex justify-between">
        <button
          onClick={() => { if (questionIdx > 0) setQuestionIdx(i => i - 1); }}
          disabled={questionIdx === 0}
          className="h-12 px-6 rounded-xl text-[15px] font-medium text-[#8B7355] dark:text-[#999] disabled:opacity-30 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
        >
          Back
        </button>
        {isLast ? (
          <button
            onClick={() => setStep('person-picker')}
            disabled={transcribing}
            className="h-12 px-8 rounded-xl text-[15px] font-semibold text-white flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
          >
            Next <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setQuestionIdx(i => i + 1)}
            disabled={transcribing}
            className="h-12 px-8 rounded-xl text-[15px] font-semibold text-white flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
          >
            Next <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
