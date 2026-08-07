import { useState } from 'react'
import type { Source, SourceInput } from '@/types'
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Upload, X as XIcon, FileText, Image as ImageIcon } from 'lucide-react'
import { createSource } from '@/services/sourceApiService'

const SOURCE_TYPES = [
  { value: 'document', label: 'Document' },
  { value: 'photo', label: 'Photo' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'census', label: 'Census' },
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'book', label: 'Book' },
  { value: 'website', label: 'Website' },
  { value: 'oral', label: 'Oral History' },
  { value: 'other', label: 'Other' },
] as const

interface AddSourceModalProps {
  treeId: string
  open: boolean
  onClose: () => void
  onSourceCreated?: (source: Source) => void
}

const INITIAL_FORM: SourceInput = {
  title: '',
  type: 'document',
  author: '',
  publisher: '',
  url: '',
  repositoryName: '',
  notes: '',
}

export function AddSourceModal({ treeId, open, onClose, onSourceCreated }: AddSourceModalProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<SourceInput>({ ...INITIAL_FORM })
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleChange = (field: keyof SourceInput, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload: SourceInput = {
        ...form,
        title: form.title.trim(),
        author: form.author?.trim() || null,
        publisher: form.publisher?.trim() || null,
        url: form.url?.trim() || null,
        repositoryName: form.repositoryName?.trim() || null,
        notes: form.notes?.trim() || null,
      }
      const created = await createSource(treeId, payload, selectedFile || undefined)
      toast({ title: 'Source created' })
      onSourceCreated?.(created)
      setForm({ ...INITIAL_FORM })
      setSelectedFile(null)
      onClose()
    } catch {
      toast({ title: 'Error', description: 'Failed to create source', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setForm({ ...INITIAL_FORM })
      setSelectedFile(null)
      onClose()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Maximum file size is 20 MB', variant: 'destructive' })
        return
      }
      setSelectedFile(file)
    }
  }

  const isImageFile = (file: File) => file.type.startsWith('image/')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="source-title">Title <span className="text-white">*</span></Label>
            <Input
              id="source-title"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Birth Certificate of John Doe"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map(st => (
                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author */}
          <div>
            <Label htmlFor="source-author">Author</Label>
            <Input
              id="source-author"
              value={form.author ?? ''}
              onChange={e => handleChange('author', e.target.value)}
              placeholder="Author or creator"
            />
          </div>

          {/* Publisher */}
          <div>
            <Label htmlFor="source-publisher">Publisher</Label>
            <Input
              id="source-publisher"
              value={form.publisher ?? ''}
              onChange={e => handleChange('publisher', e.target.value)}
              placeholder="Publisher or issuing authority"
            />
          </div>

          {/* URL */}
          <div>
            <Label htmlFor="source-url">URL</Label>
            <Input
              id="source-url"
              type="url"
              value={form.url ?? ''}
              onChange={e => handleChange('url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* File Upload */}
          <div>
            <Label>Attach Document / Image</Label>
            {selectedFile ? (
              <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                {isImageFile(selectedFile) ? (
                  <ImageIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                )}
                <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-400 hover:bg-[#E8EDFF]/50 transition-colors">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Click to upload (images, PDF, Word — max 20 MB)
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileSelect}
                />
              </label>
            )}
          </div>

          {/* Repository Name */}
          <div>
            <Label htmlFor="source-repo">Repository Name</Label>
            <Input
              id="source-repo"
              value={form.repositoryName ?? ''}
              onChange={e => handleChange('repositoryName', e.target.value)}
              placeholder="e.g. National Archives"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="source-notes">Notes</Label>
            <Textarea
              id="source-notes"
              value={form.notes ?? ''}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this source"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Source
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
