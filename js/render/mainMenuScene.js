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

// A ring "around" a sphere only needs ONE extra pass on top of the sphere,
// not a second full half-ellipse: the complete ring drawn once (before the
// sphere) already shows every tip correctly — the sphere drawn next hides
// whatever ring happens to fall inside its silhouette either side. Redrawing
// the whole front half afterward (as this used to) re-strokes that half's
// own already-correctly-visible outer tip a second time, reading as a
// doubled line right where the ring exits the sphere. Clipping the "in
// front" redraw to the sphere's own circle fixes that: it restores only the
// segment that should cross the sphere's face, and leaves the tip alone.
// -40,0 and 40,0 are diametrically opposite on the (pre-rotation) ellipse, so
// a counter-clockwise sweep between them traces exactly the bottom half —
// the near/front side for this ring's -20° tilt.
const RING_RX = 40;
const RING_RY = 11;
const RING_FRONT_ARC = `M ${-RING_RX},0 A ${RING_RX},${RING_RY} 0 0 0 ${RING_RX},0`;

/** Builds the (static) scene markup once; CSS drives all motion. */
export function mainMenuSceneHtml() {
  return `
    <svg class="menu-scene-svg" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="menu-planet-clip"><circle cx="0" cy="0" r="24"/></clipPath>
      </defs>

      ${starField('menu-starfield-far', 40, [0.4, 1], 'far')}
      ${starField('menu-starfield-near', 20, [0.8, 1.8], 'near')}

      <g class="menu-planet" transform="translate(225,85)">
        <ellipse class="menu-planet-ring-back" cx="0" cy="0" rx="${RING_RX}" ry="${RING_RY}" fill="none" stroke="#d9d9e8" stroke-width="3" transform="rotate(-20)"/>
        <circle class="menu-planet-body" cx="0" cy="0" r="24" fill="#e8a34c"/>
        <g clip-path="url(#menu-planet-clip)">
          <ellipse cx="0" cy="-14" rx="24" ry="5" fill="#c98a3c" opacity="0.4"/>
          <ellipse cx="0" cy="-4" rx="24" ry="5" fill="#f4c579" opacity="0.35"/>
          <ellipse cx="0" cy="7" rx="24" ry="5" fill="#c98a3c" opacity="0.4"/>
          <ellipse cx="0" cy="17" rx="24" ry="5" fill="#f4c579" opacity="0.3"/>
        </g>
        <g clip-path="url(#menu-planet-clip)">
          <path class="menu-planet-ring-front-base" d="${RING_FRONT_ARC}" fill="none" stroke="#d9d9e8" stroke-width="3" transform="rotate(-20)"/>
          <path class="menu-planet-ring-front" d="${RING_FRONT_ARC}" fill="none" stroke="#fff" stroke-width="1" opacity="0.4" transform="rotate(-20)"/>
        </g>
      </g>

      <g transform="translate(170,72)">
        <g class="menu-ship-bob">
          <path class="menu-ship-exhaust" d="M -4 6 Q -14 0 -4 -6 Q -9 0 -4 6 Z" fill="#e8a34c"/>
          <path class="menu-ship-body" d="M 8 0 L -8 8 L -3 0 L -8 -8 Z" fill="#c7cbd6"/>
        </g>
      </g>
    </svg>
  `;
}
