export interface HelpCategory {
  slug: string
  title: string
  description: string
  iconName: CategoryIconName
  order: number
}

export type CategoryIconName =
  | 'Rocket'
  | 'TreePine'
  | 'Users'
  | 'BookHeart'
  | 'Share2'
  | 'Compass'
  | 'ShieldCheck'

export interface HelpArticle {
  slug: string
  categorySlug: string
  title: string
  description: string
  updated: string
  order: number
  tags: string[]
  body: string
  /** Rough word count from body; used to decide whether to show right-side TOC. */
  wordCount: number
  /** Flat list of h2/h3 headings extracted for the TOC. */
  headings: HelpHeading[]
}

export interface HelpHeading {
  id: string
  text: string
  level: 2 | 3
}
