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

/** Orbit diagram for a system's planets, for the bottom of System View. */
export function systemOrbitHtml(sys) {
  const count = sys.planets.length;
  const size = 300;
  const center = size / 2;
  const maxRadius = center - 30;
  const baseRadius = 30;
  const spacing = count > 1 ? (maxRadius - baseRadius) / (count - 1) : 0;

  const rings = [];
  const markers = [];
  sys.planets.forEach((planet, i) => {
    const r = baseRadius + spacing * i;
    rings.push(`<circle cx="${center}" cy="${center}" r="${r.toFixed(1)}" fill="none" stroke="#3a4358" stroke-width="1" stroke-dasharray="3 4"/>`);

    const withMinerals = hasMinerals(planet);
    markers.push(orbitingMarker({
      center,
      radius: r,
      initialDeg: i * GOLDEN_ANGLE_DEG,
      dotR: 5 + planet.sizeRoll * 3,
      fill: withMinerals ? planet.color : '#5a6072',
      opacity: withMinerals ? 1 : 0.45,
      // Inner orbits move faster than outer ones — a loose nod to Kepler's
      // third law, purely cosmetic (no gameplay meaning to the numbers).
      durationS: 18 + i * 7,
      reverse: i % 2 === 1,
    }));
  });

  // Habitable-zone band (§6/§7 polish) — a soft ring behind everything else
  // marking which orbits the life-bias heuristic actually favors, so "why did
  // this planet get life and that one didn't" has a visible answer.
  let habitableZone = '';
  if (count > 0) {
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
      <circle cx="${center}" cy="${center}" r="20" fill="${sys.star.color}" opacity="0.25"/>
      <circle cx="${center}" cy="${center}" r="13" fill="${sys.star.color}" class="portrait-star-flicker" style="transform-origin:${center}px ${center}px"/>
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

  // The whole ring+moon assembly is drawn on a plain circle, then flattened
  // into a tilted ellipse by this static outer Y-scale — the inner CSS
  // rotation still traces a true circle in its own local space, so it comes
  // out correctly flattened too, matching the static rings exactly.
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
      <g transform="translate(${center} ${center}) scale(1 0.42) translate(${-center} ${-center})">
        ${rings}
        ${dots.join('')}
      </g>
    </svg>
  `;
}
