/**
 * InviteCollaboratorModal (Phase 4)
 *
 * Modal to invite collaborators to a tree, view current collaborators,
 * and manage their roles.
 */

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Loader2, Crown } from 'lucide-react';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  inviteUser,
  getCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
  transferOwnership,
} from '@/services/collaborationApiService';
import { useAuthStore } from '@/store/authStore';
import type { TreeAccess, TreeRole } from '@/types';

interface InviteCollaboratorModalProps {
  treeId: string;
  open: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS: Array<{ value: TreeRole; label: string; icon: string; description: string }> = [
  { value: 'controller',  label: 'Viewer',      icon: '👁️', description: 'Can view the tree and memories' },
  { value: 'contributor', label: 'Contributor', icon: '✏️', description: 'Can suggest edits (drafts for owner review)' },
  { value: 'co-owner',    label: 'Co-Owner',    icon: '👑', description: 'Full control, including invites & settings' },
];

export function InviteCollaboratorModal({
  treeId,
  open,
  onClose,
}: InviteCollaboratorModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TreeRole>('controller');
  const [personalMessage, setPersonalMessage] = useState('');
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);
  const [collaborators, setCollaborators] = useState<TreeAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<TreeAccess | null>(null);
  const [transferring, setTransferring] = useState(false);
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const loadCollaborators = useCallback(async () => {
    if (!treeId) return;
    setLoading(true);
    try {
      const data = await getCollaborators(treeId);
      setCollaborators(data);
    } catch (err: unknown) {
      console.error('Failed to load collaborators:', err);
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (open) {
      loadCollaborators();
      setError(null);
      setSuccessMsg(null);
      setEmail('');
      setRole('controller');
    }
  }, [open, loadCollaborators]);

  const handleInvite = async () => {
    // D8 — accept comma- or space-separated emails for bulk invite
    const emails = email
      .split(/[\s,;]+/)
      .map(e => e.trim())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) return;
    setInviting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const trimmedMsg = personalMessage.trim();
      const results = await Promise.allSettled(
        emails.map(addr => inviteUser(treeId, addr, role, trimmedMsg ? { personalMessage: trimmedMsg } : undefined))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setSuccessMsg(
        succeeded === results.length
          ? `Invitation${succeeded > 1 ? 's' : ''} sent to ${succeeded} ${succeeded > 1 ? 'people' : 'person'}.`
          : `${succeeded} sent · ${failed} failed.`
      );
      setEmail('');
      setPersonalMessage('');
      await loadCollaborators();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: TreeRole) => {
    try {
      await updateCollaboratorRole(treeId, userId, newRole);
      setCollaborators((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, role: newRole } : c))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeCollaborator(treeId, userId);
      setCollaborators((prev) => prev.filter((c) => c.userId !== userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove collaborator');
    }
  };

  const isCurrentUserOwner = collaborators.some(
    (c) => c.userId === currentUserId && c.role === 'owner'
  );

  const handleTransferOwnership = async () => {
    if (!transferTarget) return;
    setTransferring(true);
    setError(null);
    try {
      await transferOwnership(treeId, transferTarget.userId);
      setSuccessMsg(`Ownership transferred to ${transferTarget.email || transferTarget.userId}`);
      setTransferTarget(null);
      await loadCollaborators();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Collaborators</DialogTitle>
          <DialogDescription>
            Share this family tree with others by sending an invite.
          </DialogDescription>
        </DialogHeader>

        {/* D8 — Role matrix toggle */}
        <button
          type="button"
          onClick={() => setShowRoleMatrix(v => !v)}
          className="text-xs text-[#2F3E8F] hover:underline self-start"
        >
          {showRoleMatrix ? 'Hide role comparison' : 'Compare roles'} →
        </button>
        {showRoleMatrix && (
          <div className="rounded border border-stone-200 overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-stone-600">Role</th>
                  <th className="text-left px-2 py-1.5 font-medium text-stone-600">Permissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ROLE_OPTIONS.map(r => (
                  <tr key={r.value}>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <span className="mr-1" aria-hidden>{r.icon}</span>
                      <strong>{r.label}</strong>
                    </td>
                    <td className="px-2 py-1.5 text-stone-600">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invite form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Emails (comma-separated for multiple)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInvite(); } }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TreeRole)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Optional personal message — adds context to the invite email"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={2}
            maxLength={300}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !email.trim()}
            className="flex items-center gap-2 h-9 px-4 rounded-md bg-[#2F3E8F] text-white text-sm font-medium hover:bg-[#3B4DA6] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Send Invite
          </button>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600">{successMsg}</p>
          )}
        </div>

        {/* Collaborator list */}
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Current Collaborators
          </h3>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No collaborators yet.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {collaborators.map((collab) => (
                <li
                  key={collab.userId}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900 truncate block">
                      {collab.email || collab.userId}
                    </span>
                  </div>
                  {collab.role === 'owner' ? (
                    <span className="text-xs font-medium text-[#2F3E8F] bg-[#E8EDFF] px-2 py-0.5 rounded">
                      Owner
                    </span>
                  ) : (
                    <>
                      <select
                        value={collab.role}
                        onChange={(e) =>
                          handleRoleChange(
                            collab.userId,
                            e.target.value as TreeRole
                          )
                        }
                        className="h-7 rounded border border-gray-300 bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {isCurrentUserOwner && (
                        <button
                          onClick={() => setTransferTarget(collab)}
                          className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          title="Transfer ownership"
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(collab.userId)}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Remove collaborator"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Transfer ownership confirmation */}
        {transferTarget && (
          <div className="mt-4 border-t pt-4 bg-amber-50 -mx-6 px-6 pb-4 rounded-b-lg">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              Transfer Ownership
            </h3>
            <p className="text-sm text-amber-700 mb-3">
              Are you sure you want to transfer ownership to{' '}
              <strong>{transferTarget.email || transferTarget.userId}</strong>?
              You will be demoted to Co-Owner.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleTransferOwnership}
                disabled={transferring}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {transferring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crown className="h-3.5 w-3.5" />
                )}
                Confirm Transfer
              </button>
              <button
                onClick={() => setTransferTarget(null)}
                className="h-8 px-3 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
