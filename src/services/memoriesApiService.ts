import { getApi, postApi, postAIApi, putApi, deleteApi, memoriesApi, treeApi, albumsApi } from './api';
import type { Memory, MemoryInput } from '@/types';
import { trackEvent } from './firebase/analytics.service';

export interface CeremonyDetectionResult {
  detected: boolean;
  ceremonyName: string | null;
  ceremonyCategory: string | null;
  confidence: 'high' | 'medium' | 'low';
  description: string | null;
}

/**
 * Shared helper for paginated memory lists (Main, Archived, Trash)
 */
async function fetchPaginatedList(endpoint: string, treeId: string, options: any = {}) {
  const payload = {
    treeId,
    page: options.page || 1,
    limit: options.limit || options.pageSize || 50,
    search: options.search || options.searchQuery || "",
    filter: {
      type: options.type === 'post' ? 'all' : (options.type || "all"),
      mediaType: options.mediaType || "all",
      status: options.status || "",
      category: options.category || "",
      startDate: options.startDate || "",
      endDate: options.endDate || "",
      sortBy: options.sortBy || "newest",
      personId: options.personId || "",
      albumId: options.albumId || options.folderId || "",
      ...(options.filter || {})
    }
  };

  const data = await postApi<any>(endpoint, payload);
  const list = data.data || data.memories || data;
  const memories = Array.isArray(list) ? list : (list.items || list || []);

  return {
    memories,
    pagination: data.pagination
  };
}

export async function fetchMemories(treeId: string, options: any = {}): Promise<any> {
  return fetchPaginatedList(memoriesApi.list, treeId, options);
}

export async function fetchMemoryImages(options: any = {}): Promise<any> {
  const payload = {
    page: options.page || 1,
    limit: options.limit || 20,
    search: options.search || "",
    filter: {
      status: options.status || ""
    }
  };
  const res = await postApi<any>(memoriesApi.images, payload);
  return res.data || res;
}

export async function fetchStats(treeId: string): Promise<{ memoryCount: number; albumCount: number; storyCount: number }> {
  const res = await postApi<any>(memoriesApi.stats, { treeId });
  const data = res.data || res;
  return {
    memoryCount: data.posts || 0,
    albumCount: data.albums || 0,
    storyCount: data.stories || 0
  };
}

export async function fetchArchivedMemories(treeId: string, options: any = {}): Promise<any> {
  return fetchPaginatedList(memoriesApi.archivedList, treeId, options);
}

export async function fetchTrashedMemories(treeId: string, options: any = {}): Promise<any> {
  return fetchPaginatedList(memoriesApi.trashList, treeId, options);
}

export async function fetchMemoryById(memoryId: string, filesId?: string): Promise<Memory> {
  const payload: any = { id: memoryId };
  if (filesId) {
    payload.filesId = filesId;
  }
  const data = await postApi<any>(memoriesApi.getById, payload);
  const result = data.data || data.memory || data;
  if (result) {
    if (!result.dateTaken && result.date) {
      result.dateTaken = result.date;
    }
  }
  return result;
}

export async function createMemory(treeId: string, file: File | null, input: MemoryInput): Promise<Memory> {
  const res = await postApi<Memory>(memoriesApi.create(treeId), input);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
  return res;
}

export async function confirmMemories(treeId: string, payload: any): Promise<any> {
  const res = await postApi(memoriesApi.confirm, payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
  return res;
}

export async function getBulkPresignedUrls(files: any[]): Promise<any[]> {
  const res = await postApi<any>(memoriesApi.presignBulk, { files });
  return res.data || res.files || res;
}

export async function uploadToS3(url: string, file: File | Blob, contentType: string): Promise<void> {
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': contentType,
    },
  });
}

export async function generateAIDescription(treeId: string, payload: any): Promise<{ description: string }> {
  return postApi(memoriesApi.aiDescription(treeId), payload);
}

export async function enhanceAIDescription(payload: any): Promise<{ text?: string; description?: string; enhanced?: string }> {
  return postAIApi(memoriesApi.aiMemoryEnhance, payload);
}

export async function uploadAICaption(file: File): Promise<{ caption: string; tags: string[] }> {
  const formData = new FormData();
  formData.append('photo', file);
  return postAIApi(memoriesApi.aiPhotoCaption, formData);
}

export async function uploadAIDescription(file: File): Promise<{ description: string; wordCount?: number }> {
  const formData = new FormData();
  formData.append('photo', file);
  return postAIApi(memoriesApi.aiPhotoDescription, formData);
}

export async function uploadAICeremony(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('photo', file);
  return postAIApi(memoriesApi.aiPhotoCeremony, formData);
}

export async function uploadAIDescriptionUrl(imageUrl: string): Promise<{ description: string; wordCount?: number }> {
  const formData = new FormData();
  formData.append('photo_url', imageUrl);
  return postAIApi(memoriesApi.aiPhotoDescription, formData);
}

export async function uploadAICeremonyUrl(imageUrl: string): Promise<any> {
  const formData = new FormData();
  formData.append('photo_url', imageUrl);
  return postAIApi(memoriesApi.aiPhotoCeremony, formData);
}

export async function updateMemory(
  memoryId: string,
  data: any
): Promise<Memory> {
  return postApi(memoriesApi.updateDetails, { id: memoryId, ...data });
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await postApi(memoriesApi.delete, { id: [memoryId] });
  trackEvent("post_deleted", {
    post_id: memoryId,
    reason: "user_deleted",
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
}

export async function updateMemoriesStatus(memoryIds: string[], status: 'draft' | 'publish'): Promise<void> {
  await postApi(memoriesApi.updateStatus, { id: memoryIds, status });
}

export async function archiveMemory(memoryId: string): Promise<Memory> {
  return postApi(memoriesApi.archive, { id: [memoryId], isArchived: true });
}

export async function unarchiveMemory(memoryId: string): Promise<Memory> {
  return postApi(memoriesApi.archive, { id: [memoryId], isArchived: false });
}

export async function publishMemory(memoryId: string): Promise<void> {
  await updateMemoriesStatus([memoryId], 'publish');
}

export async function batchArchiveMemories(treeId: string, memoryIds: string[], isArchived = true): Promise<void> {
  await postApi(memoriesApi.archive, { id: memoryIds, isArchived });
}

export async function toggleMemoryLike(memoryId: string, userName: string): Promise<any> {
  return postApi(memoriesApi.like(memoryId), { userName });
}

export async function fetchMemoryLikeStatus(memoryId: string): Promise<{ likeCount: number; isLikedByMe: boolean }> {
  return getApi(memoriesApi.likes(memoryId));
}

export async function transcribeMemory(treeId: string, memoryId: string): Promise<{ transcription: string }> {
  return postApi(memoriesApi.transcribe(treeId, memoryId));
}

export async function generateMemoryPhotoDescription(memoryId: string): Promise<string> {
  const data = await getApi<any>(memoriesApi.photoDescription(memoryId));
  return data.description || data;
}

export async function fetchMemoryComments(memoryId: string): Promise<any[]> {
  return getApi(memoriesApi.comments(memoryId));
}

export async function addMemoryComment(memoryId: string, text: string, userName: string): Promise<any> {
  return postApi(memoriesApi.comments(memoryId), { text, userName });
}

export async function deleteMemoryComment(memoryId: string, commentId: string): Promise<void> {
  await deleteApi(memoriesApi.commentDetail(memoryId, commentId));
}

export async function batchDeleteMemories(treeId: string, memoryIds: string[]): Promise<void> {
  await postApi(memoriesApi.delete, { id: memoryIds });
  for (const id of memoryIds) {
    trackEvent("post_deleted", {
      post_id: id,
      reason: "batch_deleted",
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
}

export async function batchTagMemories(treeId: string, memoryIds: string[], personId: string): Promise<void> {
  await postApi(treeApi.batchTag(treeId), { memoryIds, personId });
}

export async function batchAddToAlbum(treeId: string, memoryIds: string[], albumId: string): Promise<void> {
  await postApi(treeApi.batchAlbum(treeId), { memoryIds, albumId });
}

export async function fetchPersonMemories(treeId: string, personId: string, options: any = {}): Promise<any> {
  return fetchPaginatedList(memoriesApi.list, treeId, { ...options, personId });
}

export async function permanentlyDeleteMemory(memoryId: string): Promise<void> {
  await deleteApi(memoriesApi.permanentDelete(memoryId));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
}

export async function restoreMemory(memoryId: string): Promise<Memory> {
  const res = await postApi<Memory>(memoriesApi.restore(memoryId));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
  return res;
}

export async function emptyTrash(treeId: string): Promise<void> {
  await postApi(treeApi.emptyTrash(treeId));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('memories-changed'));
  }
}

export async function fetchUploadStatus(treeId: string, batchId: string): Promise<any> {
  return getApi(treeApi.uploadStatus(treeId, batchId));
}

export async function fetchCategories(): Promise<any> {
  return getApi(memoriesApi.filterCategories);
}



export async function addMemoryTag(
  memoryId: string,
  personId: string
): Promise<void> {
  await postApi(memoriesApi.tag(memoryId, personId));
}

export async function removeMemoryTag(
  memoryId: string,
  personId: string
): Promise<void> {
  await deleteApi(memoriesApi.tag(memoryId, personId));
}

// export async function fetchMemoryCounts(
//   treeId: string
// ): Promise<Record<string, number>> {
//   const data = await getApi(treeApi.memoryCounts(treeId));
//   return data.counts || {};
// }

/**
 * Compress an image file to fit within maxBytes using canvas.
 */
export async function compressImage(file: File, maxBytes = 900_000): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxBytes) return file;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });

  const MAX_DIM = 1920;
  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  const toBlob = (q: number): Promise<Blob> =>
    new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/webp', q)
    );

  for (let quality = 0.85; quality >= 0.3; quality -= 0.1) {
    const blob = await toBlob(quality);
    if (blob.size <= maxBytes || quality <= 0.3) {
      return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
    }
  }

  const blob = await toBlob(0.3);
  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
}

async function processVideo(file: File): Promise<File> {
  if (!file.type.startsWith('video/')) return file;
  return file;
}

export async function generateVideoThumbnail(file: File): Promise<File | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.muted = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
        video.onseeked = resolve;
      };
    });

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, 300, 300);
    URL.revokeObjectURL(url);

    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.8));
    if (!blob) return null;
    return new File([blob], 'thumbnail.webp', { type: 'image/webp' });
  } catch (e) {
    console.error('Thumbnail generation failed:', e);
    return null;
  }
}

export async function removeMemoriesFromAlbum(albumId: string, memoryIds: string[]): Promise<void> {
  await postApi(albumsApi.removeItems, { albumId, memoryIds });
}
