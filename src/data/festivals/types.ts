/**
 * Festival data types shared across all religion-specific festival files.
 */

export interface FestivalPrompt {
  question: string;
  suggestedTitle: string;
  suggestedCategory: string;
}

export interface FestivalPromptBundle {
  id: string;
  festivalName: string;
  /** MM-DD format for recurring dates (approximate window) */
  dates: string[];
  /** Religions this festival is associated with */
  religions: string[];
  /** Indian states where this festival is especially prominent (optional) */
  regions?: string[];
  emoji: string;
  banner: string;
  prompts: FestivalPrompt[];
}
