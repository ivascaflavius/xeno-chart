import { rngFor } from './prng.js';
import { STAR_CLASSES, YOUNG_STAR_CHANCE } from '../data/constants.js';

const STABLE_CLASSES = STAR_CLASSES.filter((c) => c.stable);

/**
 * Generate the star for a system. Pure function of (baseSeedInt, systemId).
 * `forceStable` is used for the guaranteed-safe starting system (§2a).
 * `young` (§15a) is a visual modifier on stable classes only — a young
 * neutron star/black hole/magnetar doesn't make physical sense, so it's
 * composed onto the class art rather than being its own class.
 */
export function generateStar(baseSeedInt, systemId, forceStable) {
  const rng = rngFor(baseSeedInt, systemId, 'star');
  const pool = forceStable ? STABLE_CLASSES : STAR_CLASSES;
  const cls = rng.weightedPick(pool);
  const massRoll = rng.float();
  const young = cls.stable && rng.chance(YOUNG_STAR_CHANCE);
  return {
    class: cls.key,
    label: cls.label,
    color: cls.color,
    stable: cls.stable,
    young,
    // 0..1 relative size/mass roll, used by portrait generation for radius variance
    massRoll,
  };
}
