/**
 * AdminShareComposer — Full-featured post composer for admin "Fam & Me" posts.
 * Supports text, images (up to 4), video, and link posts — same as ShareComposer.
 * Admin posts are always public; no visibility toggle needed.
 */

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Video, Link2, X, Loader2, Languages } from 'lucide-react';
import { LinkPreviewCard } from './LinkPreviewCard';
import * as api from '@/services/dailyShareApiService';
import type { LinkPreview } from '@/services/dailyShareApiService';
import { useToast } from '@/components/ui/use-toast';

async function resizeImage(file: File, maxDim = 1200, targetBytes = 800_000): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const qualities = [0.82, 0.70, 0.58, 0.45];
      let qIndex = 0;
      const tryQuality = (q: number) => {
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(file); return; }
          if (blob.size <= targetBytes || qIndex >= qualities.length - 1) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            qIndex++;
            tryQuality(qualities[qIndex]);
          }
        }, 'image/jpeg', q);
      };
      tryQuality(qualities[qIndex]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface AdminShareComposerProps {
  adminToken: string;
  onPostCreated: () => void;
}

export function AdminShareComposer({ adminToken, onPostCreated }: AdminShareComposerProps) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [contentLanguage, setContentLanguage] = useState<string>('auto');
  const [showLangPicker, setShowLangPicker] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const hasMedia = mediaFiles.length > 0 || videoFile !== null;
  const hasContent = content.trim().length > 0 || hasMedia || (linkUrl && linkPreview);

  const getPostType = (): 'text' | 'image' | 'video' | 'link' => {
    if (videoFile) return 'video';
    if (mediaFiles.length > 0) return 'image';
    if (linkUrl && linkPreview) return 'link';
    return 'text';
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 4 - mediaFiles.length;
    const newFiles = files.slice(0, remaining);
    const resized = await Promise.all(newFiles.map(f => resizeImage(f)));
    setMediaFiles(prev => [...prev, ...resized]);
    setMediaPreviews(prev => [...prev, ...resized.map(f => URL.createObjectURL(f))]);
    if (videoFile) { setVideoFile(null); setVideoPreview(null); }
    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast({
        title: 'File too large',
        description: `Video size is ${fileSizeMB} MB. Videos must be 100 MB or below.`,
        variant: 'destructive'
      });
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    mediaPreviews.forEach(URL.revokeObjectURL);
    setMediaFiles([]);
    setMediaPreviews([]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = useCallback(() => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  }, [videoPreview]);

  const handleLinkBlur = useCallback(async () => {
    const url = linkUrl.trim();
    if (!url) { setLinkPreview(null); return; }
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    setLinkUrl(fullUrl);
    setFetchingPreview(true);
    try {
      const preview = await api.fetchLinkPreviewGlobal(fullUrl);
      setLinkPreview(preview);
    } catch {
      setLinkPreview(null);
    } finally {
      setFetchingPreview(false);
    }
  }, [linkUrl]);

  const handleSubmit = async () => {
    if (!hasContent || loading) return;
    setLoading(true);
    try {
      await api.createAdminPost({
        content: content.trim(),
        postType: getPostType(),
        linkUrl: linkUrl || undefined,
        linkTitle: linkPreview?.title || undefined,
        linkDescription: linkPreview?.description || undefined,
        linkImageUrl: linkPreview?.imageUrl || undefined,
        mediaFiles: videoFile ? [videoFile] : mediaFiles.length > 0 ? mediaFiles : undefined,
        contentLanguage: contentLanguage !== 'auto' ? contentLanguage : undefined,
      }, adminToken);

      setContent('');
      mediaPreviews.forEach(URL.revokeObjectURL);
      setMediaFiles([]);
      setMediaPreviews([]);
      removeVideo();
      setLinkUrl('');
      setLinkPreview(null);
      setShowLinkInput(false);
      onPostCreated();
    } catch {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with all FamilyAConnect users..."
        rows={3}
        className="w-full bg-[#2C1E14] border border-[#5A4333] rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
      />

      {/* Image previews */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {mediaPreviews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Video preview */}
      {videoPreview && (
        <div className="relative rounded-xl overflow-hidden max-h-[200px]">
          <video src={videoPreview} className="w-full max-h-[200px] bg-black rounded-xl" />
          <button
            onClick={removeVideo}
            className="absolute top-2 right-2 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}

      {/* Link input */}
      {showLinkInput && (
        <div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onBlur={handleLinkBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLinkBlur(); }}
              placeholder="Paste a URL..."
              className="flex-1 h-9 px-3 text-sm bg-[#2C1E14] border border-[#5A4333] rounded-lg text-gray-200 placeholder:text-[#8B7355]/60 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40"
            />
            <button
              onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkPreview(null); }}
              className="text-[#8B7355] hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {fetchingPreview && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[#8B7355]">
              <Loader2 className="h-3 w-3 animate-spin" /> Fetching preview...
            </div>
          )}
          {linkPreview && linkPreview.title && (
            <div className="mt-2">
              <LinkPreviewCard
                url={linkUrl}
                title={linkPreview.title}
                description={linkPreview.description}
                imageUrl={linkPreview.imageUrl}
              />
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between pt-1 border-t border-[#5A4333]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={!!videoFile || mediaFiles.length >= 4}
            className="h-9 w-9 flex items-center justify-center rounded-full text-[#2F3E8F] hover:bg-[#2F3E8F]/15 disabled:opacity-30 transition-colors"
            title="Add images (max 4)"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />

          <button
            onClick={() => videoInputRef.current?.click()}
            disabled={mediaFiles.length > 0}
            className="h-9 w-9 flex items-center justify-center rounded-full text-[#2F3E8F] hover:bg-[#2F3E8F]/15 disabled:opacity-30 transition-colors"
            title="Add video"
          >
            <Video className="h-5 w-5" />
          </button>
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={handleVideoSelect} />

          <button
            onClick={() => setShowLinkInput(!showLinkInput)}
            className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors ${
              showLinkInput ? 'text-[#2F3E8F] bg-[#2F3E8F]/15' : 'text-[#2F3E8F] hover:bg-[#2F3E8F]/15'
            }`}
            title="Add link"
          >
            <Link2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Content language tag */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(p => !p)}
              className={`flex items-center gap-1.5 px-2.5 h-9 rounded-full text-xs font-medium border transition-colors ${
                contentLanguage !== 'auto'
                  ? 'border-[#C2A46D] text-[#C2A46D] bg-[#C2A46D]/15'
                  : 'border-[#5A4333] text-[#8B7355] hover:border-[#C2A46D]/60'
              }`}
              title="Tag content language"
            >
              <Languages className="h-3.5 w-3.5" />
              {contentLanguage === 'auto' ? 'Lang' : { 'en': 'EN', 'hi-IN': 'HI', 'ta-IN': 'TA', 'te-IN': 'TE', 'bn-IN': 'BN', 'kn-IN': 'KN', 'ml-IN': 'ML', 'mr-IN': 'MR', 'gu-IN': 'GU' }[contentLanguage] || 'Lang'}
            </button>
            {showLangPicker && (
              <div className="absolute bottom-full mb-1 right-0 w-36 bg-[#2C1E14] rounded-lg shadow-lg border border-[#5A4333] z-50 py-1 max-h-48 overflow-y-auto">
                <button onClick={() => { setContentLanguage('auto'); setShowLangPicker(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#5A4333]/50 ${contentLanguage === 'auto' ? 'text-[#C2A46D] font-medium' : 'text-gray-400'}`}>Auto-detect</button>
                {[
                  { code: 'en', label: 'English' }, { code: 'hi-IN', label: 'Hindi' },
                  { code: 'ta-IN', label: 'Tamil' }, { code: 'te-IN', label: 'Telugu' },
                  { code: 'bn-IN', label: 'Bengali' }, { code: 'kn-IN', label: 'Kannada' },
                  { code: 'ml-IN', label: 'Malayalam' }, { code: 'mr-IN', label: 'Marathi' },
                  { code: 'gu-IN', label: 'Gujarati' },
                ].map(l => (
                  <button key={l.code} onClick={() => { setContentLanguage(l.code); setShowLangPicker(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#5A4333]/50 ${contentLanguage === l.code ? 'text-[#C2A46D] font-medium' : 'text-gray-400'}`}>{l.label}</button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!hasContent || loading}
            className="px-5 h-9 rounded-full bg-[#2F3E8F] text-white text-sm font-medium hover:bg-[#A8643A] disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Post as FamNme
          </button>
        </div>
      </div>
    </div>
  );
}
