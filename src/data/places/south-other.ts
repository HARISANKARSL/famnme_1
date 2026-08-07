/**
 * South India Places (excluding Kerala) — Tamil Nadu, Karnataka, Andhra Pradesh, Telangana
 */
import type { IndianPlace } from './types';

export const SOUTH_OTHER_PLACES: IndianPlace[] = [
  // =========================================================================
  // TAMIL NADU
  // =========================================================================
  { name: 'Tamil Nadu', alternateNames: ['TN'], state: 'Tamil Nadu', type: 'state', lat: 11.1271, lng: 78.6569 },
  { name: 'Chennai', alternateNames: ['Madras'], state: 'Tamil Nadu', district: 'Chennai', type: 'capital', lat: 13.0827, lng: 80.2707 },
  { name: 'Coimbatore', alternateNames: ['Kovai'], state: 'Tamil Nadu', district: 'Coimbatore', type: 'city', lat: 11.0168, lng: 76.9558 },
  { name: 'Madurai', alternateNames: [], state: 'Tamil Nadu', district: 'Madurai', type: 'city', lat: 9.9252, lng: 78.1198 },
  { name: 'Tiruchirappalli', alternateNames: ['Trichy', 'Trichinopoly'], state: 'Tamil Nadu', district: 'Tiruchirappalli', type: 'city', lat: 10.7905, lng: 78.7047 },
  { name: 'Salem', alternateNames: [], state: 'Tamil Nadu', district: 'Salem', type: 'city', lat: 11.6643, lng: 78.1460 },
  { name: 'Tirunelveli', alternateNames: ['Nellai', 'Tinnevelly'], state: 'Tamil Nadu', district: 'Tirunelveli', type: 'city', lat: 8.7139, lng: 77.7567 },
  { name: 'Tiruppur', alternateNames: ['Tirupur'], state: 'Tamil Nadu', district: 'Tiruppur', type: 'city', lat: 11.1085, lng: 77.3411 },
  { name: 'Vellore', alternateNames: [], state: 'Tamil Nadu', district: 'Vellore', type: 'city', lat: 12.9165, lng: 79.1325 },
  { name: 'Erode', alternateNames: [], state: 'Tamil Nadu', district: 'Erode', type: 'city', lat: 11.3410, lng: 77.7172 },
  { name: 'Thanjavur', alternateNames: ['Tanjore'], state: 'Tamil Nadu', district: 'Thanjavur', type: 'city', lat: 10.7870, lng: 79.1378 },
  { name: 'Dindigul', alternateNames: [], state: 'Tamil Nadu', district: 'Dindigul', type: 'city', lat: 10.3673, lng: 77.9803 },
  { name: 'Kanchipuram', alternateNames: ['Kanchi', 'Conjeevaram'], state: 'Tamil Nadu', district: 'Kanchipuram', type: 'city', lat: 12.8342, lng: 79.7036 },
  { name: 'Kumbakonam', alternateNames: [], state: 'Tamil Nadu', district: 'Thanjavur', type: 'town', lat: 10.9617, lng: 79.3881 },
  { name: 'Nagercoil', alternateNames: [], state: 'Tamil Nadu', district: 'Kanyakumari', type: 'city', lat: 8.1833, lng: 77.4119 },
  { name: 'Kanyakumari', alternateNames: ['Cape Comorin'], state: 'Tamil Nadu', district: 'Kanyakumari', type: 'town', lat: 8.0883, lng: 77.5385 },
  { name: 'Thoothukudi', alternateNames: ['Tuticorin'], state: 'Tamil Nadu', district: 'Thoothukudi', type: 'city', lat: 8.7642, lng: 78.1348 },
  { name: 'Udhagamandalam', alternateNames: ['Ooty', 'Ootacamund'], state: 'Tamil Nadu', district: 'Nilgiris', type: 'town', lat: 11.4102, lng: 76.6950 },
  { name: 'Kodaikanal', alternateNames: [], state: 'Tamil Nadu', district: 'Dindigul', type: 'town', lat: 10.2381, lng: 77.4892 },
  { name: 'Nagapattinam', alternateNames: ['Negapatam'], state: 'Tamil Nadu', district: 'Nagapattinam', type: 'town', lat: 10.7660, lng: 79.8424 },
  { name: 'Puducherry', alternateNames: ['Pondicherry', 'Pondy'], state: 'Puducherry', district: 'Puducherry', type: 'capital', lat: 11.9416, lng: 79.8083 },

  // =========================================================================
  // KARNATAKA
  // =========================================================================
  { name: 'Karnataka', alternateNames: ['Mysore State'], state: 'Karnataka', type: 'state', lat: 15.3173, lng: 75.7139 },
  { name: 'Bengaluru', alternateNames: ['Bangalore'], state: 'Karnataka', district: 'Bengaluru Urban', type: 'capital', lat: 12.9716, lng: 77.5946 },
  { name: 'Mysuru', alternateNames: ['Mysore'], state: 'Karnataka', district: 'Mysuru', type: 'city', lat: 12.2958, lng: 76.6394 },
  { name: 'Hubballi', alternateNames: ['Hubli'], state: 'Karnataka', district: 'Dharwad', type: 'city', lat: 15.3647, lng: 75.1240 },
  { name: 'Mangaluru', alternateNames: ['Mangalore'], state: 'Karnataka', district: 'Dakshina Kannada', type: 'city', lat: 12.9141, lng: 74.8560 },
  { name: 'Belagavi', alternateNames: ['Belgaum'], state: 'Karnataka', district: 'Belagavi', type: 'city', lat: 15.8497, lng: 74.4977 },
  { name: 'Kalaburagi', alternateNames: ['Gulbarga'], state: 'Karnataka', district: 'Kalaburagi', type: 'city', lat: 17.3297, lng: 76.8343 },
  { name: 'Davangere', alternateNames: ['Davanagere'], state: 'Karnataka', district: 'Davangere', type: 'city', lat: 14.4644, lng: 75.9218 },
  { name: 'Shivamogga', alternateNames: ['Shimoga'], state: 'Karnataka', district: 'Shivamogga', type: 'city', lat: 13.9299, lng: 75.5681 },
  { name: 'Tumakuru', alternateNames: ['Tumkur'], state: 'Karnataka', district: 'Tumakuru', type: 'city', lat: 13.3379, lng: 77.1173 },
  { name: 'Udupi', alternateNames: [], state: 'Karnataka', district: 'Udupi', type: 'city', lat: 13.3409, lng: 74.7421 },
  { name: 'Hassan', alternateNames: [], state: 'Karnataka', district: 'Hassan', type: 'district_hq', lat: 13.0073, lng: 76.1004 },
  { name: 'Dharwad', alternateNames: [], state: 'Karnataka', district: 'Dharwad', type: 'city', lat: 15.4589, lng: 75.0078 },
  { name: 'Raichur', alternateNames: [], state: 'Karnataka', district: 'Raichur', type: 'district_hq', lat: 16.2120, lng: 77.3439 },
  { name: 'Bidar', alternateNames: [], state: 'Karnataka', district: 'Bidar', type: 'district_hq', lat: 17.9104, lng: 77.5199 },
  { name: 'Chitradurga', alternateNames: [], state: 'Karnataka', district: 'Chitradurga', type: 'district_hq', lat: 14.2226, lng: 76.3987 },
  { name: 'Chikkamagaluru', alternateNames: ['Chikmagalur'], state: 'Karnataka', district: 'Chikkamagaluru', type: 'district_hq', lat: 13.3153, lng: 75.7754 },
  { name: 'Kodagu', alternateNames: ['Coorg', 'Madikeri'], state: 'Karnataka', district: 'Kodagu', type: 'district_hq', lat: 12.4244, lng: 75.7382 },

  // =========================================================================
  // ANDHRA PRADESH
  // =========================================================================
  { name: 'Andhra Pradesh', alternateNames: ['AP'], state: 'Andhra Pradesh', type: 'state', lat: 15.9129, lng: 79.7400 },
  { name: 'Amaravati', alternateNames: [], state: 'Andhra Pradesh', district: 'Guntur', type: 'capital', lat: 16.5131, lng: 80.5150 },
  { name: 'Visakhapatnam', alternateNames: ['Vizag'], state: 'Andhra Pradesh', district: 'Visakhapatnam', type: 'city', lat: 17.6868, lng: 83.2185 },
  { name: 'Vijayawada', alternateNames: ['Bezawada'], state: 'Andhra Pradesh', district: 'Krishna', type: 'city', lat: 16.5062, lng: 80.6480 },
  { name: 'Guntur', alternateNames: [], state: 'Andhra Pradesh', district: 'Guntur', type: 'city', lat: 16.3067, lng: 80.4365 },
  { name: 'Nellore', alternateNames: [], state: 'Andhra Pradesh', district: 'Nellore', type: 'city', lat: 14.4426, lng: 79.9865 },
  { name: 'Tirupati', alternateNames: [], state: 'Andhra Pradesh', district: 'Tirupati', type: 'city', lat: 13.6288, lng: 79.4192 },
  { name: 'Kakinada', alternateNames: ['Cocanada'], state: 'Andhra Pradesh', district: 'Kakinada', type: 'city', lat: 16.9891, lng: 82.2475 },
  { name: 'Rajahmundry', alternateNames: ['Rajamahendravaram'], state: 'Andhra Pradesh', district: 'East Godavari', type: 'city', lat: 17.0005, lng: 81.8040 },
  { name: 'Kurnool', alternateNames: [], state: 'Andhra Pradesh', district: 'Kurnool', type: 'city', lat: 15.8281, lng: 78.0373 },
  { name: 'Anantapur', alternateNames: ['Anantapuramu'], state: 'Andhra Pradesh', district: 'Anantapur', type: 'city', lat: 14.6819, lng: 77.6006 },
  { name: 'Kadapa', alternateNames: ['Cuddapah'], state: 'Andhra Pradesh', district: 'Kadapa', type: 'city', lat: 14.4674, lng: 78.8241 },
  { name: 'Ongole', alternateNames: [], state: 'Andhra Pradesh', district: 'Prakasam', type: 'city', lat: 15.5057, lng: 80.0499 },
  { name: 'Eluru', alternateNames: ['Ellore'], state: 'Andhra Pradesh', district: 'Eluru', type: 'city', lat: 16.7107, lng: 81.0952 },
  { name: 'Machilipatnam', alternateNames: ['Masulipatnam', 'Bandar'], state: 'Andhra Pradesh', district: 'Krishna', type: 'town', lat: 16.1875, lng: 81.1389 },

  // =========================================================================
  // TELANGANA
  // =========================================================================
  { name: 'Telangana', alternateNames: ['TS'], state: 'Telangana', type: 'state', lat: 18.1124, lng: 79.0193 },
  { name: 'Hyderabad', alternateNames: ['Bhagyanagar'], state: 'Telangana', district: 'Hyderabad', type: 'capital', lat: 17.3850, lng: 78.4867 },
  { name: 'Secunderabad', alternateNames: [], state: 'Telangana', district: 'Hyderabad', type: 'city', lat: 17.4399, lng: 78.4983 },
  { name: 'Warangal', alternateNames: [], state: 'Telangana', district: 'Warangal', type: 'city', lat: 17.9784, lng: 79.5941 },
  { name: 'Nizamabad', alternateNames: [], state: 'Telangana', district: 'Nizamabad', type: 'city', lat: 18.6725, lng: 78.0940 },
  { name: 'Karimnagar', alternateNames: [], state: 'Telangana', district: 'Karimnagar', type: 'city', lat: 18.4386, lng: 79.1288 },
  { name: 'Khammam', alternateNames: [], state: 'Telangana', district: 'Khammam', type: 'city', lat: 17.2473, lng: 80.1514 },
  { name: 'Mahbubnagar', alternateNames: ['Mahabubnagar', 'Palamoor'], state: 'Telangana', district: 'Mahbubnagar', type: 'city', lat: 16.7488, lng: 77.9850 },
  { name: 'Nalgonda', alternateNames: [], state: 'Telangana', district: 'Nalgonda', type: 'district_hq', lat: 17.0575, lng: 79.2690 },
  { name: 'Adilabad', alternateNames: [], state: 'Telangana', district: 'Adilabad', type: 'district_hq', lat: 19.6640, lng: 78.5320 },
  { name: 'Siddipet', alternateNames: [], state: 'Telangana', district: 'Siddipet', type: 'district_hq', lat: 18.1019, lng: 78.8520 },
];
