import { lazy, Suspense, useEffect, useCallback } from 'react'
import { usePanelStore } from '@/store/panelStore'
import type { PanelId } from '@/store/panelStore'
import type { Person, ExtendedRelationship, TreeMetadata, ValidationConfig } from '@/types'
import type { TreeWindowData, DuplicatePair } from '@/services/neo4jDataService'
import { Loader2 } from 'lucide-react'

// Lazy-loaded panel components
const TreeManagementPanel = lazy(() => import('@/components/panels/TreeManagementPanel').then(m => ({ default: m.TreeManagementPanel })))
const ProfilePanel = lazy(() => import('@/components/panels/ProfilePanel').then(m => ({ default: m.ProfilePanel })))
const AddRelativePanel = lazy(() => import('@/components/panels/AddRelativePanel').then(m => ({ default: m.AddRelativePanel })))
const SuggestionsPanel = lazy(() => import('@/components/panels/SuggestionsPanel').then(m => ({ default: m.SuggestionsPanel })))
const DuplicateDetectionPanel = lazy(() => import('@/components/panels/DuplicateDetectionPanel').then(m => ({ default: m.DuplicateDetectionPanel })))
const BookmarksPanel = lazy(() => import('@/components/panels/BookmarksPanel').then(m => ({ default: m.BookmarksPanel })))
const MigrationMapPanel = lazy(() => import('@/components/panels/MigrationMapPanel').then(m => ({ default: m.MigrationMapPanel })))
const HistoryPanel = lazy(() => import('@/components/panels/HistoryPanel').then(m => ({ default: m.HistoryPanel })))
const ActivityPanel = lazy(() => import('@/components/panels/ActivityPanel').then(m => ({ default: m.ActivityPanel })))
const PendingEditsPanel = lazy(() => import('@/components/panels/PendingEditsPanel').then(m => ({ default: m.PendingEditsPanel })))
const MediaGalleryPanel = lazy(() => import('@/components/panels/MediaGalleryPanel').then(m => ({ default: m.MediaGalleryPanel })))
const TimelinePanel = lazy(() => import('@/components/panels/TimelinePanel').then(m => ({ default: m.TimelinePanel })))
const SourcePanel = lazy(() => import('@/components/panels/SourcePanel').then(m => ({ default: m.SourcePanel })))
const DescendancyListPanel = lazy(() => import('@/components/panels/DescendancyListPanel').then(m => ({ default: m.DescendancyListPanel })))
const DnaPanel = lazy(() => import('@/components/panels/DnaPanel').then(m => ({ default: m.DnaPanel })))
const AllPeoplePanel = lazy(() => import('@/components/panels/AllPeoplePanel'))
const LifeStoryPanel = lazy(() => import('@/components/panels/LifeStoryPanel').then(m => ({ default: m.LifeStoryPanel })))
const CommentsPanel = lazy(() => import('@/components/panels/CommentsPanel').then(m => ({ default: m.CommentsPanel })))
const AstrologyPanel = lazy(() => import('@/components/panels/AstrologyPanel').then(m => ({ default: m.AstrologyPanel })))

const panelSuspense = (
  <div className="flex items-center justify-center h-32">
    <Loader2 className="h-5 w-5 animate-spin text-[#2F3E8F]" />
  </div>
)

export interface PanelHostCallbacks {
  onPersonContextAction: (personId: string, action: string) => void
  onSelectTree: (treeId: string) => void
  onCreateTree: () => void
  onRenameTree: (treeId: string) => void
  onDeleteTree: (treeId: string) => void
  onDuplicateTree: (treeId: string) => void
  onSettingsTree: () => void
  onExportGedcom: (treeId: string) => void
  onExportCsv: (treeId: string) => void
  onImportGedcom: (file: File, treeName: string) => void

  onTreeReload: (reason: string) => void
  onNavigateToPerson: (personId: string) => void
  onEditPerson: (personId: string) => void
  onSelectDuplicatePair: (pair: DuplicatePair) => void
  onEditApplied: () => void
  onOpenSettings: (() => void) | undefined
  onOpenAddSourceModal?: () => void
  onTellStory?: () => void
}

export interface PanelHostProps {
  currentTreeId: string | null
  treeData: TreeWindowData | null
  userTrees: TreeMetadata[]
  selectedMemberId: string | null
  addRelativePerson: Person | null
  currentValidationConfig: ValidationConfig | null
  callbacks: PanelHostCallbacks
  isWebView: boolean
}

export function PanelHost({
  currentTreeId,
  treeData,
  userTrees,
  selectedMemberId: _selectedMemberId,
  addRelativePerson,
  callbacks,
  isWebView,
}: PanelHostProps) {
  const { activePanel, panelProps, closePanel } = usePanelStore()

  // Close panel on Escape key
  useEffect(() => {
    if (!activePanel) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closePanel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePanel, closePanel])

  const handleClose = useCallback(() => {
    closePanel()
  }, [closePanel])

  if (!activePanel) return null

  const renderPanel = (panelId: PanelId) => {
    switch (panelId) {
      case 'tree-management':
        if (isWebView) return null
        return (
          <TreeManagementPanel
            isOpen
            onClose={handleClose}
            trees={userTrees}
            currentTreeId={currentTreeId}
            onSelectTree={callbacks.onSelectTree}
            onCreateTree={callbacks.onCreateTree}
            onRenameTree={callbacks.onRenameTree}
            onDeleteTree={callbacks.onDeleteTree}
            onDuplicateTree={callbacks.onDuplicateTree}
            onSettingsTree={callbacks.onSettingsTree}
            onExportGedcom={callbacks.onExportGedcom}
            onExportCsv={callbacks.onExportCsv}
            onImportGedcom={callbacks.onImportGedcom}
            onTellStory={callbacks.onTellStory}
          />
        )

      case 'profile':
        return (
          <ProfilePanel
            isOpen
            onClose={handleClose}
            onOpenSettings={callbacks.onOpenSettings}
          />
        )

      case 'add-relative':
        return (
          <AddRelativePanel
            isOpen
            person={addRelativePerson}
            onClose={handleClose}
            onAction={(personId, action) => {
              handleClose()
              callbacks.onPersonContextAction(personId, action)
            }}
            hideAddParent={(() => {
              if (!treeData || !addRelativePerson) return false
              const personId = addRelativePerson.personId
              const parentUnionIds = treeData.relationships
                .filter(r => r.type === 'HAS_CHILD' && r.toId === personId)
                .map(r => r.fromId)
              let hasFather = false
              let hasMother = false
              for (const unionId of parentUnionIds) {
                const partnerIds = treeData.relationships
                  .filter(r => r.type === 'PARTNER_IN' && r.toId === unionId)
                  .map(r => r.fromId)
                for (const partnerId of partnerIds) {
                  const p = treeData.persons.find(x => x.personId === partnerId)
                  if (p) {
                    if (p.gender === 'male') hasFather = true
                    if (p.gender === 'female') hasMother = true
                  }
                }
              }
              return hasFather && hasMother
            })()}
          />
        )

      case 'suggestions': {
        const defaultTreeId = localStorage.getItem('defaultTreeId') || userTrees[0]?.treeId || currentTreeId
        if (!defaultTreeId) return null
        const defaultTreeName = userTrees.find(t => t.treeId === defaultTreeId)?.treeName || 'Family Tree'
        return (
          <SuggestionsPanel
            treeId={defaultTreeId}
            treeName={defaultTreeName}
            isOpen
            onClose={handleClose}
            onFixSuggestion={(suggestion) => {
              handleClose()
              if (currentTreeId !== defaultTreeId) {
                callbacks.onSelectTree(defaultTreeId)
              } else {
                const person = treeData?.persons.find(p => p.personId === suggestion.personId)
                if (person) {
                  if (suggestion.type === 'missing-birthdate' || suggestion.type === 'missing-photo' || suggestion.type === 'incomplete-profile') {
                    callbacks.onPersonContextAction(person.personId, 'edit')
                  } else if (suggestion.type === 'missing-spouse') {
                    callbacks.onPersonContextAction(person.personId, 'add-spouse')
                  } else if (suggestion.type === 'missing-parents') {
                    callbacks.onPersonContextAction(person.personId, 'add-parent')
                  } else if (suggestion.type === 'single-parent') {
                    callbacks.onPersonContextAction(person.personId, 'add-spouse')
                  }
                }
              }
            }}
          />
        )
      }

      case 'duplicate-detection':
        if (!currentTreeId) return null
        return (
          <DuplicateDetectionPanel
            treeId={currentTreeId}
            isOpen
            onClose={handleClose}
            onSelectPair={callbacks.onSelectDuplicatePair}
          />
        )

      case 'bookmarks':
        if (!currentTreeId) return null
        return (
          <BookmarksPanel
            treeId={currentTreeId}
            isOpen
            onClose={handleClose}
            onNavigateToPerson={(personId) => {
              handleClose()
              callbacks.onNavigateToPerson(personId)
            }}
            onEditPerson={(personId) => {
              handleClose()
              callbacks.onEditPerson(personId)
            }}
          />
        )

      case 'migration-map':
        if (!currentTreeId) return null
        return (
          <MigrationMapPanel
            treeId={currentTreeId}
            isOpen
            onClose={handleClose}
            variant="fullpage"
          />
        )

      case 'history':
        if (!panelProps.personId) return null
        return (
          <HistoryPanel
            personId={panelProps.personId}
            personName={panelProps.personName || ''}
            onClose={handleClose}
            onReverted={() => callbacks.onTreeReload('History reverted')}
          />
        )

      case 'activity':
        if (!currentTreeId) return null
        return (
          <ActivityPanel
            treeId={currentTreeId}
            onClose={handleClose}
          />
        )

      case 'pending-edits':
        if (!currentTreeId) return null
        return (
          <PendingEditsPanel
            treeId={currentTreeId}
            onClose={handleClose}
            onEditApplied={callbacks.onEditApplied}
          />
        )

      case 'media-gallery':
        if (!panelProps.personId || !currentTreeId) return null
        return (
          <MediaGalleryPanel
            personId={panelProps.personId}
            personName={panelProps.personName || ''}
            treeId={currentTreeId}
            onClose={handleClose}
          />
        )

      case 'timeline':
        if (!treeData || !currentTreeId) return null
        return (
          <TimelinePanel
            persons={treeData.persons}
            treeId={currentTreeId}
            onClose={handleClose}
            onPersonSelect={(id) => {
              handleClose()
              callbacks.onNavigateToPerson(id)
            }}
          />
        )

      case 'source':
        if (!currentTreeId) return null
        return (
          <SourcePanel
            treeId={currentTreeId}
            personId={panelProps.personId || undefined}
            onClose={handleClose}
          />
        )

      case 'descendancy':
        if (!panelProps.personId || !treeData) return null
        return (
          <DescendancyListPanel
            personId={panelProps.personId}
            persons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships as ExtendedRelationship[]}
            onClose={handleClose}
            onPersonSelect={(id) => {
              handleClose()
              callbacks.onNavigateToPerson(id)
            }}
          />
        )

      case 'dna': {
        if (!panelProps.personId || !treeData) return null
        const person = treeData.persons.find(p => p.personId === panelProps.personId)
        if (!person) return null
        return (
          <DnaPanel
            personId={panelProps.personId}
            person={person}
            onClose={handleClose}
            onUpdate={async (updates) => {
              try {
                const { updatePerson } = await import('@/services/neo4jDataService')
                await updatePerson(panelProps.personId!, updates)
                callbacks.onTreeReload('DNA updated')
              } catch (e) { console.error(e) }
            }}
          />
        )
      }

      case 'all-people':
        if (!currentTreeId) return null
        return (
          <AllPeoplePanel
            treeId={currentTreeId}
            treeName={userTrees.find(t => t.treeId === currentTreeId)?.treeName || 'Family Tree'}
            onClose={handleClose}
            onPersonClick={(personId) => {
              handleClose()
              callbacks.onNavigateToPerson(personId)
            }}
          />
        )

      case 'life-story':
        if (!panelProps.personId || !currentTreeId || !treeData) return null
        return (
          <LifeStoryPanel
            personId={panelProps.personId}
            treeId={currentTreeId}
            persons={treeData.persons}
            unions={treeData.unions}
            relationships={treeData.relationships as ExtendedRelationship[]}
            onClose={handleClose}
          />
        )

      case 'comments':
        if (!panelProps.personId || !currentTreeId) return null
        return (
          <CommentsPanel
            personId={panelProps.personId}
            personName={panelProps.personName || ''}
            treeId={currentTreeId}
            onClose={handleClose}
          />
        )

      case 'astrology':
        return <AstrologyPanel onClose={handleClose} persons={treeData?.persons} treeId={currentTreeId || undefined} />

      default:
        return null
    }
  }

  return (
    <Suspense fallback={panelSuspense}>
      {renderPanel(activePanel)}
    </Suspense>
  )
}
