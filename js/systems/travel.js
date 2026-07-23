import {
  BASE_JUMP_FUEL_COST,
  FUEL_COST_PER_LY,
  JUMP_OXYGEN_DRAW,
  JUMP_FOOD_DRAW,
  WORMHOLE_FLAT_FUEL_COST,
  RELAXED_PENALTY,
  SHIP_CLASSES,
  DISTRESS_BEACON_MAX_USES,
  DISTRESS_BEACON_FUEL_AMOUNT,
} from '../data/constants.js';
import { getAmount, addAmount, updateLifeSupport } from './resources.js';
import { runModules } from './modules.js';
import { scanRangeMultiplier, jumpFuelMultiplier } from './hazards.js';

/** The ship-class def for save.shipClass (§12, Phase 3), falling back to 'standard' for older saves. */
function shipClassFor(save) {
  return SHIP_CLASSES.find((c) => c.key === save.shipClass) || SHIP_CLASSES[0];
}

export function jumpCostMultiplier(save) {
  return Math.pow(RELAXED_PENALTY.jumpCostMultiplier, save.degradedLevel || 0) * shipClassFor(save).fuelCostMultiplier;
}

/**
 * save.sensorRange is the upgradeable ship stat (§6); this applies the
 * Relaxed-mode degrade penalty (§9), a solar-flare hazard penalty (§10) if
 * the ship's *current* system has one, and the ship class's sensor bonus
 * (§12, Phase 3) on top.
 */
export function effectiveSensorRange(save, currentHazard) {
  const base = save.sensorRange * Math.pow(RELAXED_PENALTY.sensorRangeMultiplier, save.degradedLevel || 0);
  return base * scanRangeMultiplier(currentHazard) * shipClassFor(save).sensorRangeMultiplier;
}

/** Simple linear-with-minimum jump cost formula (§5), plus an asteroid-field surcharge (§10) if the destination has one. */
export function computeJumpCost(save, distanceLy, targetHazard) {
  const mult = jumpCostMultiplier(save) * jumpFuelMultiplier(targetHazard);
  return {
    fuel: (BASE_JUMP_FUEL_COST + distanceLy * FUEL_COST_PER_LY) * mult,
    oxygen: JUMP_OXYGEN_DRAW,
    food: JUMP_FOOD_DRAW,
  };
}

/** Wormhole jumps use a flat cost regardless of real-space distance (§2, §3), still subject to the same modifiers. */
export function computeWormholeJumpCost(save, targetHazard) {
  const mult = jumpCostMultiplier(save) * jumpFuelMultiplier(targetHazard);
  return {
    fuel: WORMHOLE_FLAT_FUEL_COST * mult,
    oxygen: JUMP_OXYGEN_DRAW,
    food: JUMP_FOOD_DRAW,
  };
}

export function canAffordJump(save, cost) {
  return getAmount(save, 'fuel') >= cost.fuel;
}

/** Furthest distance reachable on current fuel — drives the starmap's fuel-range ring. Ignores destination-specific hazards since it isn't about one specific target. */
export function maxJumpRangeLy(save) {
  const mult = jumpCostMultiplier(save);
  const fuel = getAmount(save, 'fuel');
  const distance = (fuel / mult - BASE_JUMP_FUEL_COST) / FUEL_COST_PER_LY;
  return Math.max(0, distance);
}

export function updateStranded(save) {
  save.stranded = getAmount(save, 'fuel') <= 0;
}

/** Mutates `save` in place given a precomputed cost (from computeJumpCost/computeWormholeJumpCost) and the real-space distance covered (for stats, regardless of route). */
export function performJump(save, cost, distanceLy, targetSystemId) {
  if (!canAffordJump(save, cost)) {
    return { ok: false, reason: 'insufficient-fuel' };
  }

  addAmount(save, 'fuel', -cost.fuel);
  addAmount(save, 'oxygen', -cost.oxygen);
  addAmount(save, 'food', -cost.food);

  save.position.systemId = targetSystemId;
  save.cycle += 1;
  save.stats.jumpsMade += 1;
  save.stats.distanceTraveled += distanceLy;
  if (!save.stats.systemsVisited.includes(targetSystemId)) {
    save.stats.systemsVisited.push(targetSystemId);
  }

  runModules(save, 1);
  updateStranded(save);
  updateLifeSupport(save);

  return { ok: true };
}

/** Emergency fuel top-up while stranded (§5) — not a resource-costed action, usable up to DISTRESS_BEACON_MAX_USES times per expedition. */
export function sendDistressBeacon(save) {
  if (save.distressBeaconsUsed >= DISTRESS_BEACON_MAX_USES) return { ok: false, reason: 'no-beacons-left' };
  if (!save.stranded) return { ok: false, reason: 'not-stranded' };
  addAmount(save, 'fuel', DISTRESS_BEACON_FUEL_AMOUNT);
  save.distressBeaconsUsed += 1;
  updateStranded(save);
  return { ok: true };
}
