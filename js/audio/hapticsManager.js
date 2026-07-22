// Thin wrapper around the Vibration API (§15c). No-ops silently wherever
// unsupported (notably iOS Safari) — haptics must always be a redundant
// layer on top of visual/audio feedback, never load-bearing.

const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let settings = { enabled: true };

export function isSupported() {
  return supported;
}

export function configure(newSettings) {
  settings = newSettings;
}

function vibrate(pattern) {
  if (!supported || !settings.enabled) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw if called outside a user-gesture context — never let that surface.
  }
}

const TIER_PATTERNS = {
  minor: [15],
  notable: [20, 30, 20],
  rare: [30, 40, 30, 40, 60],
  landmark: [40, 50, 40, 50, 40, 50, 100],
};

/** Pulse scaled by celebration tier (§11a, §15c). */
export function vibrateForTier(tier) {
  vibrate(TIER_PATTERNS[tier] || TIER_PATTERNS.minor);
}

export function vibrateWarning() {
  vibrate([50, 100, 50, 100, 50]);
}

export function vibrateModuleAlert() {
  vibrate([30]);
}
