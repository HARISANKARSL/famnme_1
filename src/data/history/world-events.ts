import type { HistoricalEvent } from './types';

export const WORLD_EVENTS: HistoricalEvent[] = [
  { id: 'ww1', year: 1914, endYear: 1918, title: 'World War I', description: 'Global conflict; 1.3 million Indian soldiers served in British Indian Army', region: 'world', category: 'political' },
  { id: 'spanish-flu-1918', year: 1918, endYear: 1920, title: 'Spanish Flu Pandemic', description: 'Global pandemic killing 12-17 million in India alone', region: 'world', category: 'social' },
  { id: 'ww2', year: 1939, endYear: 1945, title: 'World War II', description: 'Global conflict; Indian Army was the largest volunteer force (2.5 million)', region: 'world', category: 'political' },
  { id: 'un-1945', year: 1945, title: 'United Nations Founded', description: 'India was among founding members of the United Nations', region: 'world', category: 'political' },
  { id: 'israel-1948', year: 1948, title: 'State of Israel Created', description: 'Creation of Israel and displacement of Palestinians', region: 'world', category: 'political' },
  { id: 'moon-1969', year: 1969, title: 'Moon Landing', description: 'Apollo 11; Neil Armstrong first human on the Moon', region: 'world', category: 'cultural' },
  { id: 'oil-crisis-1973', year: 1973, title: 'Oil Crisis', description: 'OPEC embargo quadrupled oil prices; triggered Gulf migration from Kerala and other states', region: 'world', category: 'economic' },
  { id: 'chernobyl-1986', year: 1986, title: 'Chernobyl Disaster', description: 'Nuclear disaster in USSR with global impact', region: 'world', category: 'natural-disaster' },
  { id: 'gulf-war-1990', year: 1990, endYear: 1991, title: 'Gulf War', description: 'Iraq invaded Kuwait; 170,000+ Indian workers evacuated (Air India airlift)', region: 'world', category: 'political' },
  { id: 'ussr-collapse-1991', year: 1991, title: 'Soviet Union Dissolves', description: 'End of Cold War; India lost key trading partner and ally', region: 'world', category: 'political' },
  { id: '9-11-2001', year: 2001, title: '9/11 Attacks', description: 'Terrorist attacks in USA; changed global security landscape, affected Indian diaspora', region: 'world', category: 'political' },
  { id: 'financial-crisis-2008', year: 2008, title: 'Global Financial Crisis', description: 'Worldwide economic recession; impacted Indian IT and export sectors', region: 'world', category: 'economic' },
  { id: 'arab-spring-2011', year: 2011, title: 'Arab Spring', description: 'Revolutionary wave across Middle East; affected Indian workers in Gulf', region: 'world', category: 'political' },
  { id: 'covid-global-2020', year: 2020, endYear: 2022, title: 'COVID-19 Global Pandemic', description: 'Worldwide pandemic; India experienced devastating second wave in 2021', region: 'world', category: 'social' },
  { id: 'ukraine-war-2022', year: 2022, title: 'Russia-Ukraine War', description: 'European conflict; evacuation of Indian students (Operation Ganga)', region: 'world', category: 'political' },
];
