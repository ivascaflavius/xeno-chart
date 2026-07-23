import { getSystemsInBox, getSystem, distanceLy } from '../procgen/galaxy.js';
import { effectiveSensorRange, maxJumpRangeLy } from '../systems/travel.js';
import { attachHoverTooltip } from '../ui/components/tooltip.js';
import { HULL_COLORS } from '../data/constants.js';
import { getNebulaBlobsInBox } from './nebula.js';
import { getBackgroundStarsInBox } from './starfield.js';

function hullColorHex(hullColorKey) {
  return HULL_COLORS.find((h) => h.key === hullColorKey)?.color || HULL_COLORS[0].color;
}

const NS = 'http://www.w3.org/2000/svg';
const VIEW_SIZE = 600;
const TAP_TOLERANCE_PX = 18; // screen pixels, independent of zoom level
const GLOW_COLOR = '#7f9bd8';
const REVEAL_CLIP_ID = 'starmap-reveal-clip';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function clampScale(s) {
  return Math.max(4, Math.min(40, s));
}

/** Soft-edged glow (concentric fading rings) instead of one flat-opacity disc — reads as light spilling into the dark rather than a solid gray/blue circle. */
function softGlow(group, cx, cy, r, color) {
  if (r <= 0) return;
  for (const [mult, opacity] of [[1, 0.05], [0.72, 0.08], [0.46, 0.12]]) {
    group.appendChild(svgEl('circle', {
      cx: cx.toFixed(1), cy: cy.toFixed(1), r: (r * mult).toFixed(1), fill: color, opacity, stroke: 'none',
    }));
  }
}

/**
 * True once there is nothing left to harvest in a close-scanned system —
 * either every known mineral has been fully extracted, or the system never
 * had any minerals to begin with (e.g. a planet-only system with no
 * resources). Either way there's nothing more to do there, so it gets the
 * same "tapped out" marker glyph.
 */
function isFullyHarvested(baseSeedInt, save, systemId) {
  const sys = getSystem(baseSeedInt, systemId);
  for (const planet of sys.planets) {
    for (const [mineral, total] of Object.entries(planet.minerals)) {
      const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
      if (total - depleted > 0) return false;
    }
  }
  return true;
}

function buildSystemTooltipHtml(baseSeedInt, save, systemId, tier, dist) {
  if (tier === 'detected') {
    return `<strong>Unscanned system</strong><br>${dist.toFixed(1)} ly away`;
  }

  const sys = getSystem(baseSeedInt, systemId);
  const lines = [
    `<strong>${sys.name}</strong> · ${sys.star.label}`,
    `${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'} · ${dist.toFixed(1)} ly`,
  ];
  if (sys.hazard) lines.push(`⚠ ${sys.hazard.label}`);
  if (sys.wormholeTo && tier === 'close') lines.push('Wormhole present');

  if (tier === 'close') {
    const mineralTotals = {};
    let lifeCount = 0;
    for (const planet of sys.planets) {
      for (const [mineral, total] of Object.entries(planet.minerals)) {
        const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
        mineralTotals[mineral] = (mineralTotals[mineral] || 0) + Math.max(0, total - depleted);
      }
      if (planet.life) lifeCount += 1;
    }
    const mineralEntries = Object.entries(mineralTotals);
    lines.push(mineralEntries.length
      ? `Minerals left: ${mineralEntries.map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}`
      : 'No minerals left');
    if (lifeCount > 0) lines.push(`Biosignatures: ${lifeCount}`);
    if (isFullyHarvested(baseSeedInt, save, systemId)) lines.push('<em>Fully harvested</em>');
  }

  return lines.join('<br>');
}

/**
 * Pan/zoom starmap. Pan/zoom view state lives inside this controller (not in
 * save data) so it survives redraws triggered by non-travel actions like a
 * scan. Call `update(ctx)` after any change to the underlying save.
 *
 * Selection is done via manual hit-testing on pointerup rather than native
 * `click` listeners on each marker: `svg.setPointerCapture` (needed so a fast
 * drag keeps panning even if the pointer strays outside the element) redirects
 * the browser's click target to the capturing element (the <svg> root) rather
 * than the marker underneath the pointer, so per-circle click handlers never
 * fire. Hit-testing against tracked marker positions sidesteps that entirely
 * and also lets tap tolerance stay a constant screen-pixel size regardless of
 * zoom, instead of a tiny few-pixel SVG circle.
 */
const DEFAULT_SCALE = 14;

export function createStarmap(onSelectSystem) {
  const wrap = document.createElement('div');
  wrap.className = 'starmap-wrap';

  const svg = svgEl('svg', { viewBox: `0 0 ${VIEW_SIZE} ${VIEW_SIZE}` });
  const viewport = svgEl('g');
  svg.appendChild(viewport);
  wrap.appendChild(svg);

  const zoomLabel = document.createElement('div');
  zoomLabel.className = 'zoom-indicator';
  wrap.appendChild(zoomLabel);

  const view = { cx: 0, cy: 0, scale: DEFAULT_SCALE };
  let ctxRef = null;
  let centered = false;
  let renderedMarkers = []; // { id, vx, vy } in viewBox-space, populated each redraw

  function lyToPx(pos) {
    const half = VIEW_SIZE / 2;
    return {
      x: half + (pos.x - view.cx) * view.scale,
      y: half + (pos.y - view.cy) * view.scale,
    };
  }

  function redraw() {
    if (!ctxRef) return;
    const { baseSeedInt, save } = ctxRef;
    viewport.textContent = '';
    renderedMarkers = [];
    zoomLabel.textContent = `${(view.scale / DEFAULT_SCALE).toFixed(1)}x`;

    const half = VIEW_SIZE / 2 / view.scale;
    const minX = view.cx - half - 6;
    const maxX = view.cx + half + 6;
    const minY = view.cy - half - 6;
    const maxY = view.cy + half + 6;
    const systems = getSystemsInBox(baseSeedInt, minX, maxX, minY, maxY);

    const currentSystem = getSystem(baseSeedInt, save.position.systemId);
    const currentPos = currentSystem.pos;
    const sensorRange = effectiveSensorRange(save, currentSystem.hazard);
    const jumpRange = maxJumpRangeLy(save);

    const ringCenter = lyToPx(currentPos);

    // Fog of war: everything below is either "known space" (inside one of
    // these circles — the ship's current sensor reach, plus every past
    // long-range scan) or "the unknown" (pure dark void, no nebula/starlight
    // detail rendered at all). A <clipPath> unioning all the reveal circles
    // gates the decorative layers below so gas clouds and background stars
    // only ever show where the player has actually looked.
    const revealCircles = [{ cx: ringCenter.x, cy: ringCenter.y, r: Math.max(0, sensorRange * view.scale) }];
    for (const scan of save.scanHistory || []) {
      const p = lyToPx(scan);
      revealCircles.push({ cx: p.x, cy: p.y, r: Math.max(0, scan.range * view.scale) });
    }
    const defs = svgEl('defs');
    const clipPath = svgEl('clipPath', { id: REVEAL_CLIP_ID });
    for (const c of revealCircles) {
      clipPath.appendChild(svgEl('circle', { cx: c.cx.toFixed(1), cy: c.cy.toFixed(1), r: c.r.toFixed(1) }));
    }
    defs.appendChild(clipPath);
    viewport.appendChild(defs);

    // Faint, unclipped background starfield — decorative depth cue visible
    // everywhere (even unexplored space still has distant background stars
    // in it), distinct from actual system markers. A second, brighter pass
    // further down is clipped to known space, so explored regions visibly
    // "light up" relative to the surrounding dark.
    const bgStars = getBackgroundStarsInBox(baseSeedInt, minX, maxX, minY, maxY);
    const dimStarGroup = svgEl('g', { class: 'bg-stars-dim' });
    viewport.appendChild(dimStarGroup);
    for (const star of bgStars) {
      const p = lyToPx(star);
      dimStarGroup.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: star.size.toFixed(2), fill: '#fff', opacity: (0.06 + star.twinkle * 0.09).toFixed(2),
      }));
    }

    // Nebula backgrounds (§15a) — only visible in known space (see clip
    // above), so a region's true color is something you discover by scanning
    // it rather than seeing through the fog of war.
    const nebulaGroup = svgEl('g', { class: 'nebula-layer', 'clip-path': `url(#${REVEAL_CLIP_ID})` });
    viewport.appendChild(nebulaGroup);
    for (const blob of getNebulaBlobsInBox(baseSeedInt, minX, maxX, minY, maxY)) {
      const bp = lyToPx(blob);
      const br = blob.radius * view.scale;
      for (const [mult, opacity] of [[1, 0.06], [0.65, 0.08], [0.35, 0.1]]) {
        nebulaGroup.appendChild(svgEl('circle', {
          cx: bp.x.toFixed(1), cy: bp.y.toFixed(1), r: (br * mult).toFixed(1), fill: blob.color, opacity,
        }));
      }
    }

    // Brighter background stars, clipped the same way as the nebula layer —
    // known space reads as a denser, sharper starfield than the dim void
    // around it.
    const brightStarGroup = svgEl('g', { class: 'bg-stars-bright', 'clip-path': `url(#${REVEAL_CLIP_ID})` });
    viewport.appendChild(brightStarGroup);
    for (const star of bgStars) {
      const p = lyToPx(star);
      brightStarGroup.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (star.size * 1.3).toFixed(2), fill: '#fff', opacity: (0.3 + star.twinkle * 0.35).toFixed(2),
      }));
    }

    // Soft glow trail — every past long-range scan leaves a lighter patch
    // behind, so previously-covered territory reads differently from true
    // darkness even after you've moved on. All glows share one group with
    // mix-blend-mode: lighten so overlapping scans read as a single soft
    // wash rather than stacking into brighter/darker bands.
    const glowGroup = svgEl('g', { style: 'mix-blend-mode: lighten' });
    viewport.appendChild(glowGroup);
    for (const scan of save.scanHistory || []) {
      const p = lyToPx(scan);
      softGlow(glowGroup, p.x, p.y, scan.range * view.scale, GLOW_COLOR);
    }
    // Live sensor coverage from the current position, same soft treatment,
    // plus a crisp amber boundary marking it as the *live* coverage circle
    // specifically (as opposed to a permanently-scanned patch).
    softGlow(glowGroup, ringCenter.x, ringCenter.y, sensorRange * view.scale, GLOW_COLOR);

    // Ship's travel path, in the order systems were first visited.
    const visited = save.stats.systemsVisited || [];
    if (visited.length > 1) {
      const points = visited
        .map((id) => getSystem(baseSeedInt, id))
        .filter(Boolean)
        .map((s) => lyToPx(s.pos))
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');
      viewport.appendChild(svgEl('polyline', {
        points,
        fill: 'none',
        stroke: '#8b93a8',
        'stroke-width': 1,
        'stroke-dasharray': '3 4',
        opacity: 0.5,
      }));
    }

    viewport.appendChild(svgEl('circle', {
      cx: ringCenter.x.toFixed(1),
      cy: ringCenter.y.toFixed(1),
      r: Math.max(0, sensorRange * view.scale).toFixed(1),
      fill: 'none',
      stroke: '#e8a34c',
      'stroke-opacity': 0.45,
      'stroke-width': 1.5,
    }));

    // Fuel-range ring — furthest a jump can currently reach, unrelated to sensors.
    viewport.appendChild(svgEl('circle', {
      cx: ringCenter.x.toFixed(1),
      cy: ringCenter.y.toFixed(1),
      r: Math.max(0, jumpRange * view.scale).toFixed(1),
      fill: 'none',
      stroke: '#5fc9d8',
      'stroke-width': 1,
      'stroke-dasharray': '4 4',
      opacity: 0.3,
    }));

    for (const stub of systems) {
      const discovery = save.discoveries[stub.id];
      const dist = distanceLy(currentPos, stub.pos);
      const isCurrent = stub.id === save.position.systemId;
      const isVisited = visited.includes(stub.id);
      const tier = discovery ? discovery.tier : (dist <= sensorRange ? 'detected' : null);
      if (!tier) continue;

      const p = lyToPx(stub.pos);
      let color = '#5a6072';
      let radius = 4;
      let star = null;
      if (tier === 'long' || tier === 'close') {
        const sys = getSystem(baseSeedInt, stub.id);
        star = sys.star;
        color = star.color;
        radius = tier === 'close' ? 7 : 6;
      }

      // Special-object marker glyphs (§15a) — cheap overlay shapes so
      // black holes/pulsars/magnetars/young systems read as visually
      // distinct even at marker scale, not just a differently-colored dot.
      if (star?.young) {
        viewport.appendChild(svgEl('circle', {
          cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (radius * 2.2).toFixed(1), fill: '#8ecbe0', opacity: 0.12,
        }));
      }
      if (star?.class === 'BH') {
        viewport.appendChild(svgEl('ellipse', {
          cx: p.x.toFixed(1), cy: p.y.toFixed(1), rx: (radius * 1.8).toFixed(1), ry: (radius * 0.6).toFixed(1),
          fill: 'none', stroke: '#ffcf7a', 'stroke-width': 1.2, opacity: 0.6,
        }));
      } else if (star?.class === 'NS') {
        const beams = svgEl('g', { class: 'marker-pulsar-beams', style: `transform-origin:${p.x.toFixed(1)}px ${p.y.toFixed(1)}px` });
        beams.appendChild(svgEl('line', {
          x1: p.x.toFixed(1), y1: (p.y - radius * 2.4).toFixed(1), x2: p.x.toFixed(1), y2: (p.y + radius * 2.4).toFixed(1),
          stroke: color, 'stroke-width': 1, opacity: 0.4,
        }));
        viewport.appendChild(beams);
      } else if (star?.class === 'MAG') {
        viewport.appendChild(svgEl('circle', {
          cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (radius * 1.6).toFixed(1), fill: 'none', stroke: color, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.6, class: 'marker-magnetar-arcs',
        }));
      } else if (star?.class === 'BIN' && star.companion) {
        // A second small dot beside the primary marker reads as "two stars"
        // at this scale, rather than needing the full mutual-orbit animation.
        viewport.appendChild(svgEl('circle', {
          cx: (p.x + radius * 1.1).toFixed(1), cy: (p.y - radius * 0.4).toFixed(1), r: (radius * 0.55).toFixed(1), fill: star.companion.color,
        }));
      }

      // Soft halo behind long/close-scanned stars — reads as an actual point
      // of light rather than a flat dot, without adding another hard-edged
      // ring. Skipped for rogue planets, which emit no light of their own.
      if ((tier === 'long' || tier === 'close') && star?.class !== 'ROGUE') {
        viewport.appendChild(svgEl('circle', {
          cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (radius * 2.4).toFixed(1), fill: color, opacity: 0.14,
        }));
      }

      const circle = svgEl('circle', {
        cx: p.x.toFixed(1),
        cy: p.y.toFixed(1),
        r: radius,
        fill: color,
        class: 'system-marker',
      });
      if (isCurrent) {
        circle.setAttribute('stroke', hullColorHex(save.hullColor));
        circle.setAttribute('stroke-width', '2');
      } else if (isVisited) {
        circle.setAttribute('stroke', '#c7cbd6');
        circle.setAttribute('stroke-width', '1');
      }
      viewport.appendChild(circle);
      attachHoverTooltip(circle, () => buildSystemTooltipHtml(baseSeedInt, save, stub.id, tier, dist));

      if (tier === 'close' && isFullyHarvested(baseSeedInt, save, stub.id)) {
        viewport.appendChild(svgEl('circle', {
          cx: p.x.toFixed(1),
          cy: p.y.toFixed(1),
          r: Math.max(1, radius * 0.35).toFixed(1),
          fill: '#05070d',
        }));
      }

      renderedMarkers.push({ id: stub.id, vx: p.x, vy: p.y });
    }
  }

  function selectAt(clientX, clientY) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(ctm.inverse());
    const toleranceVB = TAP_TOLERANCE_PX / ctm.a;

    let closest = null;
    let closestDist = Infinity;
    for (const marker of renderedMarkers) {
      const d = Math.hypot(marker.vx - local.x, marker.vy - local.y);
      if (d <= toleranceVB && d < closestDist) {
        closest = marker;
        closestDist = d;
      }
    }
    if (closest) onSelectSystem(closest.id);
  }

  let dragging = false;
  let dragMoved = false;
  let hadMultiTouch = false;
  let lastX = 0;
  let lastY = 0;
  let pinchDist = null;
  const pointers = new Map();

  svg.addEventListener('pointerdown', (e) => {
    if (pointers.size === 0) {
      dragMoved = false;
      hadMultiTouch = false;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a smoothness nicety (keeps panning tracked if the pointer strays
      // outside the element) — losing it should never take down the whole screen.
    }
    if (pointers.size === 1) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else {
      hadMultiTouch = true;
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist) {
        view.scale = clampScale(view.scale * (dist / pinchDist));
      }
      pinchDist = dist;
      redraw();
      return;
    }

    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      view.cx -= dx / view.scale;
      view.cy -= dy / view.scale;
      lastX = e.clientX;
      lastY = e.clientY;
      redraw();
    }
  });

  function handlePointerUp(e) {
    const wasSimpleTap = pointers.size === 1 && !dragMoved && !hadMultiTouch;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = null;
    if (pointers.size === 0) dragging = false;
    if (wasSimpleTap) selectAt(e.clientX, e.clientY);
  }

  function handlePointerCancel(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = null;
    if (pointers.size === 0) dragging = false;
  }

  svg.addEventListener('pointerup', handlePointerUp);
  svg.addEventListener('pointercancel', handlePointerCancel);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    view.scale = clampScale(view.scale * (e.deltaY < 0 ? 1.1 : 0.9));
    redraw();
  }, { passive: false });

  return {
    el: wrap,
    update(ctx) {
      ctxRef = ctx;
      if (!centered) {
        const sys = getSystem(ctx.baseSeedInt, ctx.save.position.systemId);
        view.cx = sys.pos.x;
        view.cy = sys.pos.y;
        centered = true;
      }
      redraw();
    },
    recenter() {
      if (!ctxRef) return;
      const sys = getSystem(ctxRef.baseSeedInt, ctxRef.save.position.systemId);
      view.cx = sys.pos.x;
      view.cy = sys.pos.y;
      redraw();
    },
  };
}
