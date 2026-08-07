/**
 * ContributionRequest — "Ask Family" feature
 * Memory owner can invite family to add their perspective via text/photo/voice
 * Contributions appear as comments with commentType: 'contribution'
 */

import { useState } from 'react';
import { Share2, Send, Loader2, X } from 'lucide-react';
import { resolveBackendUrl } from '@/config/api';
import type { Memory } from '@/types';

interface ContributionRequestProps {
  memory: Memory;
  currentUserName: string;
  onContributed: () => void;
}

const API_BASE = resolveBackendUrl('/api');

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function ContributionRequest({ memory, currentUserName, onContributed }: ContributionRequestProps) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: `Help us remember: ${memory.title}`,
      text: `${currentUserName} is asking for your perspective on "${memory.title}" in the family tree. Do you have memories, photos, or stories to add?`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch {
        // Clipboard not available
      }
    }
  };

  const handleSubmitContribution = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/memory/${memory.memoryId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: text.trim(),
          userName: currentUserName,
          commentType: 'contribution',
        }),
      });
      setText('');
      setShowForm(false);
      onContributed();
    } catch {
      // Error silently
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a] pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Share2 className="w-3.5 h-3.5 text-[#2F3E8F]" strokeWidth={1.5} />
        <span className="text-[12px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Ask Family to Contribute</span>
      </div>
      <p className="text-[11px] text-[#8B7355] dark:text-[#999] mb-3">
        Invite family members to share their perspective, photos, or stories about this memory.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#2F3E8F] border border-[#2F3E8F]/20 hover:bg-[#2F3E8F]/5 transition-colors"
        >
          <Share2 className="w-3 h-3" />
          {shared ? 'Link Copied!' : 'Share Link'}
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#8B7355] dark:text-[#999] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
        >
          {showForm ? <X className="w-3 h-3" /> : <Send className="w-3 h-3" />}
          {showForm ? 'Cancel' : 'Add My Perspective'}
        </button>
      </div>

      {showForm && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your memory of this moment..."
            className="w-full p-3 text-[13px] rounded-xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] bg-[#f9f9f9] dark:bg-[#1E1E1E] text-[#3D2E1F] dark:text-[#f5f5f5] placeholder:text-[#B8A090] dark:placeholder:text-[#555] focus:border-[#2F3E8F] focus:ring-1 focus:ring-[#2F3E8F] outline-none resize-none min-h-[80px]"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmitContribution}
              disabled={!text.trim() || submitting}
              className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
