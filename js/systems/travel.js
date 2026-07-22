import {
  BASE_JUMP_FUEL_COST,
  FUEL_COST_PER_LY,
  JUMP_OXYGEN_DRAW,
  JUMP_FOOD_DRAW,
  RELAXED_PENALTY,
} from '../data/constants.js';
import { getAmount, addAmount, updateLifeSupport } from './resources.js';
import { runModules } from './modules.js';

export function jumpCostMultiplier(save) {
  return Math.pow(RELAXED_PENALTY.jumpCostMultiplier, save.degradedLevel || 0);
}

/** save.sensorRange is the upgradeable ship stat (§6); this applies the Relaxed-mode degrade penalty (§9) on top. */
export function effectiveSensorRange(save) {
  return save.sensorRange * Math.pow(RELAXED_PENALTY.sensorRangeMultiplier, save.degradedLevel || 0);
}

/** Simple linear-with-minimum jump cost formula (§5). */
export function computeJumpCost(save, distanceLy) {
  const mult = jumpCostMultiplier(save);
  return {
    fuel: (BASE_JUMP_FUEL_COST + distanceLy * FUEL_COST_PER_LY) * mult,
    oxygen: JUMP_OXYGEN_DRAW,
    food: JUMP_FOOD_DRAW,
  };
}

export function canAffordJump(save, cost) {
  return getAmount(save, 'fuel') >= cost.fuel;
}

/** Furthest distance reachable on current fuel — drives the starmap's fuel-range ring. */
export function maxJumpRangeLy(save) {
  const mult = jumpCostMultiplier(save);
  const fuel = getAmount(save, 'fuel');
  const distance = (fuel / mult - BASE_JUMP_FUEL_COST) / FUEL_COST_PER_LY;
  return Math.max(0, distance);
}

export function updateStranded(save) {
  save.stranded = getAmount(save, 'fuel') <= 0;
}

/** Mutates `save` in place. Caller has already confirmed affordability via canAffordJump. */
export function performJump(save, distanceLy, targetSystemId) {
  const cost = computeJumpCost(save, distanceLy);
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

/** One-time emergency fuel top-up while stranded (§5) — not a resource-costed action. */
export function sendDistressBeacon(save) {
  if (save.distressBeaconUsed) return { ok: false, reason: 'already-used' };
  if (!save.stranded) return { ok: false, reason: 'not-stranded' };
  addAmount(save, 'fuel', 10);
  save.distressBeaconUsed = true;
  updateStranded(save);
  return { ok: true };
}
