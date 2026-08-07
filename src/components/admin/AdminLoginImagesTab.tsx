/**
 * AdminLoginImagesTab
 *
 * Displays the current three login-page slideshow images and lets the admin
 * replace any or all of them with new uploads.  Each slot is independent �
 * uploading to slot 1 only changes slot 1.
 */

import { useState, useEffect, useRef } from 'react'
import { Upload, X, Loader2, Check, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '@/config/api'

interface SlotState {
  currentUrl: string           // URL shown right now (from server)
  previewUrl: string | null    // local blob preview of staged file
  file: File | null            // staged file (not yet saved)
  uploading: boolean
  saved: boolean               // flash "saved" indicator
}

const DEFAULT_URLS = [
  'https://fc-familytree.blr1.cdn.digitaloceanspaces.com/static/login/01-login.webp',
  'https://fc-familytree.blr1.cdn.digitaloceanspaces.com/static/login/02-login.webp',
  'https://fc-familytree.blr1.cdn.digitaloceanspaces.com/static/login/03-login.webp',
]

function makeSlot(url: string): SlotState {
  return { currentUrl: url, previewUrl: null, file: null, uploading: false, saved: false }
}

interface AdminLoginImagesTabProps {
  adminToken: string
}

export function AdminLoginImagesTab({ adminToken }: AdminLoginImagesTabProps) {
  const [slots, setSlots] = useState<SlotState[]>(DEFAULT_URLS.map(makeSlot))
  const [loading, setLoading] = useState(true)
  const [savingAll, setSavingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // -- Fetch current images ----------------------------------------------------

  const loadImages = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/admin/config/login-images`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (res.status === 401) {
        setError('Session expired � please log out and log in again.')
        return
      }
      if (!res.ok) {
        setError(`Server error (${res.status}) � failed to load images.`)
        return
      }
      const data = await res.json()
      const urls: string[] = data.images ?? DEFAULT_URLS
      setSlots(urls.map(makeSlot))
    } catch {
      setError('Failed to load current images')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadImages() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // -- Stage a file for a slot ------------------------------------------------

  const stageFile = (slotIdx: number, file: File) => {
    const previewUrl = URL.createObjectURL(file)
    setSlots(prev => prev.map((s, i) => {
      if (i !== slotIdx) return s
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
      return { ...s, file, previewUrl, saved: false }
    }))
  }

  const clearSlot = (slotIdx: number) => {
    setSlots(prev => prev.map((s, i) => {
      if (i !== slotIdx) return s
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
      return { ...s, file: null, previewUrl: null, saved: false }
    }))
  }

  // -- Upload a single slot ---------------------------------------------------

  const uploadSlot = async (slotIdx: number): Promise<true | string> => {
    const slot = slots[slotIdx]
    if (!slot.file) return true

    setSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, uploading: true } : s))
    try {
      const form = new FormData()
      form.append('images', slot.file)
      form.append('slotIndex', String(slotIdx))

      const res = await fetch(`${API_BASE_URL}/admin/config/login-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form,
      })
      if (res.status === 401) throw new Error('Session expired � please log out and log in again.')
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      const data = await res.json()
      const newUrl: string = data.images?.[slotIdx] ?? slot.currentUrl

      setSlots(prev => prev.map((s, i) => {
        if (i !== slotIdx) return s
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
        return { ...s, currentUrl: newUrl, file: null, previewUrl: null, uploading: false, saved: true }
      }))
      setTimeout(() => {
        setSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, saved: false } : s))
      }, 2500)
      return true
    } catch (err) {
      setSlots(prev => prev.map((s, i) => i === slotIdx ? { ...s, uploading: false } : s))
      return err instanceof Error ? err.message : 'Upload failed'
    }
  }

  // -- Save all staged slots --------------------------------------------------

  const saveAll = async () => {
    const staged = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.file)
    if (staged.length === 0) return
    setSavingAll(true)
    setError(null)
    const results = await Promise.all(staged.map(({ i }) => uploadSlot(i)))
    const firstErr = results.find(r => r !== true && r !== undefined)
    if (firstErr) setError(typeof firstErr === 'string' ? firstErr : 'One or more images failed to upload')
    setSavingAll(false)
  }

  const anyStaged = slots.some(s => s.file)

  // -- Render -----------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#2F3E8F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#E2DBCE] font-semibold text-sm uppercase tracking-wider">
            Login Page Images
          </h2>
          <p className="text-[#8B7355] text-xs mt-1">
            These three images rotate on the login screen. Click any slot to replace it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadImages}
            className="p-2 rounded-lg text-[#8B7355] hover:text-[#E2DBCE] hover:bg-[#3D2E1F] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {anyStaged && (
            <button
              onClick={saveAll}
              disabled={savingAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(180deg, #2F3E8F 0%, #25327A 100%)' }}
            >
              {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Save changes
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Image slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {slots.map((slot, idx) => {
          const displayUrl = slot.previewUrl ?? slot.currentUrl
          const isPending = !!slot.file

          return (
            <div key={idx} className="flex flex-col gap-3">
              <p className="text-[#B8A090] text-xs font-medium uppercase tracking-wider">
                Slide {idx + 1}
              </p>

              {/* Image preview card */}
              <div
                className="relative rounded-xl overflow-hidden border-2 cursor-pointer group transition-all"
                style={{
                  borderColor: isPending ? '#2F3E8F' : '#3D2E1F',
                  background: '#2A2017',
                  aspectRatio: '3 / 4',
                }}
                onClick={() => fileInputRefs[idx].current?.click()}
              >
                <img
                  src={displayUrl}
                  alt={`Login slide ${idx + 1}`}
                  className="w-full h-full object-contain"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center gap-2 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">Replace image</span>
                  </div>
                </div>

                {/* Uploading overlay */}
                {slot.uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2F3E8F]" />
                  </div>
                )}

                {/* Saved flash */}
                {slot.saved && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white text-xs font-medium">Saved</span>
                    </div>
                  </div>
                )}

                {/* Pending badge */}
                {isPending && !slot.uploading && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-[#2F3E8F] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Unsaved
                  </div>
                )}

                <input
                  ref={fileInputRefs[idx]}
                  type="file"
                  accept="image/*,.webp"
                  style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) stageFile(idx, f)
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Per-slot actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRefs[idx].current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-[#5A4333] text-[#B8A090] hover:border-[#2F3E8F] hover:text-[#2F3E8F] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose image
                </button>
                {isPending && (
                  <>
                    <button
                      onClick={() => void uploadSlot(idx)}
                      disabled={slot.uploading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60"
                      style={{ background: '#2F3E8F' }}
                    >
                      {slot.uploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => clearSlot(idx)}
                      className="p-2 rounded-lg border border-[#5A4333] text-[#8B7355] hover:border-red-700 hover:text-red-400 transition-colors"
                      title="Discard"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info note */}
      <p className="text-[#8B7355] text-xs border-t border-[#3D2E1F] pt-4">
        Images are uploaded to the CDN and visible to all users on the login screen within ~1 minute (CDN cache).
        Recommended: portrait format images with captions in the left third. Max 10 MB each.
      </p>
    </div>
  )
}
