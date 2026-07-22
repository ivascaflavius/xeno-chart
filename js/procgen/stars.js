import { rngFor } from './prng.js';
import { STAR_CLASSES } from '../data/constants.js';

const STABLE_CLASSES = STAR_CLASSES.filter((c) => c.stable);

/**
 * Generate the star for a system. Pure function of (baseSeedInt, systemId).
 * `forceStable` is used for the guaranteed-safe starting system (§2a).
 */
export function generateStar(baseSeedInt, systemId, forceStable) {
  const rng = rngFor(baseSeedInt, systemId, 'star');
  const pool = forceStable ? STABLE_CLASSES : STAR_CLASSES;
  const cls = rng.weightedPick(pool);
  const massRoll = rng.float();
  return {
    class: cls.key,
    label: cls.label,
    color: cls.color,
    stable: cls.stable,
    // 0..1 relative size/mass roll, used by portrait generation for radius variance
    massRoll,
  };
}
