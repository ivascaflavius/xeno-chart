// Root/prefix/suffix word banks for procedural naming (§7, §11).
// Pure data — consumed by procgen/names.js.

export const GALAXY_ROOTS = [
  'Xandr', 'Velor', 'Cassid', 'Nyx', 'Orith', 'Thessal', 'Corvan', 'Aveline',
  'Drystal', 'Meridi', 'Solan', 'Vantor', 'Ilyrium', 'Ophel', 'Zephyr',
  'Caldon', 'Rhessa', 'Umbral', 'Kentar', 'Novad',
];

export const GALAXY_SUFFIXES = ['os', 'um', 'a', 'ion', 'ar', 'ix', 'is', ''];

export const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

export const SPECIES_GENUS_ROOTS = [
  'Xeno', 'Astro', 'Crypto', 'Micro', 'Photo', 'Chrono', 'Litho', 'Hydro',
  'Thermo', 'Nebul', 'Silic', 'Carbon', 'Halo', 'Vitri', 'Umbr', 'Lumin',
];

export const SPECIES_GENUS_SUFFIXES = ['us', 'a', 'um', 'is', 'on', 'ix'];

export const SPECIES_EPITHET_ROOTS = [
  'minor', 'major', 'vulgaris', 'profundus', 'lucens', 'silvanus', 'errans',
  'tenuis', 'robustus', 'pallidus', 'obscurus', 'fragilis', 'communis',
];

export const SHIP_NAME_ADJECTIVES = [
  'Silent', 'Restless', 'Wandering', 'Lone', 'Iron', 'Distant', 'Quiet',
  'Steadfast', 'Drifting', 'Last', 'Faithful', 'Errant', 'Weathered', 'Bold',
];

export const SHIP_NAME_NOUNS = [
  'Vanguard', 'Wayfarer', 'Harbinger', 'Wanderer', 'Compass', 'Horizon',
  'Ember', 'Tern', 'Meridian', 'Ronin', 'Sojourner', 'Pilgrim', 'Signal', 'Drift',
];

// Real-astronomy-flavored catalog prefixes for system nomenclature (§7) —
// evokes the exoplanet-survey naming convention (Kepler-186, Gliese-667...)
// without claiming to be any specific real catalog.
export const STAR_SYSTEM_ROOTS = [
  'Kepler', 'Gliese', 'Trappist', 'Proxima', 'Wolf', 'Ross', 'Barnard',
  'Luyten', 'Groombridge', 'Lacaille', 'Struve', 'Teegarden', 'Innes', 'Tau',
];
