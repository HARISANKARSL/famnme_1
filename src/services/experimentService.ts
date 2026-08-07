/**
 * Experiment Service — Phase 3 (A/B testing infrastructure).
 *
 * Lightweight client-side experiment runner. No external dep, no server
 * roundtrip, no analytics SDK — designed as a *first* version we can
 * upgrade to GrowthBook / LaunchDarkly later by swapping `getVariant()`
 * with their SDK call.
 *
 * Bucketing: stable per (experimentId, userId) via FNV-1a hash → integer 0..99
 * compared to cumulative variant weights. Same user always gets the same
 * variant for the same experiment.
 *
 * Exposure events are stored locally for now (`fc_experiment_exposures`); a
 * future migration can ship them to a `experiment_exposures` table for
 * conversion-rate dashboards.
 */

interface Variant {
  id: string;
  weight: number;          // 0..100; weights across variants must sum to 100.
}

interface Experiment {
  id: string;
  variants: Variant[];
  /** When false the experiment is off and `getVariant` returns the first variant id (control). */
  enabled: boolean;
}

/**
 * Registered experiments. Add new ones here. Keep weights summing to 100.
 * Mark `enabled: false` to safely retire an experiment without ripping
 * the call sites — the control variant will be returned for everyone.
 */
const EXPERIMENTS: Record<string, Experiment> = {
  // Example: Today-card body copy variants (ready to flip on when we want
  // to A/B test cue wording). Off by default — control wins for everyone.
  today_card_body_v1: {
    id: 'today_card_body_v1',
    enabled: false,
    variants: [
      { id: 'control',     weight: 50 },
      { id: 'warmer_copy', weight: 50 },
    ],
  },
  // Onboarding checklist — order of items
  onboarding_order_v1: {
    id: 'onboarding_order_v1',
    enabled: false,
    variants: [
      { id: 'control',          weight: 50 },
      { id: 'invite_first',     weight: 50 },
    ],
  },
};

// Stable, fast 32-bit FNV-1a hash.
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
}

const EXPOSURES_KEY = 'fc_experiment_exposures';

function logExposure(experimentId: string, variantId: string, userId: string) {
  try {
    const raw = localStorage.getItem(EXPOSURES_KEY);
    const arr = raw ? JSON.parse(raw) as Array<{ exp: string; v: string; u: string; t: number }> : [];
    // Dedupe: only one exposure per (experiment, user) per session.
    if (arr.some(e => e.exp === experimentId && e.u === userId)) return;
    arr.push({ exp: experimentId, v: variantId, u: userId, t: Date.now() });
    // Keep last 200 exposures.
    localStorage.setItem(EXPOSURES_KEY, JSON.stringify(arr.slice(-200)));
  } catch { /* quota errors — non-critical */ }
}

/**
 * Returns the variant id assigned to (experimentId, userId).
 * Stable: same user always sees the same variant within an experiment.
 * If experiment is unknown or disabled, returns the first variant ('control').
 */
export function getVariant(experimentId: string, userId: string | null | undefined): string {
  const exp = EXPERIMENTS[experimentId];
  if (!exp || !exp.enabled || exp.variants.length === 0) {
    return EXPERIMENTS[experimentId]?.variants?.[0]?.id ?? 'control';
  }
  const userKey = userId || 'anon';
  const bucket = hash(`${experimentId}:${userKey}`) % 100;
  let cum = 0;
  for (const v of exp.variants) {
    cum += v.weight;
    if (bucket < cum) {
      logExposure(experimentId, v.id, userKey);
      return v.id;
    }
  }
  // Fallback (weights didn't sum to 100): return last variant.
  const last = exp.variants[exp.variants.length - 1];
  logExposure(experimentId, last.id, userKey);
  return last.id;
}

/** Read exposure log (e.g., for a future "send to analytics" hook). */
export function getExposures(): Array<{ exp: string; v: string; u: string; t: number }> {
  try {
    const raw = localStorage.getItem(EXPOSURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Imperative override for QA / dev. */
export function forceVariant(experimentId: string, variantId: string) {
  try { localStorage.setItem(`fc_exp_force_${experimentId}`, variantId); } catch { /* noop */ }
}

/** Clear an override. */
export function clearForcedVariant(experimentId: string) {
  try { localStorage.removeItem(`fc_exp_force_${experimentId}`); } catch { /* noop */ }
}

/**
 * React hook wrapper. Call sites:
 *   const variant = useExperiment('today_card_body_v1', user?.id)
 *   if (variant === 'warmer_copy') return <WarmerCopy/>
 */
export function useExperiment(experimentId: string, userId: string | null | undefined): string {
  // Forced override (QA) takes precedence.
  try {
    const forced = localStorage.getItem(`fc_exp_force_${experimentId}`);
    if (forced) return forced;
  } catch { /* noop */ }
  return getVariant(experimentId, userId);
}
