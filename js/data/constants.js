// Tuning values. Kept in one place so balance passes don't require hunting
// through gameplay logic.

export const GRID_SPACING_LY = 6;
export const SYSTEM_DENSITY = 0.5;

export const BASE_SENSOR_RANGE_LY = 14;

export const BASE_JUMP_FUEL_COST = 3;
export const FUEL_COST_PER_LY = 0.8;
export const JUMP_OXYGEN_DRAW = 1;
export const JUMP_FOOD_DRAW = 1;
export const WORMHOLE_FLAT_FUEL_COST = 4;

export const LONG_RANGE_SCAN_CHARGE_COST = 3;
export const CLOSE_RANGE_SCAN_CHARGE_COST = 10;

export const RESOURCE_CAPS = {
  fuel: 40,
  charge: 40,
  oxygen: 30,
  food: 30,
};

export const BUFFER_CAPS = {
  ore: 30,
  ice: 30,
  water: 20,
  hydrogen: 20,
};

export const STARTING_RESOURCES = {
  fuel: 26,
  charge: 36,
  oxygen: 30,
  food: 30,
};

export const STARTING_BUFFERS = {
  ore: 0,
  ice: 0,
  water: 0,
  hydrogen: 0,
};

// Each module: consumes `input` at `ratePerCycle`, whenever available,
// producing `output` at the given yield. Runs once per elapsed cycle.
export const MODULES = {
  refinery: {
    label: 'Refinery',
    input: 'ore',
    ratePerCycle: 3,
    outputs: { fuel: 3 },
  },
  electrolysis: {
    label: 'Electrolysis Unit',
    input: 'ice',
    ratePerCycle: 3,
    outputs: { oxygen: 2, hydrogen: 1 },
  },
  hydroponics: {
    label: 'Hydroponics Bay',
    input: 'water',
    secondaryInput: 'oxygen',
    ratePerCycle: 2,
    secondaryRatePerCycle: 1,
    outputs: { food: 2 },
  },
  reactor: {
    label: 'Reactor',
    input: 'fuel',
    ratePerCycle: 1,
    outputs: { charge: 4 },
  },
};

export const LIFE_SUPPORT_COUNTDOWN_CYCLES = 5;

export const RELAXED_PENALTY = {
  sensorRangeMultiplier: 0.7,
  jumpCostMultiplier: 1.3,
};

export const STAR_CLASSES = [
  { key: 'O', label: 'O-type (blue giant)', weight: 1, color: '#9db4ff', stable: true },
  { key: 'B', label: 'B-type (blue-white)', weight: 2, color: '#aebfff', stable: true },
  { key: 'A', label: 'A-type (white)', weight: 4, color: '#e3e8ff', stable: true },
  { key: 'F', label: 'F-type (yellow-white)', weight: 6, color: '#fff3d6', stable: true },
  { key: 'G', label: 'G-type (yellow)', weight: 8, color: '#ffe17a', stable: true },
  { key: 'K', label: 'K-type (orange)', weight: 8, color: '#ffb066', stable: true },
  { key: 'M', label: 'M-type (red dwarf)', weight: 10, color: '#ff8266', stable: true },
  { key: 'WD', label: 'White dwarf', weight: 2, color: '#dce6ff', stable: false },
  { key: 'NS', label: 'Neutron star', weight: 1, color: '#c9d8ff', stable: false },
];

export const PLANET_CLASSES = [
  { key: 'rocky', label: 'Rocky', weight: 6, minerals: ['ore'], color: '#a68a6d' },
  { key: 'molten', label: 'Molten', weight: 3, minerals: ['ore'], color: '#e2603a' },
  { key: 'ice', label: 'Ice world', weight: 5, minerals: ['ice'], color: '#bfe4f2' },
  { key: 'ocean', label: 'Ocean world', weight: 4, minerals: ['ice', 'water'], color: '#3f7fb0' },
  { key: 'gas-giant', label: 'Gas giant', weight: 5, minerals: [], color: '#d8b06b' },
  { key: 'barren', label: 'Barren', weight: 4, minerals: ['ore'], color: '#8b8b8b' },
];

export const BIOCHEMISTRY_TYPES = [
  { key: 'carbon-dna', label: 'Carbon (DNA)', weight: 20 },
  { key: 'carbon-rna', label: 'Carbon (RNA)', weight: 4 },
  { key: 'silicon', label: 'Silicon-based', weight: 1 },
];

export const LIFE_STAGES = [
  { key: 'microbial', label: 'Microbial', weight: 12 },
  { key: 'simple', label: 'Simple multicellular', weight: 5 },
  { key: 'complex', label: 'Complex organisms', weight: 2 },
];

export const BIOSIGNATURE_BASE_CHANCE = 0.12;

export const SAVE_SLOT_COUNT = 3;
export const SAVE_STORAGE_KEY_PREFIX = 'xeno-chart:save:slot';
export const GLOBAL_STORAGE_KEY = 'xeno-chart:global';

// --- Wormholes (§3, §2, Phase 2) ---
// Paired via a coarse bucket grid (see procgen/galaxy.js) rather than a
// direct per-system roll, so both endpoints agree on each other without any
// global/non-lazy bookkeeping: a bucket either has a pair or it doesn't, and
// querying either endpoint's system yields the same answer.
export const WORMHOLE_BUCKET_CELLS = 40;
export const WORMHOLE_BUCKET_CHANCE = 0.5;
export const WORMHOLE_SNAP_SEARCH_RADIUS = 4;

// --- Hazards (§10, Phase 2) ---
export const HAZARD_TYPES = [
  { key: 'solar-flare', label: 'Solar Flare' },
  { key: 'radiation-zone', label: 'Radiation Zone' },
  { key: 'asteroid-field', label: 'Asteroid Field' },
];
export const HAZARD_CHANCE_EACH = 0.08;
export const SOLAR_FLARE_SCAN_MULTIPLIER = 0.6;
export const RADIATION_ZONE_SCAN_CHARGE_MULTIPLIER = 1.75;
export const ASTEROID_FIELD_FUEL_MULTIPLIER = 1.4;

// --- Achievements (§11, Phase 2) — flat list, no tiers. `tier` drives the
// celebration rarity (§11a) when the achievement unlocks.
export const ACHIEVEMENTS = [
  { key: 'first-pulsar', label: 'First Pulsar', description: 'Discover a neutron star.', tier: 'notable' },
  { key: 'first-life', label: 'First Contact', description: 'Discover a biosignature.', tier: 'rare' },
  { key: 'first-wormhole', label: 'Through the Looking Glass', description: 'Discover a wormhole.', tier: 'rare' },
  { key: 'first-silicon-life', label: 'Not As We Know It', description: 'Discover silicon-based life.', tier: 'rare' },
  { key: 'first-harvest', label: 'First Haul', description: 'Harvest minerals for the first time.', tier: 'minor' },
  { key: 'ten-systems-mapped', label: 'Cartographer', description: 'Map 10 systems.', tier: 'notable' },
  { key: 'survive-stranding', label: 'Limping Home', description: 'Recover from being stranded.', tier: 'notable' },
];

// --- Ship cosmetics (§12, Phase 2) — purely visual, no mechanical effect.
// `unlockAchievement: null` entries are available from the start.
export const HULL_COLORS = [
  { key: 'default', label: 'Standard Gray', color: '#c7cbd6', unlockAchievement: null },
  { key: 'teal', label: 'Deep Teal', color: '#5fc9d8', unlockAchievement: null },
  { key: 'gold', label: 'Cartographer Gold', color: '#e8a34c', unlockAchievement: 'ten-systems-mapped' },
  { key: 'verdant', label: 'Verdant Green', color: '#5fd88a', unlockAchievement: 'first-life' },
  { key: 'violet', label: 'Wormhole Violet', color: '#b98ce0', unlockAchievement: 'first-wormhole' },
];
