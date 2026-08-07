import { useEffect, useState } from 'react';
import { Users, Image } from 'lucide-react';
import { Dialog, ResponsiveDialogContent as DialogContent } from '@/components/ui/dialog';
import { getTempleMembers } from '@/services/templeLinkApiService';

type Member = {
  personId: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  memoryCount?: number;
};

interface PeopleConnectedModalProps {
  treeId: string;
  templeId: string;
  templeName: string;
  onClose: () => void;
}

export function PeopleConnectedModal({ treeId, templeId, templeName, onClose }: PeopleConnectedModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTempleMembers(treeId, templeId)
      .then(data => {
        if (!cancelled) {
          const sorted = [...data as Member[]].sort((a, b) => (b.memoryCount ?? 0) - (a.memoryCount ?? 0));
          setMembers(sorted);
        }
      })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [treeId, templeId]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="p-0 max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#E2DBCE]/60 dark:border-[#2a2a2a] pr-12">
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-4 h-4 text-[#2F3E8F]" />
            <p className="text-[11px] font-semibold text-[#2F3E8F] uppercase tracking-wider">Connected to</p>
          </div>
          <h3 className="text-[15px] font-bold text-[#3D2E1F] dark:text-[#f5f5f5]">{templeName}</h3>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
          {loading ? (
            <div className="py-10 text-center">
              <div className="w-5 h-5 rounded-full border-2 border-[#2F3E8F]/40 border-t-[#2F3E8F] animate-spin mx-auto" />
              <p className="text-[12px] text-[#8B7355] dark:text-[#A19F9D] mt-2">Loading connected family members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center px-4">
              <Users className="w-8 h-8 text-[#2F3E8F]/30 mx-auto mb-2" />
              <p className="text-[13px] text-[#8B7355] dark:text-[#A19F9D]">No family members connected through memories yet.</p>
              <p className="text-[11px] text-[#8B7355]/70 dark:text-[#A19F9D]/60 mt-1">Add memories at this sacred place to see who is connected.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2DBCE]/40 dark:divide-[#2a2a2a]/60">
              {members.map(m => (
                <div key={m.personId} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2F3E8F]/15 flex items-center justify-center shrink-0">
                    {m.profilePhotoUrl
                      ? <img src={m.profilePhotoUrl} className="w-full h-full object-cover" alt={m.firstName} />
                      : <span className="text-[14px] font-bold text-[#2F3E8F]">{m.firstName[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">
                      {m.firstName} {m.lastName}
                    </p>
                    {(m.memoryCount ?? 0) > 0 && (
                      <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        {m.memoryCount} {m.memoryCount === 1 ? 'memory' : 'memories'}
                      </p>
                    )}
                  </div>
                  {(m.memoryCount ?? 0) > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2F3E8F]/10 text-[#2F3E8F] shrink-0">
                      {m.memoryCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 border-t border-[#E2DBCE]/40 dark:border-[#2a2a2a]">
          <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] text-center">
            {members.length > 0 ? `${members.length} family ${members.length === 1 ? 'member' : 'members'} connected through memories` : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
