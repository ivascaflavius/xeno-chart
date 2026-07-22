import { rngFor } from '../procgen/prng.js';

// Purely decorative background starfield for the galactic starmap — distinct
// from system markers (which represent actual, jumpable star systems). These
// give the void some depth so it reads as "space" rather than flat black,
// the same way real background stars are visible even toward regions you
// haven't explored yet. Cached per coarse region like nebula.js, and sized in
// raw viewBox units (not multiplied by the starmap's pan/zoom scale) so stars
// stay a constant, small screen size regardless of zoom level — real stars
// don't get bigger as you zoom a star *chart*, only the systems on it do.

const REGION_SIZE_LY = 20;
const STARS_PER_REGION = 10;

const regionCache = new Map();

function generateRegion(baseSeedInt, rx, ry) {
  const key = `${baseSeedInt}:${rx}:${ry}`;
  if (regionCache.has(key)) return regionCache.get(key);

  const rng = rngFor(baseSeedInt, 'bgstar', rx, ry);
  const stars = [];
  for (let i = 0; i < STARS_PER_REGION; i++) {
    stars.push({
      x: rx * REGION_SIZE_LY + rng.float() * REGION_SIZE_LY,
      y: ry * REGION_SIZE_LY + rng.float() * REGION_SIZE_LY,
      size: 0.35 + rng.float() * 0.65,
      twinkle: rng.float(),
    });
  }
  regionCache.set(key, stars);
  return stars;
}

/** All decorative background stars (real ly coordinates) whose region overlaps the given box. */
export function getBackgroundStarsInBox(baseSeedInt, minX, maxX, minY, maxY) {
  const minRx = Math.floor(minX / REGION_SIZE_LY);
  const maxRx = Math.floor(maxX / REGION_SIZE_LY);
  const minRy = Math.floor(minY / REGION_SIZE_LY);
  const maxRy = Math.floor(maxY / REGION_SIZE_LY);
  const stars = [];
  for (let rx = minRx; rx <= maxRx; rx++) {
    for (let ry = minRy; ry <= maxRy; ry++) {
      stars.push(...generateRegion(baseSeedInt, rx, ry));
    }
  }
  return stars;
}
