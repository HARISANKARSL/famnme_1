import { useState, useEffect } from 'react';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User } from 'lucide-react';
import * as neo4jAPI from '@/services/neo4jDataService';
import type { Person } from '@/types';

export interface HomePersonCandidate {
  personId: string;
  name: string;
  score?: number;
}

export interface SetHomePersonModalProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  candidates?: HomePersonCandidate[];
  onSuccess: (personId: string) => void;
  preventClose?: boolean;
}

export function SetHomePersonModal({
  open,
  onClose,
  treeId,
  candidates,
  onSuccess,
  preventClose,
}: SetHomePersonModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const [hasHomePerson, setHasHomePerson] = useState<boolean | null>(null);

  useEffect(() => {
    if (candidates) {
      setHasHomePerson(false);
    }
  }, [candidates]);

  useEffect(() => {
    if (open && treeId && !candidates) {
      loadPersons();
    }
  }, [open, treeId, candidates]);

  const loadPersons = async () => {
    setLoading(true);
    try {
      const data = await neo4jAPI.fetchTreeWindow(treeId, undefined, 99, 99, { skipCache: true });
      const sorted = [...data.persons].sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setPersons(sorted);
      const hasHp = data.persons.some(p => p.isHomePerson);
      setHasHomePerson(hasHp);
    } catch (error) {
      console.error('Failed to load persons for home person selection:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayList = candidates
    ? candidates.map(c => ({ personId: c.personId, name: c.name, subtext: `Score: ${c.score || 0}` }))
    : persons.map(p => ({
      personId: p.personId,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      subtext: `${p.birthDate || ''} ${p.birthPlace ? `• ${p.birthPlace}` : ''}`.trim() || 'No details available'
    }));

  const filteredItems = displayList.filter((item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectPerson = async (personId: string) => {
    setSettingHome(true);
    try {
      await neo4jAPI.setHomePerson(treeId, personId);
      onSuccess(personId);
    } catch (error) {
      console.error('Failed to set home person:', error);
    } finally {
      setSettingHome(false);
    }
  };

  const shouldPreventClose = preventClose ?? (hasHomePerson === false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          if (shouldPreventClose) return;
          if (!settingHome) onClose();
        }
      }}
    >
      <DialogContent hideCloseButton={true} className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Select Home Person</DialogTitle>
          <DialogDescription>
            {candidates
              ? "We've identified these potential primary persons from your import. Please select one to center the tree around."
              : "Choose the primary person to center your tree around."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#2F3E8F]" />
                <p className="text-sm text-gray-500">Loading persons...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500">
                <p>No persons found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-stone-800">
                {filteredItems.map((item) => (
                  <button
                    key={item.personId}
                    onClick={() => handleSelectPerson(item.personId)}
                    disabled={settingHome}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-stone-800 flex items-center justify-center text-slate-400 dark:text-stone-500 group-hover:bg-[#E8EDFF] dark:group-hover:bg-[#2F3E8F]/20 group-hover:text-[#2F3E8F] dark:group-hover:text-[#8CA0FF] transition-colors shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.subtext}
                      </p>
                    </div>
                    {settingHome && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* <DialogFooter className="p-6 bg-slate-50 border-t">
          <Button variant="outline" onClick={onClose} disabled={settingHome}>
            Skip for now
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
