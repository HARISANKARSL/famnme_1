/**
 * Memory Categories - Grouped classification for memories
 * Includes Indian cultural categories alongside universal ones
 */

export interface CategoryGroup {
  label: string;
  categories: string[];
}

export const MEMORY_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Festivals',
    categories: [
      'Diwali',
      'Holi',
      'Onam',
      'Pongal',
      'Navratri',
      'Eid',
      'Christmas',
      'Raksha Bandhan',
      'Ganesh Chaturthi',
      'Durga Puja',
      'Baisakhi',
      'Makar Sankranti',
      'Vishu',
      'Ugadi',
      'Lohri',
    ],
  },
  {
    label: 'Life Ceremonies',
    categories: [
      'Namkaran',
      'Annaprashana',
      'Mundan',
      'Upanayana',
      'Engagement',
      'Mehendi',
      'Sangeet',
      'Vivah/Wedding',
      'Griha Pravesh',
      'Retirement',
      'Antim Sanskar',
      'Shradh/Memorial',
    ],
  },
  {
    label: 'Family',
    categories: [
      'Joint Family Gathering',
      'Family Reunion',
      'Birthday',
      'Anniversary',
      'Family Photo',
      'Portrait',
    ],
  },
  {
    label: 'Documents & Records',
    categories: [
      'Document',
      'Certificate',
      'Birth Certificate',
      'Marriage Certificate',
      'Death Certificate',
      'Property Record',
      'Legal Document',
      'Personal Paper',
    ],
  },
  {
    label: 'Heritage & Tradition',
    categories: [
      'Recipe',
      'Heirloom',
      'Place/Building',
      'Ancestral Home',
      'Temple/Place of Worship',
      'Migration Story',
      'Oral History',
    ],
  },
  {
    label: 'Achievements',
    categories: [
      'Award/Medal',
      'Education',
      'Diploma',
      'Occupation',
      'Military Service',
    ],
  },
  {
    label: 'Other',
    categories: [
      'Newspaper',
      'Obituary',
      'Headstone',
      'Immigration',
      'Other',
    ],
  },
];

/** Flat list of all categories (for validation, backward compat) */
export const MEMORY_CATEGORIES = MEMORY_CATEGORY_GROUPS.flatMap(g => g.categories) as readonly string[];

export type MemoryCategory = string;
