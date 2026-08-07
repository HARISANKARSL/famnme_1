import type { HistoricalEvent } from './types';

export const EAST_STATE_EVENTS: HistoricalEvent[] = [
  // West Bengal
  { id: 'calcutta-killings-1946', year: 1946, title: 'Calcutta Killings', description: 'Communal riots during Direct Action Day in Calcutta', region: 'state', category: 'social', states: ['West Bengal'] },
  { id: 'bengal-partition-1947', year: 1947, title: 'Bengal Partition', description: 'Bengal divided between India (West Bengal) and Pakistan (East Pakistan)', region: 'state', category: 'political', states: ['West Bengal'] },
  { id: 'bangladesh-refugees-1971', year: 1971, title: 'Bangladesh War Refugees', description: 'Millions of refugees poured into West Bengal during Bangladesh liberation', region: 'state', category: 'social', states: ['West Bengal'] },
  { id: 'nandigram-2007', year: 2007, title: 'Nandigram Violence', description: 'Conflict over land acquisition for SEZ in West Bengal', region: 'state', category: 'political', states: ['West Bengal'] },
  { id: 'singur-2008', year: 2008, title: 'Singur Tata Nano Controversy', description: 'Farmland acquisition for Tata Nano factory led to political upheaval', region: 'state', category: 'economic', states: ['West Bengal'] },
  { id: 'wb-tmc-2011', year: 2011, title: 'TMC Wins West Bengal', description: 'Mamata Banerjee ended 34-year Left Front rule in West Bengal', region: 'state', category: 'political', states: ['West Bengal'] },
  { id: 'amphan-2020', year: 2020, title: 'Cyclone Amphan', description: 'Super cyclone devastated West Bengal and Odisha coasts', region: 'state', category: 'natural-disaster', states: ['West Bengal', 'Odisha'] },
  // Bihar / Jharkhand
  { id: 'bihar-movement-1974', year: 1974, title: 'Bihar Movement (JP Movement)', description: 'Jayaprakash Narayan led anti-corruption movement against Congress govt', region: 'state', category: 'political', states: ['Bihar'] },
  { id: 'bihar-caste-wars-1990s', year: 1990, endYear: 2005, title: 'Bihar Caste Conflicts', description: 'Period of caste-based violence between private armies in rural Bihar', region: 'state', category: 'social', states: ['Bihar'] },
  { id: 'jharkhand-formed-2000', year: 2000, title: 'Jharkhand State Formed', description: 'Tribal-majority southern Bihar carved into separate Jharkhand state', region: 'state', category: 'political', states: ['Jharkhand', 'Bihar'] },
  { id: 'bihar-floods-2008', year: 2008, title: 'Kosi River Floods', description: 'Kosi river changed course causing massive floods in Bihar', region: 'state', category: 'natural-disaster', states: ['Bihar'] },
  // Odisha
  { id: 'odisha-famine-1866', year: 1866, title: 'Great Odisha Famine', description: 'Devastating famine killing a third of Odisha population under British rule', region: 'state', category: 'natural-disaster', states: ['Odisha'] },
  { id: 'cyclone-phailin-2013', year: 2013, title: 'Cyclone Phailin', description: 'Massive cyclone hit Odisha; successful evacuation saved many lives', region: 'state', category: 'natural-disaster', states: ['Odisha'] },
  { id: 'cyclone-fani-2019', year: 2019, title: 'Cyclone Fani', description: 'Extremely severe cyclone hit Odisha coast; largest evacuation in Indian history', region: 'state', category: 'natural-disaster', states: ['Odisha'] },
  // Northeast
  { id: 'assam-movement-1979', year: 1979, endYear: 1985, title: 'Assam Movement', description: 'Anti-foreigner agitation against illegal immigration in Assam', region: 'state', category: 'political', states: ['Assam'] },
  { id: 'nellie-massacre-1983', year: 1983, title: 'Nellie Massacre', description: 'Communal violence in Assam killing hundreds of Bengali settlers', region: 'state', category: 'social', states: ['Assam'] },
  { id: 'nrc-assam-2019', year: 2019, title: 'Assam NRC Published', description: 'National Register of Citizens published, excluding 1.9 million people', region: 'state', category: 'political', states: ['Assam'] },
  { id: 'manipur-violence-2023', year: 2023, title: 'Manipur Ethnic Violence', description: 'Ethnic conflict between Meitei and Kuki communities in Manipur', region: 'state', category: 'social', states: ['Manipur'] },
];
