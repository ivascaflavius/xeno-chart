import { RESOURCE_CAPS, BUFFER_CAPS, LIFE_SUPPORT_COUNTDOWN_CYCLES } from '../data/constants.js';

export const RESOURCE_KEYS = new Set(['fuel', 'charge', 'oxygen', 'food']);
export const BUFFER_KEYS = new Set(['ore', 'ice', 'water', 'hydrogen']);

export function capFor(key) {
  return RESOURCE_KEYS.has(key) ? RESOURCE_CAPS[key] : BUFFER_CAPS[key];
}

export function getAmount(save, key) {
  return RESOURCE_KEYS.has(key) ? save.resources[key] : save.buffers[key];
}

function clamp(value, cap) {
  return Math.max(0, Math.min(cap, value));
}

/** Add (or subtract, with a negative amount) from a resource or module buffer, clamped to [0, cap]. */
export function addAmount(save, key, amount) {
  const store = RESOURCE_KEYS.has(key) ? save.resources : save.buffers;
  store[key] = clamp(store[key] + amount, capFor(key));
}

/** True and deducts if `amount` is available; false and no-op otherwise. */
export function trySpend(save, key, amount) {
  if (getAmount(save, key) < amount) return false;
  addAmount(save, key, -amount);
  return true;
}

export function statusFor(amount, cap) {
  if (amount <= 0) return 'red';
  if (cap > 0 && amount / cap < 0.34) return 'amber';
  return 'green';
}

/**
 * Check + advance the life-support failure countdown (§5). Call once after
 * every cycle-advancing action. Sets save.gameOver when the countdown expires.
 */
export function updateLifeSupport(save) {
  const critical = save.resources.oxygen <= 0 || save.resources.food <= 0;
  if (!critical) {
    save.lifeSupportCountdown = null;
    return;
  }
  save.lifeSupportCountdown = save.lifeSupportCountdown === null
    ? LIFE_SUPPORT_COUNTDOWN_CYCLES
    : save.lifeSupportCountdown - 1;
  if (save.lifeSupportCountdown <= 0) {
    if (save.difficulty === 'relaxed') {
      // Relaxed mode never ends the run — it degrades ship capability instead (§9).
      save.degradedLevel += 1;
      save.lifeSupportCountdown = null;
    } else {
      save.gameOver = true;
      save.gameOverReason = 'life-support';
    }
  }
}
