/**
 * West India Places — Maharashtra, Gujarat, Goa
 */
import type { IndianPlace } from './types';

export const WEST_PLACES: IndianPlace[] = [
  // =========================================================================
  // MAHARASHTRA
  // =========================================================================
  { name: 'Maharashtra', alternateNames: ['MH'], state: 'Maharashtra', type: 'state', lat: 19.7515, lng: 75.7139 },
  { name: 'Mumbai', alternateNames: ['Bombay'], state: 'Maharashtra', district: 'Mumbai', type: 'capital', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', alternateNames: ['Poona'], state: 'Maharashtra', district: 'Pune', type: 'city', lat: 18.5204, lng: 73.8567 },
  { name: 'Nagpur', alternateNames: [], state: 'Maharashtra', district: 'Nagpur', type: 'city', lat: 21.1458, lng: 79.0882 },
  { name: 'Thane', alternateNames: [], state: 'Maharashtra', district: 'Thane', type: 'city', lat: 19.2183, lng: 72.9781 },
  { name: 'Nashik', alternateNames: ['Nasik'], state: 'Maharashtra', district: 'Nashik', type: 'city', lat: 19.9975, lng: 73.7898 },
  { name: 'Navi Mumbai', alternateNames: ['New Bombay'], state: 'Maharashtra', district: 'Thane', type: 'city', lat: 19.0330, lng: 73.0297 },
  { name: 'Chhatrapati Sambhajinagar', alternateNames: ['Aurangabad'], state: 'Maharashtra', district: 'Chhatrapati Sambhajinagar', type: 'city', lat: 19.8762, lng: 75.3433 },
  { name: 'Solapur', alternateNames: ['Sholapur'], state: 'Maharashtra', district: 'Solapur', type: 'city', lat: 17.6599, lng: 75.9064 },
  { name: 'Kolhapur', alternateNames: [], state: 'Maharashtra', district: 'Kolhapur', type: 'city', lat: 16.7050, lng: 74.2433 },
  { name: 'Sangli', alternateNames: [], state: 'Maharashtra', district: 'Sangli', type: 'city', lat: 16.8524, lng: 74.5815 },
  { name: 'Satara', alternateNames: [], state: 'Maharashtra', district: 'Satara', type: 'city', lat: 17.6805, lng: 74.0183 },
  { name: 'Ratnagiri', alternateNames: [], state: 'Maharashtra', district: 'Ratnagiri', type: 'city', lat: 16.9944, lng: 73.3001 },
  { name: 'Ahmednagar', alternateNames: [], state: 'Maharashtra', district: 'Ahmednagar', type: 'city', lat: 19.0948, lng: 74.7480 },
  { name: 'Amravati', alternateNames: [], state: 'Maharashtra', district: 'Amravati', type: 'city', lat: 20.9374, lng: 77.7796 },
  { name: 'Latur', alternateNames: [], state: 'Maharashtra', district: 'Latur', type: 'city', lat: 18.4088, lng: 76.5604 },
  { name: 'Mahabaleshwar', alternateNames: [], state: 'Maharashtra', district: 'Satara', type: 'town', lat: 17.9307, lng: 73.6477 },
  { name: 'Lonavala', alternateNames: [], state: 'Maharashtra', district: 'Pune', type: 'town', lat: 18.7546, lng: 73.4062 },
  { name: 'Shirdi', alternateNames: [], state: 'Maharashtra', district: 'Ahmednagar', type: 'town', lat: 19.7668, lng: 74.4783 },
  { name: 'Sindhudurg', alternateNames: [], state: 'Maharashtra', district: 'Sindhudurg', type: 'district_hq', lat: 16.3489, lng: 73.7553 },

  // =========================================================================
  // GUJARAT
  // =========================================================================
  { name: 'Gujarat', alternateNames: ['GJ'], state: 'Gujarat', type: 'state', lat: 22.2587, lng: 71.1924 },
  { name: 'Gandhinagar', alternateNames: [], state: 'Gujarat', district: 'Gandhinagar', type: 'capital', lat: 23.2156, lng: 72.6369 },
  { name: 'Ahmedabad', alternateNames: ['Amdavad'], state: 'Gujarat', district: 'Ahmedabad', type: 'city', lat: 23.0225, lng: 72.5714 },
  { name: 'Surat', alternateNames: [], state: 'Gujarat', district: 'Surat', type: 'city', lat: 21.1702, lng: 72.8311 },
  { name: 'Vadodara', alternateNames: ['Baroda'], state: 'Gujarat', district: 'Vadodara', type: 'city', lat: 22.3072, lng: 73.1812 },
  { name: 'Rajkot', alternateNames: [], state: 'Gujarat', district: 'Rajkot', type: 'city', lat: 22.3039, lng: 70.8022 },
  { name: 'Bhavnagar', alternateNames: [], state: 'Gujarat', district: 'Bhavnagar', type: 'city', lat: 21.7645, lng: 72.1519 },
  { name: 'Jamnagar', alternateNames: [], state: 'Gujarat', district: 'Jamnagar', type: 'city', lat: 22.4707, lng: 70.0577 },
  { name: 'Junagadh', alternateNames: [], state: 'Gujarat', district: 'Junagadh', type: 'city', lat: 21.5222, lng: 70.4579 },
  { name: 'Anand', alternateNames: [], state: 'Gujarat', district: 'Anand', type: 'city', lat: 22.5645, lng: 72.9289 },
  { name: 'Dwarka', alternateNames: [], state: 'Gujarat', district: 'Devbhumi Dwarka', type: 'town', lat: 22.2394, lng: 68.9678 },
  { name: 'Kutch', alternateNames: ['Kachchh', 'Bhuj'], state: 'Gujarat', district: 'Kutch', type: 'district_hq', lat: 23.2420, lng: 69.6669 },
  { name: 'Porbandar', alternateNames: [], state: 'Gujarat', district: 'Porbandar', type: 'city', lat: 21.6417, lng: 69.6293 },
  { name: 'Somnath', alternateNames: ['Prabhas Patan'], state: 'Gujarat', district: 'Gir Somnath', type: 'town', lat: 20.8880, lng: 70.4013 },

  // =========================================================================
  // GOA
  // =========================================================================
  { name: 'Goa', alternateNames: [], state: 'Goa', type: 'state', lat: 15.2993, lng: 74.1240 },
  { name: 'Panaji', alternateNames: ['Panjim', 'Nova Goa'], state: 'Goa', district: 'North Goa', type: 'capital', lat: 15.4909, lng: 73.8278 },
  { name: 'Margao', alternateNames: ['Madgaon'], state: 'Goa', district: 'South Goa', type: 'city', lat: 15.2832, lng: 73.9862 },
  { name: 'Vasco da Gama', alternateNames: ['Vasco'], state: 'Goa', district: 'South Goa', type: 'city', lat: 15.3982, lng: 73.8113 },
  { name: 'Mapusa', alternateNames: [], state: 'Goa', district: 'North Goa', type: 'town', lat: 15.5913, lng: 73.8097 },
];
