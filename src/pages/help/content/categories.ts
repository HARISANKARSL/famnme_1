import type { HelpCategory } from './types'

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Welcome tour, accounts, and your first 5 minutes.',
    iconName: 'Rocket',
    order: 1,
  },
  {
    slug: 'building-your-tree',
    title: 'Building Your Tree',
    description: 'Create, edit, and organize your family trees.',
    iconName: 'TreePine',
    order: 2,
  },
  {
    slug: 'people-relationships',
    title: 'People & Relationships',
    description: 'Adding relatives, cultural details, and fixing mistakes.',
    iconName: 'Users',
    order: 3,
  },
  {
    slug: 'memories-stories',
    title: 'Memories & Stories',
    description: 'Capture photos, stories, and daily family moments.',
    iconName: 'BookHeart',
    order: 4,
  },
  {
    slug: 'collaboration-sharing',
    title: 'Collaboration & Sharing',
    description: 'Invite family, assign roles, and track changes together.',
    iconName: 'Share2',
    order: 5,
  },
  {
    slug: 'heritage-discovery',
    title: 'Heritage & Discovery',
    description: 'Maps, timelines, relationships, and temples.',
    iconName: 'Compass',
    order: 6,
  },
  {
    slug: 'account-privacy',
    title: 'Account, Privacy & Security',
    description: 'Passkeys, passwords, data, and deleting your account.',
    iconName: 'ShieldCheck',
    order: 7,
  },
]

export const CATEGORY_BY_SLUG: Record<string, HelpCategory> = Object.fromEntries(
  HELP_CATEGORIES.map(c => [c.slug, c])
)
