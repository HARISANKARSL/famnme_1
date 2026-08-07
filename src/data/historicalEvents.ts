/**
 * Historical Events — backward-compatible re-export from src/data/history/.
 *
 * All event data now lives in src/data/history/ (split by era/region).
 * This file re-exports for backward compatibility.
 */

export type { HistoricalEvent } from './history/types';
export { ALL_HISTORICAL_EVENTS as historicalEvents } from './history';
export { getEventsInRange, getClosestEvent, getEventsByStates } from './history';
