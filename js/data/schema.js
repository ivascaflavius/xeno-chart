// Single source of truth for the save shape (§14). Bump SAVE_VERSION and
// extend validateSave whenever the shape changes.

export const SAVE_VERSION = 1;
export const GLOBAL_VERSION = 1;

export function createEmptySave() {
  return {
    version: SAVE_VERSION,
    seed: '',
    galaxyName: '',
    difficulty: 'expedition', // 'relaxed' | 'expedition'
    shipName: 'Unnamed Vessel',
    hullColor: 'default',
    createdAt: 0,
    lastPlayedAt: 0,
    cycle: 0,
    position: { systemId: null },
    resources: {
      fuel: 0, charge: 0, oxygen: 0, food: 0,
    },
    buffers: {
      ore: 0, ice: 0, water: 0, hydrogen: 0,
    },
    sensorRange: 0,
    stranded: false,
    distressBeaconUsed: false,
    lifeSupportCountdown: null,
    degradedLevel: 0,
    gameOver: false,
    stats: {
      systemsVisited: [],
      lifeFound: 0,
      distanceTraveled: 0,
      jumpsMade: 0,
    },
    // systemId -> { tier: 'detected' | 'long' | 'close' }
    discoveries: {},
    // planetId -> { ore, ice, water } cumulative amounts harvested away
    mineralDepletion: {},
    // { x, y, range }[] — where past long-range scans were made, for the starmap's fog trail
    scanHistory: [],
  };
}

export function createEmptyGlobal() {
  return {
    version: GLOBAL_VERSION,
    codex: {
      stellar: {},
      planetary: {},
      biological: {},
    },
    achievements: {},
    commanderName: '',
    audio: { enabled: true, volume: 0.5 },
    haptics: { enabled: true },
  };
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Structural check — enough to reject corrupted/foreign JSON before it touches game state. */
export function validateSave(obj) {
  if (!isPlainObject(obj)) return false;
  if (typeof obj.version !== 'number') return false;
  if (obj.version !== SAVE_VERSION) return false;
  if (typeof obj.seed !== 'string') return false;
  if (obj.difficulty !== 'relaxed' && obj.difficulty !== 'expedition') return false;
  if (!isPlainObject(obj.position)) return false;
  if (!isPlainObject(obj.resources)) return false;
  if (!isPlainObject(obj.buffers)) return false;
  if (!isPlainObject(obj.discoveries)) return false;
  if (!isPlainObject(obj.mineralDepletion)) return false;
  if (!isPlainObject(obj.stats) || !Array.isArray(obj.stats.systemsVisited)) return false;
  const numericResourceKeys = ['fuel', 'charge', 'oxygen', 'food'];
  for (const k of numericResourceKeys) {
    if (typeof obj.resources[k] !== 'number') return false;
  }
  return true;
}

export function validateGlobal(obj) {
  if (!isPlainObject(obj)) return false;
  if (typeof obj.version !== 'number') return false;
  if (obj.version !== GLOBAL_VERSION) return false;
  if (!isPlainObject(obj.codex)) return false;
  return true;
}
