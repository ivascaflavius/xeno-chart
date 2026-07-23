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
const FOG_GRADIENT_ID = 'starmap-fog-falloff';
const SENSOR_MASK_ID = 'starmap-sensor-mask';
const SCANNED_MASK_ID = 'starmap-scanned-mask';
const DETECTED_WASH_COLOR = '#7c8494';
const SCANNED_BASE_TINT = '#3f5a8c';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function clampScale(s) {
  return Math.max(4, Math.min(40, s));
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
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

    // Fog of war, three tiers (§6): pure dark for the unexplored, a flat
    // neutral-gray wash for "detected" (inside the ship's *current* live
    // sensor reach but never actually long-range scanned — recalculated
    // from position every redraw, so it disappears again once the ship
    // moves away), and the full colorful nebula/starfield treatment for
    // "scanned" (every past long-range scan, permanent regardless of where
    // the ship is now). Both reveals use a soft-edged <mask> (a radial
    // gradient fading to transparent, not a hard-edged <clipPath>) so
    // overlapping scan circles blend into an organic-looking patch of light
    // instead of a grid of crisp, visibly-intersecting circle arcs.
    const defs = svgEl('defs');
    const fogGradient = svgEl('radialGradient', { id: FOG_GRADIENT_ID });
    fogGradient.appendChild(svgEl('stop', { offset: '55%', 'stop-color': '#fff', 'stop-opacity': 1 }));
    fogGradient.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#fff', 'stop-opacity': 0 }));
    defs.appendChild(fogGradient);

    const sensorMask = svgEl('mask', { id: SENSOR_MASK_ID });
    sensorMask.appendChild(svgEl('circle', {
      cx: ringCenter.x.toFixed(1), cy: ringCenter.y.toFixed(1), r: Math.max(0, sensorRange * view.scale).toFixed(1), fill: `url(#${FOG_GRADIENT_ID})`,
    }));
    defs.appendChild(sensorMask);

    const scannedMask = svgEl('mask', { id: SCANNED_MASK_ID });
    for (const scan of save.scanHistory || []) {
      const p = lyToPx(scan);
      scannedMask.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: Math.max(0, scan.range * view.scale).toFixed(1), fill: `url(#${FOG_GRADIENT_ID})`,
      }));
    }
    defs.appendChild(scannedMask);
    viewport.appendChild(defs);

    // Faint, unmasked background starfield — decorative depth cue visible
    // everywhere (even unexplored space still has distant background stars
    // in it), distinct from actual system markers. Brighter passes further
    // down are masked to known space, so explored regions visibly "light
    // up" relative to the surrounding dark.
    const bgStars = getBackgroundStarsInBox(baseSeedInt, minX, maxX, minY, maxY);
    const dimStarGroup = svgEl('g', { class: 'bg-stars-dim' });
    viewport.appendChild(dimStarGroup);
    for (const star of bgStars) {
      const p = lyToPx(star);
      dimStarGroup.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: star.size.toFixed(2), fill: '#fff', opacity: (0.06 + star.twinkle * 0.09).toFixed(2),
      }));
    }

    // Tier 2 — "detected": a flat, desaturated wash, nothing colorful. Reads
    // as "there's something out there, hazily" rather than an actual charted
    // region — that distinction (and not just a color choice) is the whole
    // point, since it's what makes the tier-3 reveal below feel earned.
    const detectedGroup = svgEl('g', { mask: `url(#${SENSOR_MASK_ID})` });
    viewport.appendChild(detectedGroup);
    detectedGroup.appendChild(svgEl('rect', {
      x: 0, y: 0, width: VIEW_SIZE, height: VIEW_SIZE, fill: DETECTED_WASH_COLOR, opacity: 0.16,
    }));

    // Tier 3 — "scanned": a permanent group, masked to every past long-range
    // scan regardless of current position. A faint uniform base tint first
    // (so even a region that happened not to roll a nebula blob still reads
    // as "lit up" rather than flat black-with-dots), then the nebula blobs
    // themselves (§15a) layered on top, then a denser/brighter starfield.
    const scannedGroup = svgEl('g', { mask: `url(#${SCANNED_MASK_ID})` });
    viewport.appendChild(scannedGroup);
    scannedGroup.appendChild(svgEl('rect', {
      x: 0, y: 0, width: VIEW_SIZE, height: VIEW_SIZE, fill: SCANNED_BASE_TINT, opacity: 0.1,
    }));
    const nebulaGroup = svgEl('g', { class: 'nebula-layer' });
    scannedGroup.appendChild(nebulaGroup);
    for (const blob of getNebulaBlobsInBox(baseSeedInt, minX, maxX, minY, maxY)) {
      const bp = lyToPx(blob);
      const br = blob.radius * view.scale;
      for (const [mult, opacity] of [[1, 0.14], [0.65, 0.18], [0.35, 0.22]]) {
        nebulaGroup.appendChild(svgEl('circle', {
          cx: bp.x.toFixed(1), cy: bp.y.toFixed(1), r: (br * mult).toFixed(1), fill: blob.color, opacity,
        }));
      }
    }
    const brightStarGroup = svgEl('g', { class: 'bg-stars-bright' });
    scannedGroup.appendChild(brightStarGroup);
    for (const star of bgStars) {
      const p = lyToPx(star);
      brightStarGroup.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: (star.size * 1.3).toFixed(2), fill: '#fff', opacity: (0.3 + star.twinkle * 0.35).toFixed(2),
      }));
    }

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
  let animating = false; // true while animateJump() owns the camera — pan/zoom input is ignored meanwhile
  const pointers = new Map();

  svg.addEventListener('pointerdown', (e) => {
    if (animating) return;
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
    if (animating || !pointers.has(e.pointerId)) return;
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
    if (animating) return;
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
    /**
     * Plays the jump as an actual bit of travel rather than the destination
     * just silently appearing: recenters on the departure point, then glides
     * the camera to the destination over `durationMs`. Since the camera's
     * center *is* the ship's position every frame, the ship marker never has
     * to be drawn or moved explicitly — it's always exactly at the viewport
     * center — while the departure point recedes into a trailing dashed line
     * behind it as the camera pulls away. Input is ignored for the duration
     * so a drag/pinch mid-flight can't fight the auto-pan.
     */
    animateJump(fromPos, toPos, durationMs, onComplete) {
      if (!ctxRef) {
        onComplete?.();
        return;
      }
      animating = true;
      view.cx = fromPos.x;
      view.cy = fromPos.y;
      const start = performance.now();
      const center = VIEW_SIZE / 2;
      function frame(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = easeInOutQuad(t);
        view.cx = fromPos.x + (toPos.x - fromPos.x) * eased;
        view.cy = fromPos.y + (toPos.y - fromPos.y) * eased;
        redraw();
        const fromPx = lyToPx(fromPos);
        viewport.appendChild(svgEl('line', {
          x1: fromPx.x.toFixed(1), y1: fromPx.y.toFixed(1), x2: center, y2: center, stroke: '#e8a34c', 'stroke-width': 2, 'stroke-dasharray': '5 5', opacity: 0.85,
        }));
        viewport.appendChild(svgEl('circle', {
          cx: center, cy: center, r: 6, fill: '#e8a34c', stroke: '#0a0e18', 'stroke-width': 1.5,
        }));
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          animating = false;
          onComplete?.();
        }
      }
      requestAnimationFrame(frame);
    },
  };
}
