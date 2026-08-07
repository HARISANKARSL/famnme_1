/**
 * Historical Events Registry — aggregates all era and regional event files.
 * Provides search/filter functions for timeline widgets.
 */

import type { HistoricalEvent } from './types';
import { PRE_INDEPENDENCE_EVENTS } from './pre-independence';
import { POST_INDEPENDENCE_EVENTS } from './post-independence';
import { MODERN_INDIA_EVENTS } from './modern-india';
import { SOUTH_STATE_EVENTS } from './state-events-south';
import { NORTH_STATE_EVENTS } from './state-events-north';
import { WEST_STATE_EVENTS } from './state-events-west';
import { EAST_STATE_EVENTS } from './state-events-east';
import { WORLD_EVENTS } from './world-events';

export type { HistoricalEvent } from './types';

/** All historical events combined */
export const ALL_HISTORICAL_EVENTS: HistoricalEvent[] = [
  ...PRE_INDEPENDENCE_EVENTS,
  ...POST_INDEPENDENCE_EVENTS,
  ...MODERN_INDIA_EVENTS,
  ...SOUTH_STATE_EVENTS,
  ...NORTH_STATE_EVENTS,
  ...WEST_STATE_EVENTS,
  ...EAST_STATE_EVENTS,
  ...WORLD_EVENTS,
].sort((a, b) => a.year - b.year);

/**
 * Get events that overlap with a given year range, optionally filtered by states.
 */
export function getEventsInRange(
  startYear: number,
  endYear: number,
  states?: string[]
): HistoricalEvent[] {
  return ALL_HISTORICAL_EVENTS.filter(event => {
    const eventEnd = event.endYear || event.year;
    const inRange = event.year <= endYear && eventEnd >= startYear;
    if (!inRange) return false;

    // If states filter provided, include national/world events + matching state events
    if (states && states.length > 0) {
      if (!event.states || event.states.length === 0) return true; // national/world event
      return event.states.some(s => states.includes(s));
    }

    return true;
  });
}

/**
 * Get the closest historical event to a given year, optionally filtered by states.
 */
export function getClosestEvent(
  year: number,
  states?: string[]
): HistoricalEvent | null {
  const candidates = states && states.length > 0
    ? ALL_HISTORICAL_EVENTS.filter(e =>
        !e.states || e.states.length === 0 || e.states.some(s => states.includes(s))
      )
    : ALL_HISTORICAL_EVENTS;

  if (candidates.length === 0) return null;

  let closest = candidates[0];
  let minDiff = Math.abs(year - closest.year);

  for (const event of candidates) {
    const diff = Math.abs(year - event.year);
    if (diff < minDiff) {
      minDiff = diff;
      closest = event;
    }
  }

  return closest;
}

/**
 * Get events relevant to specific Indian states.
 */
export function getEventsByStates(states: string[]): HistoricalEvent[] {
  return ALL_HISTORICAL_EVENTS.filter(event =>
    event.states?.some(s => states.includes(s))
  );
}
