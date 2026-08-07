/**
 * Daily Share API Service — Frontend API client for social feed
 */

import { API_BASE_URL } from '@/config/api';
import aiInstance from '@/services/api/aiInstance';
import { trackEvent } from '@/services/firebase/analytics.service';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// Types matching backend
export interface SharePost {
  postId: string;
  treeId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  postType: 'text' | 'image' | 'video' | 'link';
  mediaUrls?: string[] | null;
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImageUrl?: string | null;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  detectedLanguage?: string;
  languageConfidence?: number;
  isLikedByMe?: boolean;
  visibility?: 'public' | 'family';
  postSource?: 'user' | 'admin';
  status?: 'published' | 'draft' | string;
  feedReasons?: string[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedPreferences {
  preferredLanguages: string[];
  languageMode: 'strict' | 'soft';
  contentTypes?: string[];
}

export interface ShareComment {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: string;
}

export interface LinkPreview {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

// ============================================================================
// API Functions
// ============================================================================

export async function fetchFeed(
  treeId: string,
  cursor?: string,
  limit: number = 20,
): Promise<{ posts: SharePost[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);

  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/share/feed?${params}`);
  if (!response.ok) throw new Error('Failed to fetch feed');
  return response.json();
}

export async function createPost(
  treeId: string,
  data: {
    content: string;
    postType: 'text' | 'image' | 'video' | 'link';
    authorName: string;
    authorAvatarUrl?: string | null;
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImageUrl?: string;
    mediaFiles?: File[];
    visibility?: 'public' | 'family';
    contentLanguage?: string;
  },
): Promise<SharePost> {
  const formData = new FormData();
  formData.append('content', data.content);
  formData.append('postType', data.postType);
  formData.append('authorName', data.authorName);
  if (data.authorAvatarUrl) formData.append('authorAvatarUrl', data.authorAvatarUrl);
  if (data.linkUrl) formData.append('linkUrl', data.linkUrl);
  if (data.linkTitle) formData.append('linkTitle', data.linkTitle);
  if (data.linkDescription) formData.append('linkDescription', data.linkDescription);
  if (data.linkImageUrl) formData.append('linkImageUrl', data.linkImageUrl);
  if (data.visibility) formData.append('visibility', data.visibility);
  if (data.contentLanguage) formData.append('contentLanguage', data.contentLanguage);

  if (data.mediaFiles) {
    for (const file of data.mediaFiles) {
      formData.append('media', file);
    }
  }

  // Don't set Content-Type — browser will set multipart boundary automatically
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/tree/${treeId}/share/posts`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to create post');
  return response.json();
}

// ============================================================================
// Global Feed — AI recommendations (page-based pagination)
// ============================================================================

/** Actual AI API response shape */
interface AIFeedResponse {
  page: number;
  posts: SharePost[];
  // These may or may not be present — we derive hasMore from posts.length
  hasMore?: boolean;
  nextCursor?: string | null;
}

export async function fetchGlobalFeed(
  page: number = 1,
  treeId: string = '',
): Promise<{ posts: SharePost[]; nextCursor: string | null; hasMore: boolean; page: number }> {
  // Pull authorId from the auth store (decoded JWT sub / user.id)
  const { useAuthStore } = await import('@/store/authStore');
  const authorId = useAuthStore.getState().user?.id ?? '';

  const response = await aiInstance.post<AIFeedResponse>(
    'recommendations/feed',
    { authorId, page, tree_id: treeId },
  );

  const data = response.data;
  const posts: SharePost[] = (data.posts ?? []).map(p => ({
    ...p,
    // If linkImageUrl is absent but mediaUrls has items, use the first one as thumbnail
    linkImageUrl: p.linkImageUrl ?? p.mediaUrls?.[0] ?? null,
  }));

  // API returns { page, posts[] } without hasMore — infer from posts length
  const hasMore = data.hasMore ?? posts.length > 0;

  return {
    posts,
    nextCursor: data.nextCursor ?? null,
    hasMore,
    page: data.page ?? page,
  };
}

export async function refreshRecommendationsFeed(treeId: string = ''): Promise<void> {
  const { useAuthStore } = await import('@/store/authStore');
  const authorId = useAuthStore.getState().user?.id ?? '';
  await aiInstance.post('recommendations/feed/refresh', {
    authorId,
    treeId,
  });
}

/**
 * Creates a post via the AI backend (Snake Case payload)
 */
export async function createPostAI(data: {
  author_id: string;
  tree_id: string;
  content?: string;
  post_type?: string;
  link_url?: string;
  upload_file?: File;
  author_name: string;
  visibility?: 'public' | 'family';
  personName?: string;
}): Promise<SharePost> {
  const formData = new FormData();
  formData.append('author_id', data.author_id);
  formData.append('tree_id', data.tree_id);
  if (data.content) formData.append('content', data.content);
  if (data.post_type) formData.append('post_type', data.post_type);
  if (data.link_url) formData.append('link_url', data.link_url);
  if (data.upload_file) formData.append('upload_file', data.upload_file);
  formData.append('author_name', data.author_name);
  if (data.visibility) formData.append('visibility', data.visibility);
  if (data.personName) formData.append('personName', data.personName);

  // aiInstance baseURL is https://famnme.actigen.ai/ai/
  const response = await aiInstance.post<SharePost>('user-posts/create', formData);
  return response.data;
}

/**
 * 6.7 — Post of the day. Returns the highest-engagement share-post from the
 * last 48h (likes×3 + comments×5 + views). Returns `null` if the platform
 * has had no posts recently.
 */
export async function fetchPostOfTheDay(): Promise<SharePost | null> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/share/post-of-day`);
    if (!response.ok) return null;
    const data = await response.json() as { post: SharePost | null };
    return data.post ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Feed Preferences
// ============================================================================

export async function fetchFeedPreferences(): Promise<FeedPreferences> {
  const response = await apiFetch(`${API_BASE_URL}/share/preferences`);
  if (!response.ok) throw new Error('Failed to fetch feed preferences');
  return response.json();
}

export async function updateFeedPreferences(prefs: FeedPreferences): Promise<FeedPreferences> {
  const response = await apiFetch(`${API_BASE_URL}/share/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
  if (!response.ok) throw new Error('Failed to update feed preferences');
  return response.json();
}

// ============================================================================
// Feed Interaction Tracking (personalization signals)
// ============================================================================

interface InteractionEvent {
  postId: string;
  eventType: string;
  dwellMs?: number;
  metadata?: Record<string, unknown>;
}

let interactionBuffer: InteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushInteractions(): Promise<void> {
  if (interactionBuffer.length === 0) return;
  const events = [...interactionBuffer];
  interactionBuffer = [];
  try {
    const { useAuthStore } = await import('@/store/authStore');
    const userId = useAuthStore.getState().user?.id || 'guest_user';
    await aiInstance.post('recommendations/interaction', { userId, events });
  } catch (error) {
    // fire-and-forget — never throw, but log in development
    console.error('Failed to flush interaction buffer to /recommendations/interaction:', error);
  }
}

export function reportInteraction(
  postId: string,
  eventType: string,
  meta?: { dwellMs?: number; metadata?: Record<string, unknown> },
): void {
  interactionBuffer.push({
    postId,
    eventType,
    dwellMs: meta?.dwellMs,
    metadata: meta?.metadata,
  });
  // Flush every 5 seconds
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushInteractions();
    }, 5000);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    void flushInteractions();
  });
}

// treeId-free interactions (for global feed — no tree ownership required)

export async function recordView(post: SharePost): Promise<void> {
  try {
    trackEvent("post_viewed", {
      post_id: post.postId,
      post_type: post.postType,
      author_id: post.authorId,
      family_id: post.treeId,
    });
    await apiFetch(`${API_BASE_URL}/share/posts/${post.postId}/view`, { method: 'POST' });
  } catch {
    // fire-and-forget — never throw
  }
}

export async function toggleLikeGlobal(
  postId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const response = await apiFetch(`${API_BASE_URL}/share/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  return response.json();
}


export async function addCommentGlobal(
  postId: string,
  text: string,
  authorName: string,
  authorAvatarUrl?: string | null,
): Promise<ShareComment> {
  const response = await apiFetch(
    `${API_BASE_URL}/share/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, authorName, authorAvatarUrl }),
    },
  );
  if (!response.ok) throw new Error('Failed to add comment');
  return response.json();
}

// ============================================================================
// Admin API (Fam & Me posts)
// ============================================================================

function adminFetch(url: string, adminToken: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${adminToken}`,
    },
  });
}

export async function createAdminPost(
  data: {
    content: string;
    postType: 'text' | 'image' | 'video' | 'link';
    linkUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImageUrl?: string;
    mediaFiles?: File[];
    contentLanguage?: string;
  },
  adminToken: string,
): Promise<SharePost> {
  const formData = new FormData();
  formData.append('content', data.content);
  formData.append('postType', data.postType);
  if (data.linkUrl) formData.append('linkUrl', data.linkUrl);
  if (data.linkTitle) formData.append('linkTitle', data.linkTitle);
  if (data.linkDescription) formData.append('linkDescription', data.linkDescription);
  if (data.linkImageUrl) formData.append('linkImageUrl', data.linkImageUrl);
  if (data.contentLanguage) formData.append('contentLanguage', data.contentLanguage);

  if (data.mediaFiles) {
    for (const file of data.mediaFiles) {
      formData.append('media', file);
    }
  }

  const response = await adminFetch(`${API_BASE_URL}/admin/share/posts`, adminToken, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to create admin post');
  return response.json();
}

export async function fetchAdminPosts(
  adminToken: string,
  cursor?: string,
  limit: number = 20,
): Promise<{ posts: SharePost[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);

  const response = await adminFetch(`${API_BASE_URL}/admin/share/posts?${params}`, adminToken);
  if (!response.ok) throw new Error('Failed to fetch admin posts');
  return response.json();
}

export async function deleteAdminPost(postId: string, adminToken: string): Promise<void> {
  const response = await adminFetch(`${API_BASE_URL}/admin/share/posts/${postId}`, adminToken, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to delete admin post');
}

export async function deletePost(treeId: string, postId: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/share/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to delete post');
}

export async function toggleLike(
  treeId: string,
  postId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/share/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  return response.json();
}

export async function postMemoryInteraction(
  postId: string,
  userId: string,
  isLiked: boolean,
  comment: string = ""
): Promise<any> {
  if (comment) {
    const payload = {
      postId,
      userId,
      isLiked,
      comment
    };
    const response = await aiInstance.post('recommendations/comment', payload);
    return response.data;
  } else {
    const payload = {
      postId,
      userId,
      isLiked
    };
    const response = await aiInstance.post('recommendations/like', payload);
    return response.data;
  }
}

export async function fetchComments(
  postId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ comments: ShareComment[]; hasMore: boolean }> {
  try {
    const response = await aiInstance.get('recommendations/comments', {
      params: { postId, page, pageSize }
    });

    const data = response.data;
    let rawComments: any[] = [];
    if (Array.isArray(data)) rawComments = data;
    else if (data && Array.isArray(data.comments)) rawComments = data.comments;
    else if (data && Array.isArray(data.data)) rawComments = data.data;

    const comments = rawComments.map((c: any) => ({
      commentId: c.commentId || c.id || Math.random().toString(),
      postId: c.postId || postId,
      authorId: c.authorId || c.userId || '',
      authorName: c.authorName || c.userName || 'Unknown',
      authorAvatarUrl: c.authorAvatarUrl || c.userAvatar || null,
      text: c.text || c.comment || '',
      createdAt: c.createdAt || new Date().toISOString()
    }));

    const hasMore = data?.pagination?.hasNextPage ?? (comments.length === pageSize);

    return { comments, hasMore };
  } catch (error) {
    console.error('Failed to fetch comments', error);
    return { comments: [], hasMore: false };
  }
}

export async function addComment(
  treeId: string,
  postId: string,
  text: string,
  authorName: string,
  authorAvatarUrl?: string | null,
): Promise<ShareComment> {
  const response = await apiFetch(
    `${API_BASE_URL}/tree/${treeId}/share/posts/${postId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, authorName, authorAvatarUrl }),
    },
  );
  if (!response.ok) throw new Error('Failed to add comment');
  return response.json();
}

export async function deleteComment(treeId: string, commentId: string): Promise<void> {
  const response = await apiFetch(
    `${API_BASE_URL}/tree/${treeId}/share/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  if (!response.ok) throw new Error('Failed to delete comment');
}

export async function fetchLinkPreview(treeId: string, url: string): Promise<LinkPreview> {
  const response = await apiFetch(`${API_BASE_URL}/tree/${treeId}/share/link-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error('Failed to fetch link preview');
  return response.json();
}

export async function fetchLinkPreviewGlobal(url: string): Promise<LinkPreview> {
  const response = await apiFetch(`${API_BASE_URL}/share/link-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error('Failed to fetch link preview');
  return response.json();
}
