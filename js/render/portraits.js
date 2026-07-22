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

export function starPortrait(id, star) {
  return cached(`star:${id}`, () => {
    const r = 16 + star.massRoll * 10;
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="${(r * 2.2).toFixed(1)}" fill="${star.color}" opacity="0.12"/>
        <circle cx="50" cy="50" r="${(r * 1.5).toFixed(1)}" fill="${star.color}" opacity="0.3"/>
        <circle cx="50" cy="50" r="${r.toFixed(1)}" fill="${star.color}"/>
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
    case 'gas-giant': {
      let bands = '';
      const bandCount = 3 + (seedish % 3);
      for (let i = 0; i < bandCount; i++) {
        const y = 50 - radius * 0.7 + (i * radius * 1.4) / bandCount;
        bands += `<ellipse cx="50" cy="${y.toFixed(1)}" rx="${(radius * 1.0).toFixed(1)}" ry="${(radius * 0.16).toFixed(1)}" fill="${i % 2 ? lighter : darker}" opacity="0.35"/>`;
      }
      return bands;
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

export function planetPortrait(id, planet) {
  return cached(`planet:${id}`, () => {
    const radius = 22 + planet.sizeRoll * 14;
    const ring = planet.class === 'gas-giant'
      ? `<ellipse cx="50" cy="50" rx="${(radius * 1.7).toFixed(1)}" ry="${(radius * 0.4).toFixed(1)}" fill="none" stroke="${shade(planet.color, 0.3)}" stroke-width="2" opacity="0.6" transform="rotate(-15 50 50)"/>`
      : '';
    return `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        ${ring}
        <circle cx="50" cy="50" r="${radius.toFixed(1)}" fill="${planet.color}"/>
        <g>${planetTexture(planet, radius)}</g>
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
