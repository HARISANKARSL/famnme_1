import React, { useState } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/authStore';
import {
  BarChart2, Trash2, Eye, Image as ImageIcon, Play,
  Video, CheckCircle, User, RefreshCw, X, ChevronDown, ChevronUp, Download
} from 'lucide-react';

export function AnalyticsTrackerConsole() {
  const { eventQueue, viewedPosts, activeVideo, clearQueue, removeEvent, getEventPayload } = useAnalyticsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushStatus, setFlushStatus] = useState<string | null>(null);

  const handleDownloadJSON = () => {
    const userId = useAuthStore.getState().user?.id || 'guest_user';
    const payload = getEventPayload(userId);

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analytics_events.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'post_view': return <Eye className="w-4 h-4 text-emerald-500" />;
      case 'image_click': return <ImageIcon className="w-4 h-4 text-sky-500" />;
      case 'video_start': return <Play className="w-4 h-4 text-purple-500" fill="currentColor" />;
      case 'video_watch': return <Video className="w-4 h-4 text-amber-500" />;
      case 'video_complete': return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      case 'profile_view': return <User className="w-4 h-4 text-pink-500" />;
      default: return <BarChart2 className="w-4 h-4 text-slate-500" />;
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'post_view': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'image_click': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
      case 'video_start': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'video_watch': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'video_complete': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';
      case 'profile_view': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  };

  const handleSimulateFlush = async () => {
    if (eventQueue.length === 0) return;
    setIsFlushing(true);
    setFlushStatus('Syncing queue with backend...');

    try {
      useAnalyticsStore.getState().flushQueue();
      setFlushStatus('Success! Queue flushed.');
    } catch (err) {
      console.error(err);
      setFlushStatus('Failed to flush queue.');
    } finally {
      setIsFlushing(false);
      setTimeout(() => setFlushStatus(null), 3000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md border border-[#E2E8F0] dark:border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] dark:bg-[#151515] border-b border-[#E2E8F0] dark:border-[#2a2a2a] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#2F3E8F]" />
          <span className="text-xs font-bold text-[#3D2E1F] dark:text-[#F3F2F1] uppercase tracking-wider">
            Analytics Monitor
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] dark:bg-[#2F3E8F]/20 dark:text-[#8CA0FF]">
            {eventQueue.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isOpen ? <ChevronDown className="w-4 h-4 text-[#8B7355]" /> : <ChevronUp className="w-4 h-4 text-[#8B7355]" />}
        </div>
      </div>

      {/* Main Panel Content */}
      {isOpen && (
        <div className="p-4 max-h-[380px] overflow-y-auto space-y-4 text-xs">
          {/* Metadata State info */}
          <div className="grid grid-cols-2 gap-2 bg-[#F7F4F0] dark:bg-[#121212] p-2.5 rounded-lg border border-[#E2E8F0]/60 dark:border-[#2a2a2a]/60">
            <div>
              <span className="text-[#8B7355] block text-[9px] uppercase font-semibold">Viewed Posts</span>
              <span className="text-sm font-semibold text-[#3D2E1F] dark:text-[#F3F2F1]">
                {viewedPosts.length} <span className="text-[10px] text-[#8B7355]/70">unique</span>
              </span>
            </div>
            <div>
              <span className="text-[#8B7355] block text-[9px] uppercase font-semibold">Active Video</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate block">
                {activeVideo ? `Post #${activeVideo.postId.slice(0, 6)}` : 'None'}
              </span>
            </div>
          </div>

          {/* Queue Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateFlush}
              disabled={eventQueue.length === 0 || isFlushing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#2F3E8F] text-white font-semibold rounded-lg hover:bg-[#2F3E8F]/90 disabled:opacity-50 transition-colors"
            >
              {isFlushing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Flushing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Flush & Sync Queue</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadJSON}
              title="Download accumulated JSON file"
              className="px-2.5 py-2 border border-[#E2E8F0] dark:border-[#2a2a2a] hover:bg-[#2F3E8F]/10 hover:text-[#2F3E8F] text-[#8B7355] dark:text-gray-400 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearQueue}
              disabled={eventQueue.length === 0 || isFlushing}
              title="Clear all events"
              className="px-2.5 py-2 border border-[#E2E8F0] dark:border-[#2a2a2a] hover:bg-red-500/10 hover:text-red-500 text-[#8B7355] dark:text-gray-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {flushStatus && (
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20 text-center text-[10px] font-medium animate-pulse">
              {flushStatus}
            </div>
          )}

          {/* Events List */}
          <div className="space-y-2">
            <div className="font-semibold text-[#8B7355] uppercase tracking-wider text-[9px] flex justify-between items-center">
              <span>Event Queue ({eventQueue.length})</span>
              <span className="text-[8px] lowercase font-normal italic">local Zustand state</span>
            </div>

            {eventQueue.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#E2E8F0] dark:border-[#2a2a2a] rounded-lg text-gray-400">
                Queue is empty. Trigger feed events to fill it!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {eventQueue.map((ev, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-2 p-2 bg-[#F9FAFB] dark:bg-[#252525] rounded-md border border-[#E2E8F0] dark:border-[#2a2a2a] hover:border-[#2F3E8F]/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {getEventIcon(ev.type)}
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold uppercase tracking-wider ${getEventBadgeClass(ev.type)}`}>
                          {ev.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Event details payload */}
                      <div className="pl-5 text-[10px] text-[#3D2E1F]/80 dark:text-gray-300 font-mono space-y-0.5">
                        {'postId' in ev && (
                          <div>id: <span className="text-[#8B7355]">{ev.postId.slice(0, 8)}...</span></div>
                        )}
                        {'targetUserId' in ev && (
                          <div>user: <span className="text-[#8B7355]">{ev.targetUserId.slice(0, 8)}...</span></div>
                        )}
                        {'watchPercentage' in ev && (
                          <div>watched: <span className="text-amber-600 dark:text-amber-400 font-semibold">{Math.round(ev.watchPercentage)}% ({Math.round((ev as any).watchDuration || (ev as any).watchTime || 0)}s)</span></div>
                        )}
                        <div className="text-[8px] text-gray-400 font-sans">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => removeEvent(index)}
                      className="text-[#8B7355]/40 hover:text-red-500 hover:bg-red-500/5 p-1 rounded transition-colors"
                      title="Remove event from queue"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
