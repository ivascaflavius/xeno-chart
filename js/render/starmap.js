import { getSystemsInBox, getSystem, distanceLy } from '../procgen/galaxy.js';
import { effectiveSensorRange, maxJumpRangeLy } from '../systems/travel.js';
import { attachHoverTooltip } from '../ui/components/tooltip.js';
import { HULL_COLORS } from '../data/constants.js';

function hullColorHex(hullColorKey) {
  return HULL_COLORS.find((h) => h.key === hullColorKey)?.color || HULL_COLORS[0].color;
}

const NS = 'http://www.w3.org/2000/svg';
const VIEW_SIZE = 600;
const TAP_TOLERANCE_PX = 18; // screen pixels, independent of zoom level
const FOG_COLOR = '#4a5578';
const FOG_OPACITY = 0.35;

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function clampScale(s) {
  return Math.max(4, Math.min(40, s));
}

/** All of a close-scanned system's known minerals fully extracted — used for the "tapped out" marker glyph. */
function isFullyHarvested(baseSeedInt, save, systemId) {
  const sys = getSystem(baseSeedInt, systemId);
  let hadMinerals = false;
  for (const planet of sys.planets) {
    for (const [mineral, total] of Object.entries(planet.minerals)) {
      hadMinerals = true;
      const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
      if (total - depleted > 0) return false;
    }
  }
  return hadMinerals;
}

function buildSystemTooltipHtml(baseSeedInt, save, systemId, tier, dist) {
  if (tier === 'detected') {
    return `<strong>Unscanned system</strong><br>${dist.toFixed(1)} ly away`;
  }

  const sys = getSystem(baseSeedInt, systemId);
  const lines = [
    `<strong>${sys.star.label}</strong>`,
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
    const systems = getSystemsInBox(
      baseSeedInt,
      view.cx - half - 6, view.cx + half + 6,
      view.cy - half - 6, view.cy + half + 6,
    );

    const currentSystem = getSystem(baseSeedInt, save.position.systemId);
    const currentPos = currentSystem.pos;
    const sensorRange = effectiveSensorRange(save, currentSystem.hazard);
    const jumpRange = maxJumpRangeLy(save);

    const ringCenter = lyToPx(currentPos);

    // Fog trail — every past long-range scan leaves a lighter patch behind,
    // so previously-covered territory reads differently from true darkness
    // even after you've moved on. All revealed-area fills share one group
    // with mix-blend-mode: lighten so overlapping scans read as a single
    // flat shade rather than stacking into darker/lighter bands.
    const revealedGroup = svgEl('g', { style: 'mix-blend-mode: lighten' });
    viewport.appendChild(revealedGroup);

    for (const scan of save.scanHistory || []) {
      const p = lyToPx(scan);
      revealedGroup.appendChild(svgEl('circle', {
        cx: p.x.toFixed(1),
        cy: p.y.toFixed(1),
        r: Math.max(0, scan.range * view.scale).toFixed(1),
        fill: FOG_COLOR,
        'fill-opacity': FOG_OPACITY,
        stroke: 'none',
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

    // Sensor coverage from the current position — the area a long-range scan
    // right now would reveal. Same flat fog fill as the historical patches
    // (joining the blended group above), so "revealed" always reads as one
    // consistent shade; a crisp amber boundary drawn separately marks it as
    // the *live* coverage circle specifically.
    revealedGroup.appendChild(svgEl('circle', {
      cx: ringCenter.x.toFixed(1),
      cy: ringCenter.y.toFixed(1),
      r: Math.max(0, sensorRange * view.scale).toFixed(1),
      fill: FOG_COLOR,
      'fill-opacity': FOG_OPACITY,
      stroke: 'none',
    }));
    viewport.appendChild(svgEl('circle', {
      cx: ringCenter.x.toFixed(1),
      cy: ringCenter.y.toFixed(1),
      r: Math.max(0, sensorRange * view.scale).toFixed(1),
      fill: 'none',
      stroke: '#e8a34c',
      'stroke-opacity': 0.5,
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
      opacity: 0.35,
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
      if (tier === 'long' || tier === 'close') {
        const sys = getSystem(baseSeedInt, stub.id);
        color = sys.star.color;
        radius = tier === 'close' ? 7 : 6;
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
