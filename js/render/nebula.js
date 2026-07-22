import { rngFor } from '../procgen/prng.js';

// Nebula backgrounds (§15a, Phase 3) — 2-3 soft-edged blobs generated once
// per coarse galactic region and cached, purely as a function of
// (baseSeedInt, region), so panning never recomputes art that's already been
// seen. Softness is simulated with a few concentric low-opacity circles
// (matching the technique already used for star portraits/young-star
// clouds) rather than an SVG blur filter, to stay cheap on mobile.

const REGION_SIZE_LY = 48;
const NEBULA_REGION_CHANCE = 0.55;
const NEBULA_COLORS = ['#5f6fd8', '#d85f9e', '#5fd8c9', '#d8a35f', '#8c5fd8'];

const regionCache = new Map();

function generateRegion(baseSeedInt, rx, ry) {
  const key = `${baseSeedInt}:${rx}:${ry}`;
  if (regionCache.has(key)) return regionCache.get(key);

  const rng = rngFor(baseSeedInt, 'nebula', rx, ry);
  const blobs = [];
  if (rng.chance(NEBULA_REGION_CHANCE)) {
    const color = rng.pick(NEBULA_COLORS);
    const count = rng.int(2, 3);
    for (let i = 0; i < count; i++) {
      blobs.push({
        x: rx * REGION_SIZE_LY + rng.float() * REGION_SIZE_LY,
        y: ry * REGION_SIZE_LY + rng.float() * REGION_SIZE_LY,
        radius: REGION_SIZE_LY * (0.35 + rng.float() * 0.35),
        color,
      });
    }
  }
  regionCache.set(key, blobs);
  return blobs;
}

/** All nebula blobs (real ly coordinates) whose region overlaps the given box — same viewport-culling shape as getSystemsInBox. */
export function getNebulaBlobsInBox(baseSeedInt, minX, maxX, minY, maxY) {
  const minRx = Math.floor(minX / REGION_SIZE_LY);
  const maxRx = Math.floor(maxX / REGION_SIZE_LY);
  const minRy = Math.floor(minY / REGION_SIZE_LY);
  const maxRy = Math.floor(maxY / REGION_SIZE_LY);
  const blobs = [];
  for (let rx = minRx; rx <= maxRx; rx++) {
    for (let ry = minRy; ry <= maxRy; ry++) {
      blobs.push(...generateRegion(baseSeedInt, rx, ry));
    }
  }
  return blobs;
}
