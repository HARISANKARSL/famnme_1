import { useState, useCallback, useEffect, useRef } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';

interface YouTubePreviewCardProps {
  videoId: string;
  embedUrl: string;
  title?: string | null;
  /** Fallback thumbnail URL (used for Vimeo or when YouTube CDN fails) */
  thumbnailUrl?: string | null;
  provider: 'youtube' | 'vimeo';
  postId?: string;
}

export function YouTubePreviewCard({
  videoId,
  embedUrl,
  title,
  thumbnailUrl,
  provider,
  postId,
}: YouTubePreviewCardProps) {
  const [playing, setPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeVideo = useAnalyticsStore((state) => state.activeVideo);
  const isThisVideoActive = activeVideo?.postId === postId;

  const handlePlay = useCallback(() => {
    setPlaying(true);
    if (postId) {
      useAnalyticsStore.getState().trackVideoStart(postId);
    }
  }, [postId]);

  useEffect(() => {
    if (isThisVideoActive && !playing) {
      handlePlay();
    } else if (!isThisVideoActive && playing) {
      setPlaying(false);
    }
  }, [isThisVideoActive, playing, handlePlay]);

  useEffect(() => {
    if (!playing || !postId || provider !== 'youtube') return;

    let ytPlayer: any = null;
    let isMounted = true;
    let progressInterval: NodeJS.Timeout | null = null;

    const clearProgressTimer = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    const initPlayer = () => {
      if (!iframeRef.current || !isMounted) return;

      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        let host = 'https://www.youtube.com';
        try {
          const urlObj = new URL(embedUrl);
          host = `${urlObj.protocol}//${urlObj.host}`;
        } catch {}

        ytPlayer = new (window as any).YT.Player(`yt-player-${postId}`, {
          host,
          events: {
            onStateChange: (event: any) => {
              if (!isMounted) return;
              const playerState = event.data;

              // YT.PlayerState: PLAYING = 1, PAUSED = 2, ENDED = 0
              if (playerState === 1) {
                useAnalyticsStore.getState().trackVideoStart(postId);

                // Start progress tracking interval
                clearProgressTimer();
                progressInterval = setInterval(() => {
                  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    const currentTime = ytPlayer.getCurrentTime();
                    const duration = ytPlayer.getDuration() || 0;
                    useAnalyticsStore.getState().updateActiveVideoProgress(currentTime, duration);
                  }
                }, 500);

              } else {
                clearProgressTimer();

                if (playerState === 2) {
                  useAnalyticsStore.getState().trackVideoPause(postId);
                }

                if (playerState === 0) {
                  useAnalyticsStore.getState().trackVideoComplete(postId);
                }
              }
            },
          },
        });
      } catch (err) {
        console.error('Failed to initialize YouTube Player API:', err);
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    initPlayer();

    return () => {
      isMounted = false;
      clearProgressTimer();

      const currentActive = useAnalyticsStore.getState().activeVideo;
      if (currentActive && currentActive.postId === postId) {
        useAnalyticsStore.getState().trackVideoScrollAway(postId);
      }

      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
          ytPlayer.destroy();
        } catch {}
      }
    };
  }, [playing, postId, provider]);

  // Priority: API thumbnail (mediaUrls[0]) → CDN maxresdefault → CDN hqdefault
  const cdnThumb = useFallback
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  // If the API thumbnail failed to load (imgError), always use CDN
  const thumb = !imgError && thumbnailUrl
    ? thumbnailUrl
    : provider === 'youtube' ? cdnThumb : undefined;

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (provider === 'youtube' && !useFallback && img.naturalWidth <= 120 && img.naturalHeight <= 90) {
      setUseFallback(true);
    }
  }, [provider, useFallback]);

  const handleImgError = useCallback(() => {
    if (!imgError) {
      setImgError(true);
    } else if (provider === 'youtube' && !useFallback) {
      setUseFallback(true);
    }
  }, [imgError, provider, useFallback]);

  const baseSrc = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`;
  const iframeSrc = provider === 'youtube'
    ? `${baseSrc}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
    : baseSrc;

  return (
    <div className="rounded-xl overflow-hidden border border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        {playing ? (
          <iframe
            ref={iframeRef}
            id={`yt-player-${postId}`}
            src={iframeSrc}
            title={title || 'Video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={handlePlay}
            className="absolute inset-0 w-full h-full bg-black cursor-pointer group"
            aria-label="Play video"
          >
            {thumb && (
              <img
                key={thumb}
                src={thumb}
                alt={title || 'Video thumbnail'}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                onLoad={handleImgLoad}
                onError={handleImgError}
              />
            )}

            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-600/90 group-hover:bg-red-600 group-hover:scale-110 transition-all duration-200 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>

      {title && (
        <div className="px-3 py-2 bg-[#F5F0EB] dark:bg-[#1e1e1e]">
          <p className="text-xs font-medium text-[#3D2E1F] dark:text-[#F3F2F1] line-clamp-1">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
