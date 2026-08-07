import { Image, Camera, CalendarDays } from 'lucide-react';
import { Dialog, ResponsiveDialogContent as DialogContent } from '@/components/ui/dialog';

type KDMemory = {
  memoryId: string;
  title: string;
  memoryType: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  dateTaken?: string;
};

interface MemoryViewerModalProps {
  memory: KDMemory;
  templeName: string;
  onClose: () => void;
  onAddMemory: () => void;
}

export function MemoryViewerModal({ memory, templeName, onClose, onAddMemory }: MemoryViewerModalProps) {
  const imageUrl = memory.mediaUrl ?? memory.thumbnailUrl;

  const formattedDate = memory.dateTaken
    ? new Date(memory.dateTaken).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 shrink-0 pr-12">
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">{templeName}</p>
          <h3 className="text-[14px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] truncate">
            {memory.title}
          </h3>
        </div>

        {/* Image */}
        {imageUrl ? (
          <div className="w-full bg-black" style={{ maxHeight: '50vh' }}>
            <img
              src={imageUrl}
              alt={memory.title}
              className="w-full object-contain"
              style={{ maxHeight: '50vh' }}
            />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center bg-[#ECE7DF] dark:bg-[#1a1a1a]" style={{ height: '200px' }}>
            <Image className="w-12 h-12 text-[#2F3E8F]/40" />
          </div>
        )}

        {/* Meta */}
        <div className="px-4 py-3 flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[12px] text-[#8B7355] dark:text-[#A19F9D] capitalize">
            <Camera className="w-3.5 h-3.5" />
            {memory.memoryType}
          </span>
          {formattedDate && (
            <span className="flex items-center gap-1.5 text-[12px] text-[#8B7355] dark:text-[#A19F9D]">
              <CalendarDays className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Add memory CTA */}
        <div className="px-4 pb-4">
          <button
            onClick={onAddMemory}
            className="w-full py-2.5 rounded-xl bg-[#2F3E8F] hover:bg-[#3B4DA6] text-white text-[13px] font-semibold transition-colors"
          >
            Add another memory at {templeName}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
