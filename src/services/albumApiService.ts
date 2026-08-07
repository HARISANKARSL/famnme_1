import { postApi, putApi, deleteApi, getApi, albumsApi } from './api';
import type { Album, AlbumInput, Memory } from '@/types';

export async function createAlbum(treeId: string, input: AlbumInput): Promise<Album> {
  const res = await postApi<any>(albumsApi.create, input);
  return res.data || res;
}

export async function fetchAlbums(treeId: string, options?: { search?: string; page?: number; limit?: number; sortBy?: string }): Promise<any> {
  const data = await postApi<any>(albumsApi.getAlbums, {
    page: options?.page || 1,
    limit: options?.limit || 10,
    search: options?.search || '',
    filter: {
      sortBy: options?.sortBy || 'newest'
    }
  });
  return data;
}

export async function fetchAlbum(albumId: string): Promise<Album> {
  const json = await postApi<any>(albumsApi.getDetails, { albumId });
  return json.data;
}

export async function updateAlbum(albumId: string, data: Partial<AlbumInput>): Promise<Album> {
  const res = await putApi<any>(albumsApi.albumDetail(albumId), data);
  return res.data || res;
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await postApi(albumsApi.delete, { id: [albumId] });
}

export async function addMemoryToAlbum(albumId: string, memoryId: string): Promise<void> {
  await postApi(albumsApi.albumMemoryItem(albumId, memoryId));
}

export async function moveMemoriesToAlbum(albumId: string, memoryIds: string[]): Promise<void> {
  await postApi(albumsApi.moveMemories, { albumId, memoryIds });
}

export async function removeMemoryFromAlbum(albumId: string, memoryId: string): Promise<void> {
  await deleteApi(albumsApi.albumMemoryItem(albumId, memoryId));
}

export async function fetchAlbumMemories(albumId: string): Promise<Memory[]> {
  // return getApi(albumsApi.albumMemories(albumId));
  return [];
}

export async function fetchMemoryAlbums(memoryId: string): Promise<Album[]> {
  return getApi(`/memory/${memoryId}/albums`);
}
