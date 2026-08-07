import { useState, useMemo, useEffect, useRef } from 'react';
import type { Person, Union } from '@/types';
import type { Relationship } from '@/services/elkLayoutService';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTabId } from '@/components/profile/ProfileTabs';
import { FactsTab } from '@/components/profile/FactsTab';
import { GalleryTab } from '@/components/profile/GalleryTab';
import { LifeStoryTab } from '@/components/profile/LifeStoryTab';
import { NotesCommentsTab } from '@/components/profile/NotesCommentsTab';
import { HistoryTab } from '@/components/profile/HistoryTab';
import { treeApiCalls, aiApiCalls } from '@/api/apicalls';
import { useToast } from '@/components/ui/use-toast';

import { useAnalyticsStore } from '@/store/analyticsStore';

interface PersonProfilePageProps {
  personId: string;
  treeId: string;
  persons: Person[];
  unions: Union[];
  relationships: Relationship[];
  onClose: () => void;
  onPersonNavigate: (personId: string) => void;
  onEditPerson: (person: Person) => void;
  onDeletePerson: (person: Person) => void;
  onAddRelative: (personId: string, action: string) => void;
  onViewInTree: (personId: string) => void;
  onTreeReload: () => void;
  onManageTags: (personId: string) => void;
  onAddSource?: () => void;
  onCreateMemory?: (personId: string) => void;
  onPhotoChange?: (personId: string, file: File) => void;
}

export default function PersonProfilePage({
  personId,
  treeId,
  persons,
  unions,
  relationships,
  onClose,
  onPersonNavigate,
  onEditPerson,
  onDeletePerson,
  onAddRelative,
  onViewInTree,
  onTreeReload,
  onManageTags,
  onAddSource: _onAddSource,
  onCreateMemory,
  onPhotoChange,
}: PersonProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('facts');
  const { toast } = useToast();

  // Track profile views in Zustand
  useEffect(() => {
    if (personId) {
      useAnalyticsStore.getState().addEvent({
        type: 'profile_view',
        targetUserId: personId,
      });
    }
  }, [personId]);

  const person = useMemo(() => persons.find(p => p.personId === personId), [persons, personId]);

  const [localPerson, setLocalPerson] = useState<Person | null>(null);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [aiCitations, setAiCitations] = useState<any[]>([]);

  // Capture onTreeReload in a ref to avoid running the loading effect when parent re-renders
  const onTreeReloadRef = useRef(onTreeReload);
  useEffect(() => {
    onTreeReloadRef.current = onTreeReload;
  }, [onTreeReload]);

  const handleUpdateBiography = async () => {
    setIsBioLoading(true);
    try {
      const aiRes = await aiApiCalls.getLifeStory(personId);
      const storyText = aiRes?.biography || aiRes?.story || '';
      const biographyRefs = aiRes?.biographyReferences || (aiRes?.citations || []).map((cit: any) => ({
        personId: cit.id || cit.personId,
        displayName: cit.label || cit.displayName
      }));

      // Update the biography and biographyReferences on the backend
      const updatedPerson = await treeApiCalls.updatePerson(personId, {
        biography: storyText,
        biographyReferences: biographyRefs
      });

      // Update local state
      setLocalPerson(updatedPerson);
      setAiCitations(aiRes?.biographyReferences || aiRes?.citations || []);

      // Trigger reload in the tree
      onTreeReloadRef.current();

      toast({
        title: 'Success',
        description: 'Life story updated successfully.',
      });
    } catch (err) {
      console.error('Failed to update life story biography:', err);
      toast({
        title: 'Error',
        description: 'Failed to update life story.',
        variant: 'destructive',
      });
    } finally {
      setIsBioLoading(false);
    }
  };

  // Keep local state in sync when parent person data changes
  useEffect(() => {
    if (person) {
      setLocalPerson(prev => {
        if (prev && prev.personId === person.personId) {
          return {
            ...prev,
            ...person,
            biography: prev.biography || person.biography
          };
        }
        return person;
      });
    }
  }, [person]);

  useEffect(() => {
    let active = true;
    setLocalPerson(person || null);
    setIsBioLoading(false);
    setAiCitations([]);

    async function loadPersonDetails() {
      try {
        const fetchedPerson = await treeApiCalls.getPerson(personId);
        if (!active) return;
        setLocalPerson(fetchedPerson);

        // If biography is empty, call the AI API
        if (!fetchedPerson.biography || !fetchedPerson.biography.trim()) {
          setIsBioLoading(true);
          try {
            const aiRes = await aiApiCalls.getLifeStory(personId);
            if (!active) return;
            const storyText = aiRes?.story || '';
            setAiCitations(aiRes?.citations || []);

            if (storyText.trim()) {
              const biographyRefs = (aiRes?.citations || []).map((cit: any) => ({
                personId: cit.id,
                displayName: cit.label
              }));
              // Update the biography and biographyReferences on the backend
              await treeApiCalls.updatePerson(personId, {
                biography: storyText,
                biographyReferences: biographyRefs
              });
              // Fetch the person again to get the updated biography
              const updatedPerson = await treeApiCalls.getPerson(personId);
              if (active) {
                setLocalPerson(updatedPerson);
              }
              // Trigger reload in the tree
              onTreeReloadRef.current();
            }
          } catch (aiErr) {
            console.error('Failed to generate AI biography:', aiErr);
          } finally {
            if (active) {
              setIsBioLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch person details:', err);
      }
    }

    loadPersonDetails();

    return () => {
      active = false;
    };
  }, [personId]);

  if (!person) {
    return (
      <div className="fixed inset-0 z-[45] bg-[#f5f0e8] dark:bg-[#121212] text-[#3D2E1F] dark:text-[#F3F2F1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Person not found</p>
          <button onClick={onClose} className="mt-2 text-[#2F3E8F] dark:text-[#8CA0FF] hover:underline text-sm">Back to Tree</button>
        </div>
      </div>
    );
  }

  const activePerson = localPerson || person;
  const fullName = `${activePerson.firstName} ${activePerson.lastName || ''}`.trim();

  return (
    <div className="fixed inset-0 z-[45] bg-[#f5f0e8] dark:bg-[#121212] text-[#3D2E1F] dark:text-[#F3F2F1] overflow-y-auto">
      {/* Header */}
      <ProfileHeader
        person={activePerson}
        onClose={onClose}
        onEditPerson={() => onEditPerson(activePerson)}
        onDeletePerson={() => onDeletePerson(activePerson)}
        onViewInTree={() => onViewInTree(personId)}
        onViewHistory={() => setActiveTab('history')}
        onManageTags={() => onManageTags(personId)}
        onPhotoChange={onPhotoChange ? (file) => onPhotoChange(personId, file) : undefined}
      />

      {/* Tabs */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="pb-20 md:pb-8">
        {activeTab === 'facts' && (
          <FactsTab
            person={activePerson}
            treeId={treeId}
            persons={persons}
            unions={unions}
            relationships={relationships}
            onPersonNavigate={onPersonNavigate}
            onAddRelative={onAddRelative}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryTab
            personId={personId}
            treeId={treeId}
            personName={fullName}
            profilePhotoUrl={activePerson.photoThumbUrl || activePerson.profilePhotoUrl}
            onCreateMemory={onCreateMemory ? () => onCreateMemory(personId) : undefined}
          />
        )}

        {activeTab === 'life-story' && (
          <LifeStoryTab
            person={activePerson}
            treeId={treeId}
            persons={persons}
            unions={unions}
            relationships={relationships}
            onPersonNavigate={onPersonNavigate}
            aiCitations={aiCitations}
            aiLoading={isBioLoading}
            onUpdateBiography={handleUpdateBiography}
          />
        )}

        {activeTab === 'notes' && (
          <NotesCommentsTab
            personId={personId}
            personName={fullName}
            treeId={treeId}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            personId={personId}
            personName={fullName}
            onTreeReload={onTreeReload}
          />
        )}
      </div>
    </div>
  );
}
