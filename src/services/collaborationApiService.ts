/**
 * Collaboration API Service (Phase 4)
 *
 * Client-side service for collaboration, invitations, notifications, and watch features.
 */

import type { TreeAccess, TreeInvitation, AppNotification } from '@/types';
import { getAuthToken } from '@/lib/auth';
import { API_BASE_URL } from '@/config/api';

// ============================================================================
// Internal fetch helper
// ============================================================================

const apiBase = API_BASE_URL.replace(/\/$/, '');

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Robustness: ensure path has /api prefix if the base URL doesn't have it
  let fullPath = path.startsWith('/') ? path : `/${path}`;
  if (apiBase.startsWith('http') && !apiBase.includes('/api') && !fullPath.startsWith('/api')) {
    fullPath = `/api${fullPath}`;
  }

  const res = await fetch(`${apiBase}${fullPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ============================================================================
// Collaboration
// ============================================================================

/** Invite a user to collaborate on a tree */
export async function inviteUser(
  treeId: string,
  email: string,
  role: string,
  claimOptions?: { targetPersonId?: string; personalMessage?: string }
): Promise<TreeInvitation> {
  return apiFetch<TreeInvitation>(`/tree/${treeId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      role,
      ...(claimOptions?.targetPersonId && { targetPersonId: claimOptions.targetPersonId }),
      ...(claimOptions?.personalMessage && { personalMessage: claimOptions.personalMessage }),
    }),
  });
}

/** Get all collaborators for a tree */
export async function getCollaborators(treeId: string): Promise<TreeAccess[]> {
  return apiFetch<TreeAccess[]>(`/tree/${treeId}/collaborators`);
}

/** Update a collaborator's role */
export async function updateCollaboratorRole(
  treeId: string,
  userId: string,
  role: string
): Promise<void> {
  return apiFetch<void>(`/tree/${treeId}/collaborator/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

/** Remove a collaborator from a tree */
export async function removeCollaborator(
  treeId: string,
  userId: string
): Promise<void> {
  return apiFetch<void>(`/tree/${treeId}/collaborator/${userId}`, {
    method: 'DELETE',
  });
}

/** Get pending invitations for the current user */
export async function getMyInvitations(): Promise<TreeInvitation[]> {
  return apiFetch<TreeInvitation[]>('/invitations');
}

/** Accept an invitation — returns the treeId to navigate to */
export async function acceptInvitation(invitationId: string): Promise<{ success: boolean; treeId: string; treeName: string }> {
  return apiFetch<{ success: boolean; treeId: string; treeName: string }>(`/invitation/${invitationId}/accept`, {
    method: 'POST',
  });
}

/** Get invitation details by ID */
export async function getInvitationDetails(invitationId: string): Promise<TreeInvitation> {
  return apiFetch<TreeInvitation>(`/invitation/${invitationId}`);
}

/** Decline an invitation */
export async function declineInvitation(invitationId: string): Promise<void> {
  return apiFetch<void>(`/invitation/${invitationId}/decline`, {
    method: 'POST',
  });
}

/** Transfer tree ownership to another collaborator */
export async function transferOwnership(
  treeId: string,
  newOwnerId: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/tree/${treeId}/transfer-ownership`, {
    method: 'POST',
    body: JSON.stringify({ newOwnerId }),
  });
}

// ============================================================================
// Notifications
// ============================================================================

/** Get notifications for the current user */
export async function getNotifications(
  limit?: number,
  unreadOnly?: boolean
): Promise<AppNotification[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return apiFetch<AppNotification[]>(`/notifications${qs ? `?${qs}` : ''}`);
}

/** Get unread notification count */
export async function getUnreadCount(): Promise<number> {
  const data = await apiFetch<{ count: number }>('/notifications/unread-count');
  return data.count;
}

/** Mark a single notification as read */
export async function markNotificationRead(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}/read`, { method: 'PUT' });
}

/** Mark all notifications as read */
export async function markAllNotificationsRead(): Promise<void> {
  return apiFetch<void>('/notifications/read-all', { method: 'PUT' });
}

/** Delete a notification */
export async function deleteNotification(id: string): Promise<void> {
  return apiFetch<void>(`/notifications/${id}`, { method: 'DELETE' });
}

/** Send a birthday wish email to a family member */
export async function sendBirthdayWish(
  personId: string,
  email: string,
  message?: string
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/person/${personId}/send-birthday-wish`,
    {
      method: 'POST',
      body: JSON.stringify({ email, message }),
    }
  );
}

// ============================================================================
// Watch
// ============================================================================

/** Watch a person for change notifications */
export async function watchPerson(personId: string): Promise<void> {
  return apiFetch<void>(`/watch/${personId}`, { method: 'POST' });
}

/** Unwatch a person */
export async function unwatchPerson(personId: string): Promise<void> {
  return apiFetch<void>(`/watch/${personId}`, { method: 'DELETE' });
}

/** Get all watched persons, optionally filtered by tree */
export async function getWatchedPersons(
  treeId?: string
): Promise<Array<{ personId: string; watchedAt: string }>> {
  const qs = treeId ? `?treeId=${encodeURIComponent(treeId)}` : '';
  return apiFetch<Array<{ personId: string; watchedAt: string }>>(`/watch${qs}`);
}

/** Check if the current user is watching a person */
export async function isWatching(personId: string): Promise<boolean> {
  const data = await apiFetch<{ watching: boolean }>(`/watch/${personId}/status`);
  return data.watching;
}
