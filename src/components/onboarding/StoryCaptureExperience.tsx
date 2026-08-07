/**
 * StoryCaptureExperience — Full-screen AI-powered onboarding experience.
 *
 * Allows users to describe their family via voice or text, extracts entities
 * using AI, and builds a family tree automatically.
 *
 * Flow: User records/types → edits → records more → clicks "Process My Story"
 * → AI extracts entities → user reviews → builds tree.
 *
 * Phases:
 * 1. Priming — intro screen with Speak/Type options
 * 2. Input — record/stop/edit/process cycle with AI clarification
 * 3. Review — editable entity grid + mini tree preview
 * 4. Materializing — loading while creating tree
 * 5. Done — success (handled by parent via onComplete)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, Keyboard, ArrowRight, ArrowLeft, Loader2, TreePine,
  Gem, AlertCircle, ListChecks, Send, X, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { useStoryCapture, type CapturePhase, type InputSubState } from '@/hooks/useStoryCapture';
import { useToast } from '@/components/ui/use-toast';
import { EntityChip } from './EntityChip';
import { MiniTreePreview } from './MiniTreePreview';
import type { StoryEntity, StoryRelationship } from '@/services/storyParseService';

interface StoryCaptureExperienceProps {
  userId: string;
  onComplete: (treeId: string) => void;
  onFallbackToWizard: () => void;
  onBack?: () => void;
}

// ─── Example Prompts ──────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "I am Rahul. My father Mohan is a retired teacher from Pune. My mother Lakshmi is a homemaker.",
  "I have two brothers and a sister. My wife's name is Priya, she is from Kochi.",
  "My late grandfather was a farmer in our ancestral village near Palakkad.",
  "I have three children — my eldest son Arjun is an engineer, and my daughters Meera and Diya are studying.",
];

// ─── Clarification Card ──────────────────────────────────────────────────────

function ClarificationCard({
  question,
  onAnswer,
  onDismiss,
}: {
  question: string;
  onAnswer: (answer: string) => void;
  onDismiss: () => void;
}) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onAnswer(answer);
      setAnswer('');
    }
  };

  return (
    <div className="w-full px-4 py-3 bg-[#E8EDFF] dark:bg-zinc-900 border border-[#2F3E8F]/30 dark:border-zinc-850 rounded-2xl animate-fade-in">
      <div className="flex items-start gap-2 mb-2">
        <Gem className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{question}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Type your answer..."
          className="flex-1 px-3 py-2 text-base md:text-sm text-stone-800 dark:text-zinc-100 bg-white dark:bg-zinc-950
            border border-[#2F3E8F]/30 dark:border-zinc-800 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40
            h-11 md:h-9"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="p-2.5 bg-[#2F3E8F] text-white rounded-xl hover:bg-[#3B4DA6]
            active:scale-95 transition-all disabled:opacity-40
            h-11 md:h-9 w-11 md:w-9 flex items-center justify-center"
          title="Send answer"
        >
          <Send className="w-4 h-4" />
        </button>
        <button
          onClick={onDismiss}
          className="px-3.5 py-2 text-sm font-medium text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 rounded-xl
            transition-all h-11 md:h-9 flex items-center justify-center gap-1.5 shrink-0"
          title="Skip this question"
        >
          <span>Skip</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── No Members Message ──────────────────────────────────────────────────────

function NoMembersMessage({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="w-full px-4 py-3 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl animate-fade-in">
      <div className="flex items-start gap-2">
        <Gem className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-stone-600 dark:text-zinc-300 font-medium mb-1">
            I couldn&apos;t find any family members in your story yet.
          </p>
          <p className="text-xs text-stone-400 dark:text-zinc-400">
            Try mentioning names and relationships. For example:
            &ldquo;My father is Mohan and my mother is Lakshmi. I have a brother named Suresh.&rdquo;
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 text-stone-300 hover:text-stone-500 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Phase Components ─────────────────────────────────────────────────────────

function PrimingPhase({
  onStartVoice,
  onStartType,
  onFallback,
  onBack,
}: {
  onStartVoice: () => void;
  onStartType: () => void;
  onFallback: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] px-4 pb-20 md:pb-4 animate-fade-in w-full">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-stone-500 hover:text-stone-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}
      {/* Hero */}
      <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-6 shadow-sm">
        <Gem className="w-10 h-10 text-[#2F3E8F] dark:text-[#93C5FD]" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-stone-800 dark:text-zinc-100 mb-2 text-center">
        Tell your story.
      </h1>
      <h2 className="text-lg md:text-xl text-stone-500 dark:text-zinc-400 mb-8 text-center">
        We&apos;ll build your family tree.
      </h2>

      {/* Example prompts */}
      <div className="max-w-md w-full mb-10">
        <p className="text-xs text-stone-400 dark:text-zinc-400 text-center mb-3 uppercase tracking-wider">
          You can say things like
        </p>
        <div className="space-y-2">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <div
              key={i}
              className="text-sm text-stone-500 dark:text-zinc-300 bg-stone-50 dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 italic shadow-sm"
            >
              &ldquo;{prompt}&rdquo;
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          onClick={onStartVoice}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5
            bg-[#2F3E8F] text-white font-semibold rounded-2xl
            hover:bg-[#3B4DA6] active:scale-95 transition-all shadow-sm
            h-12 md:h-11 text-base md:text-sm"
        >
          <Mic className="w-5 h-5" />
          Speak
        </button>
        <button
          onClick={onStartType}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5
            bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-200 font-semibold rounded-2xl border border-stone-200 dark:border-zinc-800
            hover:bg-stone-50 dark:hover:bg-zinc-855 active:scale-95 transition-all
            h-12 md:h-11 text-base md:text-sm"
        >
          <Keyboard className="w-5 h-5" />
          Type
        </button>
      </div>

      {/* Fallback link */}
      <button
        onClick={onFallback}
        className="mt-6 text-sm text-stone-400 dark:text-zinc-400 hover:text-stone-600 dark:hover:text-zinc-400 underline underline-offset-2 transition-colors
          flex items-center gap-1.5"
      >
        <ListChecks className="w-4 h-4" />
        Build Step-by-Step instead
      </button>
    </div>
  );
}

function MicActivityVisualizer({ audioLevel }: { audioLevel: number }) {
  // Normalize/scale level for visual representation
  const level = Math.min(100, Math.max(0, audioLevel));

  return (
    <div className="flex items-center gap-3 shrink-0">
      <style>{`
        @keyframes slow-breath {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.6); opacity: 0.35; }
        }
      `}</style>

      {/* Pulsing Mic Circle */}
      <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40">
        {/* Slow, ambient breath circle */}
        <div
          className="absolute inset-0 rounded-full bg-blue-400 dark:bg-blue-400"
          style={{
            animation: 'slow-breath 3.5s ease-in-out infinite',
          }}
        />
        {/* Audio reactive circle with smooth transition */}
        <div
          className="absolute inset-0 rounded-full bg-blue-500/20 dark:bg-blue-500/10"
          style={{
            transition: 'transform 0.4s ease-out',
            transform: `scale(${1 + (level / 100) * 0.7})`
          }}
        />
        <Mic className="w-3.5 h-3.5 text-[#2F3E8F] dark:text-blue-400 relative z-10" />
      </div>

      {/* Waveform Bars with smooth wave-like transition */}
      <div className="flex items-end gap-1 h-5">
        {[0.4, 0.8, 0.6, 0.9, 0.5].map((multiplier, i) => {
          // Bouncing height dynamically calculated based on level
          const baseHeight = 4;
          const peakHeight = 16;
          const height = baseHeight + (level / 100) * (peakHeight - baseHeight) * multiplier;
          return (
            <div
              key={i}
              className="w-0.75 bg-gradient-to-t from-indigo-500 to-blue-400 rounded-full transition-all duration-300 ease-out"
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function InputPhase({
  narrativeText,
  setNarrativeText,
  interimTranscript,
  isListening,
  audioLevel,
  isSpeaking,
  inputSubState,
  startListening,
  stopListening,
  speechSupported,
  isParsing,
  parseError,
  entities,
  relationships,
  clarificationQuestion,
  answerClarification,
  dismissClarification,
  noMembersDetected,
  clearNoMembers,
  onUpdate,
  onRemove,
  onProcess,
  onReview,
  onBack,
  resetCapture,
}: {
  narrativeText: string;
  setNarrativeText: (t: string) => void;
  interimTranscript: string;
  isListening: boolean;
  audioLevel: number;
  isSpeaking: boolean;
  inputSubState: InputSubState;
  startListening: () => void;
  stopListening: () => void;
  speechSupported: boolean;
  isParsing: boolean;
  parseError: string | null;
  entities: StoryEntity[];
  relationships: StoryRelationship[];
  clarificationQuestion: string | null;
  answerClarification: (answer: string) => void;
  dismissClarification: () => void;
  noMembersDetected: boolean;
  clearNoMembers: () => void;
  onUpdate: (tempId: string, updates: Partial<StoryEntity>) => void;
  onRemove: (tempId: string) => void;
  onProcess: () => void;
  onReview: () => void;
  onBack: () => void;
  resetCapture: () => void;
}) {
  const canProcess = narrativeText.trim().length >= 5 &&
    inputSubState !== 'RECORDING' &&
    inputSubState !== 'PROCESSING' &&
    inputSubState !== 'CLARIFYING';
  const charCount = narrativeText.length;
  const showCharWarning = charCount >= 4500;

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-sm text-stone-400 dark:text-zinc-400 hover:text-stone-600 dark:hover:text-zinc-300 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-lg font-semibold text-stone-800 dark:text-zinc-100 mb-1 text-center">
        Tell me about your family
      </h2>
      <p className="text-sm text-stone-400 dark:text-zinc-400 mb-4 text-center">
        Speak freely about your family members — names, relationships, occupations, places, anything you remember.
      </p>

      {/* Text input — only shows committed narrativeText, not interim */}
      <textarea
        value={narrativeText}
        onChange={(e) => {
          let val = e.target.value;
          // Prevent leading whitespace
          val = val.replace(/^\s+/, '');
          // Prevent starting with a special character
          val = val.replace(/^[^a-zA-Z0-9\u00C0-\u00FF\u0100-\u017F]+/, '');
          setNarrativeText(val);
          if (noMembersDetected) clearNoMembers();
        }}
        onFocus={() => { if (noMembersDetected) clearNoMembers(); }}
        placeholder="Start speaking or type here... For example: 'I am Abhilash. My parents are Mohan and Mani. I have a wife named Aswathy and a son Agastya. My father was a teacher in Palakkad.'"
        className="w-full min-h-[160px] p-4 text-base md:text-sm text-stone-800 dark:text-zinc-100 bg-white dark:bg-zinc-900
          border border-stone-200 dark:border-zinc-800 rounded-2xl resize-y
          focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 focus:border-blue-300
          placeholder:text-stone-300 dark:placeholder:text-zinc-650
          disabled:bg-stone-50 dark:disabled:bg-zinc-950 disabled:cursor-not-allowed"
        rows={6}
        disabled={inputSubState === 'PROCESSING'}
      />

      {/* Interim transcript & Audio Processing State */}
      {(isListening || inputSubState === 'PROCESSING') && (
        <div className="w-full mt-1 px-4 py-2.5 bg-stone-50 dark:bg-zinc-900 rounded-xl border border-stone-100 dark:border-zinc-800 flex items-center gap-3 min-h-[48px]">
          {inputSubState === 'PROCESSING' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#2F3E8F] shrink-0" />
              <p className="text-sm text-stone-500 dark:text-zinc-400 italic">
                Processing narration...
              </p>
            </>
          ) : isListening && isSpeaking ? (
            <>
              <MicActivityVisualizer audioLevel={audioLevel} />
              <p className="text-sm text-stone-850 dark:text-zinc-200 font-medium transition-colors">
                {interimTranscript || 'Speaking...'}
              </p>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#2F3E8F] shrink-0" />
              <p className="text-sm text-stone-500 dark:text-zinc-400 italic">
                {interimTranscript || 'Listening... speak freely...'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Character warning */}
      {showCharWarning && (
        <div className="w-full mt-2 flex items-center gap-1.5 text-xs text-[#2F3E8F]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Your story is getting long ({charCount}/5000 chars). Consider processing what you have.</span>
        </div>
      )}

      {/* Clarification card */}
      {inputSubState === 'CLARIFYING' && clarificationQuestion && (
        <div className="w-full mt-3">
          <ClarificationCard
            question={clarificationQuestion}
            onAnswer={answerClarification}
            onDismiss={dismissClarification}
          />
        </div>
      )}

      {/* No members message */}
      {inputSubState === 'NO_MEMBERS' && noMembersDetected && (
        <div className="w-full mt-3">
          <NoMembersMessage onDismiss={clearNoMembers} />
        </div>
      )}

      {/* Action bar: Record + Process */}
      <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3 mt-4 w-full">
        {/* Clear/Reset button */}
        {(narrativeText.trim().length > 0 || isListening) && (
          <button
            onClick={resetCapture}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold
              transition-all active:scale-95 w-full sm:w-auto
              h-12 md:h-11 text-base md:text-sm
              bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-850"
            title="Reset to initial state"
          >
            <RotateCcw className="w-5 h-5" />
            Clear
          </button>
        )}
        {/* Record / Stop button */}
        {speechSupported && (
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={inputSubState === 'PROCESSING' || isParsing}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold
              transition-all active:scale-95 w-full sm:w-auto
              h-12 md:h-11 text-base md:text-sm
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            title={
              inputSubState === 'PROCESSING' && !isParsing
                ? 'Processing audio'
                : isListening
                  ? 'Stop recording'
                  : 'Start recording'
            }
          >
            {inputSubState === 'PROCESSING' && !isParsing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#2F3E8F]" />
                Loading...
              </>
            ) : isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Record
              </>
            )}
          </button>
        )}

        {/* Speech not supported notice */}
        {!speechSupported && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-zinc-400 px-3">
            <AlertCircle className="w-3.5 h-3.5" />
            Voice recording not available in this browser
          </div>
        )}

        {/* Process button */}
        <button
          onClick={onProcess}
          disabled={!canProcess}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-semibold
            transition-all active:scale-95 w-full sm:w-auto
            h-12 md:h-11 text-base md:text-sm
            bg-[#2F3E8F] text-white hover:bg-[#3B4DA6] shadow-sm
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Understanding...
            </>
          ) : (
            <>
              <Gem className="w-5 h-5" />
              Process My Story
            </>
          )}
        </button>
      </div>

      {/* Parse error with retry */}
      {parseError && (
        <div className="flex items-center gap-2 mt-3 w-full animate-fade-in">
          <span className="text-xs text-red-500 flex items-center gap-1.5 flex-1">
            <AlertCircle className="w-4 h-4" />
            {parseError.toLowerCase().includes('map') ||
              parseError.toLowerCase().includes('undefined') ||
              parseError.toLowerCase().includes('json') ||
              parseError.toLowerCase().includes('typeerror') ||
              parseError.toLowerCase().includes('parse failed')
              ? 'Failed to process. Please retry.'
              : parseError}
          </span>
          <button
            onClick={onProcess}
            className="text-xs text-[#2F3E8F] dark:text-[#93C5FD] hover:text-[#2F3E8F]/80 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Hint when textarea is empty or short */}
      {narrativeText.trim().length < 20 && narrativeText.trim().length > 0 && (
        <p className="text-xs text-stone-400 dark:text-zinc-400 mt-2 text-center">
          Keep going — tell us a bit more about your family to get started.
        </p>
      )}

      {/* Entity chips */}
      {inputSubState === 'IDLE' && entities.length > 0 && (
        <div className="mt-6 w-full">
          <p className="text-xs text-stone-400 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Family members found ({entities.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {entities.map(entity => (
              <EntityChip
                key={entity.tempId}
                entity={entity}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Mini tree preview */}
      {inputSubState === 'IDLE' && entities.length >= 3 && (
        <div className="mt-6 w-full bg-stone-50 dark:bg-zinc-900/50 border border-stone-100 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-stone-400 dark:text-zinc-400 uppercase tracking-wider mb-1 text-center">
            Your family tree so far
          </p>
          <MiniTreePreview entities={entities} relationships={relationships} />
        </div>
      )}

      {/* Review button */}
      {inputSubState === 'IDLE' && entities.length >= 1 && (
        <button
          onClick={onReview}
          className="mt-6 flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto bg-[#2F3E8F] text-white
            font-semibold rounded-2xl hover:bg-[#3B4DA6] active:scale-95 transition-all shadow-sm
            h-12 md:h-11 text-base md:text-sm"
        >
          Review & Build Tree
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function ReviewPhase({
  entities,
  relationships,
  suggestedTreeName,
  summary,
  onUpdate,
  onRemove,
  onMaterialize,
  isMaterializing,
  materializeError,
  onBack,
}: {
  entities: StoryEntity[];
  relationships: StoryRelationship[];
  suggestedTreeName: string;
  summary?: string | null;
  onUpdate: (tempId: string, updates: Partial<StoryEntity>) => void;
  onRemove: (tempId: string) => void;
  onMaterialize: (treeName: string) => void;
  isMaterializing: boolean;
  materializeError: string | null;
  onBack: () => void;
}) {
  const [treeName, setTreeName] = useState(suggestedTreeName);

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-sm text-stone-400 dark:text-zinc-400 hover:text-stone-600 dark:hover:text-zinc-300 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Add more
      </button>

      <h2 className="text-lg font-semibold text-stone-800 dark:text-zinc-100 mb-2 text-center">
        Here&apos;s what I understood
      </h2>
      <p className="text-sm text-stone-500 dark:text-zinc-400 mb-6 text-center">
        Tap any name to edit details. Remove incorrect entries.
      </p>

      {/* AI Summary */}
      {summary && (
        <div className="w-full mb-6 p-4 bg-blue-50/50 dark:bg-zinc-900/30 border border-blue-100 dark:border-zinc-800 rounded-2xl animate-fade-in">
          <div className="flex items-start gap-2">
            <Gem className="w-4 h-4 text-[#2F3E8F] dark:text-[#93C5FD] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed italic">&ldquo;{summary}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Tree name */}
      <div className="w-full mb-6">
        <label className="text-xs text-stone-400 dark:text-zinc-400 uppercase tracking-wider mb-1 block">Tree Name</label>
        <input
          type="text"
          value={treeName}
          onChange={(e) => setTreeName(e.target.value)}
          className="w-full px-4 py-2.5 text-base md:text-sm text-stone-800 dark:text-zinc-100 bg-white dark:bg-zinc-900
            border border-stone-200 dark:border-zinc-800 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/40 focus:border-blue-300
            h-11 md:h-9"
        />
      </div>

      {/* Entity chips (expandable in review) */}
      <div className="w-full mb-6">
        <p className="text-xs text-stone-400 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Family members ({entities.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {entities.map(entity => (
            <EntityChip
              key={entity.tempId}
              entity={entity}
              onUpdate={onUpdate}
              onRemove={onRemove}
              expandable
            />
          ))}
        </div>
      </div>

      {/* Mini tree */}
      <div className="w-full bg-stone-50 dark:bg-zinc-900/50 border border-stone-100 dark:border-zinc-800 rounded-2xl p-4 mb-6">
        <MiniTreePreview entities={entities} relationships={relationships} />
      </div>

      {/* Error */}
      {materializeError && (
        <div className="w-full mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600
          flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {materializeError}
        </div>
      )}

      {/* Build button */}
      <button
        onClick={() => onMaterialize(treeName)}
        disabled={isMaterializing || entities.length < 1}
        className="flex items-center justify-center gap-2 px-8 py-3.5 w-full sm:w-auto bg-[#2F3E8F] text-white
          font-semibold rounded-2xl hover:bg-[#3B4DA6] active:scale-95 transition-all shadow-sm
          disabled:opacity-50 disabled:cursor-not-allowed
          h-12 md:h-11 text-base md:text-sm"
      >
        {isMaterializing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Building your tree...
          </>
        ) : (
          <>
            <TreePine className="w-5 h-5" />
            Build My Family Tree
          </>
        )}
      </button>
    </div>
  );
}

function MaterializingPhase() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-6">
        <Loader2 className="w-10 h-10 text-[#2F3E8F] dark:text-[#93C5FD] animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-stone-800 dark:text-zinc-100 mb-2">Building your family tree...</h2>
      <p className="text-sm text-stone-500 dark:text-zinc-400">Creating members and connecting relationships</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StoryCaptureExperience({
  userId: _userId,
  onComplete,
  onFallbackToWizard,
  onBack,
}: StoryCaptureExperienceProps) {
  const capture = useStoryCapture();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to the top when phase changes to review (next section)
  useEffect(() => {
    if (capture.phase === 'review') {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [capture.phase]);

  // Show toast when materialize error occurs
  useEffect(() => {
    if (capture.materializeError) {
      toast({
        title: 'Failed to build tree',
        description: capture.materializeError,
        variant: 'destructive',
      });
    }
  }, [capture.materializeError, toast]);

  const handleStartVoice = () => {
    capture.setPhase('input');
    capture.setInputMode('mic');
    // Don't auto-start recording — let user tap Record when ready
  };

  const handleStartType = () => {
    capture.setPhase('input');
    capture.setInputMode('type');
  };

  const handleProcess = () => {
    capture.stopListening();
    capture.triggerParse();
  };

  const handleReview = () => {
    capture.stopListening();
    // Trigger a final parse if we haven't already
    if (capture.entities.length === 0) {
      capture.triggerParse();
    }
    capture.setPhase('review');
  };

  const handleMaterialize = async (treeName: string) => {
    const treeId = await capture.handleMaterialize(treeName);
    if (treeId) {
      onComplete(treeId);
    }
  };

  const handleBackToInput = () => {
    capture.setPhase('input');
  };

  const handleBackToPriming = () => {
    capture.stopListening();
    capture.setPhase('priming');
  };

  const renderPhase = (phase: CapturePhase) => {
    switch (phase) {
      case 'priming':
        return (
          <PrimingPhase
            onStartVoice={handleStartVoice}
            onStartType={handleStartType}
            onFallback={onFallbackToWizard}
            onBack={onBack}
          />
        );

      case 'input':
        return (
          <InputPhase
            narrativeText={capture.narrativeText}
            setNarrativeText={capture.setNarrativeText}
            interimTranscript={capture.interimTranscript}
            isListening={capture.isListening}
            audioLevel={capture.audioLevel}
            isSpeaking={capture.isSpeaking}
            inputSubState={capture.inputSubState}
            startListening={capture.startListening}
            stopListening={capture.stopListening}
            speechSupported={capture.speechSupported}
            isParsing={capture.isParsing}
            parseError={capture.parseError}
            entities={capture.entities}
            relationships={capture.relationships}
            clarificationQuestion={capture.clarificationQuestion}
            answerClarification={capture.answerClarification}
            dismissClarification={capture.dismissClarification}
            noMembersDetected={capture.noMembersDetected}
            clearNoMembers={capture.clearNoMembers}
            onUpdate={capture.updateEntity}
            onRemove={capture.removeEntity}
            onProcess={handleProcess}
            onReview={handleReview}
            onBack={handleBackToPriming}
            resetCapture={capture.resetCapture}
          />
        );

      case 'review':
        return (
          <ReviewPhase
            entities={capture.entities}
            relationships={capture.relationships}
            suggestedTreeName={capture.suggestedTreeName}
            summary={capture.summary}
            onUpdate={capture.updateEntity}
            onRemove={capture.removeEntity}
            onMaterialize={handleMaterialize}
            isMaterializing={capture.isMaterializing}
            materializeError={capture.materializeError}
            onBack={handleBackToInput}
          />
        );

      case 'materializing':
        return <MaterializingPhase />;

      case 'done':
        return null; // Parent handles navigation
    }
  };

  return (
    <div ref={containerRef} className="w-full flex-1 min-h-0 overflow-y-auto">
      {renderPhase(capture.phase)}
    </div>
  );
}
