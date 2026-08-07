import { useRef, useState } from 'react';
import { X, Plus, Upload, Check, Mic } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';

import type { TreeMetadata } from '@/types';
import { TreeCard } from '@/components/cards/TreeCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface TreeManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trees: TreeMetadata[];
  currentTreeId: string | null;
  onSelectTree: (treeId: string) => void;
  onCreateTree: () => void;
  onRenameTree: (treeId: string) => void;
  onDeleteTree: (treeId: string) => void;
  onDuplicateTree: (treeId: string) => void;
  onSettingsTree?: (treeId: string) => void;
  onExportGedcom?: (treeId: string) => void;
  onExportCsv?: (treeId: string) => void;
  onImportGedcom?: (file: File, treeName: string) => void;
  onTellStory?: () => void;
  loading?: boolean;
}

export function TreeManagementPanel({
  isOpen,
  onClose,
  trees,
  currentTreeId,
  onSelectTree,
  onCreateTree,
  onRenameTree,
  onDeleteTree,
  onDuplicateTree,
  onSettingsTree,
  onExportGedcom,
  onExportCsv,
  onImportGedcom,
  onTellStory,
  loading = false,
}: TreeManagementPanelProps) {
  const { isMobile } = useResponsive();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importTreeName, setImportTreeName] = useState('');

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportGedcom || !importTreeName.trim()) return;

    onImportGedcom(file, importTreeName.trim());

    // Reset state
    setIsImporting(false);
    setImportTreeName('');
    e.target.value = '';
  };


  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 bottom-0 w-full sm:w-96'} bg-white dark:bg-zinc-950 dark:border-l dark:border-zinc-800 shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
            My Family Trees
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Create/Import buttons */}
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800 space-y-2">
          <Button
            onClick={onCreateTree}
            className="w-full bg-[#2F3E8F] hover:bg-[#3B4DA6] text-white dark:bg-[#2F3E8F] dark:hover:bg-[#3B4DA6]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Tree
          </Button>

          {onTellStory && (
            <Button
              onClick={onTellStory}
              variant="outline"
              className="w-full border-[#2F3E8F] text-[#2F3E8F] hover:bg-[#2F3E8F]/5 dark:border-[#7B8FD4] dark:text-[#7B8FD4] dark:hover:bg-[#7B8FD4]/10"
            >
              <Mic className="h-4 w-4 mr-2" />
              Tell a Story
            </Button>
          )}

          {onImportGedcom && (
            <div className="space-y-2">
              {!isImporting ? (
                <Button
                  variant="outline"
                  onClick={() => setIsImporting(true)}
                  className="w-full border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import GEDCOM File
                </Button>
              ) : (
                <div className="space-y-2 p-3 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">GEDCOM Import</span>
                    <button 
                      onClick={() => { setIsImporting(false); setImportTreeName(''); }}
                      className="text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter tree name..."
                    value={importTreeName}
                    onChange={(e) => setImportTreeName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 rounded focus:outline-none focus:ring-1 focus:ring-[#2F3E8F] dark:focus:ring-[#7B8FD4]"
                    autoFocus
                  />
                  <Button
                    disabled={!importTreeName.trim()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#2F3E8F] text-white dark:bg-[#2F3E8F] dark:hover:bg-[#3B4DA6]"
                    size="sm"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Select File & Import
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".ged,.gedcom"
                onChange={handleFileImport}
                className="hidden"
              />
            </div>
          )}

        </div>

        {/* Tree list */}
        <ScrollArea className={`flex-1 p-4 ${isMobile ? 'pb-16' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F3E8F]" />
            </div>
          ) : trees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-zinc-400">
              <p className="text-sm">No trees found</p>
              <p className="text-xs mt-1">Create your first family tree to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trees.map((tree) => (
                <TreeCard
                  key={tree.treeId}
                  tree={tree}
                  isActive={tree.treeId === currentTreeId}
                  onClick={() => onSelectTree(tree.treeId)}
                  onRename={() => onRenameTree(tree.treeId)}
                  onDelete={() => onDeleteTree(tree.treeId)}
                  onDuplicate={() => onDuplicateTree(tree.treeId)}
                  onSettings={onSettingsTree ? () => onSettingsTree(tree.treeId) : undefined}
                  onExportGedcom={onExportGedcom ? () => onExportGedcom(tree.treeId) : undefined}
                  onExportCsv={onExportCsv ? () => onExportCsv(tree.treeId) : undefined}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
