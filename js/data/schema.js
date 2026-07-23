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
    shipClass: 'standard',
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
    // { key, cyclesLeft } | null — set by a hostile intelligent-life encounter (§3, Phase 3)
    moduleDisabled: null,
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
    // planetId -> { genesisMarkerId, speciesName, biochemistry, stage, techTier, systemId } —
    // every life discovery made this expedition, for the Phase 3 lineage-web codex view.
    // genesisMarkerId is only meaningful within this save's own galaxy (it's derived from
    // baseSeedInt), so lineage is tracked per-expedition rather than globally.
    lifeDiscoveries: {},
    // planetId -> true — a biosignature is revealed by the close-range scan itself, but
    // codex/achievement crediting (and any first-contact encounter) waits for a deliberate
    // "take a sample" action, tracked here so it only fires once per planet.
    sampledPlanets: {},
    // { cycle, type, text, iconName, systemId?, planetId? }[], newest last, capped at
    // JOURNAL_MAX_ENTRIES (see gameState.js) — a human-readable log of what happened this
    // expedition, shown in the Journal screen. systemId/planetId (when present) let the
    // Journal screen look up and show the real star/planet portrait next to the entry.
    journal: [],
  };
}

/** A fresh install (or a full reset) gets a placeholder identity rather than an empty field to fill in. */
function generateDefaultCommanderName() {
  return `Commander-${Math.floor(1000 + Math.random() * 9000)}`;
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
    commanderName: generateDefaultCommanderName(),
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
