import { rngFor } from './prng.js';
import {
  GRID_SPACING_LY,
  SYSTEM_DENSITY,
  WORMHOLE_BUCKET_CELLS,
  WORMHOLE_BUCKET_CHANCE,
  WORMHOLE_SNAP_SEARCH_RADIUS,
  HAZARD_TYPES,
  HAZARD_CHANCE_EACH,
} from '../data/constants.js';
import { generateStar } from './stars.js';
import { generatePlanets } from './planets.js';
import { generateSystemName } from './names.js';

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

export function systemExists(baseSeedInt, systemId) {
  const { gx, gy } = cellFromSystemId(systemId);
  return cellHasSystem(baseSeedInt, gx, gy, getStartSystemId(baseSeedInt));
}

function bucketForCell(gx, gy) {
  return {
    bx: Math.floor(gx / WORMHOLE_BUCKET_CELLS),
    by: Math.floor(gy / WORMHOLE_BUCKET_CELLS),
  };
}

/**
 * Nearest existing system to (targetGx, targetGy), searching outward ring by
 * ring up to `radius` cells. `bounds`, if given, rejects any candidate
 * outside it — used to keep a wormhole endpoint snap from crossing into a
 * neighboring bucket, which would break the pairing's reciprocity guarantee.
 */
function findNearestExistingSystem(baseSeedInt, startSystemId, targetGx, targetGy, radius, bounds) {
  for (let r = 0; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const gx = targetGx + dx;
        const gy = targetGy + dy;
        if (bounds && (gx < bounds.minGx || gx > bounds.maxGx || gy < bounds.minGy || gy > bounds.maxGy)) continue;
        if (cellHasSystem(baseSeedInt, gx, gy, startSystemId)) {
          return systemIdFromCell(gx, gy);
        }
      }
    }
  }
  return null;
}

// Memoizes getBucketWormholePair — pure w.r.t. its inputs (always the same
// answer for a given seed+bucket), just expensive to recompute. Without this,
// every visible starmap marker would redo an up-to-81-cell search on every
// redraw during a pan gesture (§7 mobile-performance risk).
const wormholeBucketCache = new Map();

/**
 * Wormholes are paired per coarse bucket rather than per-system, so both
 * endpoints agree without any non-local bookkeeping (§3, §2): a bucket either
 * has a pair or it doesn't, and asking either endpoint's system for its
 * wormhole yields the same answer, purely as a function of (seed, bucket).
 * Endpoint snapping is bounded to the bucket's own cells so a snap can never
 * cross into a neighboring bucket and silently break that guarantee.
 */
function getBucketWormholePair(baseSeedInt, bx, by) {
  const cacheKey = `${baseSeedInt}:${bx}:${by}`;
  if (wormholeBucketCache.has(cacheKey)) return wormholeBucketCache.get(cacheKey);

  const pair = computeBucketWormholePair(baseSeedInt, bx, by);
  wormholeBucketCache.set(cacheKey, pair);
  return pair;
}

function computeBucketWormholePair(baseSeedInt, bx, by) {
  const rng = rngFor(baseSeedInt, 'wormholeBucket', bx, by);
  if (!rng.chance(WORMHOLE_BUCKET_CHANCE)) return null;

  const startSystemId = getStartSystemId(baseSeedInt);
  const minGx = bx * WORMHOLE_BUCKET_CELLS;
  const maxGx = minGx + WORMHOLE_BUCKET_CELLS - 1;
  const minGy = by * WORMHOLE_BUCKET_CELLS;
  const maxGy = minGy + WORMHOLE_BUCKET_CELLS - 1;
  const bounds = {
    minGx, maxGx, minGy, maxGy,
  };

  const ax = minGx + rng.int(0, WORMHOLE_BUCKET_CELLS - 1);
  const ay = minGy + rng.int(0, WORMHOLE_BUCKET_CELLS - 1);
  const cx = minGx + rng.int(0, WORMHOLE_BUCKET_CELLS - 1);
  const cy = minGy + rng.int(0, WORMHOLE_BUCKET_CELLS - 1);

  const sysA = findNearestExistingSystem(baseSeedInt, startSystemId, ax, ay, WORMHOLE_SNAP_SEARCH_RADIUS, bounds);
  const sysB = findNearestExistingSystem(baseSeedInt, startSystemId, cx, cy, WORMHOLE_SNAP_SEARCH_RADIUS, bounds);
  if (!sysA || !sysB || sysA === sysB) return null;
  return { a: sysA, b: sysB };
}

/** The system on the other end of `systemId`'s wormhole, or null if it has none. Always two-way by construction. */
export function getWormholeDestination(baseSeedInt, systemId) {
  const { gx, gy } = cellFromSystemId(systemId);
  const { bx, by } = bucketForCell(gx, gy);
  const pair = getBucketWormholePair(baseSeedInt, bx, by);
  if (!pair) return null;
  if (pair.a === systemId) return pair.b;
  if (pair.b === systemId) return pair.a;
  return null;
}

/** One of 0-1 hazard flags (§10) — never on the guaranteed-safe starting system. */
function rollHazard(baseSeedInt, systemId, isStartSystem) {
  if (isStartSystem) return null;
  const rng = rngFor(baseSeedInt, systemId, 'hazard');
  for (const hazardType of HAZARD_TYPES) {
    if (rng.chance(HAZARD_CHANCE_EACH)) {
      return { type: hazardType.key, label: hazardType.label };
    }
  }
  return null;
}

/** Full lazy generation of one system's contents (star + planets + life + hazard + wormhole). */
export function getSystem(baseSeedInt, systemId) {
  const { gx, gy } = cellFromSystemId(systemId);
  const startSystemId = getStartSystemId(baseSeedInt);
  const isStartSystem = systemId === startSystemId;
  if (!isStartSystem && !cellHasSystem(baseSeedInt, gx, gy, startSystemId)) {
    return null;
  }
  const pos = getSystemPosition(baseSeedInt, gx, gy);
  const name = generateSystemName(baseSeedInt, systemId);
  const star = generateStar(baseSeedInt, systemId, isStartSystem);
  const planets = generatePlanets(baseSeedInt, systemId, star, isStartSystem);
  const hazard = rollHazard(baseSeedInt, systemId, isStartSystem);
  const wormholeTo = getWormholeDestination(baseSeedInt, systemId);
  return {
    id: systemId, gx, gy, pos, name, isStartSystem, star, planets, hazard, wormholeTo,
  };
}
