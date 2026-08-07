import { useState, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'fc_seen_stories';

function getStorageKey(treeId: string, userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${treeId}_${userId}`;
}

function loadSeenIds(treeId: string, userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(treeId, userId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistSeenIds(treeId: string, userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(getStorageKey(treeId, userId), JSON.stringify([...ids]));
  } catch { /* storage full — non-critical */ }
}

export function useSeenStories(treeId: string, userId: string) {
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadSeenIds(treeId, userId));

  const isSeen = useCallback((storyId: string) => seenIds.has(storyId), [seenIds]);

  const markSeen = useCallback((storyId: string) => {
    setSeenIds(prev => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      persistSeenIds(treeId, userId, next);
      return next;
    });
  }, [treeId, userId]);

  return { seenIds, isSeen, markSeen };
}
