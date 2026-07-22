// Habitable-zone heuristic (§6, §7, polish rounds 5-6). The data model has
// no real orbital-distance value (planets only have a generation `index`),
// so this treats index as a stand-in for "closer to/further from the star."
//
// Real habitable zones shift outward and widen around hotter, more luminous
// stars and sit close-in and narrow around cool ones (an M dwarf's habitable
// zone is famously tight) — `ZONE_BY_STAR_CLASS` encodes that as a target
// position (0 = innermost orbit, 1 = outermost) and a width in planet slots,
// kept to 1 for most classes and 2 only for the rare O/B giants so the zone
// stays a small minority of the system rather than swallowing most of it.
const ZONE_BY_STAR_CLASS = {
  O: { position: 0.85, width: 2 },
  B: { position: 0.75, width: 2 },
  A: { position: 0.6, width: 1 },
  F: { position: 0.5, width: 1 },
  G: { position: 0.4, width: 1 },
  K: { position: 0.28, width: 1 },
  M: { position: 0.15, width: 1 },
};
const DEFAULT_ZONE = { position: 0.4, width: 1 }; // degenerate remnants (WD/NS/BH/MAG) — rare anyway, chance is already suppressed elsewhere

/** Band of orbital indices (inclusive) considered habitable for a system with `count` planets around a `starClassKey` star. */
export function habitableIndexRange(count, starClassKey) {
  if (count <= 0) return { lo: -1, hi: -1 };
  const { position, width } = ZONE_BY_STAR_CLASS[starClassKey] || DEFAULT_ZONE;
  const target = Math.round(position * (count - 1));
  const lo = Math.max(0, Math.min(target, count - 1));
  const hi = Math.min(count - 1, lo + width - 1);
  return { lo, hi };
}

export function isInHabitableZone(index, count, starClassKey) {
  const { lo, hi } = habitableIndexRange(count, starClassKey);
  return index >= lo && index <= hi;
}

/** Coarse orbital zone ('inner' | 'habitable' | 'outer') an index falls into — drives which planet classes can generate there (§7 polish). */
export function zoneForIndex(index, count, starClassKey) {
  const { lo, hi } = habitableIndexRange(count, starClassKey);
  if (index < lo) return 'inner';
  if (index > hi) return 'outer';
  return 'habitable';
}
