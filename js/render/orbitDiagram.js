// Stylized (not physically accurate) top-down orbit diagrams — a System
// View shows how its planets are laid out around the star, and a Scan
// Detail shows a planet's own moons the same way, both actually orbiting.
//
// Motion technique: a marker sits at a fixed offset (center + radius, center)
// inside an inner <g> that CSS-rotates it continuously about that same
// center; an outer <g> applies a one-time SVG `transform="rotate(...)"` for
// its starting phase, so planets don't all launch from the same angle. Both
// rotations share the same pivot, so they add together — the outer static
// rotation just becomes the animation's starting point.

import { habitableIndexRange } from '../procgen/habitability.js';
import { Rng, seedToInt } from '../procgen/prng.js';

const GOLDEN_ANGLE_DEG = 137.508;

function hasMinerals(planet) {
  return planet.minerals && Object.keys(planet.minerals).length > 0;
}

function orbitingMarker({
  center, radius, initialDeg, dotR, fill, opacity = 1, stroke = '', durationS, reverse, shaded = false,
}) {
  const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="0.6"` : '';
  const cx = (center + radius).toFixed(1);
  const cy = center.toFixed(1);
  // A moon should read as a small shaded sphere like the planet it orbits,
  // not a flat dot — a highlight (light source) and shadow circle offset to
  // opposite corners of the base fill fake that at a size too small for real
  // crater texture, with no <defs>/gradients (per this file's no-shared-ids
  // convention — the same markup can be duplicated in the DOM at once).
  const body = shaded
    ? `
      <circle cx="${cx}" cy="${cy}" r="${dotR.toFixed(1)}" fill="${fill}" ${strokeAttr}/>
      <circle cx="${(center + radius - dotR * 0.3).toFixed(1)}" cy="${(center - dotR * 0.3).toFixed(1)}" r="${(dotR * 0.55).toFixed(1)}" fill="#e2e6f0" opacity="0.35"/>
      <circle cx="${(center + radius + dotR * 0.35).toFixed(1)}" cy="${(center + dotR * 0.35).toFixed(1)}" r="${(dotR * 0.4).toFixed(1)}" fill="#05070d" opacity="0.35"/>
    `
    : `<circle cx="${cx}" cy="${cy}" r="${dotR.toFixed(1)}" fill="${fill}" opacity="${opacity}" ${strokeAttr}/>`;
  return `
    <g transform="rotate(${initialDeg.toFixed(1)} ${center} ${center})">
      <g class="orbit-spin" style="transform-origin:${center}px ${center}px; animation-duration:${durationS}s;${reverse ? ' animation-direction:reverse;' : ''}">
        ${body}
      </g>
    </g>
  `;
}

/**
 * Two bodies (a planet and its binary companion, or a binary system's two
 * stars) mutually orbiting a shared point that itself orbits `center` —
 * an inner `.orbit-spin` group nested inside the usual outer one. Both
 * groups use the same generic keyframe (a plain 360° rotation); what differs
 * is each one's own `transform-origin`, so they compose independently: the
 * outer pivot is the system's star, the inner pivot is wherever this pair's
 * own orbital point sits in the (pre-rotation) local coordinate space that
 * both groups share — which is also where the pair's own geometry is drawn,
 * so the inner pivot stays glued to the pair as the outer rotation carries
 * it around.
 */
export function binaryOrbitingMarker({
  center, radius, initialDeg, durationS, reverse, primary, companion, mutualDurationS = 7,
}) {
  const px = (center + radius).toFixed(1);
  const py = center.toFixed(1);
  const sep = Math.max(primary.dotR, companion.dotR) * 1.7;
  const primaryBody = `<circle cx="${(center + radius + sep).toFixed(1)}" cy="${py}" r="${primary.dotR.toFixed(1)}" fill="${primary.fill}" opacity="${primary.opacity ?? 1}"/>`;
  const companionBody = `<circle cx="${(center + radius - sep).toFixed(1)}" cy="${py}" r="${companion.dotR.toFixed(1)}" fill="${companion.fill}"/>`;
  return `
    <g transform="rotate(${initialDeg.toFixed(1)} ${center} ${center})">
      <g class="orbit-spin" style="transform-origin:${center}px ${center}px; animation-duration:${durationS}s;${reverse ? ' animation-direction:reverse;' : ''}">
        <g class="orbit-spin" style="transform-origin:${px}px ${py}px; animation-duration:${mutualDurationS}s;">
          ${primaryBody}
          ${companionBody}
        </g>
      </g>
    </g>
  `;
}

// A binary pair's combined visual footprint (glow radius) is bigger than a
// single star's — shared by the halo circle below and by systemOrbitHtml's
// innermost ring so the two stay in sync: without this, the first planet
// ring (a fixed radius sized for one star) could sit inside or right on top
// of the pair's glow instead of clearing it.
function binaryStarHaloRadius(star) {
  const rA = 10 + star.massRoll * 6;
  const rB = 10 + star.companion.massRoll * 6;
  const sep = 16;
  return sep + Math.max(rA, rB) + 6;
}

/** The star (or binary pair) at a system orbit diagram's center. */
function systemCenterStarHtml(center, star) {
  if (star.class === 'BIN' && star.companion) {
    const rA = 10 + star.massRoll * 6;
    const rB = 10 + star.companion.massRoll * 6;
    const sep = 16;
    return `
      <circle cx="${center}" cy="${center}" r="${binaryStarHaloRadius(star).toFixed(1)}" fill="${star.color}" opacity="0.15"/>
      <g class="orbit-spin" style="transform-origin:${center}px ${center}px; animation-duration:10s;">
        <circle cx="${(center + sep).toFixed(1)}" cy="${center}" r="${rA.toFixed(1)}" fill="${star.color}" class="portrait-star-flicker" style="transform-origin:${(center + sep).toFixed(1)}px ${center}px"/>
        <circle cx="${(center - sep).toFixed(1)}" cy="${center}" r="${rB.toFixed(1)}" fill="${star.companion.color}" class="portrait-star-flicker" style="transform-origin:${(center - sep).toFixed(1)}px ${center}px"/>
      </g>
    `;
  }
  return `
    <circle cx="${center}" cy="${center}" r="20" fill="${star.color}" opacity="0.25"/>
    <circle cx="${center}" cy="${center}" r="13" fill="${star.color}" class="portrait-star-flicker" style="transform-origin:${center}px ${center}px"/>
  `;
}

/**
 * Orbit diagram for a system's planets, for the bottom of System View.
 * `scanned` (default true) gates everything that isn't already known from
 * the "N planets detected" subtitle above it — pre-scan, the ring count and
 * spacing still show (planet count is public the moment a system is
 * detected), but each marker is a uniform gray placeholder instead of the
 * real class/color/binary-pairing, so the diagram doesn't spoil what a
 * close-range scan is actually for. Without this, System View either had to
 * hide the whole diagram pre-scan (leaving a hole where the action bar
 * looked like it was floating in empty space) or show it fully populated.
 */
export function systemOrbitHtml(sys, { scanned = true } = {}) {
  const count = sys.planets.length;
  const size = 300;
  const center = size / 2;
  const maxRadius = center - 30;
  // A binary pair's glow reaches further out than a single star's, so the
  // innermost planet ring needs to start further out too, or it ends up
  // sitting on top of the stars instead of clearing them (§7b polish).
  const baseRadius = (sys.star.class === 'BIN' && sys.star.companion)
    ? binaryStarHaloRadius(sys.star) + 12
    : 30;
  const spacing = count > 1 ? (maxRadius - baseRadius) / (count - 1) : 0;

  const rings = [];
  const markers = [];
  sys.planets.forEach((planet, i) => {
    const r = baseRadius + spacing * i;
    rings.push(`<circle cx="${center}" cy="${center}" r="${r.toFixed(1)}" fill="none" stroke="#3a4358" stroke-width="1" stroke-dasharray="3 4"/>`);

    const sharedOrbitArgs = {
      center,
      radius: r,
      initialDeg: i * GOLDEN_ANGLE_DEG,
      // Inner orbits move faster than outer ones — a loose nod to Kepler's
      // third law, purely cosmetic (no gameplay meaning to the numbers).
      durationS: 18 + i * 7,
      reverse: i % 2 === 1,
    };

    if (!scanned) {
      markers.push(orbitingMarker({
        ...sharedOrbitArgs, dotR: 5, fill: '#5a6072', opacity: 0.5,
      }));
      return;
    }

    const withMinerals = hasMinerals(planet);
    if (planet.binaryCompanion) {
      markers.push(binaryOrbitingMarker({
        ...sharedOrbitArgs,
        primary: {
          dotR: 4 + planet.sizeRoll * 2.4,
          fill: withMinerals ? planet.color : '#5a6072',
          opacity: withMinerals ? 1 : 0.45,
        },
        companion: {
          dotR: 4 + planet.binaryCompanion.sizeRoll * 2.4,
          fill: planet.binaryCompanion.color,
        },
      }));
    } else {
      markers.push(orbitingMarker({
        ...sharedOrbitArgs,
        dotR: 5 + planet.sizeRoll * 3,
        fill: withMinerals ? planet.color : '#5a6072',
        opacity: withMinerals ? 1 : 0.45,
      }));
    }
  });

  // Habitable-zone band (§6/§7 polish) — a soft ring behind everything else
  // marking which orbits the life-bias heuristic actually favors, so "why did
  // this planet get life and that one didn't" has a visible answer. Held
  // back pre-scan along with everything else planet-specific.
  let habitableZone = '';
  if (scanned && count > 0) {
    const { lo, hi } = habitableIndexRange(count, sys.star.class);
    const bandHalfWidth = Math.max(spacing * 0.35, 8);
    const innerR = Math.max(0, baseRadius + spacing * lo - bandHalfWidth);
    const outerR = baseRadius + spacing * hi + bandHalfWidth;
    habitableZone = `
      <circle cx="${center}" cy="${center}" r="${outerR.toFixed(1)}" fill="#5fd88a" opacity="0.12"/>
      <circle cx="${center}" cy="${center}" r="${innerR.toFixed(1)}" style="fill:var(--bg-panel)"/>
    `;
  }

  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      ${habitableZone}
      ${rings.join('')}
      ${systemCenterStarHtml(center, sys.star)}
      ${markers.join('')}
    </svg>
  `;
}

/**
 * Moon-orbit overlay for Scan Detail's planet portrait — absolutely
 * positioned, transparent except for rings/dots. Each moon gets its own
 * dedicated ring (radius, size, speed, direction all vary per moon) instead
 * of bucketing several moons onto one or two shared circles; `planetId`
 * seeds a small local Rng purely for that per-moon cosmetic variety, so the
 * same planet always renders the same moons rather than reshuffling them
 * every time its Planetary View is opened.
 */
export function moonOrbitOverlayHtml(planetId, moonCount) {
  if (!moonCount) return '';
  const size = 220;
  const center = size / 2;
  const rng = new Rng(seedToInt(`${planetId}:moons`));

  // Individual orbits spread evenly from just outside the planet portrait
  // (which occupies the middle 50% of this same box, so its edge sits at
  // roughly radius 55 here) out toward the frame edge.
  const minR = 60;
  const maxR = center - 15;
  const radii = [];
  for (let i = 0; i < moonCount; i++) {
    radii.push(moonCount === 1 ? (minR + maxR) / 2 : minR + (i * (maxR - minR)) / (moonCount - 1));
  }

  const rings = radii
    .map((r) => `<circle cx="${center}" cy="${center}" r="${r.toFixed(1)}" fill="none" stroke="#4a5578" stroke-width="1" stroke-dasharray="3 4" opacity="0.7"/>`)
    .join('');

  const dots = [];
  for (let i = 0; i < moonCount; i++) {
    dots.push(orbitingMarker({
      center,
      radius: radii[i],
      initialDeg: i * GOLDEN_ANGLE_DEG + 40 + (rng.float() - 0.5) * 40,
      dotR: 2.4 + rng.float() * 2.6,
      fill: '#8b93a8',
      stroke: '#05070d',
      shaded: true,
      // Every moon has its own ring now, so — unlike planets sharing a
      // system's orbit bands — there's no shared-circle collision to avoid;
      // speed and direction can vary freely per moon.
      durationS: 12 + i * 5 + rng.float() * 6,
      reverse: rng.chance(0.5),
    }));
  }

  // Rendered as a straight top-down view — true circular rings, not a
  // tilted/flattened perspective — so orbit shapes and speeds read clearly.
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
      ${rings}
      ${dots.join('')}
    </svg>
  `;
}

/**
 * Binary-planet pair overlay for Scan Detail — System View's orbit diagram
 * already shows a binary planet as two bodies mutually orbiting a shared
 * barycenter (§7a), but the planet's own Planetary View used to show only
 * the single primary body sitting still, with no indication it has a
 * companion at all. Both bodies swing around this diagram box's own center
 * in a single rotation (deliberately not `binaryOrbitingMarker`'s nested
 * outer+inner pair used in System View — with no outer system-orbit radius
 * to speak of here, that outer rotation's pivot collapses onto the same
 * point as the inner one, so it doesn't cancel out as a no-op the way a
 * true zero-radius orbit would: it just adds a second, faster spin on top
 * of the mutual orbit, which is what made this look far too fast at first).
 * A small barycenter cross marks the shared pivot; rendered top-down (true
 * circles) at the same unhurried pace as a regular moon orbit, like
 * `moonOrbitOverlayHtml` above. Replaces this diagram's usual centered
 * `planetPortrait` entirely (rather than layering a companion on top of
 * it): both bodies are drawn as simple shaded spheres, matching System
 * View's own binary-planet rendering, since showing the primary's full
 * texture only on one moving body while the companion stays a flat dot
 * would read as inconsistent, not paired.
 */
export function binaryPairOverlayHtml(planetId, planet) {
  const size = 220;
  const center = size / 2;
  const rng = new Rng(seedToInt(`${planetId}:binary`));
  const companion = planet.binaryCompanion;
  const primaryR = 13 + planet.sizeRoll * 8;
  const companionR = 13 + companion.sizeRoll * 8;
  const sep = Math.max(primaryR, companionR) * 1.7;
  const durationS = 14 + rng.float() * 8;

  const orbitRing = `<circle cx="${center}" cy="${center}" r="${sep.toFixed(1)}" fill="none" stroke="#4a5578" stroke-width="1" stroke-dasharray="3 4" opacity="0.6"/>`;
  const barycenter = `<path d="M${(center - 5).toFixed(1)} ${center} H${(center + 5).toFixed(1)} M${center} ${(center - 5).toFixed(1)} V${(center + 5).toFixed(1)}" stroke="#ff8a7a" stroke-width="1.2" opacity="0.7"/>`;
  const pair = `
    <g class="orbit-spin" style="transform-origin:${center}px ${center}px; animation-duration:${durationS.toFixed(1)}s;${rng.chance(0.5) ? ' animation-direction:reverse;' : ''}">
      <circle cx="${(center + sep).toFixed(1)}" cy="${center}" r="${primaryR.toFixed(1)}" fill="${planet.color}"/>
      <circle cx="${(center - sep).toFixed(1)}" cy="${center}" r="${companionR.toFixed(1)}" fill="${companion.color}"/>
    </g>
  `;

  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
      ${orbitRing}
      ${barycenter}
      ${pair}
    </svg>
  `;
}
