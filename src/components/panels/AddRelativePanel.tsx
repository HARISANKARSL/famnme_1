import { useState, useEffect } from 'react';
import {
  X, UserPlus, Heart, Baby, Users, Shield, Pencil, Trash2, Zap,
  User, Image, Focus, MoreHorizontal, Eye, Clock, Tag, BookOpen,
  MessageCircle, Mail, GitBranch, HeartCrack, EyeOff, ChevronDown, UserCheck,
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { useContributorStore } from '@/store/contributorStore';
import { getTreeClaimStatuses } from '@/services/claimApiService';
import type { Person } from '@/types';
import { useTreeStore } from '@/store/treeStore';

export interface AddRelativePanelProps {
  isOpen: boolean;
  person: Person | null;
  onClose: () => void;
  onAction: (personId: string, action: string) => void;
  hideAddParent?: boolean;
}

export function AddRelativePanel({ isOpen, person, onClose, onAction, hideAddParent = false }: AddRelativePanelProps) {
  const { isMobile } = useResponsive();
  const [showActions, setShowActions] = useState(false);
  const [showMisc, setShowMisc] = useState(false);
  const myRole = useContributorStore(s => s.myRole);
  const isContributor = myRole === 'contributor';
  const layoutMode = useTreeStore(s => s.layoutMode);
  const isPedigree = layoutMode === 'ancestry-pedigree';

  if (!isOpen || !person) return null;

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();

  // Fetch claim status for this person
  const treeId = useContributorStore(s => s.treeId);
  const [claimInfo, setClaimInfo] = useState<{ status: string; userName?: string } | null>(null);
  useEffect(() => {
    if (!treeId || !person.personId) return;
    getTreeClaimStatuses(treeId).then(result => {
      const claim = result.claimStatuses[person.personId];
      if (claim) setClaimInfo({ status: claim.status, userName: (claim as Record<string, string>).userName });
    }).catch(() => { });
  }, [treeId, person.personId]);

  const handleAction = (action: string) => {
    onAction(person.personId, action);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 bottom-0 w-full sm:w-80'} bg-white dark:bg-[#1a1a1a] shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <div>
            <h2 className="text-lg font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">{fullName}</h2>
            <p className="text-[13px] text-[#8B7355] dark:text-[#999] mt-0.5">What would you like to do?</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
          >
            <X className="h-5 w-5 text-[#8B7355] dark:text-[#999]" />
          </button>
        </div>

        {/* Options */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isMobile ? 'pb-16' : ''}`}>
          {/* Quick Add — prominent (hidden for contributors — they use individual add) */}
          {!isContributor && !isPedigree && (
            <PanelButton
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              label="Quick Add Family"
              subtitle="Add multiple relatives at once"
              onClick={() => handleAction('quick-add')}
              highlight
            />
          )}

          {/* Invite to join / Claimed by — below Quick Add (hidden for contributors viewing shared tree) */}
          {/* !isContributor && (
            claimInfo?.status === 'approved' ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/40">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-green-800 dark:text-green-300">
                    Claimed by {claimInfo.userName || 'a family member'}
                  </p>
                  <p className="text-[11px] text-green-600/70 dark:text-green-400/60">This profile has been verified</p>
                </div>
              </div>
            ) : claimInfo?.status === 'pending' ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
                <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-amber-800 dark:text-amber-300">Invite pending</p>
                  <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60">Waiting for response</p>
                </div>
              </div>
            ) : (
              <PanelButton
                icon={<Mail className="w-5 h-5 text-[#C2A46D]" />}
                label={`Invite ${person.firstName} to join`}
                subtitle="Send an invite to claim this profile"
                onClick={() => handleAction('invite-to-claim')}
              />
            )
          ) */}

          {/* Edit Details — below invite, above Add Family */}
          {!isPedigree && (
            <PanelButton icon={<Pencil className="w-5 h-5" />} label={isContributor ? 'Suggest Edit' : 'Edit Details'} onClick={() => handleAction('edit')} />
          )}

          {/* ── Add Family ── */}
          <div>
            <SectionHeader label={isContributor ? 'Suggest New Member' : 'Add Family'} />
            <div className="space-y-0.5">
              {!hideAddParent && (
                <PanelButton icon={<UserPlus className="w-5 h-5" />} label="Add Parent" onClick={() => handleAction('add-parent-from-drawer')} />
              )}
              <PanelButton icon={<Heart className="w-5 h-5" />} label="Add Spouse" onClick={() => handleAction('add-spouse')} />
              <PanelButton icon={<Baby className="w-5 h-5" />} label="Add Child" onClick={() => handleAction('add-child')} />
              <PanelButton icon={<Users className="w-5 h-5" />} label="Add Sibling" onClick={() => handleAction('add-sibling')} />
            </div>
            {isContributor && (
              <p className="text-[11px] text-amber-600 mt-2 px-3">Additions will be sent to the tree owner for approval</p>
            )}
          </div>

          <Divider />

          {/* ── Actions (collapsible) ── */}
          {/* <div>
            <button
              onClick={() => setShowActions(prev => !prev)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors min-h-[44px]"
            >
              <Focus className="w-5 h-5 text-[#B8A090] dark:text-[#666]" />
              <span className="text-[13px] font-medium flex-1">Actions</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showActions ? 'rotate-180' : ''}`} />
            </button>

            {showActions && (
              <div className="mt-1 space-y-0.5 animate-[fade-in_200ms_ease-out]">
                <PanelButton icon={<User className="w-5 h-5" />} label="View Profile" onClick={() => handleAction('view-profile')} />
                <PanelButton icon={<Image className="w-5 h-5" />} label="Photos & Memories" onClick={() => handleAction('media-gallery')} />
                <PanelButton icon={<Focus className="w-5 h-5" />} label="Focus on This Person" onClick={() => handleAction('focus')} />
              </div>
            )}
          </div> */}

          {/* ── Miscellaneous (collapsible) ── */}
          {!isPedigree && (
            <div>
              <button
                onClick={() => setShowMisc(prev => !prev)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[#8B7355] dark:text-[#999] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors min-h-[44px]"
              >
                <MoreHorizontal className="w-5 h-5 text-[#B8A090] dark:text-[#666]" />
                <span className="text-[13px] font-medium flex-1">Miscellaneous</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showMisc ? 'rotate-180' : ''}`} />
              </button>

              {showMisc && (
                <div className="mt-1 space-y-0.5 animate-[fade-in_200ms_ease-out]">
                  {/* <PanelButton icon={<Eye className="w-5 h-5" />} label="View Relationships" onClick={() => handleAction('view-relationships')} />
                  <PanelButton icon={<Clock className="w-5 h-5" />} label="View History" onClick={() => handleAction('view-history')} />
                  <PanelButton icon={<Tag className="w-5 h-5" />} label="Manage Tags" onClick={() => handleAction('manage-tags')} />
                  <PanelButton icon={<BookOpen className="w-5 h-5" />} label="Life Story" onClick={() => handleAction('view-life-story')} />
                  <PanelButton icon={<MessageCircle className="w-5 h-5" />} label="Comments" onClick={() => handleAction('view-comments')} />
                  <PanelButton icon={<GitBranch className="w-5 h-5" />} label="View Their Tree" onClick={() => handleAction('view-their-tree')} /> */}

                  {/* Destructive zone (hidden for contributors) */}
                  {!isContributor && (
                    <div className="mt-2 pt-2 border-t border-red-100 dark:border-red-900/30">
                      {/* <PanelButton icon={<EyeOff className="w-5 h-5" />} label="Set Branch Privacy" onClick={() => handleAction('branch-privacy')} />
                      <PanelButton icon={<HeartCrack className="w-5 h-5" />} label="End Marriage" onClick={() => handleAction('end-marriage')} variant="danger" /> */}
                      <PanelButton icon={<Trash2 className="w-5 h-5" />} label="Delete" onClick={() => handleAction('delete')} variant="danger" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-[#B8A090] dark:text-[#666] uppercase tracking-wider mb-1.5 px-3">
      {label}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-[#E2E8F0]/60 dark:bg-[#2a2a2a] mx-2" />;
}

function PanelButton({
  icon,
  label,
  subtitle,
  onClick,
  variant = 'default',
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left min-h-[44px]
        ${highlight
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[#2F3E8F] dark:text-amber-200'
          : variant === 'danger'
            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
            : 'text-[#3D2E1F] dark:text-[#e0e0e0] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
        }`}
    >
      <span className={
        highlight ? 'text-amber-500'
          : variant === 'danger' ? 'text-red-500 dark:text-red-400'
            : 'text-[#8B7355] dark:text-[#999]'
      }>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium block">{label}</span>
        {subtitle && <span className="text-[11px] text-[#B8A090] dark:text-[#666]">{subtitle}</span>}
      </div>
    </button>
  );
}
