import type { HistoricalEvent } from './types';

export const WEST_STATE_EVENTS: HistoricalEvent[] = [
  // Maharashtra
  { id: 'samyukta-maharashtra-1960', year: 1960, title: 'Maharashtra & Gujarat Formed', description: 'Bombay State split into Maharashtra and Gujarat along linguistic lines', region: 'state', category: 'political', states: ['Maharashtra', 'Gujarat'] },
  { id: 'shiv-sena-1966', year: 1966, title: 'Shiv Sena Founded', description: 'Bal Thackeray founded Shiv Sena as a pro-Marathi political organization', region: 'state', category: 'political', states: ['Maharashtra'] },
  { id: 'koyna-earthquake-1967', year: 1967, title: 'Koyna Earthquake', description: 'Reservoir-induced earthquake in Maharashtra killing 200+', region: 'state', category: 'natural-disaster', states: ['Maharashtra'] },
  { id: 'naxal-mh-1970s', year: 1970, endYear: 1980, title: 'Naxalite Movement in Maharashtra', description: 'Maoist movement spread to tribal areas of Maharashtra', region: 'state', category: 'political', states: ['Maharashtra'] },
  { id: 'textile-strike-1982', year: 1982, endYear: 1983, title: 'Great Bombay Textile Strike', description: 'Year-long strike by 250,000+ mill workers led by Datta Samant', region: 'state', category: 'economic', states: ['Maharashtra'] },
  { id: 'mumbai-floods-2005', year: 2005, title: 'Mumbai Floods (26 July)', description: 'Record 944mm rainfall in 24 hours paralyzed Mumbai, killing 1,000+', region: 'state', category: 'natural-disaster', states: ['Maharashtra'] },
  { id: 'pune-floods-2019', year: 2019, title: 'Pune Dam Discharge Floods', description: 'Uncontrolled dam discharge caused severe flooding in Pune', region: 'state', category: 'natural-disaster', states: ['Maharashtra'] },
  // Gujarat
  { id: 'gj-navnirman-1974', year: 1974, title: 'Gujarat Navnirman Andolan', description: 'Student-led anti-corruption movement that toppled the state government', region: 'state', category: 'political', states: ['Gujarat'] },
  { id: 'morbi-dam-1979', year: 1979, title: 'Morbi Dam Disaster', description: 'Machhu Dam burst killed thousands in Morbi, Gujarat', region: 'state', category: 'natural-disaster', states: ['Gujarat'] },
  { id: 'gj-anti-reservation-1985', year: 1985, title: 'Gujarat Anti-Reservation Agitation', description: 'Violent protests against caste-based reservations in Gujarat', region: 'state', category: 'social', states: ['Gujarat'] },
  { id: 'gj-vibrant-2003', year: 2003, endYear: 2023, title: 'Vibrant Gujarat Summit', description: 'Biennial business summit making Gujarat a major investment destination', region: 'state', category: 'economic', states: ['Gujarat'] },
  // Goa
  { id: 'goa-statehood-1987', year: 1987, title: 'Goa Achieves Statehood', description: 'Goa became the 25th state of India (previously a Union Territory)', region: 'state', category: 'political', states: ['Goa'] },
  { id: 'goa-mining-ban-2012', year: 2012, title: 'Goa Mining Ban', description: 'Supreme Court banned iron ore mining in Goa over environmental concerns', region: 'state', category: 'economic', states: ['Goa'] },
];
