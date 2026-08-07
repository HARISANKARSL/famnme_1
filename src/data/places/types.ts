/**
 * Indian Place data type for the standardized places dataset.
 */

export interface IndianPlace {
  name: string;              // Standard modern name (e.g., "Thiruvananthapuram")
  alternateNames: string[];  // Historical/colloquial names (e.g., ["Trivandrum"])
  state: string;             // State or UT name
  district?: string;         // District name (omitted for state-level entries)
  type: 'state' | 'union_territory' | 'capital' | 'city' | 'town' | 'village' | 'district_hq';
  lat: number;
  lng: number;
}
