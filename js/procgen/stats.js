// Cosmetic star/planet stat display (§7 polish round 6) — pure derived
// values, not new procgen state: every range below is interpolated by the
// star's existing `massRoll` or planet's existing `sizeRoll` (already
// generated for portrait sizing), so the same object always reports the
// same stats without any new RNG draws. Ranges are loosely realistic, not
// meant to be astrophysically rigorous.

const STAR_STAT_RANGES = {
  O: { tempK: [30000, 50000], radiusRsun: [6.6, 12], massMsun: [16, 90] },
  B: { tempK: [10000, 30000], radiusRsun: [1.8, 6.6], massMsun: [2.1, 16] },
  A: { tempK: [7500, 10000], radiusRsun: [1.4, 1.8], massMsun: [1.4, 2.1] },
  F: { tempK: [6000, 7500], radiusRsun: [1.15, 1.4], massMsun: [1.04, 1.4] },
  G: { tempK: [5200, 6000], radiusRsun: [0.96, 1.15], massMsun: [0.8, 1.04] },
  K: { tempK: [3700, 5200], radiusRsun: [0.7, 0.96], massMsun: [0.45, 0.8] },
  M: { tempK: [2400, 3700], radiusRsun: [0.15, 0.7], massMsun: [0.08, 0.45] },
  // Giants are cooler at the surface than their spectral color alone implies
  // (that's the "giant" part — hugely expanded, so temperature drops even as
  // luminosity and radius balloon) — RG in particular reads as cool/orange
  // despite the class name, matching its portrait color.
  RG: { tempK: [3000, 5000], radiusRsun: [10, 100], massMsun: [0.3, 8] },
  BG: { tempK: [15000, 30000], radiusRsun: [5, 20], massMsun: [8, 25] },
  // A close binary pair of ordinary sun-like stars — the display shows one
  // set of stats standing in for "the system," since the two members aren't
  // tracked as separately-typed stars.
  BIN: { tempK: [5000, 6500], radiusRsun: [0.8, 1.3], massMsun: [1.6, 2.4] },
  WD: { tempK: [8000, 40000], radiusRsun: [0.008, 0.02], massMsun: [0.5, 1.4] },
  NS: { tempK: [500000, 1000000], radiusRsun: [0.00003, 0.00004], massMsun: [1.4, 2.2] },
  BH: { tempK: null, radiusRsun: [0.00001, 0.0003], massMsun: [5, 50] },
  MAG: { tempK: [500000, 1000000], radiusRsun: [0.00003, 0.00004], massMsun: [1.1, 2.0] },
  // The still-cooling compact core left behind — smaller and cooler than a
  // fresh neutron star, but still far hotter/denser than any ordinary star.
  SNR: { tempK: [100000, 500000], radiusRsun: [0.001, 0.01], massMsun: [1.2, 2.0] },
  // Planet-scale, not star-scale — no internal fusion, so no temperature of its own.
  ROGUE: { tempK: null, radiusRsun: [0.02, 0.12], massMsun: [0.00001, 0.003] },
};

const lerp = (roll, [lo, hi]) => lo + roll * (hi - lo);

/** { temperatureK: number|null, radiusSolar: number, massSolar: number } for a system's star. */
export function starStats(star) {
  const range = STAR_STAT_RANGES[star.class] || STAR_STAT_RANGES.G;
  const radiusDigits = range.radiusRsun[1] < 0.05 ? 5 : 2;
  return {
    temperatureK: range.tempK ? Math.round(lerp(star.massRoll, range.tempK)) : null,
    radiusSolar: Number(lerp(star.massRoll, range.radiusRsun).toFixed(radiusDigits)),
    massSolar: Number(lerp(star.massRoll, range.massMsun).toFixed(2)),
  };
}

const PLANET_STAT_RANGES = {
  rocky: { tempK: [220, 500], radiusEarth: [0.4, 1.3], massEarth: [0.2, 1.8] },
  molten: { tempK: [700, 1400], radiusEarth: [0.4, 1.1], massEarth: [0.2, 1.3] },
  ice: { tempK: [40, 140], radiusEarth: [0.3, 1.0], massEarth: [0.1, 1.0] },
  ocean: { tempK: [260, 320], radiusEarth: [0.8, 1.6], massEarth: [0.5, 2.5] },
  'gas-giant': { tempK: [100, 170], radiusEarth: [4, 12], massEarth: [20, 300] },
  barren: { tempK: [100, 450], radiusEarth: [0.2, 0.8], massEarth: [0.05, 0.6] },
  'earth-like': { tempK: [265, 300], radiusEarth: [0.85, 1.3], massEarth: [0.6, 1.7] },
  'ice-giant': { tempK: [50, 80], radiusEarth: [3, 5], massEarth: [10, 20] },
  'super-earth': { tempK: [230, 320], radiusEarth: [1.3, 2.5], massEarth: [2, 10] },
  iron: { tempK: [500, 900], radiusEarth: [0.3, 0.9], massEarth: [0.3, 2] },
  dwarf: { tempK: [30, 100], radiusEarth: [0.05, 0.3], massEarth: [0.0001, 0.01] },
};
const HOT_JUPITER_TEMP_K = [1000, 2500];

/** { surfaceTempK: number, radiusEarth: number, massEarth: number } for a planet. */
export function planetStats(planet) {
  const range = PLANET_STAT_RANGES[planet.class] || PLANET_STAT_RANGES.rocky;
  const tempRange = planet.hotJupiter ? HOT_JUPITER_TEMP_K : range.tempK;
  return {
    surfaceTempK: Math.round(lerp(planet.sizeRoll, tempRange)),
    radiusEarth: Number(lerp(planet.sizeRoll, range.radiusEarth).toFixed(2)),
    massEarth: Number(lerp(planet.sizeRoll, range.massEarth).toFixed(2)),
  };
}
