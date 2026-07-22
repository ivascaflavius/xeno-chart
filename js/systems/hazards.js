import {
  SOLAR_FLARE_SCAN_MULTIPLIER,
  RADIATION_ZONE_SCAN_CHARGE_MULTIPLIER,
  ASTEROID_FIELD_FUEL_MULTIPLIER,
} from '../data/constants.js';

// Pure multiplier lookups for the hazard flag on a system (§10) — kept
// separate from travel.js so "what a hazard does" stays in one place
// regardless of which action (scan, jump) ends up applying it.

export function scanRangeMultiplier(hazard) {
  return hazard?.type === 'solar-flare' ? SOLAR_FLARE_SCAN_MULTIPLIER : 1;
}

export function closeScanChargeMultiplier(hazard) {
  return hazard?.type === 'radiation-zone' ? RADIATION_ZONE_SCAN_CHARGE_MULTIPLIER : 1;
}

export function jumpFuelMultiplier(hazard) {
  return hazard?.type === 'asteroid-field' ? ASTEROID_FIELD_FUEL_MULTIPLIER : 1;
}
