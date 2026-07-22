import { rngFor } from '../procgen/prng.js';

// Animated main menu scene (§15b, Phase 3). The ship never actually moves
// relative to the planet — motion reads entirely from the two parallax
// starfield layers scrolling past and the exhaust flicker, which avoids the
// visible seam a literal approach-then-reset animation would have and is
// far cheaper to keep smooth on mobile. All animation is CSS (see
// css/styles.css); this module only builds the static SVG markup once.
//
// Fixed decorative seed — this scene is cosmetic, not part of any save, so
// it doesn't need to vary with the player's expedition seed. Using a stable
// local PRNG (rather than Math.random()) just avoids a visual "pop" if the
// main menu is ever re-rendered without a full page reload.
const SCENE_SEED = 913_204_771;

const TILE_WIDTH = 400;
const TILE_HEIGHT = 260;

function starField(className, count, radiusRange, seedTag) {
  const rng = rngFor(SCENE_SEED, seedTag);
  let stars = '';
  for (let i = 0; i < count; i++) {
    const x = rng.float() * TILE_WIDTH;
    const y = rng.float() * TILE_HEIGHT;
    const r = radiusRange[0] + rng.float() * (radiusRange[1] - radiusRange[0]);
    const opacity = (0.3 + rng.float() * 0.6).toFixed(2);
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${opacity}"/>`;
  }
  return `
    <g class="${className}">
      <g class="menu-scene-tile" transform="translate(0,0)">${stars}</g>
      <g class="menu-scene-tile" transform="translate(${TILE_WIDTH},0)">${stars}</g>
    </g>
  `;
}

/** Builds the (static) scene markup once; CSS drives all motion. */
export function mainMenuSceneHtml() {
  return `
    <svg class="menu-scene-svg" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      ${starField('menu-starfield-far', 40, [0.4, 1], 'far')}
      ${starField('menu-starfield-near', 20, [0.8, 1.8], 'near')}

      <g class="menu-planet" transform="translate(225,85)">
        <ellipse class="menu-planet-ring" cx="0" cy="0" rx="40" ry="11" fill="none" stroke="#d9d9e8" stroke-width="3" transform="rotate(-20)"/>
        <circle class="menu-planet-body" cx="0" cy="0" r="24" fill="#e8a34c"/>
        <ellipse class="menu-planet-ring-front" cx="0" cy="0" rx="40" ry="11" fill="none" stroke="#fff" stroke-width="1" opacity="0.4" transform="rotate(-20)"/>
      </g>

      <g transform="translate(170,105)">
        <g class="menu-ship-bob">
          <path class="menu-ship-exhaust" d="M -4 6 Q -14 0 -4 -6 Q -9 0 -4 6 Z" fill="#e8a34c"/>
          <path class="menu-ship-body" d="M 8 0 L -8 8 L -3 0 L -8 -8 Z" fill="#c7cbd6"/>
        </g>
      </g>
    </svg>
  `;
}
