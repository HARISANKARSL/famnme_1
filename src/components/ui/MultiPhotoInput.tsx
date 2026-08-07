/**
 * MultiPhotoInput — Multi-file picker with preview grid, drag-and-drop, and remove.
 */

import { useRef, useState, useCallback } from 'react'
import { Upload, X, Plus, Image, Film, Mic } from 'lucide-react'

interface Props {
  files: File[]
  onFilesChange: (files: File[]) => void
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
  disabled?: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Mic
  return Image
}

export function MultiPhotoInput({
  files,
  onFilesChange,
  accept = 'image/*,video/*,audio/*',
  maxFiles = 20,
  maxSizeMB = 50,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const maxBytes = maxSizeMB * 1024 * 1024

    const valid = fileArray.filter(f => {
      if (f.size > maxBytes) return false
      return true
    })

    const combined = [...files, ...valid].slice(0, maxFiles)
    onFilesChange(combined)
  }, [files, onFilesChange, maxFiles, maxSizeMB])

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }, [files, onFilesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles, disabled])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = '' // reset so same files can be re-selected
    }
  }, [addFiles])

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  // Empty state: show drop zone
  if (files.length === 0) {
    return (
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-[#2F3E8F] bg-[#2F3E8F]/5'
            : 'border-[#E2E8F0] hover:border-[#2F3E8F]/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-[#B8A090] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[#3D2E1F]">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-[#8B7355] mt-1">
          Photos, videos, or audio · Max {maxSizeMB}MB each · Up to {maxFiles} files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
        />
      </div>
    )
  }

  // Preview grid
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 border-2 rounded-xl transition-colors ${
        dragOver ? 'border-[#2F3E8F] bg-[#2F3E8F]/5' : 'border-[#E2E8F0]'
      }`}>
        {files.map((file, idx) => {
          const isImage = file.type.startsWith('image/')
          const Icon = getFileIcon(file.type)
          return (
            <div key={`${file.name}-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden bg-[#F4F6FA]">
              {isImage ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#8B7355]">
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-[9px] truncate max-w-[80%]">{file.name}</span>
                </div>
              )}
              {/* Size badge */}
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                {formatSize(file.size)}
              </div>
              {/* Remove button */}
              {!disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Add more button */}
        {files.length < maxFiles && !disabled && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-[#E2E8F0] hover:border-[#2F3E8F]/50 flex flex-col items-center justify-center text-[#B8A090] hover:text-[#2F3E8F] transition-colors"
          >
            <Plus className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Add more</span>
          </button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-[#8B7355]">
          {files.length} file{files.length !== 1 ? 's' : ''} · {formatSize(totalSize)}
        </span>
        {!disabled && (
          <button
            onClick={() => onFilesChange([])}
            className="text-xs text-[#B8A090] hover:text-red-500 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  )
}
