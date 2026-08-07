/**
 * Historical Event types — shared across all era/region data files.
 */

export interface HistoricalEvent {
  id: string;
  year: number;
  endYear?: number;
  title: string;
  description: string;
  region: 'india' | 'world' | 'south-asia' | 'state';
  category: 'political' | 'social' | 'cultural' | 'economic' | 'natural-disaster' | 'religious';
  /** Indian states where this event is especially relevant */
  states?: string[];
}
