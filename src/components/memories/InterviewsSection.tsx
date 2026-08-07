/**
 * InterviewsSection — Grid of interview cards (pattern follows AlbumsSection)
 */

import { MessageCircle, User } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';
import type { Interview } from '@/types';

interface InterviewsSectionProps {
  interviews: Interview[];
  loading: boolean;
  onInterviewClick: (interview: Interview) => void;
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

export function InterviewsSection({ interviews, loading, onInterviewClick }: InterviewsSectionProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#2F3E8F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-base font-medium text-gray-500">No interviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Use "Interview an Elder" to capture family stories</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {interviews.map(interview => (
        <button
          key={interview.interviewId}
          onClick={() => onInterviewClick(interview)}
          className="text-left rounded-xl border border-[#E2E8F0]/60 hover:border-[#2F3E8F]/40 hover:shadow-md transition-all overflow-hidden group bg-white"
        >
          {/* Cover area */}
          <div className="h-36 bg-gradient-to-br from-[#E8EDFF] to-[#F3E8DE] flex items-center justify-center relative overflow-hidden">
            {interview.coverPhotoUrl ? (
              <img
                src={resolveBackendUrl(interview.coverPhotoUrl)}
                alt={interview.templateTitle}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <MessageCircle className="w-10 h-10 text-[#2F3E8F]/30" />
            )}
            {/* Answer count badge */}
            {interview.answerCount !== undefined && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-medium">
                {interview.answerCount} answers
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-900 truncate">{interview.templateTitle}</p>
            {interview.intervieweeName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-5 h-5 rounded-full bg-[#E8EDFF] overflow-hidden flex-shrink-0">
                  {interview.intervieweePhotoUrl ? (
                    <img src={resolveBackendUrl(interview.intervieweePhotoUrl)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center">
                      <User className="w-3 h-3 text-[#2F3E8F]" />
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600 truncate">{interview.intervieweeName}</span>
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(interview.createdAt)}</p>
            {interview.aiNarrative && (
              <p className="text-[11px] text-[#2F3E8F] mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2F3E8F]" />
                AI story generated
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
