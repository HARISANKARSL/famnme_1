/**
 * InterviewDetailView — Full detail view for a single interview
 * Shows AI narrative, then Q&A cards with audio/photo per answer.
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, Trash2, RefreshCw, Gem, Music, AlertTriangle, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchInterview, deleteInterview, regenerateNarrative } from '@/services/interviewApiService';
import { resolveBackendUrl } from '@/config/api';
import type { Interview, InterviewAnswer } from '@/types';

interface InterviewDetailViewProps {
  interviewId: string;
  onBack: () => void;
  onDeleted: () => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch { return dateStr; }
}

export function InterviewDetailView({ interviewId, onBack, onDeleted }: InterviewDetailViewProps) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInterview(interviewId)
      .then(result => {
        if (!cancelled) {
          setInterview(result.interview);
          setAnswers(result.answers);
        }
      })
      .catch(err => console.error('Failed to load interview:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [interviewId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateNarrative(interviewId);
      if (result.narrative && interview) {
        setInterview({ ...interview, aiNarrative: result.narrative });
      }
    } catch (err) {
      console.error('Failed to regenerate narrative:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteInterview(interviewId);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete interview:', err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F]" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="text-center py-16 text-gray-500">Interview not found</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{interview.templateTitle}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {interview.intervieweeName && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-[#E8EDFF] overflow-hidden flex-shrink-0">
                  {interview.intervieweePhotoUrl ? (
                    <img src={resolveBackendUrl(interview.intervieweePhotoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center"><User className="w-2.5 h-2.5 text-[#2F3E8F]" /></span>
                  )}
                </div>
                <span className="text-xs text-gray-600">{interview.intervieweeName}</span>
                <span className="text-xs text-gray-300">·</span>
              </div>
            )}
            <span className="text-xs text-gray-400">{formatDate(interview.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* AI Narrative */}
      {interview.aiNarrative ? (
        <div className="rounded-xl p-5 mb-6 border border-[#2F3E8F]/30/60" style={{ background: 'linear-gradient(135deg, #fffbeb, #fff7ed)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5" />
              AI-Generated Story
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1 text-[11px] text-[#2F3E8F] hover:text-blue-900 disabled:opacity-50"
            >
              {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Regenerate
            </button>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{interview.aiNarrative}</p>
        </div>
      ) : (
        <div className="rounded-xl p-5 mb-6 border border-dashed border-blue-300 bg-[#E8EDFF]/30 text-center">
          <Gem className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-[#2F3E8F] mb-2">AI story is being generated...</p>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-xs text-[#2F3E8F] hover:underline disabled:opacity-50"
          >
            {regenerating ? 'Generating...' : 'Generate now'}
          </button>
        </div>
      )}

      {/* Q&A Cards */}
      <div className="space-y-4">
        {answers.map((answer, idx) => (
          <div key={answer.answerId} className="rounded-xl border border-[#E2E8F0]/60 overflow-hidden">
            {/* Question header */}
            <div className="px-4 py-3 bg-[#E8EDFF]/50 border-b border-[#E2E8F0]/40">
              <p className="text-xs text-[#2F3E8F] font-medium mb-0.5">Question {idx + 1}</p>
              <p className="text-sm font-semibold text-gray-900">{answer.questionText}</p>
            </div>

            {/* Answer body */}
            <div className="px-4 py-3 space-y-3">
              {/* Text answer */}
              {answer.answerText && answer.answerText !== '(no answer)' ? (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{answer.answerText}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No answer provided</p>
              )}

              {/* Audio player */}
              {answer.audioUrl && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#E8EDFF] border border-[#2F3E8F]/20">
                  <Music className="w-4 h-4 text-[#2F3E8F] flex-shrink-0" />
                  <audio controls className="h-8 flex-1" src={resolveBackendUrl(answer.audioUrl)}>
                    Audio not supported
                  </audio>
                </div>
              )}

              {/* Photo */}
              {answer.photoUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={resolveBackendUrl(answer.photoUrl)}
                    alt={`Photo for question ${idx + 1}`}
                    className="w-full max-h-64 object-contain bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete action */}
      <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Delete this interview?
            </span>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting} className="h-7 text-xs">
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete Interview
          </Button>
        )}
      </div>
    </div>
  );
}
