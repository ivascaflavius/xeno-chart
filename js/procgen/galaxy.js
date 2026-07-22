import { rngFor } from './prng.js';
import { GRID_SPACING_LY, SYSTEM_DENSITY } from '../data/constants.js';
import { generateStar } from './stars.js';
import { generatePlanets } from './planets.js';

// The galaxy is a sparse infinite grid: each grid cell either has exactly one
// system or none, decided by a per-cell density roll. Systems are generated
// lazily, on demand, from (baseSeedInt, systemId) alone — see §3a / §7.

export function systemIdFromCell(gx, gy) {
  return `${gx},${gy}`;
}

export function cellFromSystemId(systemId) {
  const [gx, gy] = systemId.split(',').map(Number);
  return { gx, gy };
}

/**
 * Deterministic starting system cell — offset from the seed rather than the
 * literal grid origin (§2a), so it carries no special geometric meaning.
 */
export function getStartSystemId(baseSeedInt) {
  const rng = rngFor(baseSeedInt, 'startCell');
  const gx = rng.int(-3, 3);
  const gy = rng.int(-3, 3);
  return systemIdFromCell(gx, gy);
}

function cellHasSystem(baseSeedInt, gx, gy, startSystemId) {
  const systemId = systemIdFromCell(gx, gy);
  if (systemId === startSystemId) return true; // guaranteed safe harbor, always present
  const rng = rngFor(baseSeedInt, 'density', gx, gy);
  return rng.chance(SYSTEM_DENSITY);
}

export function getSystemPosition(baseSeedInt, gx, gy) {
  const rng = rngFor(baseSeedInt, 'pos', gx, gy);
  const jitterX = (rng.float() - 0.5) * GRID_SPACING_LY * 0.7;
  const jitterY = (rng.float() - 0.5) * GRID_SPACING_LY * 0.7;
  return {
    x: gx * GRID_SPACING_LY + jitterX,
    y: gy * GRID_SPACING_LY + jitterY,
  };
}

export function distanceLy(posA, posB) {
  return Math.hypot(posA.x - posB.x, posA.y - posB.y);
}

/** All existing systems within `radiusLy` of `centerPos` (real ly coordinates). */
export function getSystemsInRadius(baseSeedInt, centerPos, radiusLy) {
  const startSystemId = getStartSystemId(baseSeedInt);
  const cellRadius = Math.ceil(radiusLy / GRID_SPACING_LY) + 1;
  const centerGx = Math.round(centerPos.x / GRID_SPACING_LY);
  const centerGy = Math.round(centerPos.y / GRID_SPACING_LY);
  const results = [];
  for (let gx = centerGx - cellRadius; gx <= centerGx + cellRadius; gx++) {
    for (let gy = centerGy - cellRadius; gy <= centerGy + cellRadius; gy++) {
      if (!cellHasSystem(baseSeedInt, gx, gy, startSystemId)) continue;
      const pos = getSystemPosition(baseSeedInt, gx, gy);
      const distance = distanceLy(centerPos, pos);
      if (distance <= radiusLy) {
        results.push({ id: systemIdFromCell(gx, gy), pos, distance });
      }
    }
  }
  return results;
}

/** All existing systems within an axis-aligned box (real ly coordinates) — used for starmap viewport culling. */
export function getSystemsInBox(baseSeedInt, minX, maxX, minY, maxY) {
  const startSystemId = getStartSystemId(baseSeedInt);
  const minGx = Math.floor(minX / GRID_SPACING_LY) - 1;
  const maxGx = Math.ceil(maxX / GRID_SPACING_LY) + 1;
  const minGy = Math.floor(minY / GRID_SPACING_LY) - 1;
  const maxGy = Math.ceil(maxY / GRID_SPACING_LY) + 1;
  const results = [];
  for (let gx = minGx; gx <= maxGx; gx++) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      if (!cellHasSystem(baseSeedInt, gx, gy, startSystemId)) continue;
      const pos = getSystemPosition(baseSeedInt, gx, gy);
      if (pos.x < minX || pos.x > maxX || pos.y < minY || pos.y > maxY) continue;
      results.push({ id: systemIdFromCell(gx, gy), pos });
    }
  }
  return results;
}

/** Full lazy generation of one system's contents (star + planets + life). */
export function getSystem(baseSeedInt, systemId) {
  const { gx, gy } = cellFromSystemId(systemId);
  const startSystemId = getStartSystemId(baseSeedInt);
  const isStartSystem = systemId === startSystemId;
  if (!isStartSystem && !cellHasSystem(baseSeedInt, gx, gy, startSystemId)) {
    return null;
  }
  const pos = getSystemPosition(baseSeedInt, gx, gy);
  const star = generateStar(baseSeedInt, systemId, isStartSystem);
  const planets = generatePlanets(baseSeedInt, systemId, star, isStartSystem);
  return { id: systemId, gx, gy, pos, isStartSystem, star, planets };
}
