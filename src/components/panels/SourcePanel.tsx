import { useState, useEffect, useCallback } from 'react'
import { useResponsive } from '@/hooks/useResponsive'
import type { Source, SourceCitation, SourceCitationInput } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Loader2, X, ChevronDown, ChevronRight, Plus, Trash2, BookOpen, Link2, FileText, Image as ImageIcon, ExternalLink, Eye } from 'lucide-react'
import {
  getTreeSources, deleteSource,
  getPersonCitations, addCitation, deleteCitation,
} from '@/services/sourceApiService'
import { resolveBackendUrl } from '@/config/api'
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const FACT_TYPES = ['birth', 'death', 'marriage', 'name', 'residence', 'occupation', 'general'] as const
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-blue-100 text-[#2F3E8F]',
  photo: 'bg-purple-100 text-purple-700',
  certificate: 'bg-green-100 text-green-700',
  census: 'bg-yellow-100 text-yellow-700',
  newspaper: 'bg-blue-100 text-[#2F3E8F]',
  book: 'bg-indigo-100 text-indigo-700',
  website: 'bg-cyan-100 text-cyan-700',
  oral: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700',
}

interface SourcePanelProps {
  treeId: string
  onClose: () => void
  personId?: string
  onAddSource?: () => void
}

export function SourcePanel({ treeId, onClose, personId, onAddSource }: SourcePanelProps) {
  const { isMobile } = useResponsive()
  const { toast } = useToast()

  // Sources list
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)

  // Person citations (when personId is provided)
  const [personCitations, setPersonCitations] = useState<SourceCitation[]>([])
  const [previewDoc, setPreviewDoc] = useState<{ url: string; mimeType?: string | null; name?: string | null } | null>(null)

  // Expanded source
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null)
  const [, setSourceCitations] = useState<SourceCitation[]>([])

  // Cite form (for adding citation to a person)
  const [citingSourceId, setCitingSourceId] = useState<string | null>(null)
  const [citeForm, setCiteForm] = useState<{
    factType: SourceCitationInput['factType']
    confidence: SourceCitationInput['confidence']
    page: string
    detail: string
    notes: string
  }>({
    factType: 'general',
    confidence: 'medium',
    page: '',
    detail: '',
    notes: '',
  })
  const [citeSaving, setCiteSaving] = useState(false)

  const loadSources = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTreeSources(treeId)
      setSources(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load sources', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [treeId, toast])

  const loadPersonCitations = useCallback(async () => {
    if (!personId) return
    try {
      const data = await getPersonCitations(personId)
      setPersonCitations(data)
    } catch {
      // silent fail
    }
  }, [personId])

  useEffect(() => {
    loadSources()
    loadPersonCitations()
  }, [loadSources, loadPersonCitations])

  const handleToggleExpand = (sourceId: string) => {
    if (expandedSourceId === sourceId) {
      setExpandedSourceId(null)
      setSourceCitations([])
    } else {
      setExpandedSourceId(sourceId)
      // Citations for this source are filtered from personCitations if personId, otherwise just show source info
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm('Delete this source and all its citations?')) return
    try {
      await deleteSource(sourceId)
      setSources(prev => prev.filter(s => s.sourceId !== sourceId))
      toast({ title: 'Source deleted' })
    } catch {
      toast({ title: 'Error', description: 'Failed to delete source', variant: 'destructive' })
    }
  }

  const handleStartCite = (sourceId: string) => {
    setCitingSourceId(sourceId)
    setCiteForm({ factType: 'general', confidence: 'medium', page: '', detail: '', notes: '' })
  }

  const handleSaveCitation = async () => {
    if (!personId || !citingSourceId) return
    setCiteSaving(true)
    try {
      const citation: SourceCitationInput = {
        sourceId: citingSourceId,
        personId,
        factType: citeForm.factType,
        confidence: citeForm.confidence,
        page: citeForm.page || null,
        detail: citeForm.detail || null,
        notes: citeForm.notes || null,
      }
      const created = await addCitation(citation)
      setPersonCitations(prev => [...prev, created])
      setCitingSourceId(null)
      toast({ title: 'Citation added' })
    } catch {
      toast({ title: 'Error', description: 'Failed to add citation', variant: 'destructive' })
    } finally {
      setCiteSaving(false)
    }
  }

  const handleDeleteCitation = async (citationId: string) => {
    try {
      await deleteCitation(citationId)
      setPersonCitations(prev => prev.filter(c => c.citationId !== citationId))
      toast({ title: 'Citation removed' })
    } catch {
      toast({ title: 'Error', description: 'Failed to delete citation', variant: 'destructive' })
    }
  }

  // Get citation count for a source
  const getCitationCount = (sourceId: string) => {
    return personCitations.filter(c => c.sourceId === sourceId).length
  }

  return (
    <div className={`${isMobile ? 'fixed inset-0 z-50' : 'h-full border-l border-gray-200'} flex flex-col bg-white`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {personId ? 'Sources & Citations' : 'Tree Sources'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onAddSource && (
            <Button size="sm" onClick={onAddSource}>
              <Plus className="h-4 w-4 mr-1" />
              Add Source
            </Button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isMobile ? 'pb-16' : ''}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No sources yet.</p>
            {onAddSource && (
              <Button variant="outline" size="sm" className="mt-3" onClick={onAddSource}>
                <Plus className="h-4 w-4 mr-1" />
                Add your first source
              </Button>
            )}
          </div>
        ) : (
          sources.map(source => {
            const isExpanded = expandedSourceId === source.sourceId
            const isCiting = citingSourceId === source.sourceId
            const citCount = personId ? getCitationCount(source.sourceId) : 0
            const citationsForSource = personCitations.filter(c => c.sourceId === source.sourceId)

            return (
              <div key={source.sourceId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Source header row */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => handleToggleExpand(source.sourceId)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{source.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[source.type] || TYPE_COLORS.other}`}>
                        {source.type}
                      </span>
                    </div>
                    {source.author && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">by {source.author}</p>
                    )}
                  </div>
                  {personId && citCount > 0 && (
                    <span className="text-xs bg-blue-100 text-[#2F3E8F] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {citCount} citation{citCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-2">
                    {/* Source details */}
                    <div className="text-sm text-gray-600 space-y-1">
                      {source.author && <p><span className="font-medium">Author:</span> {source.author}</p>}
                      {source.publisher && <p><span className="font-medium">Publisher:</span> {source.publisher}</p>}
                      {source.url && (
                        <p>
                          <span className="font-medium">URL:</span>{' '}
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[#2F3E8F] hover:underline inline-flex items-center gap-1">
                            {source.url.length > 40 ? source.url.slice(0, 40) + '...' : source.url}
                            <Link2 className="h-3 w-3" />
                          </a>
                        </p>
                      )}
                      {source.repositoryName && <p><span className="font-medium">Repository:</span> {source.repositoryName}</p>}
                      {source.notes && <p><span className="font-medium">Notes:</span> {source.notes}</p>}
                    </div>

                    {/* Attached file preview */}
                    {source.fileUrl && (() => {
                      const docUrl = resolveBackendUrl(source.fileUrl);
                      return (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attached Document</p>
                          {source.fileMimeType?.startsWith('image/') ? (
                            <div className="space-y-1.5">
                              <div
                                onClick={() => setPreviewDoc({ url: docUrl, mimeType: source.fileMimeType, name: source.fileName })}
                                className="block cursor-pointer group/preview"
                              >
                                <img
                                  src={docUrl}
                                  alt={source.fileName || 'Source document'}
                                  className="max-h-48 rounded-lg border border-gray-200 object-contain hover:opacity-90 transition-opacity"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                                <span className="text-xs text-gray-500 truncate">{source.fileName}</span>
                                <button
                                  onClick={() => setPreviewDoc({ url: docUrl, mimeType: source.fileMimeType, name: source.fileName })}
                                  className="text-xs text-[#2F3E8F] hover:underline inline-flex items-center gap-0.5 ml-auto font-medium"
                                >
                                  View full size <ExternalLink className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : source.fileMimeType === 'application/pdf' ? (
                            <div className="space-y-1.5">
                              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-32">
                                <FileText className="h-10 w-10 text-red-300" />
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-red-500" />
                                <span className="text-xs text-gray-500 truncate">{source.fileName}</span>
                                <a
                                  href={docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#2F3E8F] hover:underline inline-flex items-center gap-0.5 ml-auto font-medium"
                                >
                                  Open PDF <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate flex-1">{source.fileName}</span>
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#2F3E8F] hover:underline inline-flex items-center gap-1 flex-shrink-0 font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Open
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Existing citations for this person from this source */}
                    {personId && citationsForSource.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Citations</p>
                        {citationsForSource.map(cit => (
                          <div key={cit.citationId} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 text-sm">
                            <div>
                              <span className="font-medium capitalize">{cit.factType}</span>
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                cit.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                cit.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-[#2F3E8F]'
                              }`}>
                                {cit.confidence}
                              </span>
                              {cit.page && <span className="text-gray-500 ml-2">p. {cit.page}</span>}
                            </div>
                            <button
                              onClick={() => handleDeleteCitation(cit.citationId)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cite this source form */}
                    {personId && isCiting && (
                      <div className="bg-[#E8EDFF] rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium text-blue-900">Add Citation</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Fact Type</Label>
                            <Select value={citeForm.factType} onValueChange={(v) => setCiteForm(prev => ({ ...prev, factType: v as SourceCitationInput['factType'] }))}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FACT_TYPES.map(ft => (
                                  <SelectItem key={ft} value={ft} className="capitalize">{ft}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Confidence</Label>
                            <Select value={citeForm.confidence} onValueChange={(v) => setCiteForm(prev => ({ ...prev, confidence: v as SourceCitationInput['confidence'] }))}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONFIDENCE_LEVELS.map(cl => (
                                  <SelectItem key={cl} value={cl} className="capitalize">{cl}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Page / Location</Label>
                          <Input
                            className="h-8 text-sm"
                            value={citeForm.page}
                            onChange={e => setCiteForm(prev => ({ ...prev, page: e.target.value }))}
                            placeholder="e.g. p.42, entry #5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Detail</Label>
                          <Input
                            className="h-8 text-sm"
                            value={citeForm.detail}
                            onChange={e => setCiteForm(prev => ({ ...prev, detail: e.target.value }))}
                            placeholder="Specific detail cited"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveCitation} disabled={citeSaving}>
                            {citeSaving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCitingSourceId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {personId && !isCiting && (
                        <Button size="sm" variant="outline" onClick={() => handleStartCite(source.sourceId)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Cite this source
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => handleDeleteSource(source.sourceId)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      {/* Document Preview Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] p-6">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{previewDoc.name || 'Document Preview'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex items-center justify-center bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800 p-2 overflow-hidden max-h-[85vh]">
              {previewDoc.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name || 'Preview'}
                  className="max-h-[75vh] object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-16 w-16 text-blue-500 mb-4" />
                  <p className="text-sm font-medium mb-4">Preview not available for this file type.</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2F3E8F] text-white rounded-lg text-sm hover:bg-[#25327A] transition-colors"
                  >
                    Open in new tab <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
