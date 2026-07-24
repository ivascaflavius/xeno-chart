// Cosmetic magnitude color grading (not a new procgen value) — how a
// star's/planet's temperature, radius, or mass compares to a familiar
// reference point (the Sun for stars, Earth for planets): blue when much
// smaller/colder, green near the reference, red when much bigger/hotter.
// Log-scaled since these values span orders of magnitude across classes.
// Radius/mass are already expressed as a ratio to the reference (R☉/M☉,
// R⊕/M⊕), so those callers just pass 1 as the reference value.

const COLD = '#5fc9d8';
const NEUTRAL = '#5fd88a';
const HOT = '#d8615f';

export const SUN_TEMP_K = 5778;
export const EARTH_TEMP_K = 288;

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const lerpChannel = (shift) => {
    const av = (pa >> shift) & 255;
    const bv = (pb >> shift) & 255;
    return Math.round(av + (bv - av) * t);
  };
  return `#${[16, 8, 0].map(lerpChannel).map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Blue when much smaller/colder than `reference`, green near it, red when
 * much bigger/hotter — clamped to full saturation 2 octaves (4x) either
 * side. Returns null for values that don't apply (black holes/rogue planets
 * have no surface temperature of their own), so callers can fall back to a
 * plain uncolored "N/A".
 */
export function relativeColorFor(value, reference) {
  if (value === null || value === undefined) return null;
  const t = Math.max(-1, Math.min(1, Math.log2(value / reference) / 2));
  return t < 0 ? mixHex(COLD, NEUTRAL, t + 1) : mixHex(NEUTRAL, HOT, t);
}
