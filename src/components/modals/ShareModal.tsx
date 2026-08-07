import { X, Link2, Check, Instagram, Linkedin } from 'lucide-react';
import { useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export function ShareModal({ open, onClose, title, url }: ShareModalProps) {
  const { isMobile } = useResponsive();
  const [copied, setCopied] = useState(false);
  const [instagramFeedback, setInstagramFeedback] = useState(false);

  if (!open) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleWhatsApp = () => {
    const textToShare = title ? `${title}\n${url}` : url;
    const text = encodeURIComponent(textToShare);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleFacebook = () => {
    const shareUrl = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank', 'noopener,noreferrer');
  };

  const handleX = () => {
    const shareUrl = encodeURIComponent(url);
    const text = encodeURIComponent(title || 'Check this out!');
    window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedIn = () => {
    const shareUrl = encodeURIComponent(url);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank', 'noopener,noreferrer');
  };

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setInstagramFeedback(true);
      setTimeout(() => setInstagramFeedback(false), 3000);
      // Fallback redirect to Instagram Web
      window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to copy for Instagram', err);
    }
  };

  return (
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-sm bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Share</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Share Options Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-y-6 gap-x-3 mb-6">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center group-hover:bg-[#25D366]/20 transition-all duration-200 transform group-hover:scale-105">
                <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">WhatsApp</span>
            </button>

            {/* Facebook */}
            <button
              onClick={handleFacebook}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center group-hover:bg-[#1877F2]/20 transition-all duration-200 transform group-hover:scale-105">
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Facebook</span>
            </button>

            {/* Instagram */}
            <button
              onClick={handleInstagram}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-all duration-200 transform group-hover:scale-105">
                <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Instagram</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={handleX}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/20 transition-all duration-200 transform group-hover:scale-105">
                <svg className="w-4 h-4 text-black dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">X (Twitter)</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={handleLinkedIn}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-[#0A66C2]/10 flex items-center justify-center group-hover:bg-[#0A66C2]/20 transition-all duration-200 transform group-hover:scale-105">
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">LinkedIn</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2 group focus:outline-none"
            >
              <div className="w-12 h-12 rounded-full bg-[#2F3E8F]/10 flex items-center justify-center group-hover:bg-[#2F3E8F]/20 transition-all duration-200 transform group-hover:scale-105">
                {copied ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Link2 className="w-5 h-5 text-[#2F3E8F] dark:text-[#8CA0FF]" />
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                {copied ? 'Copied!' : 'Copy Link'}
              </span>
            </button>
          </div>

          {/* Toast / Helper Text */}
          {instagramFeedback && (
            <div className="mb-4 text-center text-[11px] font-medium text-pink-600 dark:text-pink-400 bg-pink-500/10 py-1.5 px-3 rounded-lg animate-in fade-in duration-200">
              Link copied! Paste it in Instagram.
            </div>
          )}

          {/* URL text display field with custom copy button */}
          <div className="relative flex items-center">
            <input
              type="text"
              readOnly
              value={url}
              className="w-full pl-3 pr-20 py-2.5 bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-600 dark:text-gray-300 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="absolute right-1 top-1 bottom-1 px-4 bg-white dark:bg-[#333] border border-gray-200 dark:border-white/10 rounded-md text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#444] transition-colors"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
