/**
 * Northeast India (8 states) + Union Territories
 */
import type { IndianPlace } from './types';

export const NORTHEAST_UT_PLACES: IndianPlace[] = [
  // =========================================================================
  // ASSAM
  // =========================================================================
  { name: 'Assam', alternateNames: [], state: 'Assam', type: 'state', lat: 26.2006, lng: 92.9376 },
  { name: 'Dispur', alternateNames: [], state: 'Assam', district: 'Kamrup Metropolitan', type: 'capital', lat: 26.1408, lng: 91.7898 },
  { name: 'Guwahati', alternateNames: ['Gauhati'], state: 'Assam', district: 'Kamrup Metropolitan', type: 'city', lat: 26.1445, lng: 91.7362 },
  { name: 'Silchar', alternateNames: [], state: 'Assam', district: 'Cachar', type: 'city', lat: 24.8333, lng: 92.7789 },
  { name: 'Dibrugarh', alternateNames: [], state: 'Assam', district: 'Dibrugarh', type: 'city', lat: 27.4728, lng: 94.9120 },
  { name: 'Jorhat', alternateNames: [], state: 'Assam', district: 'Jorhat', type: 'city', lat: 26.7509, lng: 94.2037 },
  { name: 'Tezpur', alternateNames: [], state: 'Assam', district: 'Sonitpur', type: 'city', lat: 26.6338, lng: 92.8006 },

  // =========================================================================
  // MEGHALAYA
  // =========================================================================
  { name: 'Meghalaya', alternateNames: [], state: 'Meghalaya', type: 'state', lat: 25.4670, lng: 91.3662 },
  { name: 'Shillong', alternateNames: [], state: 'Meghalaya', district: 'East Khasi Hills', type: 'capital', lat: 25.5788, lng: 91.8933 },
  { name: 'Tura', alternateNames: [], state: 'Meghalaya', district: 'West Garo Hills', type: 'town', lat: 25.5149, lng: 90.2195 },
  { name: 'Cherrapunji', alternateNames: ['Sohra', 'Cherrapunjee'], state: 'Meghalaya', district: 'East Khasi Hills', type: 'town', lat: 25.2800, lng: 91.7300 },

  // =========================================================================
  // MANIPUR
  // =========================================================================
  { name: 'Manipur', alternateNames: [], state: 'Manipur', type: 'state', lat: 24.6637, lng: 93.9063 },
  { name: 'Imphal', alternateNames: [], state: 'Manipur', district: 'Imphal West', type: 'capital', lat: 24.8170, lng: 93.9368 },

  // =========================================================================
  // MIZORAM
  // =========================================================================
  { name: 'Mizoram', alternateNames: [], state: 'Mizoram', type: 'state', lat: 23.1645, lng: 92.9376 },
  { name: 'Aizawl', alternateNames: [], state: 'Mizoram', district: 'Aizawl', type: 'capital', lat: 23.7271, lng: 92.7176 },

  // =========================================================================
  // NAGALAND
  // =========================================================================
  { name: 'Nagaland', alternateNames: [], state: 'Nagaland', type: 'state', lat: 26.1584, lng: 94.5624 },
  { name: 'Kohima', alternateNames: [], state: 'Nagaland', district: 'Kohima', type: 'capital', lat: 25.6751, lng: 94.1086 },
  { name: 'Dimapur', alternateNames: [], state: 'Nagaland', district: 'Dimapur', type: 'city', lat: 25.9042, lng: 93.7269 },

  // =========================================================================
  // TRIPURA
  // =========================================================================
  { name: 'Tripura', alternateNames: [], state: 'Tripura', type: 'state', lat: 23.9408, lng: 91.9882 },
  { name: 'Agartala', alternateNames: [], state: 'Tripura', district: 'West Tripura', type: 'capital', lat: 23.8315, lng: 91.2868 },

  // =========================================================================
  // ARUNACHAL PRADESH
  // =========================================================================
  { name: 'Arunachal Pradesh', alternateNames: ['AR'], state: 'Arunachal Pradesh', type: 'state', lat: 28.2180, lng: 94.7278 },
  { name: 'Itanagar', alternateNames: [], state: 'Arunachal Pradesh', district: 'Papum Pare', type: 'capital', lat: 27.0844, lng: 93.6053 },

  // =========================================================================
  // SIKKIM
  // =========================================================================
  { name: 'Sikkim', alternateNames: [], state: 'Sikkim', type: 'state', lat: 27.5330, lng: 88.5122 },
  { name: 'Gangtok', alternateNames: [], state: 'Sikkim', district: 'East Sikkim', type: 'capital', lat: 27.3389, lng: 88.6065 },

  // =========================================================================
  // UNION TERRITORIES
  // =========================================================================
  { name: 'Andaman and Nicobar Islands', alternateNames: ['A&N Islands'], state: 'Andaman and Nicobar Islands', type: 'union_territory', lat: 11.7401, lng: 92.6586 },
  { name: 'Port Blair', alternateNames: ['Sri Vijaya Puram'], state: 'Andaman and Nicobar Islands', district: 'South Andaman', type: 'capital', lat: 11.6234, lng: 92.7265 },

  { name: 'Lakshadweep', alternateNames: ['Laccadive Islands'], state: 'Lakshadweep', type: 'union_territory', lat: 10.5667, lng: 72.6417 },
  { name: 'Kavaratti', alternateNames: [], state: 'Lakshadweep', district: 'Lakshadweep', type: 'capital', lat: 10.5626, lng: 72.6369 },

  { name: 'Dadra and Nagar Haveli and Daman and Diu', alternateNames: ['DNHDD'], state: 'Dadra and Nagar Haveli and Daman and Diu', type: 'union_territory', lat: 20.1809, lng: 73.0169 },
  { name: 'Daman', alternateNames: [], state: 'Dadra and Nagar Haveli and Daman and Diu', district: 'Daman', type: 'capital', lat: 20.3974, lng: 72.8328 },
  { name: 'Silvassa', alternateNames: [], state: 'Dadra and Nagar Haveli and Daman and Diu', district: 'Dadra and Nagar Haveli', type: 'town', lat: 20.2766, lng: 73.0169 },
];
