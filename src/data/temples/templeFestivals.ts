/**
 * Known festivals for specific temples.
 * Used to detect "unrecorded" festivals and prompt users to add memories.
 * Keys are templeIds from the temple registry.
 */
export const TEMPLE_FESTIVALS: Record<string, string[]> = {
  // Major Kerala temples
  'guruvayur-temple': ['Ekadashi', 'Guruvayur Utsavam', 'Ashtami Rohini', 'Pallivetta'],
  'sabarimala-temple': ['Mandalam', 'Makaravilakku', 'Vishu', 'Edavalapathiyam'],
  'padmanabhaswamy-temple': ['Alpashy Thirunal', 'Panguni Thirunal', 'Arattu', 'Laksha Deepam'],
  // Tamilnadu major temples
  'brihadeeswara-temple-thanjavur': ['Brahmotsavam', 'Karthigai Deepam', 'Maha Shivaratri'],
  'meenakshi-amman-temple': ['Chithirai Festival', 'Navaratri', 'Adi Pooram'],
  'murugan-temple-palani': ['Thai Poosam', 'Panguni Uthiram', 'Skanda Sashti'],
  // Andhra / Tirupati
  'tirupati-balaji-temple': ['Brahmotsavam', 'Vaikunta Ekadashi', 'Rathasapthami'],
  // Generic fallback for any temple using common South Indian festival names
};

/**
 * Returns festival list for a given templeId, or an empty array if not known.
 */
export function getFestivalsForTemple(templeId: string): string[] {
  return TEMPLE_FESTIVALS[templeId] ?? [];
}
