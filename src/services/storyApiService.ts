import { postApi, getApi, putApi, deleteApi, storiesApi } from './api';
import type { Story, StorySlide, StoryInput, StorySlideInput } from '@/types';

// Story CRUD
export async function createStory(treeId: string, data: StoryInput & { authorName: string; authorAvatarUrl?: string }): Promise<Story> {
  return postApi(storiesApi.list, { ...data, treeId });
}

export async function saveStory(treeId: string, data: {
  title: string;
  type: 'photo' | 'textstory';
  textstory?: string;
  files?: Array<{ fileName: string; fileType: string; key: string }>;
  ownerId?: string;
  personName?: string;
  authorName?: string;

}): Promise<any> {
  return postApi(storiesApi.save, { ...data, treeId });
}

export async function fetchStories(treeId: string, options: { page?: number; limit?: number } = {}): Promise<{ stories: Story[]; pagination: any }> {
  const data = await postApi<any>(storiesApi.list, {
    treeId,
    page: options.page || 1,
    limit: options.limit || 20
  });
  const rawStories = Array.isArray(data) ? data : data.stories || data.items || [];
  const stories = rawStories.map((s: any) => ({
    ...s,
    storyId: s.storyId || s._id // Normalize _id to storyId
  }));
  return {
    stories,
    pagination: data.pagination
  };
}

export async function fetchStory(storyId: string): Promise<Story> {
  return getApi(storiesApi.detail(storyId));
}

export async function updateStory(storyId: string, data: Partial<StoryInput>): Promise<Story> {
  return putApi(storiesApi.detail(storyId), data);
}

export async function deleteStory(storyId: string): Promise<void> {
  await postApi(storiesApi.delete, { id: storyId });
}

// Slide CRUD
export async function addSlide(storyId: string, data: StorySlideInput): Promise<StorySlide> {
  return postApi(storiesApi.slides(storyId), data);
}

export async function fetchSlides(storyId: string): Promise<StorySlide[]> {
  return getApi(storiesApi.slides(storyId));
}

export async function updateSlide(slideId: string, data: Partial<StorySlideInput>): Promise<StorySlide> {
  return putApi(storiesApi.detail(slideId), data); // Assuming slide details use story detail endpoint or have similar structure
}

export async function deleteSlide(slideId: string): Promise<void> {
  await deleteApi(storiesApi.detail(slideId));
}

export async function reorderSlides(storyId: string, slideIds: string[]): Promise<StorySlide[]> {
  return putApi(storiesApi.reorder(storyId), { slideIds });
}

// Like / Reaction
export async function likeStory(storyId: string): Promise<{ liked: boolean; likeCount: number }> {
  return postApi(storiesApi.like(storyId));
}

export async function getStoryLikes(storyId: string): Promise<{ liked: boolean; likeCount: number }> {
  return getApi(storiesApi.likes(storyId));
}
