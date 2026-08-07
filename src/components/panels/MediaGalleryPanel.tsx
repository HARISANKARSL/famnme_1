/**
 * MediaGalleryPanel - Per-person file attachments with upload, preview, captions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Trash2, Edit2, Check, FileText, Image as ImageIcon } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { uploadAttachments, listAttachments, updateCaption, deleteAttachment } from '@/services/attachmentService';
import { resolveBackendUrl } from '@/config/api';
import type { Attachment } from '@/types';

interface MediaGalleryPanelProps {
  personId: string;
  personName: string;
  treeId: string;
  onClose: () => void;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (isImage(mimeType)) return <ImageIcon className="w-8 h-8 text-sky-400" />;
  return <FileText className="w-8 h-8 text-gray-400" />;
}

export function MediaGalleryPanel({ personId, personName, treeId, onClose }: MediaGalleryPanelProps) {
  const { isMobile } = useResponsive();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAttachments();
  }, [personId]);

  async function loadAttachments() {
    setLoading(true);
    try {
      const result = await listAttachments(personId);
      setAttachments(result);
    } catch (err) {
      console.error('Failed to load attachments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    try {
      await uploadAttachments(personId, treeId, fileArray);
      await loadAttachments();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    try {
      await deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.attachmentId !== attachmentId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleSaveCaption(attachmentId: string) {
    try {
      const updated = await updateCaption(attachmentId, captionText);
      setAttachments(prev => prev.map(a => a.attachmentId === attachmentId ? updated : a));
      setEditingCaption(null);
    } catch (err) {
      console.error('Caption update failed:', err);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [personId, treeId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-14 bottom-0 w-[420px]'} bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Media Gallery</h2>
          <p className="text-xs text-gray-500">{personName} - {attachments.length} file(s)</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mx-3 mt-3 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={`w-6 h-6 mx-auto mb-1 ${uploading ? 'animate-pulse text-sky-500' : 'text-gray-400'}`} />
        <p className="text-xs text-gray-500">
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Images, PDFs, documents (max 20MB)</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={e => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Gallery Grid */}
      <div className={`flex-1 overflow-y-auto p-3 ${isMobile ? 'pb-16' : ''}`}>
        {loading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
        {!loading && attachments.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No attachments yet</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {attachments.map(att => (
            <div key={att.attachmentId} className="border border-gray-100 rounded-lg overflow-hidden group">
              {/* Thumbnail / Icon */}
              <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                {isImage(att.mimeType) ? (
                  <img
                    src={resolveBackendUrl(att.filePath)}
                    alt={att.originalName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileTypeIcon mimeType={att.mimeType} />
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDelete(att.attachmentId)}
                    className="p-1.5 bg-white rounded-full shadow hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate" title={att.originalName}>
                  {att.originalName}
                </p>
                <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>

                {/* Caption */}
                {editingCaption === att.attachmentId ? (
                  <div className="flex gap-1 mt-1">
                    <input
                      type="text"
                      value={captionText}
                      onChange={e => setCaptionText(e.target.value)}
                      className="flex-1 text-xs px-1.5 py-0.5 border rounded"
                      placeholder="Caption"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveCaption(att.attachmentId)}
                      className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-gray-500 flex-1 truncate">
                      {att.caption || <span className="italic text-gray-300">No caption</span>}
                    </p>
                    <button
                      onClick={() => { setEditingCaption(att.attachmentId); setCaptionText(att.caption || ''); }}
                      className="p-0.5 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
