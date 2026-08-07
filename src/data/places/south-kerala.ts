/**
 * Kerala Places — deep coverage for all 14 districts + major towns
 */
import type { IndianPlace } from './types';

export const KERALA_PLACES: IndianPlace[] = [
  // State
  { name: 'Kerala', alternateNames: ['Keralam'], state: 'Kerala', type: 'state', lat: 10.8505, lng: 76.2711 },

  // === District HQs & Major Cities ===
  { name: 'Thiruvananthapuram', alternateNames: ['Trivandrum'], state: 'Kerala', district: 'Thiruvananthapuram', type: 'capital', lat: 8.5241, lng: 76.9366 },
  { name: 'Kochi', alternateNames: ['Cochin', 'Ernakulam'], state: 'Kerala', district: 'Ernakulam', type: 'city', lat: 9.9312, lng: 76.2673 },
  { name: 'Kozhikode', alternateNames: ['Calicut'], state: 'Kerala', district: 'Kozhikode', type: 'city', lat: 11.2588, lng: 75.7804 },
  { name: 'Thrissur', alternateNames: ['Trichur'], state: 'Kerala', district: 'Thrissur', type: 'district_hq', lat: 10.5276, lng: 76.2144 },
  { name: 'Kollam', alternateNames: ['Quilon'], state: 'Kerala', district: 'Kollam', type: 'district_hq', lat: 8.8932, lng: 76.6141 },
  { name: 'Alappuzha', alternateNames: ['Alleppey'], state: 'Kerala', district: 'Alappuzha', type: 'district_hq', lat: 9.4981, lng: 76.3388 },
  { name: 'Palakkad', alternateNames: ['Palghat'], state: 'Kerala', district: 'Palakkad', type: 'district_hq', lat: 10.7867, lng: 76.6548 },
  { name: 'Kannur', alternateNames: ['Cannanore'], state: 'Kerala', district: 'Kannur', type: 'district_hq', lat: 11.8745, lng: 75.3704 },
  { name: 'Malappuram', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'district_hq', lat: 11.0510, lng: 76.0711 },
  { name: 'Kottayam', alternateNames: [], state: 'Kerala', district: 'Kottayam', type: 'district_hq', lat: 9.5916, lng: 76.5222 },
  { name: 'Kasaragod', alternateNames: ['Kasargod'], state: 'Kerala', district: 'Kasaragod', type: 'district_hq', lat: 12.4996, lng: 74.9869 },
  { name: 'Pathanamthitta', alternateNames: [], state: 'Kerala', district: 'Pathanamthitta', type: 'district_hq', lat: 9.2648, lng: 76.7870 },
  { name: 'Idukki', alternateNames: [], state: 'Kerala', district: 'Idukki', type: 'district_hq', lat: 9.8494, lng: 76.9720 },
  { name: 'Wayanad', alternateNames: ['Wynad'], state: 'Kerala', district: 'Wayanad', type: 'district_hq', lat: 11.6854, lng: 76.1320 },

  // === Thiruvananthapuram District Towns ===
  { name: 'Neyyattinkara', alternateNames: [], state: 'Kerala', district: 'Thiruvananthapuram', type: 'town', lat: 8.3988, lng: 77.0849 },
  { name: 'Attingal', alternateNames: [], state: 'Kerala', district: 'Thiruvananthapuram', type: 'town', lat: 8.6968, lng: 76.8158 },
  { name: 'Varkala', alternateNames: [], state: 'Kerala', district: 'Thiruvananthapuram', type: 'town', lat: 8.7379, lng: 76.7163 },
  { name: 'Nedumangad', alternateNames: [], state: 'Kerala', district: 'Thiruvananthapuram', type: 'town', lat: 8.6028, lng: 77.0000 },
  { name: 'Kazhakkoottam', alternateNames: ['Kazhakuttam', 'Technopark'], state: 'Kerala', district: 'Thiruvananthapuram', type: 'town', lat: 8.5568, lng: 76.8769 },

  // === Ernakulam District Towns ===
  { name: 'Aluva', alternateNames: ['Alwaye'], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 10.1004, lng: 76.3570 },
  { name: 'Perumbavoor', alternateNames: [], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 10.1074, lng: 76.4738 },
  { name: 'Angamaly', alternateNames: [], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 10.1960, lng: 76.3860 },
  { name: 'Muvattupuzha', alternateNames: [], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 9.9894, lng: 76.5790 },
  { name: 'Kothamangalam', alternateNames: [], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 10.0550, lng: 76.6270 },
  { name: 'North Paravur', alternateNames: ['Paravur'], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 10.1449, lng: 76.2274 },
  { name: 'Piravom', alternateNames: [], state: 'Kerala', district: 'Ernakulam', type: 'town', lat: 9.8720, lng: 76.4930 },

  // === Kollam District Towns ===
  { name: 'Punalur', alternateNames: [], state: 'Kerala', district: 'Kollam', type: 'town', lat: 9.0186, lng: 76.9260 },
  { name: 'Karunagappally', alternateNames: ['Karunagapally'], state: 'Kerala', district: 'Kollam', type: 'town', lat: 9.0563, lng: 76.5359 },
  { name: 'Kottarakkara', alternateNames: [], state: 'Kerala', district: 'Kollam', type: 'town', lat: 9.0138, lng: 76.7755 },
  { name: 'Kayamkulam', alternateNames: [], state: 'Kerala', district: 'Alappuzha', type: 'town', lat: 9.1747, lng: 76.5010 },

  // === Alappuzha District Towns ===
  { name: 'Cherthala', alternateNames: [], state: 'Kerala', district: 'Alappuzha', type: 'town', lat: 9.6837, lng: 76.3365 },
  { name: 'Mavelikkara', alternateNames: [], state: 'Kerala', district: 'Alappuzha', type: 'town', lat: 9.2589, lng: 76.5518 },
  { name: 'Haripad', alternateNames: [], state: 'Kerala', district: 'Alappuzha', type: 'town', lat: 9.2818, lng: 76.4588 },

  // === Kottayam District Towns ===
  { name: 'Changanassery', alternateNames: ['Changanacherry'], state: 'Kerala', district: 'Kottayam', type: 'town', lat: 9.4440, lng: 76.5360 },
  { name: 'Pala', alternateNames: [], state: 'Kerala', district: 'Kottayam', type: 'town', lat: 9.7142, lng: 76.6836 },
  { name: 'Ettumanoor', alternateNames: [], state: 'Kerala', district: 'Kottayam', type: 'town', lat: 9.6700, lng: 76.5600 },
  { name: 'Vaikom', alternateNames: [], state: 'Kerala', district: 'Kottayam', type: 'town', lat: 9.7500, lng: 76.3960 },

  // === Thrissur District Towns ===
  { name: 'Guruvayur', alternateNames: ['Guruvayoor'], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.5946, lng: 76.0409 },
  { name: 'Chalakudy', alternateNames: [], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.3100, lng: 76.3316 },
  { name: 'Irinjalakuda', alternateNames: [], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.3417, lng: 76.2143 },
  { name: 'Kodungallur', alternateNames: ['Cranganore', 'Kodungalloor'], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.2260, lng: 76.1948 },
  { name: 'Wadakkanchery', alternateNames: [], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.6560, lng: 76.2410 },
  { name: 'Kunnamkulam', alternateNames: [], state: 'Kerala', district: 'Thrissur', type: 'town', lat: 10.6509, lng: 76.0695 },

  // === Palakkad District Towns ===
  { name: 'Ottapalam', alternateNames: [], state: 'Kerala', district: 'Palakkad', type: 'town', lat: 10.7710, lng: 76.3770 },
  { name: 'Shoranur', alternateNames: ['Shoranur Junction'], state: 'Kerala', district: 'Palakkad', type: 'town', lat: 10.7620, lng: 76.2700 },
  { name: 'Chittur', alternateNames: ['Chittur-Thathamangalam'], state: 'Kerala', district: 'Palakkad', type: 'town', lat: 10.6990, lng: 76.7410 },
  { name: 'Mannarkkad', alternateNames: ['Mannarkad'], state: 'Kerala', district: 'Palakkad', type: 'town', lat: 10.9915, lng: 76.4576 },

  // === Malappuram District Towns ===
  { name: 'Tirur', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'town', lat: 10.9134, lng: 75.9225 },
  { name: 'Manjeri', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'town', lat: 11.1201, lng: 76.1196 },
  { name: 'Perinthalmanna', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'town', lat: 10.9763, lng: 76.2280 },
  { name: 'Ponnani', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'town', lat: 10.7672, lng: 75.9247 },
  { name: 'Nilambur', alternateNames: [], state: 'Kerala', district: 'Malappuram', type: 'town', lat: 11.2782, lng: 76.2259 },

  // === Kozhikode District Towns ===
  { name: 'Vadakara', alternateNames: ['Badagara'], state: 'Kerala', district: 'Kozhikode', type: 'town', lat: 11.5943, lng: 75.4901 },
  { name: 'Koyilandy', alternateNames: ['Quilandy'], state: 'Kerala', district: 'Kozhikode', type: 'town', lat: 11.4440, lng: 75.6943 },
  { name: 'Ramanattukara', alternateNames: [], state: 'Kerala', district: 'Kozhikode', type: 'town', lat: 11.2349, lng: 75.8326 },

  // === Kannur District Towns ===
  { name: 'Thalassery', alternateNames: ['Tellicherry'], state: 'Kerala', district: 'Kannur', type: 'town', lat: 11.7480, lng: 75.4899 },
  { name: 'Payyanur', alternateNames: [], state: 'Kerala', district: 'Kannur', type: 'town', lat: 12.0985, lng: 75.2050 },
  { name: 'Mattannur', alternateNames: [], state: 'Kerala', district: 'Kannur', type: 'town', lat: 11.9290, lng: 75.5742 },
  { name: 'Taliparamba', alternateNames: [], state: 'Kerala', district: 'Kannur', type: 'town', lat: 12.0358, lng: 75.3590 },
  { name: 'Kuthuparamba', alternateNames: [], state: 'Kerala', district: 'Kannur', type: 'town', lat: 11.8140, lng: 75.5614 },

  // === Wayanad District Towns ===
  { name: 'Kalpetta', alternateNames: [], state: 'Kerala', district: 'Wayanad', type: 'town', lat: 11.6087, lng: 76.0830 },
  { name: 'Mananthavady', alternateNames: [], state: 'Kerala', district: 'Wayanad', type: 'town', lat: 11.8022, lng: 76.0033 },
  { name: 'Sultan Bathery', alternateNames: ['Sulthan Bathery'], state: 'Kerala', district: 'Wayanad', type: 'town', lat: 11.6642, lng: 76.2560 },

  // === Pathanamthitta District Towns ===
  { name: 'Adoor', alternateNames: [], state: 'Kerala', district: 'Pathanamthitta', type: 'town', lat: 9.1543, lng: 76.7336 },
  { name: 'Thiruvalla', alternateNames: ['Tiruvalla'], state: 'Kerala', district: 'Pathanamthitta', type: 'town', lat: 9.3838, lng: 76.5747 },
  { name: 'Pandalam', alternateNames: [], state: 'Kerala', district: 'Pathanamthitta', type: 'town', lat: 9.2275, lng: 76.6785 },
  { name: 'Ranni', alternateNames: [], state: 'Kerala', district: 'Pathanamthitta', type: 'town', lat: 9.3862, lng: 76.7856 },

  // === Idukki District Towns ===
  { name: 'Thodupuzha', alternateNames: [], state: 'Kerala', district: 'Idukki', type: 'town', lat: 9.8949, lng: 76.7156 },
  { name: 'Munnar', alternateNames: [], state: 'Kerala', district: 'Idukki', type: 'town', lat: 10.0889, lng: 77.0595 },
  { name: 'Thekkady', alternateNames: ['Periyar'], state: 'Kerala', district: 'Idukki', type: 'town', lat: 9.6000, lng: 77.1663 },
  { name: 'Kattappana', alternateNames: [], state: 'Kerala', district: 'Idukki', type: 'town', lat: 9.7560, lng: 77.0860 },

  // === Kasaragod District Towns ===
  { name: 'Kanhangad', alternateNames: [], state: 'Kerala', district: 'Kasaragod', type: 'town', lat: 12.3064, lng: 75.0910 },
  { name: 'Nileshwaram', alternateNames: ['Nileshwar'], state: 'Kerala', district: 'Kasaragod', type: 'town', lat: 12.2586, lng: 75.1285 },
];
