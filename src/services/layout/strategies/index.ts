/**
 * Strategy Registry
 *
 * Maps layout mode names to their strategy implementations.
 */

import type { LayoutStrategy } from '../types';
import { FullTreeStrategy } from './fullTreeStrategy';
import { PedigreeStrategy } from './pedigreeStrategy';
import { DescendantStrategy } from './descendantStrategy';

const strategies: Record<string, LayoutStrategy> = {
  tree: new FullTreeStrategy(),
  pedigree: new PedigreeStrategy(),
  descendant: new DescendantStrategy(),
};

export function getStrategy(mode: 'tree' | 'pedigree' | 'descendant'): LayoutStrategy {
  return strategies[mode] ?? strategies.tree;
}

export { FullTreeStrategy, PedigreeStrategy, DescendantStrategy };
