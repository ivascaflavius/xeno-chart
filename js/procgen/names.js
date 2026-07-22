import { rngFor } from './prng.js';
import {
  GALAXY_ROOTS,
  GALAXY_SUFFIXES,
  ROMAN_NUMERALS,
  SPECIES_GENUS_ROOTS,
  SPECIES_GENUS_SUFFIXES,
  SPECIES_EPITHET_ROOTS,
} from '../data/wordBanks.js';

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
