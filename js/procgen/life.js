import { rngFor, deriveSeedInt } from './prng.js';
import {
  BIOSIGNATURE_BASE_CHANCE, BIOCHEMISTRY_TYPES, LIFE_STAGES, TECH_TIERS, ENCOUNTER_TYPES, MODULES,
  HABITABLE_ZONE_LIFE_MULTIPLIER, OUTSIDE_HABITABLE_ZONE_LIFE_MULTIPLIER,
} from '../data/constants.js';
import { generateSpeciesName } from './names.js';

const CLASS_MULTIPLIER = {
  ocean: 2.0,
  'earth-like': 2.2,
  rocky: 1.2,
  ice: 0.6,
  barren: 0.3,
  molten: 0.1,
  'gas-giant': 0.05,
  'ice-giant': 0.05,
};

const SIMPLE_STAGE = LIFE_STAGES.find((s) => s.key === 'simple');

function parseSystemCoords(planetId) {
  const [systemId] = planetId.split(':p');
  const [gx, gy] = systemId.split(',').map(Number);
  return { gx, gy };
}

function deriveGenesisMarkerId(baseSeedInt, planetId) {
  const { gx, gy } = parseSystemCoords(planetId);
  const sectorX = Math.floor(gx / 4);
  const sectorY = Math.floor(gy / 4);
  return deriveSeedInt(baseSeedInt, 'genesis', sectorX, sectorY).toString(36);
}

/**
 * Roll for a biosignature on a planet. Pure function of (baseSeedInt, planetId).
 * Returns null (no life) or a life record. `intelligent` stage carries an
 * additional tech-tier + first-contact encounter roll (§3, Phase 3).
 * `inHabitableZone` biases whether life shows up at all (§6/§7 polish); a
 * planet without `hasSurfaceWater` can still host microbial/simple life but
 * never gets clamped up to complex/intelligent.
 */
export function rollLife(baseSeedInt, planetId, star, planetClass, inHabitableZone) {
  const rng = rngFor(baseSeedInt, planetId, 'life');
  const classMult = CLASS_MULTIPLIER[planetClass.key] ?? 0.2;
  const starMult = star.stable ? 1.0 : 0.1;
  const zoneMult = inHabitableZone ? HABITABLE_ZONE_LIFE_MULTIPLIER : OUTSIDE_HABITABLE_ZONE_LIFE_MULTIPLIER;
  const chance = BIOSIGNATURE_BASE_CHANCE * classMult * starMult * zoneMult;

  if (!rng.chance(chance)) return null;

  const biochemistry = rng.weightedPick(BIOCHEMISTRY_TYPES);
  let stage = rng.weightedPick(LIFE_STAGES);
  if (!planetClass.hasSurfaceWater && (stage.key === 'complex' || stage.key === 'intelligent')) {
    stage = SIMPLE_STAGE;
  }
  const genesisMarkerId = deriveGenesisMarkerId(baseSeedInt, planetId);
  const speciesName = generateSpeciesName(baseSeedInt, planetId);

  const life = {
    biochemistry: biochemistry.key,
    biochemistryLabel: biochemistry.label,
    stage: stage.key,
    stageLabel: stage.label,
    genesisMarkerId,
    speciesName,
  };

  if (stage.key === 'intelligent') {
    const techTier = rng.weightedPick(TECH_TIERS);
    const encounter = rng.weightedPick(ENCOUNTER_TYPES);
    life.techTier = techTier.key;
    life.techTierLabel = techTier.label;
    life.encounter = encounter.key;
    if (encounter.key === 'hostile') {
      life.hostileModuleKey = rng.pick(Object.keys(MODULES));
    }
  }

  return life;
}
