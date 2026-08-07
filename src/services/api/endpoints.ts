/**
 * Centralized endpoint configuration for Preserve Family service (localhost:8000)
 */

export const memoriesApi = {
  list: '/vault/memories',
  getById: '/vault/memories/get-by-id',
  archivedList: '/vault/memories/archived-list',
  trashList: '/vault/memories/trash-list',
  delete: '/vault/memories/delete',
  archive: '/vault/memories/archive',
  updateStatus: '/vault/memories/update-status',
  stats: '/vault/memories/stats',
  filterCategories: '/vault/memories/categories',
  detail: (id: string) => `/vault/memory/${id}`,
  restore: (id: string) => `/vault/memory/${id}/restore`,
  permanentDelete: (id: string) => `/vault/memory/${id}/permanent`,
  publish: (id: string) => `/vault/memory/${id}/publish`,
  unarchive: (id: string) => `/vault/memory/${id}/unarchive`,
  like: (id: string) => `/vault/memory/${id}/like`,
  likes: (id: string) => `/vault/memory/${id}/likes`,
  comments: (id: string) => `/vault/memory/${id}/comments`,
  commentDetail: (id: string, commentId: string) => `/vault/memory/${id}/comments/${commentId}`,
  tag: (id: string, personId: string) => `/vault/memory/${id}/tag/${personId}`,
  allowlist: (id: string) => `/vault/memory/${id}/allowlist`,
  create: (treeId: string) => `/tree/${treeId}/memory`,
  confirm: '/vault/memories/confirm',
  presignBulk: '/vault/memories/presigned-url',
  updateDetails: '/vault/memories/update-details',
  aiDescription: (treeId: string) => `/tree/${treeId}/memories/ai-description`,
  aiEnhance: (treeId: string) => `/tree/${treeId}/memories/ai-enhance`,
  transcribe: (treeId: string, id: string) => `/tree/${treeId}/memories/${id}/transcribe`,
  photoDescription: (id: string) => `/memory/${id}/photo-description`,
  images: '/vault/memories/images',
  aiPhotoCaption: '/ai/photo/caption',
  aiPhotoDescription: '/ai/photo/description',
  aiPhotoCeremony: '/ai/photo/ceremony',
  aiMemoryEnhance: '/ai/memory/enhance',
};

export const albumsApi = {
  create: '/vault/albums/create-album',
  getAlbums: '/vault/albums/get-albums',
  getDetails: '/vault/albums/get-album-details',
  delete: '/vault/albums/delete',
  moveMemories: '/vault/albums/move-memories',
  removeItems: '/vault/albums/remove-items',
  albumDetail: (id: string) => `/album/${id}`,
  albumMemories: (id: string) => `/album/${id}/memories`,
  albumMemoryItem: (id: string, memoryId: string) => `/album/${id}/memory/${memoryId}`,
};

export const treeApi = {
  memoryCounts: (treeId: string) => `/tree/${treeId}/memories/counts`,
  batchTag: (treeId: string) => `/tree/${treeId}/memories/batch/tag`,
  batchAlbum: (treeId: string) => `/tree/${treeId}/memories/batch/album`,
  batchPrivacy: (treeId: string) => `/tree/${treeId}/memories/batch/privacy`,
  emptyTrash: (treeId: string) => `/tree/${treeId}/trash/empty`,
  uploadStatus: (treeId: string, batchId: string) => `/tree/${treeId}/upload-status/${batchId}`,
};

export const storiesApi = {
  save: '/vault/stories/save',
  list: '/vault/stories/list',
  detail: (id: string) => `/vault/story/${id}`,
  slides: (id: string) => `/vault/story/${id}/slides`,
  reorder: (id: string) => `/vault/story/${id}/slides/reorder`,
  like: (id: string) => `/vault/story/${id}/like`,
  likes: (id: string) => `/vault/story/${id}/likes`,
  delete: '/vault/stories/delete',
};

export const notificationsApi = {
  list: '/api/notification/list',
  markAsRead: '/api/notification/mark-read',
};
