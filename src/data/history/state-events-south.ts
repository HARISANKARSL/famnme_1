// import type { HistoricalEvent } from './types';

// export const SOUTH_STATE_EVENTS: HistoricalEvent[] = [
//   // Kerala
//   { id: 'vaikom-1924', year: 1924, title: 'Vaikom Satyagraha', description: 'Protest for temple entry rights of lower castes in Travancore', region: 'state', category: 'social', states: ['Kerala'] },
//   { id: 'temple-entry-1936', year: 1936, title: 'Temple Entry Proclamation', description: 'Travancore opened Hindu temples to all castes — landmark social reform', region: 'state', category: 'religious', states: ['Kerala'] },
//   { id: 'kerala-education-1959', year: 1959, title: 'Kerala Education Bill Crisis', description: 'Education reform bill led to Liberation Struggle and dismissal of state government', region: 'state', category: 'political', states: ['Kerala'] },
//   { id: 'kerala-land-reform-1970', year: 1970, title: 'Kerala Land Reform Act', description: 'Radical land redistribution abolished feudal landlordism in Kerala', region: 'state', category: 'economic', states: ['Kerala'] },
//   { id: 'kerala-literacy-1991', year: 1991, title: 'Kerala Declared Fully Literate', description: 'First Indian state to achieve 100% literacy rate', region: 'state', category: 'social', states: ['Kerala'] },
//   { id: 'endosulfan-2001', year: 2001, endYear: 2011, title: 'Endosulfan Tragedy', description: 'Decades of aerial pesticide spraying caused severe health issues in Kasaragod', region: 'state', category: 'social', states: ['Kerala'] },
//   { id: 'sabarimala-2018', year: 2018, title: 'Sabarimala Temple Verdict', description: 'Supreme Court allowed women of all ages to enter Sabarimala temple', region: 'state', category: 'religious', states: ['Kerala'] },
//   // Tamil Nadu
//   { id: 'dmk-1969', year: 1969, title: 'DMK Wins Tamil Nadu', description: 'DMK became first Dravidian party to win state elections, ending Congress rule', region: 'state', category: 'political', states: ['Tamil Nadu'] },
//   { id: 'mgr-1977', year: 1977, title: 'MGR Becomes Chief Minister', description: 'Film star MG Ramachandran (MGR) led AIADMK to power in Tamil Nadu', region: 'state', category: 'political', states: ['Tamil Nadu'] },
//   { id: 'rajiv-assassination-1991', year: 1991, title: 'Rajiv Gandhi Assassination', description: 'Former PM Rajiv Gandhi assassinated during election rally in Sriperumbudur', region: 'india', category: 'political', states: ['Tamil Nadu'] },
//   { id: 'tn-jallikattu-2017', year: 2017, title: 'Jallikattu Protests', description: 'Massive protests in Tamil Nadu demanding lifting of ban on traditional bull-taming sport', region: 'state', category: 'cultural', states: ['Tamil Nadu'] },
//   // Karnataka
//   { id: 'gokak-1982', year: 1982, title: 'Gokak Movement', description: 'Pro-Kannada movement demanding primacy for Kannada language', region: 'state', category: 'cultural', states: ['Karnataka'] },
//   { id: 'cauvery-1991', year: 1991, endYear: 2018, title: 'Cauvery Water Dispute', description: 'Decades-long inter-state water dispute between Karnataka and Tamil Nadu', region: 'state', category: 'political', states: ['Karnataka', 'Tamil Nadu'] },
//   { id: 'bangalore-it-1990s', year: 1995, endYear: 2005, title: 'Bangalore IT Boom', description: "Bangalore emerged as India's Silicon Valley, transforming Karnataka's economy", region: 'state', category: 'economic', states: ['Karnataka'] },
//   // Andhra Pradesh / Telangana
//   { id: 'telangana-movement-1969', year: 1969, title: 'Telangana Movement', description: 'Demand for separate Telangana state from Andhra Pradesh', region: 'state', category: 'political', states: ['Telangana', 'Andhra Pradesh'] },
//   { id: 'ap-cyclone-1977', year: 1977, title: 'Andhra Pradesh Cyclone', description: 'Devastating cyclone in Diviseema region killing 10,000+', region: 'state', category: 'natural-disaster', states: ['Andhra Pradesh'] },
//   { id: 'telangana-formed-2014', year: 2014, title: 'Telangana State Formed', description: 'Telangana became the 29th state of India, carved from Andhra Pradesh', region: 'state', category: 'political', states: ['Telangana', 'Andhra Pradesh'] },
//   { id: 'ap-bifurcation-2014', year: 2014, title: 'AP Capital Shifts to Amaravati', description: 'After bifurcation, Andhra Pradesh chose Amaravati as new capital', region: 'state', category: 'political', states: ['Andhra Pradesh'] },
//   { id: 'cyclone-hudhud-2014', year: 2014, title: 'Cyclone Hudhud', description: 'Severe cyclone devastated Visakhapatnam coast', region: 'state', category: 'natural-disaster', states: ['Andhra Pradesh'] },
// ];

import type { HistoricalEvent } from './types';

export const SOUTH_STATE_EVENTS: HistoricalEvent[] = [
  // Kerala
  { id: 'vaikom-1924', year: 1924, title: 'Vaikom Satyagraha', description: 'Protest for temple entry rights of lower castes in Travancore', region: 'state', category: 'social', states: ['Kerala'] },
  { id: 'temple-entry-1936', year: 1936, title: 'Temple Entry Proclamation', description: 'Travancore opened Hindu temples to all castes — landmark social reform', region: 'state', category: 'religious', states: ['Kerala'] },
  { id: 'kerala-education-1959', year: 1959, title: 'Kerala Education Bill Crisis', description: 'Education reform bill led to Liberation Struggle and dismissal of state government', region: 'state', category: 'political', states: ['Kerala'] },
  { id: 'kerala-land-reform-1970', year: 1970, title: 'Kerala Land Reform Act', description: 'Radical land redistribution abolished feudal landlordism in Kerala', region: 'state', category: 'economic', states: ['Kerala'] },
  { id: 'kerala-literacy-1991', year: 1991, title: 'Kerala Declared Fully Literate', description: 'First Indian state to achieve 100% literacy rate', region: 'state', category: 'social', states: ['Kerala'] },
  { id: 'endosulfan-2001', year: 2001, endYear: 2011, title: 'Endosulfan Tragedy', description: 'Decades of aerial pesticide spraying caused severe health issues in Kasaragod', region: 'state', category: 'social', states: ['Kerala'] },
  { id: 'kochi-metro-2017', year: 2017, title: 'Kochi Metro Opens', description: 'Kochi Metro became one of India’s most modern urban transit systems', region: 'state', category: 'economic', states: ['Kerala'] },
  { id: 'sabarimala-2018', year: 2018, title: 'Sabarimala Temple Verdict', description: 'Supreme Court allowed women of all ages to enter Sabarimala temple', region: 'state', category: 'religious', states: ['Kerala'] },
  { id: 'kerala-floods-2018', year: 2018, title: 'Kerala Floods', description: 'Worst flooding in Kerala in a century, displacing over a million people', region: 'state', category: 'natural-disaster', states: ['Kerala'] },
  { id: 'kerala-covid-response-2020', year: 2020, title: 'Kerala COVID Response', description: 'Kerala gained national attention for its early pandemic response and public health coordination', region: 'state', category: 'social', states: ['Kerala'] },
  { id: 'silverline-debate-2022', year: 2022, title: 'SilverLine Rail Debate', description: 'Statewide protests and debates over Kerala’s proposed semi high-speed rail corridor', region: 'state', category: 'political', states: ['Kerala'] },
  { id: 'kerala-folk-festival-2025', year: 2025, title: 'Kerala International Folk Festival', description: 'Large international folk arts festival held in Thiruvananthapuram celebrating global and Kerala traditions', region: 'state', category: 'cultural', states: ['Kerala'] }, // :contentReference[oaicite:0]{index=0}
  { id: 'iiie-kochi-2026', year: 2026, title: 'India International Industrial Expo Kochi', description: 'Major industrial and MSME expo hosted in Kochi with global participation', region: 'state', category: 'economic', states: ['Kerala'] }, // :contentReference[oaicite:1]{index=1}

  // Tamil Nadu
  { id: 'dmk-1969', year: 1969, title: 'DMK Wins Tamil Nadu', description: 'DMK became first Dravidian party to win state elections, ending Congress rule', region: 'state', category: 'political', states: ['Tamil Nadu'] },
  { id: 'mgr-1977', year: 1977, title: 'MGR Becomes Chief Minister', description: 'Film star MG Ramachandran (MGR) led AIADMK to power in Tamil Nadu', region: 'state', category: 'political', states: ['Tamil Nadu'] },
  { id: 'rajiv-assassination-1991', year: 1991, title: 'Rajiv Gandhi Assassination', description: 'Former PM Rajiv Gandhi assassinated during election rally in Sriperumbudur', region: 'india', category: 'political', states: ['Tamil Nadu'] },
  { id: 'classical-tamil-2004', year: 2004, title: 'Tamil Recognized as Classical Language', description: 'Tamil became the first Indian language to receive Classical Language status', region: 'state', category: 'cultural', states: ['Tamil Nadu'] },
  { id: 'chennai-it-corridor-2005', year: 2005, title: 'Chennai IT Corridor Expansion', description: 'OMR corridor transformed Chennai into a major technology hub', region: 'state', category: 'economic', states: ['Tamil Nadu'] },
  { id: 'tn-jallikattu-2017', year: 2017, title: 'Jallikattu Protests', description: 'Massive protests in Tamil Nadu demanding lifting of ban on traditional bull-taming sport', region: 'state', category: 'cultural', states: ['Tamil Nadu'] },
  { id: 'gaja-cyclone-2018', year: 2018, title: 'Cyclone Gaja', description: 'Severe cyclone caused major destruction across Tamil Nadu coastal districts', region: 'state', category: 'natural-disaster', states: ['Tamil Nadu'] },
  { id: 'chennai-floods-2023', year: 2023, title: 'Chennai Floods', description: 'Cyclone Michaung and heavy rains caused severe flooding in Chennai region', region: 'state', category: 'natural-disaster', states: ['Tamil Nadu'] },
  { id: 'tn-film-policy-2026', year: 2026, title: 'Tamil Nadu Cinema Policy Reforms', description: 'Tamil Nadu approved expanded theatre screenings and reforms supporting the film industry', region: 'state', category: 'cultural', states: ['Tamil Nadu'] },

  // Karnataka
  { id: 'gokak-1982', year: 1982, title: 'Gokak Movement', description: 'Pro-Kannada movement demanding primacy for Kannada language', region: 'state', category: 'cultural', states: ['Karnataka'] },
  { id: 'cauvery-1991', year: 1991, endYear: 2018, title: 'Cauvery Water Dispute', description: 'Decades-long inter-state water dispute between Karnataka and Tamil Nadu', region: 'state', category: 'political', states: ['Karnataka', 'Tamil Nadu'] },
  { id: 'bangalore-it-1990s', year: 1995, endYear: 2005, title: 'Bangalore IT Boom', description: "Bangalore emerged as India's Silicon Valley, transforming Karnataka's economy", region: 'state', category: 'economic', states: ['Karnataka'] },
  { id: 'infosys-rise-1999', year: 1999, title: 'Rise of Bengaluru Tech Industry', description: 'Bengaluru emerged as India’s global software and startup capital', region: 'state', category: 'economic', states: ['Karnataka'] },
  { id: 'isro-mars-2014', year: 2014, title: 'Mars Orbiter Mission Success', description: 'ISRO successfully reached Mars orbit on its first attempt', region: 'state', category: 'social', states: ['Karnataka'] },
  { id: 'karnataka-floods-2019', year: 2019, title: 'Karnataka Floods', description: 'Heavy monsoon flooding affected large parts of Karnataka', region: 'state', category: 'natural-disaster', states: ['Karnataka'] },
  { id: 'bengaluru-water-crisis-2024', year: 2024, title: 'Bengaluru Water Crisis', description: 'Rapid urban growth and drought conditions triggered severe water shortages', region: 'state', category: 'social', states: ['Karnataka'] },
  { id: 'mekedatu-debate-2026', year: 2026, title: 'Mekedatu Dam Debate', description: 'Renewed discussions and legal debates over the Mekedatu reservoir project', region: 'state', category: 'political', states: ['Karnataka', 'Tamil Nadu'] },

  // Andhra Pradesh / Telangana
  { id: 'telangana-movement-1969', year: 1969, title: 'Telangana Movement', description: 'Demand for separate Telangana state from Andhra Pradesh', region: 'state', category: 'political', states: ['Telangana', 'Andhra Pradesh'] },
  { id: 'ap-cyclone-1977', year: 1977, title: 'Andhra Pradesh Cyclone', description: 'Devastating cyclone in Diviseema region killing 10,000+', region: 'state', category: 'natural-disaster', states: ['Andhra Pradesh'] },
  { id: 'hyderabad-genome-valley-2001', year: 2001, title: 'Genome Valley Expansion', description: 'Hyderabad became a major biotechnology and pharmaceutical hub', region: 'state', category: 'economic', states: ['Telangana'] },
  { id: 'telangana-formed-2014', year: 2014, title: 'Telangana State Formed', description: 'Telangana became the 29th state of India, carved from Andhra Pradesh', region: 'state', category: 'political', states: ['Telangana', 'Andhra Pradesh'] },
  { id: 'ap-bifurcation-2014', year: 2014, title: 'AP Capital Shifts to Amaravati', description: 'After bifurcation, Andhra Pradesh chose Amaravati as new capital', region: 'state', category: 'political', states: ['Andhra Pradesh'] },
  { id: 'cyclone-hudhud-2014', year: 2014, title: 'Cyclone Hudhud', description: 'Severe cyclone devastated Visakhapatnam coast', region: 'state', category: 'natural-disaster', states: ['Andhra Pradesh'] },
  { id: 'hyderabad-metro-2017', year: 2017, title: 'Hyderabad Metro Launch', description: 'One of the world’s largest metro rail PPP projects opened in Hyderabad', region: 'state', category: 'economic', states: ['Telangana'] },
];
