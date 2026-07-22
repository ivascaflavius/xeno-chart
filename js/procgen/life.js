import { rngFor, deriveSeedInt } from './prng.js';
import { BIOSIGNATURE_BASE_CHANCE, BIOCHEMISTRY_TYPES, LIFE_STAGES } from '../data/constants.js';
import { generateSpeciesName } from './names.js';

const CLASS_MULTIPLIER = {
  ocean: 2.0,
  rocky: 1.2,
  ice: 0.6,
  barren: 0.3,
  molten: 0.1,
  'gas-giant': 0.05,
};

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
 * Returns null (no life) or a life record. Phase 1 only ever produces
 * non-intelligent stages — intelligent life is Phase 3 (§3).
 */
export function rollLife(baseSeedInt, planetId, star, planetClass) {
  const rng = rngFor(baseSeedInt, planetId, 'life');
  const classMult = CLASS_MULTIPLIER[planetClass.key] ?? 0.2;
  const starMult = star.stable ? 1.0 : 0.1;
  const chance = BIOSIGNATURE_BASE_CHANCE * classMult * starMult;

  if (!rng.chance(chance)) return null;

  const biochemistry = rng.weightedPick(BIOCHEMISTRY_TYPES);
  const stage = rng.weightedPick(LIFE_STAGES);
  const genesisMarkerId = deriveGenesisMarkerId(baseSeedInt, planetId);
  const speciesName = generateSpeciesName(baseSeedInt, planetId);

  return {
    biochemistry: biochemistry.key,
    biochemistryLabel: biochemistry.label,
    stage: stage.key,
    stageLabel: stage.label,
    genesisMarkerId,
    speciesName,
  };
}
