import type { HistoricalEvent } from './types';

export const NORTH_STATE_EVENTS: HistoricalEvent[] = [
  // Punjab / Haryana
  { id: 'partition-punjab-1947', year: 1947, title: 'Punjab Partition Violence', description: 'Massive communal violence and displacement during Punjab partition', region: 'state', category: 'social', states: ['Punjab', 'Haryana'] },
  { id: 'chandigarh-1966', year: 1966, title: 'Chandigarh Becomes UT', description: "Le Corbusier's planned city became shared capital of Punjab and Haryana", region: 'state', category: 'political', states: ['Punjab', 'Haryana', 'Chandigarh'] },
  { id: 'punjab-insurgency-1980s', year: 1981, endYear: 1993, title: 'Punjab Insurgency', description: 'Period of Sikh separatist militancy and state response in Punjab', region: 'state', category: 'political', states: ['Punjab'] },
  // Delhi
  { id: 'delhi-capital-1911', year: 1911, title: 'Capital Moved to Delhi', description: 'British shifted capital from Calcutta to New Delhi', region: 'india', category: 'political', states: ['Delhi', 'West Bengal'] },
  { id: 'delhi-statehood-1991', year: 1991, title: 'Delhi Gets Statehood (NCT)', description: 'Delhi became National Capital Territory with elected government', region: 'state', category: 'political', states: ['Delhi'] },
  { id: 'delhi-metro-2002', year: 2002, title: 'Delhi Metro Opens', description: "India's second metro rail system opened, transforming Delhi transport", region: 'state', category: 'economic', states: ['Delhi'] },
  { id: 'delhi-riots-2020', year: 2020, title: 'Delhi Riots', description: 'Communal violence in northeast Delhi during CAA protests', region: 'state', category: 'social', states: ['Delhi'] },
  // Uttar Pradesh
  { id: 'up-zamindari-1952', year: 1952, title: 'UP Zamindari Abolition', description: 'Abolition of zamindari (landlord) system in Uttar Pradesh', region: 'state', category: 'economic', states: ['Uttar Pradesh'] },
  { id: 'muzaffarnagar-2013', year: 2013, title: 'Muzaffarnagar Riots', description: 'Communal violence in western UP displacing tens of thousands', region: 'state', category: 'social', states: ['Uttar Pradesh'] },
  { id: 'ayodhya-temple-2024', year: 2024, title: 'Ram Temple Consecration', description: 'Ram Mandir inaugurated in Ayodhya after decades of legal dispute', region: 'india', category: 'religious', states: ['Uttar Pradesh'] },
  // Rajasthan
  { id: 'rajasthan-formation-1949', year: 1949, title: 'Rajasthan Formed', description: 'Merger of Rajputana princely states into Rajasthan', region: 'state', category: 'political', states: ['Rajasthan'] },
  { id: 'sati-ban-1987', year: 1987, title: 'Roop Kanwar Sati Case', description: 'Sati incident in Rajasthan leading to strict anti-sati legislation', region: 'state', category: 'social', states: ['Rajasthan'] },
  // Jammu & Kashmir
  { id: 'kashmir-accession-1947', year: 1947, title: 'Kashmir Accession to India', description: 'Maharaja Hari Singh signed Instrument of Accession amid tribal invasion', region: 'state', category: 'political', states: ['Jammu and Kashmir'] },
  { id: 'kashmir-insurgency-1989', year: 1989, endYear: 2019, title: 'Kashmir Insurgency', description: 'Armed insurgency and separatist movement in Kashmir Valley', region: 'state', category: 'political', states: ['Jammu and Kashmir'] },
  { id: 'uri-attack-2016', year: 2016, title: 'Uri Attack & Surgical Strikes', description: 'Attack on Indian Army base followed by cross-border surgical strikes', region: 'india', category: 'political', states: ['Jammu and Kashmir'] },
  // Himachal Pradesh / Uttarakhand
  { id: 'hp-statehood-1971', year: 1971, title: 'Himachal Pradesh Full Statehood', description: 'HP became a full state of India', region: 'state', category: 'political', states: ['Himachal Pradesh'] },
  { id: 'uttarakhand-formed-2000', year: 2000, title: 'Uttarakhand State Formed', description: 'Hill districts carved out of UP to form Uttarakhand (initially Uttaranchal)', region: 'state', category: 'political', states: ['Uttarakhand'] },
  // Madhya Pradesh / Chhattisgarh
  { id: 'chhattisgarh-formed-2000', year: 2000, title: 'Chhattisgarh State Formed', description: 'Tribal-majority region carved from Madhya Pradesh', region: 'state', category: 'political', states: ['Chhattisgarh', 'Madhya Pradesh'] },
  { id: 'naxal-corridor', year: 2005, endYear: 2020, title: 'Red Corridor Naxal Conflict', description: 'Ongoing Maoist insurgency in tribal belt of central India', region: 'state', category: 'political', states: ['Chhattisgarh', 'Jharkhand', 'Odisha', 'Maharashtra'] },
];
