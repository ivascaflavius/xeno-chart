// Parameterized SVG portrait generators (§7). Each function is cached by
// object id so re-opening a detail panel never regenerates the art. SVGs are
// deliberately self-contained (no <defs>/id-referenced gradients) since the
// same cached string can end up inserted into the DOM more than once at a
// time (codex grid + a detail panel), and duplicate element ids would break.

const cache = new Map();

function cached(key, build) {
  if (cache.has(key)) return cache.get(key);
  const svg = build();
  cache.set(key, svg);
  return svg;
}

export function lockedPortrait() {
  return cached('locked', () => `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="portrait-locked">
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 6"/>
      <text x="50" y="63" text-anchor="middle" font-size="38" fill="currentColor" font-family="sans-serif">?</text>
    </svg>
  `);
}

// Special-object rendering (§15a, Phase 3) — layered on top of the flat
// three-circle star glyph for classes that read as visually distinct objects
// rather than "a bigger/smaller dot."
function blackHolePortrait(r) {
  const bands = [2.6, 2.0, 1.5].map((mult, i) => `
    <ellipse cx="50" cy="50" rx="${(r * mult).toFixed(1)}" ry="${(r * mult * 0.32).toFixed(1)}"
      fill="none" stroke="#ffcf7a" stroke-width="${(2.4 - i * 0.6).toFixed(1)}" opacity="${(0.15 + i * 0.15).toFixed(2)}"/>
  `).join('');
  return `
    <circle cx="50" cy="50" r="${(r * 3.2).toFixed(1)}" fill="#0a0a12" opacity="0.25"/>
    ${bands}
    <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="#05060a"/>
  `;
}

function pulsarPortrait(r, color) {
  const beam = (rot) => `
    <path d="M 50 50 L ${(50 - r * 0.55).toFixed(1)} ${(50 - r * 5.5).toFixed(1)} L ${(50 + r * 0.55).toFixed(1)} ${(50 - r * 5.5).toFixed(1)} Z"
      fill="${color}" opacity="0.35" transform="rotate(${rot} 50 50)"/>
  `;
  return `
    <g class="portrait-pulsar" style="transform-origin:50px 50px">
      ${beam(0)}${beam(180)}
    </g>
    <circle cx="50" cy="50" r="${(r * 1.6).toFixed(1)}" fill="${color}" opacity="0.25"/>
    <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="${color}"/>
  `;
}

function magnetarPortrait(r, color) {
  const arc = (rot) => `
    <path d="M 50 50 Q ${(50 + r * 3).toFixed(1)} ${(50 - r * 1.5).toFixed(1)} ${(50 + r * 0.5).toFixed(1)} ${(50 - r * 4.2).toFixed(1)}"
      fill="none" stroke="${color}" stroke-width="1.4" opacity="0.4" transform="rotate(${rot} 50 50)"/>
  `;
  return `
    <g class="portrait-magnetar">
      ${[0, 90, 180, 270].map(arc).join('')}
    </g>
    <circle cx="50" cy="50" r="${(r * 1.4).toFixed(1)}" fill="${color}" opacity="0.3"/>
    <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="${color}"/>
  `;
}

/** Soft surrounding cloud motif for young/star-forming systems (§15a) — layered on top of any stable star's normal glyph. */
function youngStarCloud(r) {
  const puffs = [
    [-r * 1.4, -r * 0.6, r * 1.3],
    [r * 1.5, -r * 0.3, r * 1.1],
    [r * 0.2, r * 1.4, r * 1.4],
  ];
  return puffs.map(([dx, dy, pr]) => `
    <circle cx="${(50 + dx).toFixed(1)}" cy="${(50 + dy).toFixed(1)}" r="${pr.toFixed(1)}" fill="#8ecbe0" opacity="0.07"/>
  `).join('');
}

export function starPortrait(id, star) {
  return cached(`star:${id}`, () => {
    const r = 16 + star.massRoll * 10;
    const cloud = star.young ? youngStarCloud(r) : '';
    let body;
    if (star.class === 'BH') {
      body = blackHolePortrait(r);
    } else if (star.class === 'NS') {
      body = pulsarPortrait(r, star.color);
    } else if (star.class === 'MAG') {
      body = magnetarPortrait(r, star.color);
    } else {
      body = `
        <circle cx="50" cy="50" r="${(r * 2.2).toFixed(1)}" fill="${star.color}" opacity="0.12"/>
        <circle cx="50" cy="50" r="${(r * 1.5).toFixed(1)}" fill="${star.color}" opacity="0.3"/>
        <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="${star.color}"/>
      `;
    }
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        ${cloud}
        <g class="portrait-star-flicker" style="transform-origin:50px 50px">${body}</g>
      </svg>
    `;
  });
}

function planetTexture(planet, radius) {
  const seedish = Math.floor(planet.sizeRoll * 1000) + planet.index;
  const darker = shade(planet.color, -0.25);
  const lighter = shade(planet.color, 0.25);
  switch (planet.class) {
    case 'rocky':
    case 'barren': {
      const count = 3 + (seedish % 4);
      let dots = '';
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + seedish;
        const dist = radius * (0.25 + ((seedish * (i + 1)) % 10) / 20);
        const cx = 50 + Math.cos(angle) * dist;
        const cy = 50 + Math.sin(angle) * dist;
        dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${2 + (i % 3)}" fill="${darker}" opacity="0.5"/>`;
      }
      return dots;
    }
    case 'molten': {
      return `<path d="M ${50 - radius * 0.8} 55 Q 40 ${50 - radius * 0.3} 55 55 T ${50 + radius * 0.8} 50" stroke="${lighter}" stroke-width="3" fill="none" opacity="0.7"/>`;
    }
    case 'ice': {
      const rx = radius * 0.9;
      return `<ellipse cx="50" cy="${(50 - radius * 0.55).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(radius * 0.35).toFixed(1)}" fill="${lighter}" opacity="0.7"/>
        <ellipse cx="50" cy="${(50 + radius * 0.6).toFixed(1)}" rx="${(rx * 0.85).toFixed(1)}" ry="${(radius * 0.3).toFixed(1)}" fill="${lighter}" opacity="0.5"/>`;
    }
    case 'ocean': {
      const rx = radius * 0.85;
      return `<path d="M ${50 - rx} 45 Q 50 ${40} ${50 + rx} 45" stroke="${lighter}" stroke-width="2.5" fill="none" opacity="0.6"/>
        <path d="M ${50 - rx} 58 Q 50 ${53} ${50 + rx} 58" stroke="${lighter}" stroke-width="2" fill="none" opacity="0.5"/>`;
    }
    case 'gas-giant':
    case 'ice-giant': {
      let bands = '';
      // Ice giants get fewer, fainter bands than gas giants — a Neptune/
      // Uranus look (smoother, more uniform) rather than Jupiter's turbulence.
      const isIceGiant = planet.class === 'ice-giant';
      const bandCount = isIceGiant ? 2 + (seedish % 2) : 3 + (seedish % 3);
      const bandOpacity = isIceGiant ? 0.2 : 0.35;
      for (let i = 0; i < bandCount; i++) {
        const y = 50 - radius * 0.7 + (i * radius * 1.4) / bandCount;
        bands += `<ellipse cx="50" cy="${y.toFixed(1)}" rx="${(radius * 1.0).toFixed(1)}" ry="${(radius * 0.16).toFixed(1)}" fill="${i % 2 ? lighter : darker}" opacity="${bandOpacity}"/>`;
      }
      return bands;
    }
    case 'earth-like': {
      // A blue ocean base (planet.color) with a couple of organic continent
      // blobs layered on top — the water-bearing "habitable-looking" world
      // the rest of the terrestrial classes deliberately don't have.
      const blobs = [
        {
          cx: 50 + ((seedish % 7) - 3), cy: 42 + ((seedish % 5) - 2), r: radius * 0.55, color: '#4a7c3f',
        },
        {
          cx: 58 - (seedish % 6), cy: 62 + (seedish % 4), r: radius * 0.35, color: '#7a6a3f',
        },
      ];
      return blobs.map(({
        cx, cy, r, color,
      }) => `
        <path d="M ${(cx - r).toFixed(1)} ${cy.toFixed(1)}
                 Q ${cx.toFixed(1)} ${(cy - r * 1.3).toFixed(1)} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}
                 Q ${cx.toFixed(1)} ${(cy + r * 1.1).toFixed(1)} ${(cx - r).toFixed(1)} ${cy.toFixed(1)} Z"
          fill="${color}" opacity="0.85"/>
      `).join('');
    }
    default:
      return '';
  }
}

function shade(hex, amount) {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const adjust = (channel) => Math.max(0, Math.min(255, Math.round(channel + 255 * amount)));
  r = adjust(r);
  g = adjust(g);
  b = adjust(b);
  return `rgb(${r}, ${g}, ${b})`;
}

// Corner decorators (Phase 3 polish) — small badges layered on the portrait
// itself so a biosignature/mineral deposit reads at a glance from the system
// view grid, not just from a tooltip. Kept tiny and corner-anchored so they
// never obscure the main planet art.
function dnaDecorator() {
  return `
    <g transform="translate(70,68)" opacity="0.95">
      <path d="M2 0 Q10 6.5 2 13 Q-6 19.5 2 26" stroke="#5fd88a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M2 0 Q-6 6.5 2 13 Q10 19.5 2 26" stroke="#5fd88a" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.55"/>
      <line x1="-4" y1="4.5" x2="8" y2="4.5" stroke="#5fd88a" stroke-width="1"/>
      <line x1="-4" y1="13" x2="8" y2="13" stroke="#5fd88a" stroke-width="1"/>
      <line x1="-4" y1="21.5" x2="8" y2="21.5" stroke="#5fd88a" stroke-width="1"/>
    </g>
  `;
}

function mineralDecorator() {
  return `
    <g transform="translate(7,7)">
      <path d="M7 0 L14 6 L10.5 14 L3.5 14 L0 6 Z" fill="#e8a34c" stroke="#ffdca4" stroke-width="0.8"/>
    </g>
  `;
}

export function planetPortrait(id, planet, { decorate = true } = {}) {
  return cached(`planet:${id}:${decorate ? 'd' : 'plain'}`, () => {
    const radius = 22 + planet.sizeRoll * 14;
    // Ring variety (§7 polish) — not every gas giant is Saturn; a "hot
    // Jupiter" (the innermost gas giant in a system, see planets.js) never
    // gets one at all — migrated in too close/tidally battered to keep a
    // ring system — and gets a warm glow instead of the cooler default look.
    const hasRing = (planet.class === 'gas-giant' || planet.class === 'ice-giant') && !planet.hotJupiter && planet.sizeRoll > 0.4;
    // rx capped at 1.3x radius (not the more dramatic 1.7x a real ring-plane
    // deserves) so the tilted ellipse's bounding box always stays inside the
    // 0-100 viewBox even at max planet size — anything larger got silently
    // cut off at the SVG's edge instead of closing into a full ellipse.
    const ring = hasRing
      ? `<ellipse cx="50" cy="50" rx="${(radius * 1.3).toFixed(1)}" ry="${(radius * 0.4).toFixed(1)}" fill="none" stroke="${shade(planet.color, 0.3)}" stroke-width="2" opacity="0.6" transform="rotate(-15 50 50)"/>`
      : '';
    const hotJupiterGlow = planet.hotJupiter
      ? `<circle cx="50" cy="50" r="${(radius * 1.6).toFixed(1)}" fill="#ff7a45" opacity="0.16"/>`
      : '';
    const hasMinerals = planet.minerals && Object.keys(planet.minerals).length > 0;
    // Slow self-rotation (polish round 5) — duration/direction derived from
    // sizeRoll (already on the planet) rather than a fresh RNG draw, so every
    // planet spins at its own steady pace without needing new procgen state.
    const spinDuration = (40 - planet.sizeRoll * 20).toFixed(1);
    const spinDirection = planet.sizeRoll < 0.5 ? 'normal' : 'reverse';

    // Most planets should read as spinning about a roughly vertical axis —
    // surface features sweeping left/right across a fixed silhouette — not a
    // flat disc spinning face-on like a coin, which is what a literal
    // rotate() of the whole texture looks like once it has any asymmetric
    // detail (gas-giant bands especially). That's simulated by clipping the
    // texture to the planet's circle and scrolling it horizontally, with the
    // pattern tripled left/center/right so the scroll always has coverage
    // and loops seamlessly. A small deterministic minority spin the old
    // (literal rotate) way instead — a stand-in for a Uranus-style planet
    // whose axis points at the viewer rather than to the side.
    const isPolarSpin = Math.floor(planet.sizeRoll * 100) % 6 === 0;

    let body;
    if (isPolarSpin) {
      body = `
        ${hotJupiterGlow}
        <g class="portrait-planet-spin" style="transform-origin:50px 50px; animation-duration:${spinDuration}s; animation-direction:${spinDirection}">
          ${ring}
          <circle cx="50" cy="50" r="${radius.toFixed(1)}" fill="${planet.color}"/>
          <g>${planetTexture(planet, radius)}</g>
        </g>
      `;
    } else {
      const diameter = radius * 2;
      const scrollDist = (spinDirection === 'reverse' ? -diameter : diameter).toFixed(1);
      const texture = planetTexture(planet, radius);
      body = `
        ${hotJupiterGlow}
        ${ring}
        <g style="clip-path: circle(${radius.toFixed(1)}px at 50px 50px) view-box;">
          <circle cx="50" cy="50" r="${radius.toFixed(1)}" fill="${planet.color}"/>
          <g class="portrait-planet-scroll" style="animation-duration:${spinDuration}s; --scroll-dist:${scrollDist}px;">
            <g transform="translate(${(-diameter).toFixed(1)},0)">${texture}</g>
            <g>${texture}</g>
            <g transform="translate(${diameter.toFixed(1)},0)">${texture}</g>
          </g>
        </g>
      `;
    }

    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        ${body}
        ${decorate && hasMinerals ? mineralDecorator() : ''}
        ${decorate && planet.life ? dnaDecorator() : ''}
      </svg>
    `;
  });
}

const STAGE_SHAPE = {
  microbial: (color) => `
    <circle cx="38" cy="46" r="6" fill="${color}" opacity="0.8"/>
    <circle cx="55" cy="40" r="8" fill="${color}" opacity="0.8"/>
    <circle cx="60" cy="60" r="5" fill="${color}" opacity="0.8"/>
    <circle cx="42" cy="62" r="4" fill="${color}" opacity="0.8"/>
  `,
  simple: (color) => `
    <ellipse cx="50" cy="50" rx="22" ry="14" fill="${color}" opacity="0.85"/>
    <ellipse cx="50" cy="50" rx="12" ry="7" fill="${color}"/>
  `,
  complex: (color) => `
    <path d="M 30 60 Q 50 20 70 60 Q 50 80 30 60 Z" fill="${color}" opacity="0.85"/>
    <circle cx="50" cy="48" r="8" fill="${color}"/>
  `,
};

const BIOCHEM_COLOR = {
  'carbon-dna': '#5fd88a',
  'carbon-rna': '#5fc9d8',
  silicon: '#b98ce0',
};

export function lifePortrait(id, life) {
  return cached(`life:${id}`, () => {
    const color = BIOCHEM_COLOR[life.biochemistry] || '#5fd88a';
    const shapeFn = STAGE_SHAPE[life.stage] || STAGE_SHAPE.microbial;
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="40" fill="${color}" opacity="0.08"/>
        ${shapeFn(color)}
      </svg>
    `;
  });
}
