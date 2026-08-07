/**
 * AddToAlbumModal - Select albums to add a memory (or batch) to
 */

import { useState, useEffect } from 'react';
import { X, Loader2, FolderOpen, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { fetchAlbums, addMemoryToAlbum, moveMemoriesToAlbum, createAlbum } from '@/services/albumApiService';
import { Input } from '@/components/ui/input';
import type { Album } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';

interface AddToAlbumModalProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  memoryIds: string[];  // single or batch
  onDone: (albumId: string, albumName: string) => void;
}

export function AddToAlbumModal({ open, onClose, treeId, memoryIds, onDone }: AddToAlbumModalProps) {
  const { toast } = useToast();
  const { isMobile } = useResponsive();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmAlbum, setConfirmAlbum] = useState<Album | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchAlbums(treeId)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.albums || []);
        setAlbums(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, treeId]);

  if (!open) return null;

  const handleAddToAlbum = async (albumId: string) => {
    setAdding(albumId);
    try {
      await moveMemoriesToAlbum(albumId, memoryIds);
      const album = albums.find(a => (a.albumId || (a as any)._id) === albumId);
      const name = album ? album.name : '';
      onDone(albumId, name);
      onClose();
    } catch (err) {
      console.error('Failed to add to album:', err);
    } finally {
      setAdding(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const album = await createAlbum(treeId, { name: newName.trim() });
      toast({
        title: 'Success',
        description: 'Album created successfully',
      });
      const albumId = album.albumId || (album as any)._id;
      await moveMemoriesToAlbum(albumId, memoryIds);
      onDone(albumId, newName.trim());
      onClose();
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[70] ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col ${isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90dvh] overflow-hidden' : 'max-w-sm mx-2 sm:mx-4 rounded-2xl max-h-[80vh]'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <h2 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">
            {confirmAlbum ? 'Confirm Move' : 'Add to Album'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
          {confirmAlbum ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-[#E8EDFF] flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6 text-[#2F3E8F]" />
              </div>
              <h3 className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] mb-1">Move Memories</h3>
              <p className="text-xs text-[#8B7355] dark:text-[#999] mb-6 max-w-[260px] leading-relaxed">
                Are you sure you want to move {memoryIds.length === 1 ? 'this memory' : `${memoryIds.length} memories`} to the album <strong className="text-gray-900 dark:text-white">"{confirmAlbum.name}"</strong>?
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setConfirmAlbum(null)}
                  disabled={!!adding}
                  className="flex-1 text-xs h-9 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const albumId = confirmAlbum.albumId || (confirmAlbum as any)._id;
                    handleAddToAlbum(albumId);
                  }}
                  disabled={!!adding}
                  className="flex-1 text-xs h-9 rounded-lg bg-[#2F3E8F] hover:bg-[#1e2a6b] text-white"
                >
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Move'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {loading && <p className="text-sm text-[#8B7355] dark:text-[#999] text-center py-6">Loading albums...</p>}

              {!loading && albums.length === 0 && !showCreate && (
                <div className="text-center py-6">
                  <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-[#8B7355] dark:text-[#999] mb-3">No albums yet</p>
                </div>
              )}

              {!loading && albums.map(album => {
                const albumId = album.albumId || (album as any)._id;
                const count = album.fileIds?.length ?? (album as any).itemCount ?? (album as any).memoryCount ?? (album as any).memories?.length ?? (album.memoryIds?.length || 0);
                return (
                  <button
                    key={albumId}
                    onClick={() => setConfirmAlbum(album)}
                    disabled={!!adding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {album.coverImageUrl ? (
                        <img src={album.coverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FolderOpen className="w-5 h-5 text-[#8B7355] dark:text-[#999]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{album.name}</p>
                      <p className="text-[10px] text-[#8B7355] dark:text-[#999]">{count} items</p>
                    </div>
                    {adding === albumId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#2F3E8F]" />
                    ) : (
                      <Check className="w-4 h-4 text-gray-300" />
                    )}
                  </button>
                );
              })}

              {/* Create new inline */}
              {showCreate ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Album name"
                    className="text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateAndAdd} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#E8EDFF] transition-colors text-left mt-1"
                >
                  <div className="w-10 h-10 rounded bg-[#E8EDFF] flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5 text-[#2F3E8F]" />
                  </div>
                  <span className="text-sm font-medium text-[#2F3E8F]">Create New Album</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
