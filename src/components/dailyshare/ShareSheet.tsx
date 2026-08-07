/**
 * ShareSheet — Bottom-sheet/modal for sharing a post to social platforms
 *
 * Opened when the Share button is clicked on a post card or in the media viewer.
 * Provides: WhatsApp, Twitter/X, Facebook, Instagram, LinkedIn, Copy Link.
 */

import { useState, useCallback } from 'react';
import { X, Link2, Check, Instagram, Linkedin } from 'lucide-react';
import { getShareUrl } from '@/config/api';
import type { SharePost } from '@/services/dailyShareApiService';

interface ShareSheetProps {
  post: SharePost;
  onClose: () => void;
}

export function ShareSheet({ post, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [instagramFeedback, setInstagramFeedback] = useState(false);

  const shareUrl = getShareUrl(post.postId);

  const authorLabel = post.postSource === 'admin' ? 'FamNme' : post.authorName;
  const contentSnippet = post.content?.trim()
    ? post.content.trim().slice(0, 120) + (post.content.trim().length > 120 ? '…' : '')
    : '';

  const shareText = contentSnippet
    ? `${authorLabel} on FamNme: "${contentSnippet}"`
    : `Check out this post by ${authorLabel} on FamNme!`;

  const handleWhatsApp = useCallback(() => {
    const text = `${shareText}\n\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    onClose();
  }, [shareText, shareUrl, onClose]);

  const handleTwitter = useCallback(() => {
    const text = `${shareText}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
    onClose();
  }, [shareText, shareUrl, onClose]);

  const handleFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    );
    onClose();
  }, [shareText, shareUrl, onClose]);

  const handleLinkedIn = useCallback(() => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
    onClose();
  }, [shareUrl, onClose]);

  const handleInstagram = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setInstagramFeedback(true);
      setTimeout(() => {
        setInstagramFeedback(false);
        window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
        onClose();
      }, 1500);
    } catch {
      onClose();
    }
  }, [shareUrl, onClose]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1200);
    } catch {
      // Fallback: select and copy
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    }
  }, [shareUrl, onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full sm:w-[360px] bg-white dark:bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">Share post</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-[#8B7355] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content snippet preview */}
        {contentSnippet && (
          <p className="px-5 pb-3 text-sm text-[#8B7355] dark:text-[#A19F9D] line-clamp-2">
            {contentSnippet}
          </p>
        )}

        {/* Feedback for Instagram */}
        {instagramFeedback && (
          <div className="mx-5 mb-3 text-center text-xs font-medium text-pink-600 dark:text-pink-400 bg-pink-500/10 py-1.5 px-3 rounded-lg animate-in fade-in duration-200">
            Link copied! Redirecting to Instagram...
          </div>
        )}

        {/* Share options */}
        <div className="px-4 pb-4 space-y-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 fill-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Share on WhatsApp</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={handleTwitter}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 fill-[#000] dark:fill-white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Share on X (Twitter)</span>
          </button>

          {/* Facebook */}
          <button
            onClick={handleFacebook}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 fill-[#1877F2]">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Share on Facebook</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagram}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            <Instagram className="h-5 w-5 flex-shrink-0 text-pink-600 dark:text-pink-400" />
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Share on Instagram</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={handleLinkedIn}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            <Linkedin className="h-5 w-5 flex-shrink-0 text-[#0A66C2]" />
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">Share on LinkedIn</span>
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[#F5F0EB] dark:bg-[#252525] hover:bg-[#EDEBE5] dark:hover:bg-[#2e2e2e] transition-colors text-left"
          >
            {copied
              ? <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
              : <Link2 className="h-5 w-5 flex-shrink-0 text-[#2F3E8F]" />
            }
            <span className="text-sm font-medium text-[#3D2E1F] dark:text-[#F3F2F1]">
              {copied ? 'Link copied!' : 'Copy link'}
            </span>
          </button>
        </div>

        {/* Bottom safe area for mobile */}
        <div className="pb-safe pb-2" />
      </div>
    </div>
  );
}
