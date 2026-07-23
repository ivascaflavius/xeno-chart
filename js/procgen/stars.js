import { rngFor } from './prng.js';
import { STAR_CLASSES, YOUNG_STAR_CHANCE } from '../data/constants.js';

const STABLE_CLASSES = STAR_CLASSES.filter((c) => c.stable);

// A binary system's companion is always a plain main-sequence star, never
// another binary/giant/remnant/rogue — keeps "what can a companion be" simple
// and avoids nonsensical nesting (a binary whose second member is itself a
// black hole reads as a totally different, unimplemented kind of system).
const MAIN_SEQUENCE_KEYS = new Set(['O', 'B', 'A', 'F', 'G', 'K', 'M']);
const COMPANION_CLASSES = STAR_CLASSES.filter((c) => MAIN_SEQUENCE_KEYS.has(c.key));

/**
 * Generate the star for a system. Pure function of (baseSeedInt, systemId).
 * `forceStable` is used for the guaranteed-safe starting system (§2a).
 * `young` (§15a) is a visual modifier on youngEligible classes only — a young
 * neutron star/black hole/magnetar/giant doesn't make physical sense, so it's
 * composed onto the class art rather than being its own class.
 */
export function generateStar(baseSeedInt, systemId, forceStable) {
  const rng = rngFor(baseSeedInt, systemId, 'star');
  const pool = forceStable ? STABLE_CLASSES : STAR_CLASSES;
  const cls = rng.weightedPick(pool);
  const massRoll = rng.float();
  const young = !!cls.youngEligible && rng.chance(YOUNG_STAR_CHANCE);

  // A binary system's companion star varies in size but isn't wildly
  // mismatched from the primary — its massRoll is nudged from the primary's
  // rather than drawn fully independently ("similarly but not exactly
  // matched in size").
  let companion = null;
  if (cls.key === 'BIN') {
    const compRng = rngFor(baseSeedInt, systemId, 'star', 'companion');
    const compCls = compRng.weightedPick(COMPANION_CLASSES);
    const companionMassRoll = Math.max(0, Math.min(1, massRoll + (compRng.float() - 0.5) * 0.4));
    companion = {
      class: compCls.key, label: compCls.label, color: compCls.color, massRoll: companionMassRoll,
    };
  }

  return {
    class: cls.key,
    label: cls.label,
    color: cls.color,
    stable: cls.stable,
    young,
    companion,
    // 0..1 relative size/mass roll, used by portrait generation for radius variance
    massRoll,
  };
}
