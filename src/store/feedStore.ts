import { create } from 'zustand';

interface FeedState {
  activeCommentPostId: string | null;
  setActiveCommentPostId: (id: string | null) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  activeCommentPostId: null,
  setActiveCommentPostId: (id) => set({ activeCommentPostId: id }),
}));
