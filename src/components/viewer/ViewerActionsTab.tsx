import { useState } from 'react';
import { Download, Trash2, Link2, FolderPlus, AlertTriangle, Share2, Send, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteMemory, archiveMemory, unarchiveMemory, publishMemory, removeMemoriesFromAlbum } from '@/services/memoriesApiService';
import { AddToAlbumModal } from '@/components/modals/AddToAlbumModal';
import { useToast } from '@/components/ui/use-toast';
import { API_BASE_URL } from '@/config/api';
import type { Memory } from '@/types';

interface ViewerActionsTabProps {
  memory: Memory;
  treeId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onDelete: () => void;
  onUpdate: (albumId?: string, albumName?: string) => void;
  albumId?: string | null;
}

const VIEWER_ACTIONS_CONFIG = [
  // { id: 'share_feed', label: 'Share to Family Feed', icon: Send, iconColor: 'text-[#2F3E8F] dark:text-[#7B8FD4]', textColor: 'text-[#2F3E8F] dark:text-[#7B8FD4]', bgColor: 'hover:bg-[#2F3E8F]/5 dark:hover:bg-[#7B8FD4]/10', isPrimary: true },
  // { id: 'native_share', label: 'Share via...', icon: Share2, iconColor: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300', textColor: 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white', bgColor: 'hover:bg-gray-50 dark:hover:bg-stone-850/50' },
  // { id: 'download', label: 'Download', icon: Download, iconColor: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300', textColor: 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white', bgColor: 'hover:bg-gray-50 dark:hover:bg-stone-850/50', requireMedia: true },
  // { id: 'copy_link', label: 'Copy Link', icon: Link2, iconColor: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300', textColor: 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white', bgColor: 'hover:bg-gray-50 dark:hover:bg-stone-850/50' },
  // { id: 'add_album', label: 'Add to Album', icon: FolderPlus, iconColor: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300', textColor: 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white', bgColor: 'hover:bg-gray-50 dark:hover:bg-stone-850/50' },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    toggleIcon: ArchiveRestore,
    iconColor: 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300',
    textColor: 'text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white',
    bgColor: 'hover:bg-gray-100 dark:hover:bg-stone-800/50'
  },
  {
    id: 'publish',
    label: 'Publish',
    icon: Send,
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'hover:bg-gray-100 dark:hover:bg-stone-800/50',
    requiresDraft: true
  },
  {
    id: 'delete',
    label: 'Delete Memory',
    icon: Trash2,
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'hover:bg-gray-100 dark:hover:bg-stone-800/50',
    isDanger: true,
    hasSeparator: true
  },
];

export function ViewerActionsTab({ memory, treeId, currentUserName, currentUserAvatar, onDelete, onUpdate, albumId }: ViewerActionsTabProps) {
  const { toast } = useToast();
  const firstFile = (memory.files?.[0] || {}) as any;
  const isText = memory.memoryType === 'text' || (!memory.files || memory.files.length === 0);
  const memoryId = isText
    ? (memory._id || memory.memoryId || (memory as any).id)
    : (firstFile._id || memory._id || memory.memoryId || (memory as any).id || firstFile.key);
  const isArchived = memory.isArchived || memory.files?.[0]?.isArchived || memory.files?.[0]?.isArchive;
  const status = memory.status || firstFile?.status;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);

  const handleDownload = async () => {
    if (!memory.mediaUrl) return;
    const baseName = memory.title || 'download';
    try {
      const res = await fetch(memory.mediaUrl);
      const blob = await res.blob();

      const contentType = res.headers.get('content-type') || '';
      let extension = '';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
      else if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('mp4')) extension = '.mp4';
      else if (contentType.includes('quicktime') || contentType.includes('mov')) extension = '.mov';
      else if (contentType.includes('mpeg') || contentType.includes('mp3')) extension = '.mp3';
      else if (contentType.includes('wav')) extension = '.wav';

      if (!extension) {
        try {
          const pathname = new URL(memory.mediaUrl).pathname;
          const lastDot = pathname.lastIndexOf('.');
          if (lastDot !== -1) {
            extension = pathname.slice(lastDot);
          }
        } catch { }
      }

      const filename = baseName.toLowerCase().endsWith(extension.toLowerCase()) ? baseName : `${baseName}${extension}`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Direct download failed, falling back to open in tab', err);
      const a = document.createElement('a');
      a.href = memory.mediaUrl;
      a.target = '_blank';
      a.click();
    }
  };

  const handleCopyLink = async () => {
    const url = memory.mediaUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handleShareToFeed = async () => {
    setSharing(true);
    try {
      const postType = memory.memoryType === 'text' ? 'text' : memory.memoryType === 'video' ? 'video' : 'image';
      const body: Record<string, unknown> = {
        content: `Shared a memory: ${memory.title}${memory.description ? ' — ' + memory.description : ''}`,
        postType,
        visibility: 'family',
        authorName: currentUserName || 'User',
        authorAvatarUrl: currentUserAvatar || null,
      };
      if (memory.mediaUrl && postType === 'image') {
        body.mediaUrls = JSON.stringify([memory.mediaUrl]);
      } else if (memory.mediaUrl && postType === 'video') {
        body.videoUrl = memory.mediaUrl;
        body.videoThumbnailUrl = memory.thumbnailUrl || null;
      }
      const token = localStorage.getItem('auth_token');
      const base = API_BASE_URL.replace(/\/api$/, '');
      const res = await fetch(`${base}/api/tree/${treeId}/share/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Share failed');
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch (err) {
      console.error('Share to feed failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleNativeShare = async () => {
    const shareData: ShareData = {
      title: memory.title,
      text: memory.description || memory.title,
      url: memory.mediaUrl || window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { }
  };

  const handleArchive = async () => {
    if (!memoryId) return;
    setArchiving(true);
    try {
      if (isArchived) await unarchiveMemory(memoryId);
      else await archiveMemory(memoryId);
      setConfirmArchive(false);
      onUpdate();
    } catch (err) {
      console.error('Archive toggle failed:', err);
    } finally {
      setArchiving(false);
    }
  };

  const handlePublish = async () => {
    const actualMemoryId = memoryId;
    if (!actualMemoryId) return;
    setPublishing(true);
    try {
      await publishMemory(actualMemoryId);
      toast({
        title: 'Published Successfully!',
        description: 'The memory has been published.'
      });
      setConfirmPublish(false);
      onUpdate();
    } catch (err) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!memoryId) return;
    setDeleting(true);
    try {
      if (albumId) {
        const fileId = firstFile._id || firstFile.fileId || memoryId;
        await removeMemoriesFromAlbum(albumId, [fileId]);
        toast({
          title: 'Memory Removed!',
          description: 'The memory has been removed from this album.'
        });
      } else {
        await deleteMemory(memoryId);
        toast({
          title: isText ? 'Text Memory Deleted Successfully!' : 'Memory Deleted Successfully!',
          description: 'It will be deleted permanently.'
        });
      }
      onDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>

      {VIEWER_ACTIONS_CONFIG.map((action) => {
        if (action.requireMedia && !memory.mediaUrl) return null;
        if (action.requiresDraft && status !== 'draft') return null;

        // Custom render for Archive confirmation
        if (action.id === 'archive' && confirmArchive) {
          return (
            <div key={action.id} className="space-y-2 py-2 px-1 bg-stone-50 dark:bg-black/20 rounded-xl border border-stone-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-[11px] font-medium text-stone-600 dark:text-stone-400 px-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {isArchived ? 'Restore this memory to main gallery?' : 'Move this memory to personal archive?'}
              </div>
              <div className="flex gap-1.5 px-2 pb-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmArchive(false)} disabled={archiving} className="flex-1 h-7 text-[10px]">Cancel</Button>
                <Button size="sm" onClick={handleArchive} disabled={archiving} className="flex-1 h-7 text-[10px] bg-[#C2A46D] hover:bg-[#A8894F]">
                  {archiving ? 'Saving...' : isArchived ? 'Restore' : 'Archive'}
                </Button>
              </div>
            </div>
          );
        }

        // Custom render for Publish confirmation
        if (action.id === 'publish' && confirmPublish) {
          return (
            <div key={action.id} className="space-y-2 py-2 px-1 bg-green-50 dark:bg-green-950/10 rounded-xl border border-green-100 dark:border-green-900/20 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-[11px] font-medium text-green-700 dark:text-green-400 px-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Are you sure you want to publish this memory?
              </div>
              <div className="flex gap-1.5 px-2 pb-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmPublish(false)} disabled={publishing} className="flex-1 h-7 text-[10px]">Cancel</Button>
                <Button size="sm" onClick={handlePublish} disabled={publishing} className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white">
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>
          );
        }

        // Custom render for Delete confirmation
        if (action.id === 'delete' && confirmDelete) {
          return (
            <div key={action.id} className="border-t border-gray-100 dark:border-white/5 pt-2 mt-3 overflow-hidden">
              <div className="space-y-2 py-2 px-1 bg-red-50/30 dark:bg-red-950/10 rounded-xl border border-red-100/50 dark:border-red-900/20 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 text-[11px] font-medium text-red-600 dark:text-red-400 px-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> {albumId ? 'Are you sure you want to remove this item from the album?' : isText ? 'Once deleted, this text memory cannot be restored.' : 'Once deleted, this memory cannot be restored.'}
                </div>
                <div className="flex gap-1.5 px-2 pb-1">
                  <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 h-7 text-[10px]">Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="flex-1 h-7 text-[10px]">
                    {deleting ? 'Removing...' : isText ? 'Delete Text Memory' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        const Icon = (action.id === 'archive' && isArchived) ? action.toggleIcon! : action.icon;
        const label = (action.id === 'share_feed' && shared) ? 'Shared!' :
          (action.id === 'share_feed' && sharing) ? 'Sharing...' :
            (action.id === 'copy_link' && copied) ? 'Copied!' :
              (action.id === 'archive' && isArchived) ? 'Unarchive' :
                (action.id === 'delete' && albumId) ? 'Remove from Album' :
                  (action.id === 'delete' && isText) ? 'Delete Text Memory' : action.label;

        const onClick = () => {
          if (action.id === 'share_feed') handleShareToFeed();
          if (action.id === 'native_share') handleNativeShare();
          if (action.id === 'download') handleDownload();
          if (action.id === 'copy_link') handleCopyLink();
          if (action.id === 'add_album') setShowAlbumModal(true);
          if (action.id === 'archive') setConfirmArchive(true);
          if (action.id === 'publish') setConfirmPublish(true);
          if (action.id === 'delete') setConfirmDelete(true);
        };

        return (
          <div key={action.id} className={action.hasSeparator ? "border-t border-gray-100 dark:border-white/5 pt-2 mt-3" : ""}>
            <button onClick={onClick} disabled={action.id === 'share_feed' && sharing}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${action.bgColor}`}>
              <Icon className={`w-4 h-4 transition-colors ${action.iconColor}`} />
              <span className={`text-sm font-medium transition-colors ${action.textColor}`}>
                {label}
              </span>
            </button>
          </div>
        );
      })}

      {showAlbumModal && (
        <AddToAlbumModal
          open={showAlbumModal}
          onClose={() => setShowAlbumModal(false)}
          treeId={treeId}
          memoryIds={[memoryId!]}
          onDone={(albumId, albumName) => {
            onUpdate(albumId, albumName);
          }}
        />
      )}
    </div>
  );
}
