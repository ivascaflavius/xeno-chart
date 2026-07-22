import { rngFor } from './prng.js';
import { PLANET_CLASSES, MOON_COUNT_RANGES } from '../data/constants.js';
import { rollLife } from './life.js';
import { zoneForIndex } from './habitability.js';

const MINERAL_ROLL_RANGES = {
  ore: [20, 60],
  ice: [20, 50],
  water: [10, 40],
};

function generateOnePlanet(baseSeedInt, systemId, index, count, star, forceMineralBearing) {
  const rng = rngFor(baseSeedInt, systemId, 'planet', index);

  // A planet's class is restricted to whatever's eligible for its actual
  // orbital zone (§6/§7 polish round 6) — molten/rocky/hot-Jupiter inward,
  // water-bearing worlds in the temperate band, ice/ice-giants out in the
  // cold — rather than picking from the whole class list regardless of
  // where in the system it landed.
  const zone = zoneForIndex(index, count, star.class);
  let eligible = PLANET_CLASSES.filter((c) => c.zones.includes(zone));
  if (forceMineralBearing) {
    eligible = eligible.filter((c) => c.minerals.length > 0);
  }
  const cls = rng.weightedPick(eligible);

  const minerals = {};
  for (const mineral of cls.minerals) {
    const [lo, hi] = MINERAL_ROLL_RANGES[mineral];
    minerals[mineral] = rng.int(lo, hi);
  }

  const planetId = `${systemId}:p${index}`;
  const sizeRoll = rng.float();

  const moonRng = rngFor(baseSeedInt, systemId, 'planet', index, 'moons');
  const [moonLo, moonHi] = MOON_COUNT_RANGES[cls.key] || [0, 1];
  const moonCount = moonRng.int(moonLo, moonHi);

  // A gas giant that landed in the inner zone reads as a "hot Jupiter" (§7
  // polish) — migrated in close, too hot/tidally battered to keep a ring
  // system, so it always renders without one (see portraits.js).
  const hotJupiter = cls.key === 'gas-giant' && zone === 'inner';

  const planet = {
    id: planetId,
    index,
    class: cls.key,
    label: cls.label,
    color: cls.color,
    minerals,
    sizeRoll,
    moonCount,
    hotJupiter,
  };

  planet.life = rollLife(baseSeedInt, planetId, star, cls, zone === 'habitable');
  return planet;
}

/**
 * Generate every planet in a system. Pure function of (baseSeedInt, systemId).
 * `isStartSystem` guarantees at least one mineral-bearing planet (§2a).
 */
export function generatePlanets(baseSeedInt, systemId, star, isStartSystem) {
  const countRng = rngFor(baseSeedInt, systemId, 'planetCount');
  let count = countRng.int(0, 6);
  if (isStartSystem && count < 1) count = countRng.int(1, 3);

  const planets = [];
  for (let i = 0; i < count; i++) {
    planets.push(generateOnePlanet(baseSeedInt, systemId, i, count, star, false));
  }

  if (isStartSystem && !planets.some((p) => Object.keys(p.minerals).length > 0)) {
    planets[0] = generateOnePlanet(baseSeedInt, systemId, 0, count, star, true);
  }

  return planets;
}
