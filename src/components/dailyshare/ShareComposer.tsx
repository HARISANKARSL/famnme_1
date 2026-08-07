/**
 * ShareComposer — Post creation box ("What's on your mind?")
 */

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Video, Link2, X, Loader2, Globe, Lock, Languages } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LinkPreviewCard } from './LinkPreviewCard';
import * as api from '@/services/dailyShareApiService';
import type { LinkPreview } from '@/services/dailyShareApiService';
import { useToast } from '@/components/ui/use-toast';
import { trackEvent } from '@/services/firebase/analytics.service';

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

/**
 * Resize an image File to fit within maxDim, then compress to stay under
 * targetBytes. Tries progressively lower JPEG quality until size fits.
 * This guarantees uploads stay under Nginx's body size limit.
 */
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

      // Try decreasing quality until output fits within targetBytes
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

interface ShareComposerProps {
  treeId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  onPostCreated: () => void;
}

export function ShareComposer({ treeId, authorName, authorAvatarUrl, onPostCreated }: ShareComposerProps) {
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
  const [visibility, setVisibility] = useState<'public' | 'family'>('family');
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

    // Max 4 images total
    const remaining = 4 - mediaFiles.length;
    const newFiles = files.slice(0, remaining);

    // Resize images client-side before upload (keeps files under Nginx's body limit)
    const resized = await Promise.all(newFiles.map(f => resizeImage(f)));

    setMediaFiles(prev => [...prev, ...resized]);
    setMediaPreviews(prev => [...prev, ...resized.map(f => URL.createObjectURL(f))]);

    // Clear video if images are selected
    if (videoFile) {
      setVideoFile(null);
      setVideoPreview(null);
    }

    // Reset input
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

    // Clear images if video is selected
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

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleLinkBlur = useCallback(async () => {
    const url = linkUrl.trim();
    if (!url) { setLinkPreview(null); return; }

    // Ensure URL has protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    setLinkUrl(fullUrl);
    setFetchingPreview(true);
    try {
      const preview = await api.fetchLinkPreview(treeId, fullUrl);
      setLinkPreview(preview);
    } catch {
      setLinkPreview(null);
    } finally {
      setFetchingPreview(false);
    }
  }, [linkUrl, treeId]);

  const handleSubmit = async () => {
    if (!hasContent || loading) return;
    setLoading(true);
    const postType = getPostType();
    const mediaType = videoFile ? "Video" : mediaFiles.length > 0 ? "Image" : "None";

    trackEvent("create_post_started", {
      post_id: null,
      post_type: postType,
      media_type: mediaType,
    });

    try {
      const response = await api.createPost(treeId, {
        content: content.trim(),
        postType,
        authorName,
        authorAvatarUrl,
        linkUrl: linkUrl || undefined,
        linkTitle: linkPreview?.title || undefined,
        linkDescription: linkPreview?.description || undefined,
        linkImageUrl: linkPreview?.imageUrl || undefined,
        mediaFiles: videoFile ? [videoFile] : mediaFiles.length > 0 ? mediaFiles : undefined,
        visibility,
        contentLanguage: contentLanguage !== 'auto' ? contentLanguage : undefined,
      });

      trackEvent("create_post_completed", {
        post_id: response.postId,
        post_type: response.postType,
        media_type: mediaType,
      });

      // Reset
      setContent('');
      mediaPreviews.forEach(URL.revokeObjectURL);
      setMediaFiles([]);
      setMediaPreviews([]);
      removeVideo();
      setLinkUrl('');
      setLinkPreview(null);
      setShowLinkInput(false);

      onPostCreated();
    } catch (err) {
      trackEvent("create_post_failed", {
        post_id: null,
        post_type: postType,
        media_type: mediaType,
        error: String(err),
      });
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative px-4 py-4 border-b border-[#E2E8F0]/80 dark:border-[#2a2a2a]">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={authorAvatarUrl || undefined} />
          <AvatarFallback className="bg-[#E2E8F0] dark:bg-[#2a2a2a] text-[#8B7355] text-sm font-medium">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={2}
            className="w-full resize-none bg-transparent text-base md:text-[15px] text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/50 focus:outline-none leading-relaxed"
          />

          {/* Image previews */}
          {mediaPreviews.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
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
            <div className="relative mt-2 rounded-xl overflow-hidden max-h-[200px]">
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
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={handleLinkBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLinkBlur(); }}
                  placeholder="Paste a URL..."
                  className="flex-1 h-11 md:h-9 px-3 text-base md:text-sm bg-[#F5F0EB]/60 dark:bg-[#1e1e1e] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] rounded-lg text-[#3D2E1F] dark:text-[#F3F2F1] placeholder:text-[#8B7355]/50 focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]/40"
                />
                <button
                  onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkPreview(null); }}
                  className="text-[#8B7355] hover:text-[#3D2E1F]"
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
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E2E8F0]/40 dark:border-[#2a2a2a]/60">
            <div className="flex items-center gap-1">
              {/* Image button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={!!videoFile || mediaFiles.length >= 4}
                className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-full text-[#2F3E8F] hover:bg-[#2F3E8F]/10 disabled:opacity-30 transition-colors"
                title="Add images"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />

              {/* Video button */}
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={mediaFiles.length > 0}
                className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-full text-[#2F3E8F] hover:bg-[#2F3E8F]/10 disabled:opacity-30 transition-colors"
                title="Add video"
              >
                <Video className="h-5 w-5" />
              </button>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={handleVideoSelect} />

              {/* Link button */}
              <button
                onClick={() => setShowLinkInput(!showLinkInput)}
                className={`h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-full transition-colors ${
                  showLinkInput ? 'text-[#2F3E8F] bg-[#2F3E8F]/10' : 'text-[#2F3E8F] hover:bg-[#2F3E8F]/10'
                }`}
                title="Add link"
              >
                <Link2 className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Content language selector — shown for link posts (video language can't be auto-detected) */}
              {(showLinkInput || linkUrl) && (
                <div className="relative">
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    className={`flex items-center gap-1.5 px-2.5 h-11 md:h-9 rounded-full text-xs font-medium border transition-colors ${
                      contentLanguage !== 'auto'
                        ? 'border-[#C2A46D] text-[#8B6914] bg-[#C2A46D]/10'
                        : 'border-[#E2E8F0] dark:border-[#3a3a3a] text-[#8B7355] hover:border-[#C2A46D]/60'
                    }`}
                    title="Tag content language (for video/link posts)"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {contentLanguage === 'auto' ? 'Lang' : { 'en': 'EN', 'hi-IN': 'HI', 'ta-IN': 'TA', 'te-IN': 'TE', 'bn-IN': 'BN', 'kn-IN': 'KN', 'ml-IN': 'ML', 'mr-IN': 'MR', 'gu-IN': 'GU' }[contentLanguage] || 'Lang'}
                  </button>
                  {showLangPicker && (
                    <div className="absolute bottom-full mb-1 right-0 w-36 bg-white dark:bg-[#1E1E1E] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1 max-h-48 overflow-y-auto">
                      <button onClick={() => { setContentLanguage('auto'); setShowLangPicker(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${contentLanguage === 'auto' ? 'text-[#2F3E8F] font-medium' : 'text-gray-600'}`}>Auto-detect</button>
                      {[
                        { code: 'en', label: 'English' }, { code: 'hi-IN', label: 'Hindi' },
                        { code: 'ta-IN', label: 'Tamil' }, { code: 'te-IN', label: 'Telugu' },
                        { code: 'bn-IN', label: 'Bengali' }, { code: 'kn-IN', label: 'Kannada' },
                        { code: 'ml-IN', label: 'Malayalam' }, { code: 'mr-IN', label: 'Marathi' },
                        { code: 'gu-IN', label: 'Gujarati' },
                      ].map(l => (
                        <button key={l.code} onClick={() => { setContentLanguage(l.code); setShowLangPicker(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 ${contentLanguage === l.code ? 'text-[#2F3E8F] font-medium' : 'text-gray-600 dark:text-gray-400'}`}>{l.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Visibility toggle */}
              <button
                onClick={() => setVisibility(v => v === 'family' ? 'public' : 'family')}
                className={`flex items-center gap-1.5 px-3 h-11 md:h-9 rounded-full text-xs font-medium border transition-colors ${
                  visibility === 'public'
                    ? 'border-[#2F3E8F] text-[#2F3E8F] bg-[#2F3E8F]/8'
                    : 'border-[#E2E8F0] dark:border-[#3a3a3a] text-[#8B7355] hover:border-[#2F3E8F]/60 hover:text-[#2F3E8F]'
                }`}
                title={visibility === 'public' ? 'Visible to everyone on FamilyAConnect' : 'Visible to family only'}
              >
                {visibility === 'public'
                  ? <><Globe className="h-3.5 w-3.5" /> Public</>
                  : <><Lock className="h-3.5 w-3.5" /> Family</>
                }
              </button>

              {/* Post button */}
              <button
                onClick={handleSubmit}
                disabled={!hasContent || loading}
                className="px-5 h-11 md:h-9 rounded-full bg-[#2F3E8F] text-white text-sm font-medium hover:bg-[#A8643A] disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Post
              </button>
            </div>
          </div>
        </div> {/* closes flex-1 */}
      </div> {/* closes flex gap-3 */}
      {/* ═══ Professional Modern Uploading/Submitting Overlay ═══ */}
      {loading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-[#1E1E1E]/95 backdrop-blur-[4px] z-30 flex flex-col justify-between p-5 animate-in fade-in duration-300 rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a] pb-3">
              <div className="flex items-center gap-3 text-left">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={authorAvatarUrl || undefined} />
                  <AvatarFallback className="bg-[#E2E8F0] dark:bg-[#2a2a2a] text-[#8B7355] text-xs font-semibold">
                    {getInitials(authorName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">
                    Publishing Post...
                  </h4>
                  <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-[#2F3E8F] dark:text-[#8CA0FF]" />
                    {mediaFiles.length > 0 ? 'Uploading attachments...' : 'Sending to family tree...'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#2F3E8F] dark:text-[#8CA0FF] bg-[#2F3E8F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {visibility === 'public' ? 'Public' : 'Family'}
              </span>
            </div>

            {/* Content Preview */}
            <div className="flex-1 flex flex-col justify-center my-4 space-y-3 overflow-hidden">
              {content.trim() && (
                <div className="px-1 text-left">
                  <p className="text-[13px] text-[#3D2E1F]/80 dark:text-[#D2D0CE]/80 font-normal italic line-clamp-3 leading-relaxed">
                    "{content.trim()}"
                  </p>
                </div>
              )}

              {mediaPreviews.length > 0 && (
                <div className="relative rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 p-2 flex gap-2 justify-center max-h-[140px] items-center">
                  <div className="absolute inset-0 skeleton-shimmer opacity-40 z-10 pointer-events-none" />
                  {mediaPreviews.slice(0, 3).map((preview, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/20">
                      <img src={preview} alt="" className="w-full h-full object-cover blur-[0.5px]" />
                    </div>
                  ))}
                  {mediaPreviews.length > 3 && (
                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      +{mediaPreviews.length - 3}
                    </div>
                  )}
                </div>
              )}

              {videoPreview && (
                <div className="relative rounded-xl overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-200/50 dark:border-stone-800 p-2 flex justify-center max-h-[140px] items-center">
                  <div className="absolute inset-0 skeleton-shimmer opacity-40 z-10 pointer-events-none" />
                  <div className="relative w-36 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/20 bg-black flex items-center justify-center">
                    <Video className="w-6 h-6 text-white/50 animate-pulse" />
                  </div>
                </div>
              )}

              {linkUrl && linkPreview && (
                <div className="border border-stone-200/60 dark:border-stone-800 rounded-xl p-2.5 bg-stone-50/50 dark:bg-stone-900/50 flex items-center gap-3 max-h-[80px]">
                  {linkPreview.imageUrl && (
                    <img src={linkPreview.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-[#3D2E1F] dark:text-[#e0e0e0] truncate">{linkPreview.title}</p>
                    <p className="text-[10px] text-[#8B7355] dark:text-stone-500 truncate mt-0.5">{linkUrl}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
              <div className="flex justify-between items-center text-[11px] font-medium text-[#8B7355] dark:text-[#A19F9D]">
                <span>Publishing to family feed...</span>
                <span className="tabular-nums animate-pulse">Processing</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2F3E8F] via-[#C2A46D] to-[#2F3E8F] rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
