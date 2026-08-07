/**
 * Cultural Knowledge Base
 *
 * Static knowledge entries for gotra, nakshatra, rashi, caste
 * explaining cultural significance.
 */

export interface KnowledgeEntry {
  term: string;
  localTerm?: string;
  category: 'gotra' | 'nakshatra' | 'rashi' | 'caste' | 'religion' | 'ceremony' | 'general';
  description: string;
  significance?: string;
}

export const CULTURAL_KNOWLEDGE: KnowledgeEntry[] = [
  {
    term: 'Gotra',
    localTerm: 'गोत्र',
    category: 'gotra',
    description: 'A clan or lineage assigned to a Hindu family, traced through the paternal line.',
    significance: 'Marriages within the same gotra are traditionally prohibited (exogamy). It traces back to one of the Saptarishis (seven sages).',
  },
  {
    term: 'Nakshatra',
    localTerm: 'नक्षत्र',
    category: 'nakshatra',
    description: 'A birth star or lunar mansion in Vedic astrology, determined by the moon\'s position at the time of birth.',
    significance: 'Used in determining compatibility for marriage (Kundali matching), naming ceremonies, and auspicious timing for events.',
  },
  {
    term: 'Rashi',
    localTerm: 'राशि',
    category: 'rashi',
    description: 'The zodiac sign in Hindu astrology based on the moon\'s position at birth.',
    significance: 'Important for horoscope matching, naming the child (names often start with specific syllables based on rashi), and determining auspicious dates.',
  },
  {
    term: 'Caste',
    localTerm: 'जाति',
    category: 'caste',
    description: 'A social classification system in Indian society that has historical and cultural roots.',
    significance: 'Historically determined occupation and social standing. While discrimination based on caste is unconstitutional in India, it remains relevant for genealogical and historical documentation.',
  },
  {
    term: 'Native Place',
    localTerm: 'मूल निवास',
    category: 'general',
    description: 'The ancestral village or town where a family\'s roots trace back to.',
    significance: 'Indian families often maintain strong connections to their ancestral villages. It helps in tracing migration patterns and regional cultural practices.',
  },
  {
    term: 'Elder Status',
    localTerm: 'ज्येष्ठ/कनिष्ठ',
    category: 'general',
    description: 'Whether a person is elder or younger among their siblings.',
    significance: 'Critical for accurate Hindi kinship terminology. For example, father\'s elder brother is ताऊ (Tau) while younger brother is चाचा (Chacha).',
  },
];

export function getKnowledgeEntry(term: string): KnowledgeEntry | undefined {
  return CULTURAL_KNOWLEDGE.find(k =>
    k.term.toLowerCase() === term.toLowerCase() ||
    k.localTerm?.toLowerCase() === term.toLowerCase()
  );
}

export function getEntriesByCategory(category: KnowledgeEntry['category']): KnowledgeEntry[] {
  return CULTURAL_KNOWLEDGE.filter(k => k.category === category);
}
