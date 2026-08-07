import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { ImageCropModal } from '@/components/ui/ImageCropModal';

export interface PhotoUploadInputProps {
  currentPhotoUrl?: string | null;
  onPhotoSelect: (file: File | null) => void;
  previewUrl?: string | null;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function estimateUploadSeconds(bytes: number): string {
  // Conservative estimate: assume 200 KB/s after compression to ~1 MB max.
  const compressedBytes = Math.min(bytes, 1024 * 1024);
  const seconds = Math.max(1, Math.round(compressedBytes / (200 * 1024)));
  return seconds < 60 ? `~${seconds}s` : `~${Math.round(seconds / 60)}m`;
}

export function PhotoUploadInput({
  currentPhotoUrl,
  onPhotoSelect,
  previewUrl,
  disabled = false,
}: PhotoUploadInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [pickedFileMeta, setPickedFileMeta] = useState<{ size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add Paste (Ctrl+V) support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      // Don't intercept paste if user is currently typing in a text input or textarea
      // unless it's the container itself (rare but possible)
      const activeEl = document.activeElement;
      const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (isTyping && activeEl !== fileInputRef.current) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            validateAndOpenCrop(file);
            // Prevent default so the image isn't pasted as text elsewhere if applicable
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled]);

  const displayUrl = previewUrl || currentPhotoUrl;

  const validateAndOpenCrop = (file: File) => {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 20MB');
      return;
    }
    if (file.type && !file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    setError(null);
    setPickedFileMeta({ size: file.size });
    const objectUrl = URL.createObjectURL(file);
    setCropImageUrl(objectUrl);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndOpenCrop(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndOpenCrop(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCropDone = (croppedFile: File) => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    onPhotoSelect(croppedFile);
  };

  const handleCropCancel = () => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoSelect(null);
    setError(null);
  };

  return (
    <div className="space-y-3">
      <Label>Profile Photo</Label>

      {/* E5 — Drag-and-drop wrapper */}
      <div
        ref={containerRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-xl border-2 border-dashed p-3 transition-colors ${isDragging
          ? 'border-[#2F3E8F] bg-[#E8EDFF]'
          : 'border-transparent'
          }`}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Profile photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <Upload className="h-10 w-10 text-gray-400" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={undefined}
            onChange={handleFileSelect}
            className="absolute w-0 h-0 overflow-hidden opacity-0"
            style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
            disabled={disabled}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-2" />
              {displayUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {/* {displayUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )} */}
          </div>

          <p className="text-sm text-gray-500">
            JPG, PNG, GIF, WebP or HEIC. Drag-drop, click, or paste (Ctrl+V). Auto-compressed.
          </p>
          {pickedFileMeta && (
            <p className="text-xs text-stone-500">
              {formatFileSize(pickedFileMeta.size)} · estimated upload {estimateUploadSeconds(pickedFileMeta.size)}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
      {/* Crop Modal */}
      {cropImageUrl && (
        <ImageCropModal
          imageUrl={cropImageUrl}
          onCropDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
