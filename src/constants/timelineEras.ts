/**
 * Timeline Eras — Indian historical era groupings for memory timeline
 */

export interface TimelineEra {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  description: string;
}

export const TIMELINE_ERAS: TimelineEra[] = [
  { id: 'pre-independence', label: 'Pre-Independence', startYear: 0, endYear: 1946, description: 'Before India gained independence' },
  { id: 'post-independence', label: 'Post-Independence', startYear: 1947, endYear: 1969, description: 'Building a new nation' },
  { id: 'urbanization', label: 'Urbanization Era', startYear: 1970, endYear: 1994, description: 'Migration and modernization' },
  { id: 'digital-era', label: 'Digital Era', startYear: 1995, endYear: 9999, description: 'The connected world' },
];

export function getEraForYear(year: number): TimelineEra | undefined {
  return TIMELINE_ERAS.find(era => year >= era.startYear && year <= era.endYear);
}
