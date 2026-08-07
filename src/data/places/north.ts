/**
 * North India Places — Delhi, UP, Uttarakhand, HP, J&K, Ladakh, Punjab, Haryana, Rajasthan, MP, Chhattisgarh
 */
import type { IndianPlace } from './types';

export const NORTH_PLACES: IndianPlace[] = [
  // =========================================================================
  // DELHI
  // =========================================================================
  { name: 'Delhi', alternateNames: ['New Delhi', 'NCT of Delhi'], state: 'Delhi', type: 'union_territory', lat: 28.7041, lng: 77.1025 },
  { name: 'New Delhi', alternateNames: [], state: 'Delhi', district: 'New Delhi', type: 'capital', lat: 28.6139, lng: 77.2090 },

  // =========================================================================
  // UTTAR PRADESH
  // =========================================================================
  { name: 'Uttar Pradesh', alternateNames: ['UP'], state: 'Uttar Pradesh', type: 'state', lat: 26.8467, lng: 80.9462 },
  { name: 'Lucknow', alternateNames: [], state: 'Uttar Pradesh', district: 'Lucknow', type: 'capital', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur', alternateNames: ['Cawnpore'], state: 'Uttar Pradesh', district: 'Kanpur Nagar', type: 'city', lat: 26.4499, lng: 80.3319 },
  { name: 'Agra', alternateNames: [], state: 'Uttar Pradesh', district: 'Agra', type: 'city', lat: 27.1767, lng: 78.0081 },
  { name: 'Varanasi', alternateNames: ['Benares', 'Banaras', 'Kashi'], state: 'Uttar Pradesh', district: 'Varanasi', type: 'city', lat: 25.3176, lng: 82.9739 },
  { name: 'Prayagraj', alternateNames: ['Allahabad'], state: 'Uttar Pradesh', district: 'Prayagraj', type: 'city', lat: 25.4358, lng: 81.8463 },
  { name: 'Meerut', alternateNames: [], state: 'Uttar Pradesh', district: 'Meerut', type: 'city', lat: 28.9845, lng: 77.7064 },
  { name: 'Noida', alternateNames: [], state: 'Uttar Pradesh', district: 'Gautam Buddha Nagar', type: 'city', lat: 28.5355, lng: 77.3910 },
  { name: 'Ghaziabad', alternateNames: [], state: 'Uttar Pradesh', district: 'Ghaziabad', type: 'city', lat: 28.6692, lng: 77.4538 },
  { name: 'Bareilly', alternateNames: [], state: 'Uttar Pradesh', district: 'Bareilly', type: 'city', lat: 28.3670, lng: 79.4304 },
  { name: 'Aligarh', alternateNames: [], state: 'Uttar Pradesh', district: 'Aligarh', type: 'city', lat: 27.8974, lng: 78.0880 },
  { name: 'Gorakhpur', alternateNames: [], state: 'Uttar Pradesh', district: 'Gorakhpur', type: 'city', lat: 26.7606, lng: 83.3732 },
  { name: 'Mathura', alternateNames: [], state: 'Uttar Pradesh', district: 'Mathura', type: 'city', lat: 27.4924, lng: 77.6737 },
  { name: 'Ayodhya', alternateNames: ['Faizabad'], state: 'Uttar Pradesh', district: 'Ayodhya', type: 'city', lat: 26.7922, lng: 82.1998 },
  { name: 'Jhansi', alternateNames: [], state: 'Uttar Pradesh', district: 'Jhansi', type: 'city', lat: 25.4484, lng: 78.5685 },

  // =========================================================================
  // UTTARAKHAND
  // =========================================================================
  { name: 'Uttarakhand', alternateNames: ['Uttaranchal'], state: 'Uttarakhand', type: 'state', lat: 30.0668, lng: 79.0193 },
  { name: 'Dehradun', alternateNames: ['Dehra Dun'], state: 'Uttarakhand', district: 'Dehradun', type: 'capital', lat: 30.3165, lng: 78.0322 },
  { name: 'Haridwar', alternateNames: ['Hardwar'], state: 'Uttarakhand', district: 'Haridwar', type: 'city', lat: 29.9457, lng: 78.1642 },
  { name: 'Rishikesh', alternateNames: [], state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.0869, lng: 78.2676 },
  { name: 'Nainital', alternateNames: [], state: 'Uttarakhand', district: 'Nainital', type: 'town', lat: 29.3803, lng: 79.4636 },
  { name: 'Haldwani', alternateNames: [], state: 'Uttarakhand', district: 'Nainital', type: 'city', lat: 29.2183, lng: 79.5130 },
  { name: 'Mussoorie', alternateNames: [], state: 'Uttarakhand', district: 'Dehradun', type: 'town', lat: 30.4598, lng: 78.0644 },

  // =========================================================================
  // HIMACHAL PRADESH
  // =========================================================================
  { name: 'Himachal Pradesh', alternateNames: ['HP'], state: 'Himachal Pradesh', type: 'state', lat: 31.1048, lng: 77.1734 },
  { name: 'Shimla', alternateNames: ['Simla'], state: 'Himachal Pradesh', district: 'Shimla', type: 'capital', lat: 31.1048, lng: 77.1734 },
  { name: 'Dharamshala', alternateNames: ['Dharamsala'], state: 'Himachal Pradesh', district: 'Kangra', type: 'city', lat: 32.2190, lng: 76.3234 },
  { name: 'Manali', alternateNames: [], state: 'Himachal Pradesh', district: 'Kullu', type: 'town', lat: 32.2396, lng: 77.1887 },
  { name: 'Kullu', alternateNames: [], state: 'Himachal Pradesh', district: 'Kullu', type: 'district_hq', lat: 31.9579, lng: 77.1095 },
  { name: 'Mandi', alternateNames: [], state: 'Himachal Pradesh', district: 'Mandi', type: 'district_hq', lat: 31.7084, lng: 76.9319 },

  // =========================================================================
  // JAMMU & KASHMIR + LADAKH
  // =========================================================================
  { name: 'Jammu and Kashmir', alternateNames: ['J&K', 'JK'], state: 'Jammu and Kashmir', type: 'union_territory', lat: 33.7782, lng: 76.5762 },
  { name: 'Srinagar', alternateNames: [], state: 'Jammu and Kashmir', district: 'Srinagar', type: 'capital', lat: 34.0837, lng: 74.7973 },
  { name: 'Jammu', alternateNames: [], state: 'Jammu and Kashmir', district: 'Jammu', type: 'city', lat: 32.7266, lng: 74.8570 },
  { name: 'Ladakh', alternateNames: [], state: 'Ladakh', type: 'union_territory', lat: 34.1526, lng: 77.5771 },
  { name: 'Leh', alternateNames: [], state: 'Ladakh', district: 'Leh', type: 'capital', lat: 34.1526, lng: 77.5771 },

  // =========================================================================
  // PUNJAB
  // =========================================================================
  { name: 'Punjab', alternateNames: [], state: 'Punjab', type: 'state', lat: 31.1471, lng: 75.3412 },
  { name: 'Chandigarh', alternateNames: [], state: 'Chandigarh', type: 'union_territory', lat: 30.7333, lng: 76.7794 },
  { name: 'Ludhiana', alternateNames: [], state: 'Punjab', district: 'Ludhiana', type: 'city', lat: 30.9010, lng: 75.8573 },
  { name: 'Amritsar', alternateNames: [], state: 'Punjab', district: 'Amritsar', type: 'city', lat: 31.6340, lng: 74.8723 },
  { name: 'Jalandhar', alternateNames: ['Jullundur'], state: 'Punjab', district: 'Jalandhar', type: 'city', lat: 31.3260, lng: 75.5762 },
  { name: 'Patiala', alternateNames: [], state: 'Punjab', district: 'Patiala', type: 'city', lat: 30.3398, lng: 76.3869 },
  { name: 'Bathinda', alternateNames: ['Bhatinda'], state: 'Punjab', district: 'Bathinda', type: 'city', lat: 30.2110, lng: 74.9455 },

  // =========================================================================
  // HARYANA
  // =========================================================================
  { name: 'Haryana', alternateNames: [], state: 'Haryana', type: 'state', lat: 29.0588, lng: 76.0856 },
  { name: 'Gurugram', alternateNames: ['Gurgaon'], state: 'Haryana', district: 'Gurugram', type: 'city', lat: 28.4595, lng: 77.0266 },
  { name: 'Faridabad', alternateNames: [], state: 'Haryana', district: 'Faridabad', type: 'city', lat: 28.4089, lng: 77.3178 },
  { name: 'Karnal', alternateNames: [], state: 'Haryana', district: 'Karnal', type: 'city', lat: 29.6857, lng: 76.9905 },
  { name: 'Ambala', alternateNames: ['Umballa'], state: 'Haryana', district: 'Ambala', type: 'city', lat: 30.3782, lng: 76.7767 },
  { name: 'Hisar', alternateNames: ['Hissar'], state: 'Haryana', district: 'Hisar', type: 'city', lat: 29.1492, lng: 75.7217 },
  { name: 'Panipat', alternateNames: [], state: 'Haryana', district: 'Panipat', type: 'city', lat: 29.3909, lng: 76.9635 },
  { name: 'Rohtak', alternateNames: [], state: 'Haryana', district: 'Rohtak', type: 'city', lat: 28.8955, lng: 76.6066 },

  // =========================================================================
  // RAJASTHAN
  // =========================================================================
  { name: 'Rajasthan', alternateNames: ['Rajputana'], state: 'Rajasthan', type: 'state', lat: 27.0238, lng: 74.2179 },
  { name: 'Jaipur', alternateNames: ['Pink City'], state: 'Rajasthan', district: 'Jaipur', type: 'capital', lat: 26.9124, lng: 75.7873 },
  { name: 'Jodhpur', alternateNames: ['Blue City'], state: 'Rajasthan', district: 'Jodhpur', type: 'city', lat: 26.2389, lng: 73.0243 },
  { name: 'Udaipur', alternateNames: ['City of Lakes'], state: 'Rajasthan', district: 'Udaipur', type: 'city', lat: 24.5854, lng: 73.7125 },
  { name: 'Kota', alternateNames: [], state: 'Rajasthan', district: 'Kota', type: 'city', lat: 25.2138, lng: 75.8648 },
  { name: 'Ajmer', alternateNames: [], state: 'Rajasthan', district: 'Ajmer', type: 'city', lat: 26.4499, lng: 74.6399 },
  { name: 'Bikaner', alternateNames: [], state: 'Rajasthan', district: 'Bikaner', type: 'city', lat: 28.0229, lng: 73.3119 },
  { name: 'Jaisalmer', alternateNames: ['Golden City'], state: 'Rajasthan', district: 'Jaisalmer', type: 'city', lat: 26.9157, lng: 70.9083 },
  { name: 'Pushkar', alternateNames: [], state: 'Rajasthan', district: 'Ajmer', type: 'town', lat: 26.4898, lng: 74.5511 },

  // =========================================================================
  // MADHYA PRADESH
  // =========================================================================
  { name: 'Madhya Pradesh', alternateNames: ['MP'], state: 'Madhya Pradesh', type: 'state', lat: 22.9734, lng: 78.6569 },
  { name: 'Bhopal', alternateNames: [], state: 'Madhya Pradesh', district: 'Bhopal', type: 'capital', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore', alternateNames: [], state: 'Madhya Pradesh', district: 'Indore', type: 'city', lat: 22.7196, lng: 75.8577 },
  { name: 'Jabalpur', alternateNames: ['Jubbulpore'], state: 'Madhya Pradesh', district: 'Jabalpur', type: 'city', lat: 23.1815, lng: 79.9864 },
  { name: 'Gwalior', alternateNames: [], state: 'Madhya Pradesh', district: 'Gwalior', type: 'city', lat: 26.2183, lng: 78.1828 },
  { name: 'Ujjain', alternateNames: [], state: 'Madhya Pradesh', district: 'Ujjain', type: 'city', lat: 23.1765, lng: 75.7885 },
  { name: 'Sagar', alternateNames: [], state: 'Madhya Pradesh', district: 'Sagar', type: 'city', lat: 23.8388, lng: 78.7378 },

  // =========================================================================
  // CHHATTISGARH
  // =========================================================================
  { name: 'Chhattisgarh', alternateNames: ['CG'], state: 'Chhattisgarh', type: 'state', lat: 21.2787, lng: 81.8661 },
  { name: 'Raipur', alternateNames: [], state: 'Chhattisgarh', district: 'Raipur', type: 'capital', lat: 21.2514, lng: 81.6296 },
  { name: 'Bhilai', alternateNames: [], state: 'Chhattisgarh', district: 'Durg', type: 'city', lat: 21.2167, lng: 81.3833 },
  { name: 'Bilaspur', alternateNames: [], state: 'Chhattisgarh', district: 'Bilaspur', type: 'city', lat: 22.0797, lng: 82.1409 },
  { name: 'Korba', alternateNames: [], state: 'Chhattisgarh', district: 'Korba', type: 'city', lat: 22.3595, lng: 82.7501 },
];
