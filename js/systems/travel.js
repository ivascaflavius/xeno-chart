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
import { getSystem, getSystemsInRadius, distanceLy } from '../procgen/galaxy.js';

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

/**
 * Every jump cost worth comparing fuel against right now: the current
 * system's wormhole link (if any) plus every system the player has ever
 * discovered (save.discoveries — a stable, saved list, unlike the starmap's
 * viewport-dependent rendering) or can currently detect within sensor range.
 * Used to tell "stranded" (no known jump is affordable) apart from merely
 * "low on fuel" — a flat fuel<=0 check misses the common case where a
 * player has, say, 2 fuel left but every reachable system costs more.
 */
function candidateJumpFuelCosts(save, baseSeedInt) {
  const currentSys = getSystem(baseSeedInt, save.position.systemId);
  const range = effectiveSensorRange(save, currentSys.hazard);
  const ids = new Set(Object.keys(save.discoveries));
  for (const stub of getSystemsInRadius(baseSeedInt, currentSys.pos, range)) ids.add(stub.id);
  ids.delete(currentSys.id);

  const costs = [];
  if (currentSys.wormholeTo) {
    const target = getSystem(baseSeedInt, currentSys.wormholeTo);
    costs.push(computeWormholeJumpCost(save, target.hazard).fuel);
  }
  for (const id of ids) {
    const target = getSystem(baseSeedInt, id);
    const distance = distanceLy(currentSys.pos, target.pos);
    costs.push(computeJumpCost(save, distance, target.hazard).fuel);
  }
  return costs;
}

/** True if at least one known or currently-detected system is within jump range on current fuel. */
export function hasAnyAffordableJump(save, baseSeedInt) {
  const costs = candidateJumpFuelCosts(save, baseSeedInt);
  if (costs.length === 0) return true; // nothing to compare against yet — don't call it stranded prematurely
  const fuel = getAmount(save, 'fuel');
  return costs.some((cost) => fuel >= cost);
}

export function updateStranded(save, baseSeedInt) {
  save.stranded = !hasAnyAffordableJump(save, baseSeedInt);
}

/** Mutates `save` in place given a precomputed cost (from computeJumpCost/computeWormholeJumpCost) and the real-space distance covered (for stats, regardless of route). */
export function performJump(save, cost, distanceLy, targetSystemId, baseSeedInt) {
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
  updateStranded(save, baseSeedInt);
  updateLifeSupport(save);

  return { ok: true };
}

/** Emergency fuel top-up while stranded (§5) — not a resource-costed action, usable up to DISTRESS_BEACON_MAX_USES times per expedition. */
export function sendDistressBeacon(save, baseSeedInt) {
  if (save.distressBeaconsUsed >= DISTRESS_BEACON_MAX_USES) return { ok: false, reason: 'no-beacons-left' };
  if (!save.stranded) return { ok: false, reason: 'not-stranded' };
  addAmount(save, 'fuel', DISTRESS_BEACON_FUEL_AMOUNT);
  save.distressBeaconsUsed += 1;
  updateStranded(save, baseSeedInt);
  return { ok: true };
}
