/**
 * useReadMemories — Phase 3 / 6.11 (read/unread state for memories).
 *
 * Mirrors `useSeenStories` but for memories. Stores a set of memory IDs the
 * current user has opened, scoped per (tree, user). Lives in localStorage —
 * no server roundtrip needed for what is essentially per-device UX glue.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'fc_read_memories';

function key(treeId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${treeId}_${userId}`;
}

function load(treeId: string, userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(treeId, userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.filter((s): s is string => typeof s === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function persist(treeId: string, userId: string, ids: Set<string>): void {
  try {
    // Cap at 5000 to avoid quota issues over time.
    const arr = [...ids].slice(-5000);
    localStorage.setItem(key(treeId, userId), JSON.stringify(arr));
  } catch { /* storage full — non-critical */ }
}

export function useReadMemories(treeId: string, userId: string) {
  const [readIds, setReadIds] = useState<Set<string>>(() => load(treeId, userId));

  const isRead = useCallback((memoryId: string) => readIds.has(memoryId), [readIds]);

  const markRead = useCallback((memoryId: string) => {
    setReadIds(prev => {
      if (prev.has(memoryId)) return prev;
      const next = new Set(prev);
      next.add(memoryId);
      persist(treeId, userId, next);
      return next;
    });
  }, [treeId, userId]);

  const markAllRead = useCallback((memoryIds: string[]) => {
    setReadIds(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const id of memoryIds) {
        if (!next.has(id)) { next.add(id); changed = true; }
      }
      if (!changed) return prev;
      persist(treeId, userId, next);
      return next;
    });
  }, [treeId, userId]);

  const unreadCount = useCallback((allIds: string[]) => {
    let n = 0;
    for (const id of allIds) if (!readIds.has(id)) n++;
    return n;
  }, [readIds]);

  return { isRead, markRead, markAllRead, unreadCount };
}
