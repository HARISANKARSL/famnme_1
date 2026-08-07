import type { HistoricalEvent } from './types';

export const PRE_INDEPENDENCE_EVENTS: HistoricalEvent[] = [
  { id: 'revolt-1857', year: 1857, title: 'Indian Rebellion of 1857', description: 'First War of Independence against British East India Company rule', region: 'india', category: 'political' },
  { id: 'inc-1885', year: 1885, title: 'Indian National Congress Founded', description: 'Formation of INC in Bombay, beginning of organized independence movement', region: 'india', category: 'political', states: ['Maharashtra'] },
  { id: 'bengal-partition-1905', year: 1905, title: 'Partition of Bengal', description: 'British partition of Bengal province sparking Swadeshi Movement', region: 'india', category: 'political', states: ['West Bengal', 'Bangladesh'] },
  { id: 'muslim-league-1906', year: 1906, title: 'All-India Muslim League Founded', description: 'Formation of Muslim League in Dhaka', region: 'india', category: 'political' },
  { id: 'jallianwala-1919', year: 1919, title: 'Jallianwala Bagh Massacre', description: 'British troops fired on a peaceful gathering in Amritsar, killing hundreds', region: 'india', category: 'political', states: ['Punjab'] },
  { id: 'khilafat-1920', year: 1920, title: 'Non-Cooperation & Khilafat Movement', description: 'Gandhi launched Non-Cooperation Movement alongside Khilafat agitation', region: 'india', category: 'political' },
  { id: 'moplah-1921', year: 1921, title: 'Moplah Rebellion', description: 'Mappila uprising in Malabar region of Kerala against British and landlords', region: 'state', category: 'political', states: ['Kerala'] },
  { id: 'chauri-chaura-1922', year: 1922, title: 'Chauri Chaura Incident', description: 'Violent clash in UP that led Gandhi to call off Non-Cooperation Movement', region: 'india', category: 'political', states: ['Uttar Pradesh'] },
  { id: 'simon-1927', year: 1927, title: 'Simon Commission', description: 'All-British commission to review Indian constitution met with protests ("Simon Go Back")', region: 'india', category: 'political' },
  { id: 'bardoli-1928', year: 1928, title: 'Bardoli Satyagraha', description: 'Successful no-tax campaign led by Sardar Patel in Gujarat', region: 'state', category: 'political', states: ['Gujarat'] },
  { id: 'salt-march-1930', year: 1930, title: 'Salt March (Dandi March)', description: "Gandhi's 241-mile march to Dandi to defy British salt tax", region: 'india', category: 'political', states: ['Gujarat'] },
  { id: 'rto-1932', year: 1932, title: 'Poona Pact', description: 'Agreement between Gandhi and Ambedkar on Dalit representation', region: 'india', category: 'social', states: ['Maharashtra'] },
  { id: 'goi-act-1935', year: 1935, title: 'Government of India Act', description: 'Major constitutional reform establishing provincial autonomy', region: 'india', category: 'political' },
  { id: 'quit-india-1942', year: 1942, title: 'Quit India Movement', description: "Gandhi's call for immediate British withdrawal; mass arrests followed", region: 'india', category: 'political' },
  { id: 'bengal-famine-1943', year: 1943, title: 'Bengal Famine', description: 'Devastating famine killing an estimated 2-3 million in Bengal', region: 'india', category: 'natural-disaster', states: ['West Bengal'] },
  { id: 'ina-1943', year: 1943, endYear: 1945, title: 'Indian National Army (INA)', description: 'Subhas Chandra Bose led INA alongside Japanese forces against British', region: 'india', category: 'political' },
  { id: 'naval-mutiny-1946', year: 1946, title: 'Royal Indian Navy Mutiny', description: 'Naval ratings revolted against British in Bombay, spreading to other ports', region: 'india', category: 'political', states: ['Maharashtra'] },
  { id: 'direct-action-1946', year: 1946, title: 'Direct Action Day', description: 'Communal violence in Calcutta leaving thousands dead', region: 'india', category: 'social', states: ['West Bengal'] },
  { id: 'independence-1947', year: 1947, title: 'Indian Independence & Partition', description: 'India and Pakistan gained independence; massive communal displacement', region: 'india', category: 'political' },
  { id: 'travancore-1949', year: 1949, title: 'Travancore Joins Indian Union', description: 'Princely state of Travancore acceded to India after initial resistance', region: 'state', category: 'political', states: ['Kerala'] },
];
