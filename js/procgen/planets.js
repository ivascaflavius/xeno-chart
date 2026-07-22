import { rngFor } from './prng.js';
import { PLANET_CLASSES } from '../data/constants.js';
import { rollLife } from './life.js';

const MINERAL_ROLL_RANGES = {
  ore: [20, 60],
  ice: [20, 50],
  water: [10, 40],
};

function generateOnePlanet(baseSeedInt, systemId, index, star, forceMineralBearing) {
  const rng = rngFor(baseSeedInt, systemId, 'planet', index);
  let cls = forceMineralBearing
    ? PLANET_CLASSES.filter((c) => c.minerals.length > 0)[
        rng.int(0, PLANET_CLASSES.filter((c) => c.minerals.length > 0).length - 1)
      ]
    : rng.weightedPick(PLANET_CLASSES);

  const minerals = {};
  for (const mineral of cls.minerals) {
    const [lo, hi] = MINERAL_ROLL_RANGES[mineral];
    minerals[mineral] = rng.int(lo, hi);
  }

  const planetId = `${systemId}:p${index}`;
  const sizeRoll = rng.float();

  const planet = {
    id: planetId,
    index,
    class: cls.key,
    label: cls.label,
    color: cls.color,
    minerals,
    sizeRoll,
  };

  planet.life = rollLife(baseSeedInt, planetId, star, cls);
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
    planets.push(generateOnePlanet(baseSeedInt, systemId, i, star, false));
  }

  if (isStartSystem && !planets.some((p) => Object.keys(p.minerals).length > 0)) {
    planets[0] = generateOnePlanet(baseSeedInt, systemId, 0, star, true);
  }

  return planets;
}
