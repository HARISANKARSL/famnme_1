/**
 * Faith Content API Service — Frontend client for "Your Faith" feed.
 */

import { resolveBackendUrl } from '@/config/api';

const API_BASE = resolveBackendUrl('/api');

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { message?: string; error?: string }).message || (err as { message?: string; error?: string }).error || 'Request failed');
  }
  return res;
}

export interface FaithPost {
  postId: string;
  faithCategory: string;
  language: string;
  title?: string;
  content: string;
  postType: 'text' | 'image' | 'video' | 'link';
  mediaUrls?: string[];
  videoUrl?: string;
  videoThumbnailUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImageUrl?: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  isLikedByUser?: boolean;
}

export interface FaithComment {
  commentId: string;
  postId: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
}

export async function getFaithFeed(params: {
  faith?: string;
  lang?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ posts: FaithPost[]; nextCursor: string | null }> {
  const searchParams = new URLSearchParams();
  if (params.faith) searchParams.set('faith', params.faith);
  if (params.lang) searchParams.set('lang', params.lang);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await apiFetch(`/faith/feed?${searchParams.toString()}`);
  return res.json();
}

export async function toggleFaithLike(postId: string): Promise<{ liked: boolean; likeCount: number }> {
  const res = await apiFetch(`/faith/posts/${postId}/like`, { method: 'POST' });
  return res.json();
}

export async function getFaithComments(postId: string): Promise<FaithComment[]> {
  const res = await apiFetch(`/faith/posts/${postId}/comments`);
  return res.json();
}

export async function addFaithComment(postId: string, text: string, authorName: string, authorAvatarUrl?: string): Promise<FaithComment> {
  const res = await apiFetch(`/faith/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text, authorName, authorAvatarUrl }),
  });
  return res.json();
}

export async function deleteFaithComment(commentId: string): Promise<void> {
  await apiFetch(`/faith/comments/${commentId}`, { method: 'DELETE' });
}

export async function viewFaithPost(postId: string): Promise<void> {
  apiFetch(`/faith/posts/${postId}/view`, { method: 'POST' }).catch(() => {});
}
