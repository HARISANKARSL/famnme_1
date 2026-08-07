/**
 * East India Places — West Bengal, Bihar, Jharkhand, Odisha
 */
import type { IndianPlace } from './types';

export const EAST_PLACES: IndianPlace[] = [
  // =========================================================================
  // WEST BENGAL
  // =========================================================================
  { name: 'West Bengal', alternateNames: ['WB', 'Paschim Banga'], state: 'West Bengal', type: 'state', lat: 22.9868, lng: 87.8550 },
  { name: 'Kolkata', alternateNames: ['Calcutta'], state: 'West Bengal', district: 'Kolkata', type: 'capital', lat: 22.5726, lng: 88.3639 },
  { name: 'Howrah', alternateNames: [], state: 'West Bengal', district: 'Howrah', type: 'city', lat: 22.5958, lng: 88.2636 },
  { name: 'Durgapur', alternateNames: [], state: 'West Bengal', district: 'Paschim Bardhaman', type: 'city', lat: 23.5204, lng: 87.3119 },
  { name: 'Asansol', alternateNames: [], state: 'West Bengal', district: 'Paschim Bardhaman', type: 'city', lat: 23.6888, lng: 86.9661 },
  { name: 'Siliguri', alternateNames: [], state: 'West Bengal', district: 'Darjeeling', type: 'city', lat: 26.7271, lng: 88.3953 },
  { name: 'Darjeeling', alternateNames: [], state: 'West Bengal', district: 'Darjeeling', type: 'town', lat: 27.0360, lng: 88.2627 },
  { name: 'Kharagpur', alternateNames: [], state: 'West Bengal', district: 'Paschim Medinipur', type: 'city', lat: 22.3460, lng: 87.2320 },
  { name: 'Haldia', alternateNames: [], state: 'West Bengal', district: 'Purba Medinipur', type: 'city', lat: 22.0257, lng: 88.0583 },
  { name: 'Bardhaman', alternateNames: ['Burdwan'], state: 'West Bengal', district: 'Purba Bardhaman', type: 'city', lat: 23.2324, lng: 87.8615 },
  { name: 'Shantiniketan', alternateNames: ['Bolpur'], state: 'West Bengal', district: 'Birbhum', type: 'town', lat: 23.6814, lng: 87.6855 },
  { name: 'Murshidabad', alternateNames: [], state: 'West Bengal', district: 'Murshidabad', type: 'district_hq', lat: 24.1751, lng: 88.2723 },

  // =========================================================================
  // BIHAR
  // =========================================================================
  { name: 'Bihar', alternateNames: [], state: 'Bihar', type: 'state', lat: 25.0961, lng: 85.3131 },
  { name: 'Patna', alternateNames: ['Pataliputra'], state: 'Bihar', district: 'Patna', type: 'capital', lat: 25.6093, lng: 85.1376 },
  { name: 'Gaya', alternateNames: ['Bodh Gaya'], state: 'Bihar', district: 'Gaya', type: 'city', lat: 24.7914, lng: 84.9994 },
  { name: 'Muzaffarpur', alternateNames: [], state: 'Bihar', district: 'Muzaffarpur', type: 'city', lat: 26.1209, lng: 85.3647 },
  { name: 'Bhagalpur', alternateNames: [], state: 'Bihar', district: 'Bhagalpur', type: 'city', lat: 25.2425, lng: 86.9842 },
  { name: 'Darbhanga', alternateNames: [], state: 'Bihar', district: 'Darbhanga', type: 'city', lat: 26.1542, lng: 85.8918 },
  { name: 'Purnia', alternateNames: ['Purnea'], state: 'Bihar', district: 'Purnia', type: 'city', lat: 25.7771, lng: 87.4753 },
  { name: 'Nalanda', alternateNames: [], state: 'Bihar', district: 'Nalanda', type: 'district_hq', lat: 25.1360, lng: 85.4430 },

  // =========================================================================
  // JHARKHAND
  // =========================================================================
  { name: 'Jharkhand', alternateNames: [], state: 'Jharkhand', type: 'state', lat: 23.6102, lng: 85.2799 },
  { name: 'Ranchi', alternateNames: [], state: 'Jharkhand', district: 'Ranchi', type: 'capital', lat: 23.3441, lng: 85.3096 },
  { name: 'Jamshedpur', alternateNames: ['Tatanagar'], state: 'Jharkhand', district: 'East Singhbhum', type: 'city', lat: 22.8046, lng: 86.2029 },
  { name: 'Dhanbad', alternateNames: [], state: 'Jharkhand', district: 'Dhanbad', type: 'city', lat: 23.7957, lng: 86.4304 },
  { name: 'Bokaro', alternateNames: ['Bokaro Steel City'], state: 'Jharkhand', district: 'Bokaro', type: 'city', lat: 23.6693, lng: 86.1511 },
  { name: 'Hazaribagh', alternateNames: [], state: 'Jharkhand', district: 'Hazaribagh', type: 'city', lat: 23.9925, lng: 85.3637 },
  { name: 'Deoghar', alternateNames: [], state: 'Jharkhand', district: 'Deoghar', type: 'city', lat: 24.4850, lng: 86.6947 },

  // =========================================================================
  // ODISHA
  // =========================================================================
  { name: 'Odisha', alternateNames: ['Orissa'], state: 'Odisha', type: 'state', lat: 20.9517, lng: 85.0985 },
  { name: 'Bhubaneswar', alternateNames: [], state: 'Odisha', district: 'Khordha', type: 'capital', lat: 20.2961, lng: 85.8245 },
  { name: 'Cuttack', alternateNames: [], state: 'Odisha', district: 'Cuttack', type: 'city', lat: 20.4625, lng: 85.8830 },
  { name: 'Rourkela', alternateNames: [], state: 'Odisha', district: 'Sundargarh', type: 'city', lat: 22.2604, lng: 84.8536 },
  { name: 'Puri', alternateNames: [], state: 'Odisha', district: 'Puri', type: 'city', lat: 19.8135, lng: 85.8312 },
  { name: 'Sambalpur', alternateNames: [], state: 'Odisha', district: 'Sambalpur', type: 'city', lat: 21.4669, lng: 83.9812 },
  { name: 'Berhampur', alternateNames: ['Brahmapur'], state: 'Odisha', district: 'Ganjam', type: 'city', lat: 19.3150, lng: 84.7941 },
  { name: 'Konark', alternateNames: [], state: 'Odisha', district: 'Puri', type: 'town', lat: 19.8876, lng: 86.0946 },
];
