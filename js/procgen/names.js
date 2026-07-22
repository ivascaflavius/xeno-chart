import { rngFor } from './prng.js';
import {
  GALAXY_ROOTS,
  GALAXY_SUFFIXES,
  ROMAN_NUMERALS,
  SPECIES_GENUS_ROOTS,
  SPECIES_GENUS_SUFFIXES,
  SPECIES_EPITHET_ROOTS,
  SHIP_NAME_ADJECTIVES,
  SHIP_NAME_NOUNS,
  STAR_SYSTEM_ROOTS,
} from '../data/wordBanks.js';

// Reuses the species genus word bank in its own 'clade' RNG namespace, so a
// clade name never coincides with any individual species binomial derived
// from the same genesisMarkerId, while still reading as kin to it.

/** Deterministic Greek/Latin-sounding galaxy name, e.g. "Xandros-7", "Velorum IX". */
export function generateGalaxyName(baseSeedInt) {
  const rng = rngFor(baseSeedInt, 'galaxyName');
  const root = rng.pick(GALAXY_ROOTS);
  const suffix = rng.pick(GALAXY_SUFFIXES);
  const useRoman = rng.chance(0.5);
  const tag = useRoman ? rng.pick(ROMAN_NUMERALS) : String(rng.int(1, 99));
  const sep = useRoman ? ' ' : '-';
  return `${root}${suffix}${sep}${tag}`;
}

/** Deterministic Latin-sounding binomial for a life discovery, e.g. "Xenocus errans". */
export function generateSpeciesName(baseSeedInt, id) {
  const rng = rngFor(baseSeedInt, id, 'species');
  const genus = rng.pick(SPECIES_GENUS_ROOTS) + rng.pick(SPECIES_GENUS_SUFFIXES);
  const epithet = rng.pick(SPECIES_EPITHET_ROOTS);
  return `${genus} ${epithet}`;
}

/**
 * Deterministic clade name for a genesis lineage (§3, §11, Phase 3), e.g.
 * "Clade Nebulon IV". One name per genesisMarkerId, so every life discovery
 * sharing an origin point shows the same clade in the lineage-web codex view.
 */
export function generateCladeName(baseSeedInt, genesisMarkerId) {
  const rng = rngFor(baseSeedInt, genesisMarkerId, 'clade');
  const root = rng.pick(SPECIES_GENUS_ROOTS) + rng.pick(SPECIES_GENUS_SUFFIXES);
  const numeral = rng.pick(ROMAN_NUMERALS);
  return `Clade ${root} ${numeral}`;
}

/** Deterministic default ship name, used when the player leaves the name field blank. */
export function generateShipName(baseSeedInt) {
  const rng = rngFor(baseSeedInt, 'shipName');
  return `${rng.pick(SHIP_NAME_ADJECTIVES)} ${rng.pick(SHIP_NAME_NOUNS)}`;
}

/** Deterministic catalog-style system name, e.g. "Kepler-437" (§7) — flavor on top of the star's class label, not a replacement for it. */
export function generateSystemName(baseSeedInt, systemId) {
  const rng = rngFor(baseSeedInt, systemId, 'systemName');
  const root = rng.pick(STAR_SYSTEM_ROOTS);
  const number = rng.int(1, 999);
  return `${root}-${number}`;
}

/** Per-planet designation off a system name, e.g. "Kepler-437 A", "Kepler-437 B". */
export function planetDesignation(systemName, index) {
  return `${systemName} ${String.fromCharCode(65 + index)}`;
}
