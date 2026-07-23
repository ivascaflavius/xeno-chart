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

// A stranded ship can call for emergency fuel up to this many times per
// expedition (§5) — beyond that, being stranded with no scan/harvest options
// left either is a genuine dead end (see gameState.js's isDeadlocked()).
export const DISTRESS_BEACON_MAX_USES = 3;
export const DISTRESS_BEACON_FUEL_AMOUNT = 10;

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

// `short` is a 1-2 word caption for the Codex grid tile (the full `label`,
// with its parenthetical, is reserved for the hover tooltip). `youngEligible`
// gates the "young/star-forming" visual modifier (§15a) — only plain
// main-sequence classes make sense as young; an evolved giant or a compact
// remnant does not, regardless of its `stable` flag (which instead governs
// whether a class is eligible for the guaranteed-safe starting system and,
// separately, whether planets can be expected to have survived around it).
export const STAR_CLASSES = [
  {
    key: 'O', label: 'O-type (blue giant)', short: 'O-type', weight: 1, color: '#9db4ff', stable: true, youngEligible: true,
  },
  {
    key: 'B', label: 'B-type (blue-white)', short: 'B-type', weight: 2, color: '#aebfff', stable: true, youngEligible: true,
  },
  {
    key: 'A', label: 'A-type (white)', short: 'A-type', weight: 4, color: '#e3e8ff', stable: true, youngEligible: true,
  },
  {
    key: 'F', label: 'F-type (yellow-white)', short: 'F-type', weight: 6, color: '#fff3d6', stable: true, youngEligible: true,
  },
  {
    key: 'G', label: 'G-type (yellow)', short: 'G-type', weight: 8, color: '#ffe17a', stable: true, youngEligible: true,
  },
  {
    key: 'K', label: 'K-type (orange)', short: 'K-type', weight: 8, color: '#ffb066', stable: true, youngEligible: true,
  },
  {
    key: 'M', label: 'M-type (red dwarf)', short: 'Red Dwarf', weight: 10, color: '#ff8266', stable: true, youngEligible: true,
  },
  {
    key: 'RG', label: 'Red giant', short: 'Red Giant', weight: 1.2, color: '#ff7a5a', stable: true, youngEligible: false,
  },
  {
    key: 'BG', label: 'Blue giant', short: 'Blue Giant', weight: 0.8, color: '#7fa3ff', stable: true, youngEligible: false,
  },
  {
    key: 'BIN', label: 'Binary system', short: 'Binary', weight: 1.5, color: '#ffce7a', stable: true, youngEligible: false,
  },
  {
    key: 'WD', label: 'White dwarf', short: 'White Dwarf', weight: 2, color: '#dce6ff', stable: false, youngEligible: false,
  },
  {
    key: 'NS', label: 'Neutron star (pulsar)', short: 'Pulsar', weight: 1, color: '#c9d8ff', stable: false, youngEligible: false,
  },
  {
    key: 'BH', label: 'Black hole', short: 'Black Hole', weight: 0.5, color: '#0a0a12', stable: false, youngEligible: false,
  },
  {
    key: 'MAG', label: 'Magnetar', short: 'Magnetar', weight: 0.5, color: '#ff7ad9', stable: false, youngEligible: false,
  },
  {
    key: 'SNR', label: 'Supernova remnant', short: 'Remnant', weight: 0.4, color: '#c9a6ff', stable: false, youngEligible: false,
  },
  {
    key: 'ROGUE', label: 'Rogue planet', short: 'Rogue', weight: 1, color: '#4a4a52', stable: false, youngEligible: false,
  },
];

// Chance a stable-class star rolls as "young/star-forming" (§15a) — a visual
// modifier layered on top of its class, not a separate class, so it composes
// with the existing star-class art rather than doubling the class list.
export const YOUNG_STAR_CHANCE = 0.12;

// Chance any given planet turns out to be a binary pair — two bodies orbiting
// a shared barycenter at that same orbital slot instead of a single world
// (§7 polish). Purely cosmetic/flavor like moons: the companion has no
// separate minerals or harvesting of its own.
export const BINARY_PLANET_CHANCE = 0.07;

// `hasSurfaceWater` gates complex/intelligent life (§3, polish round 5) — a
// planet without it can still host microbial/simple life (extremophiles,
// subsurface chemistry), but never anything more advanced, which needs
// liquid (or at least frozen) water to reflect on. Only affects that one
// clamp; it isn't a mineral or a scan-visible stat.
//
// `zones` restricts which orbital zone (§6/§7 polish round 6 — see
// procgen/habitability.js's zoneForIndex) a class can generate in: molten
// worlds and hot Jupiters belong close to the star, water-bearing worlds in
// the temperate habitable band, ice/ice-giants out in the cold — a planet is
// only ever rolled from the classes eligible for the zone it actually landed in.
export const PLANET_CLASSES = [
  {
    key: 'rocky', label: 'Rocky', weight: 6, minerals: ['ore'], color: '#a68a6d', hasSurfaceWater: false, zones: ['inner', 'habitable'],
  },
  {
    key: 'molten', label: 'Molten', weight: 3, minerals: ['ore'], color: '#e2603a', hasSurfaceWater: false, zones: ['inner'],
  },
  {
    key: 'ice', label: 'Ice world', weight: 5, minerals: ['ice'], color: '#bfe4f2', hasSurfaceWater: true, zones: ['outer'],
  },
  {
    key: 'ocean', label: 'Ocean world', weight: 4, minerals: ['ice', 'water'], color: '#3f7fb0', hasSurfaceWater: true, zones: ['habitable'],
  },
  {
    key: 'gas-giant', label: 'Gas giant', weight: 5, minerals: [], color: '#d8b06b', hasSurfaceWater: false, zones: ['inner', 'habitable', 'outer'],
  },
  {
    key: 'barren', label: 'Barren', weight: 4, minerals: ['ore'], color: '#8b8b8b', hasSurfaceWater: false, zones: ['inner', 'outer'],
  },
  {
    key: 'earth-like', label: 'Earth-analogue', weight: 3, minerals: ['ore', 'water'], color: '#3a6ea5', hasSurfaceWater: true, zones: ['habitable'],
  },
  {
    key: 'ice-giant', label: 'Ice giant', weight: 3, minerals: ['ice'], color: '#5a9bc2', hasSurfaceWater: false, zones: ['outer'],
  },
  {
    key: 'super-earth', label: 'Super-Earth', weight: 3, minerals: ['ore', 'water'], color: '#5a8a5f', hasSurfaceWater: true, zones: ['inner', 'habitable'],
  },
  {
    key: 'iron', label: 'Iron planet', weight: 2, minerals: ['ore'], color: '#6b6b73', hasSurfaceWater: false, zones: ['inner'],
  },
  {
    key: 'dwarf', label: 'Dwarf planet', weight: 4, minerals: ['ice'], color: '#9a8f8a', hasSurfaceWater: false, zones: ['outer'],
  },
];

// Moon count roll range per planet class — cosmetic only (orbit diagram in
// Scan Detail), no mechanical effect.
export const MOON_COUNT_RANGES = {
  rocky: [0, 2],
  molten: [0, 1],
  ice: [0, 2],
  ocean: [0, 1],
  'gas-giant': [0, 4],
  barren: [0, 2],
  'earth-like': [0, 2],
  'ice-giant': [0, 3],
  'super-earth': [0, 3],
  iron: [0, 1],
  dwarf: [0, 2],
};

// Habitable-zone life bias (§6, §7, polish round 5) — planets outside the
// system's habitable orbital-index band still occasionally have life, but
// nowhere near as often as those inside it.
export const HABITABLE_ZONE_LIFE_MULTIPLIER = 1.6;
export const OUTSIDE_HABITABLE_ZONE_LIFE_MULTIPLIER = 0.08;

// `short` is a 1-word Codex grid caption (paired with a LIFE_STAGES `short`
// below to make a 2-word tile caption); `label` stays full-length for tooltips.
export const BIOCHEMISTRY_TYPES = [
  {
    key: 'carbon-dna', label: 'Carbon (DNA)', short: 'Carbon-DNA', weight: 20,
  },
  {
    key: 'carbon-rna', label: 'Carbon (RNA)', short: 'Carbon-RNA', weight: 4,
  },
  {
    key: 'silicon', label: 'Silicon-based', short: 'Silicon', weight: 1,
  },
  {
    key: 'mirror-chirality', label: 'Mirror-chirality', short: 'Mirror', weight: 0.6,
  },
  {
    key: 'invented-polymer', label: 'Invented polymer', short: 'Polymer', weight: 0.3,
  },
];

export const LIFE_STAGES = [
  {
    key: 'microbial', label: 'Microbial', short: 'Microbial', weight: 12,
  },
  {
    key: 'simple', label: 'Simple multicellular', short: 'Simple', weight: 5,
  },
  {
    key: 'complex', label: 'Complex organisms', short: 'Complex', weight: 2,
  },
  {
    key: 'intelligent', label: 'Intelligent', short: 'Intelligent', weight: 0.4,
  },
];

export const BIOSIGNATURE_BASE_CHANCE = 0.12;

// --- Intelligent life & encounters (§3, Phase 3) ---
export const TECH_TIERS = [
  { key: 'pre-industrial', label: 'Pre-industrial', weight: 5 },
  { key: 'industrial', label: 'Industrial', weight: 3 },
  { key: 'post-industrial', label: 'Post-industrial', weight: 2 },
  { key: 'silent', label: 'Silent (signals only)', weight: 1 },
];

// A simple 50/50 outcome, no combat mechanics: hostile disables one random
// module (reusing the existing module-failure/status-dot system) for a set
// number of cycles; peaceful is flavor-only.
export const ENCOUNTER_TYPES = [
  { key: 'peaceful', label: 'Peaceful', weight: 1 },
  { key: 'hostile', label: 'Hostile', weight: 1 },
];
export const HOSTILE_MODULE_DISABLE_CYCLES = 4;

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
  {
    key: 'first-pulsar', label: 'First Pulsar', description: 'Discover a neutron star.', tier: 'notable', iconName: 'pulsar',
  },
  {
    key: 'first-life', label: 'First Contact', description: 'Discover a biosignature.', tier: 'rare', iconName: 'dna',
  },
  {
    key: 'first-wormhole', label: 'Through the Looking Glass', description: 'Discover a wormhole.', tier: 'rare', iconName: 'wormhole',
  },
  {
    key: 'first-silicon-life', label: 'Not As We Know It', description: 'Discover silicon-based life.', tier: 'rare', iconName: 'atom',
  },
  {
    key: 'first-harvest', label: 'First Haul', description: 'Harvest minerals for the first time.', tier: 'minor', iconName: 'harvest',
  },
  {
    key: 'ten-systems-mapped', label: 'Cartographer', description: 'Map 10 systems.', tier: 'notable', iconName: 'map',
  },
  {
    key: 'survive-stranding', label: 'Limping Home', description: 'Recover from being stranded.', tier: 'notable', iconName: 'lifebuoy',
  },
  {
    key: 'first-intelligent-life', label: 'First Contact (Intelligent)', description: 'Discover intelligent life.', tier: 'landmark', iconName: 'brain',
  },
  {
    key: 'first-black-hole', label: 'Event Horizon', description: 'Discover a black hole.', tier: 'notable', iconName: 'blackhole',
  },
  {
    key: 'first-magnetar', label: 'Field Lines', description: 'Discover a magnetar.', tier: 'notable', iconName: 'magnetar',
  },
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

// --- Ship classes (§12, Phase 3) — optional starting loadout, purely a
// mechanical multiplier pair applied at travel/sensor time, no new subsystems.
export const SHIP_CLASSES = [
  {
    key: 'standard', label: 'Standard', description: 'Balanced loadout — no bonuses or penalties.', sensorRangeMultiplier: 1, fuelCostMultiplier: 1,
  },
  {
    key: 'scanner', label: 'Scanner-Focused', description: '+25% sensor range; standard fuel costs.', sensorRangeMultiplier: 1.25, fuelCostMultiplier: 1,
  },
  {
    key: 'efficient', label: 'Fuel-Efficient', description: 'Standard sensor range; -20% jump fuel cost.', sensorRangeMultiplier: 1, fuelCostMultiplier: 0.8,
  },
];
