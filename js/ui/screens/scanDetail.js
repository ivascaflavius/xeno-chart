import { el } from '../components/dom.js';
import { planetPortrait } from '../../render/portraits.js';
import { getAmount, capFor } from '../../systems/resources.js';
import { shipStatusPanel, resourceIconRow } from '../components/cargoBar.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { planetDesignation } from '../../procgen/names.js';
import { moonOrbitOverlayHtml, binaryPairOverlayHtml } from '../../render/orbitDiagram.js';
import { planetStats } from '../../procgen/stats.js';
import { relativeColorFor, EARTH_TEMP_K } from '../../render/tempColor.js';
import { hazardChip } from '../components/hazardChip.js';
import { screenHeader } from '../components/screenHeader.js';
import {
  backAction, distressBeaconAction, codexAction, journalAction,
} from '../components/commonActions.js';

/** Icon+label on one line, the actual content on the next — System View's wormhole panel is a single full-width line, so this keeps Planetary View's Minerals/Biosignature rows the same two-line height instead of a one-liner throwing the two screens out of alignment. */
function twoLineSection(iconName, label, statusClass, content) {
  return el('div', { className: 'stack', style: 'gap:4px' }, [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: `icon-chip${statusClass ? ` ${statusClass}` : ''}`, html: icon(iconName, 16) }),
      el('span', { className: 'subtitle', text: label }),
    ]),
    content,
  ]);
}

const BAR_SCOPES = '.minerals-panel [data-resource-key], .cargo-bar-panel [data-resource-key]';

function withIndefiniteArticle(label) {
  return `${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label.toLowerCase()}`;
}

/** Snapshot every mineral/cargo bar's current rendered width, keyed by panel-scope + resource key. */
function captureFillWidths(container) {
  const widths = new Map();
  container.querySelectorAll(BAR_SCOPES).forEach((itemEl) => {
    const scope = itemEl.closest('.minerals-panel') ? 'minerals' : 'cargo';
    const fill = itemEl.querySelector('.progress-fill');
    if (fill) widths.set(`${scope}:${itemEl.dataset.resourceKey}`, fill.style.width);
  });
  return widths;
}

/**
 * Replays a from -> to width transition on the (freshly re-rendered) bars
 * after a harvest — the mineral deposit bar drains first, then the ship
 * cargo bar fills in shortly after, echoing the "to cargo" flow arrow
 * between the two panels. Both finish well under a second.
 */
function animateHarvestBars(container, beforeWidths) {
  const mineralFills = [];
  const cargoFills = [];
  container.querySelectorAll(BAR_SCOPES).forEach((itemEl) => {
    const scope = itemEl.closest('.minerals-panel') ? 'minerals' : 'cargo';
    const before = beforeWidths.get(`${scope}:${itemEl.dataset.resourceKey}`);
    const fill = itemEl.querySelector('.progress-fill');
    if (!fill || before === undefined) return;
    const after = fill.style.width;
    fill.style.transition = 'none';
    fill.style.width = before;
    (scope === 'minerals' ? mineralFills : cargoFills).push({ fill, after });
  });
  if (mineralFills.length === 0 && cargoFills.length === 0) return;

  // Force a reflow so the browser actually paints the "before" width above
  // before we schedule the "after" width — otherwise both changes could get
  // batched into one frame and the transition would never fire.
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight;

  requestAnimationFrame(() => {
    mineralFills.forEach(({ fill }) => { fill.style.transition = ''; });
    mineralFills.forEach(({ fill, after }) => { fill.style.width = after; });
    setTimeout(() => {
      cargoFills.forEach(({ fill }) => { fill.style.transition = ''; });
      cargoFills.forEach(({ fill, after }) => { fill.style.width = after; });
    }, 150);
  });
}

export function render(container, gs) {
  const sys = gs.currentSystem();
  const planet = sys.planets.find((p) => p.id === gs.selectedPlanetId);

  const stats = planetStats(planet);
  const moonCount = planet.moonCount || 0;
  // Color-graded against Earth — blue smaller/colder, green Earth-like, red
  // bigger/hotter — same treatment as System View's star stats. Radius/mass
  // are already expressed as a ratio to Earth, so 1 is the reference.
  const tempColor = relativeColorFor(stats.surfaceTempK, EARTH_TEMP_K);
  const tempSpan = el('span', {
    style: tempColor ? `color:${tempColor}` : undefined,
    text: `${stats.surfaceTempK.toLocaleString()} K`,
  });
  const radiusColor = relativeColorFor(stats.radiusEarth, 1);
  const radiusSpan = el('span', { style: radiusColor ? `color:${radiusColor}` : undefined, text: `${stats.radiusEarth} R⊕` });
  const massColor = relativeColorFor(stats.massEarth, 1);
  const massSpan = el('span', { style: massColor ? `color:${massColor}` : undefined, text: `${stats.massEarth} M⊕` });

  const planetIcon = el('div', { style: 'width:52px;height:52px;flex-shrink:0', html: planetPortrait(planet.id, planet) });
  const planetPanel = el('div', { className: 'panel row panel-compact' }, [
    planetIcon,
    el('div', { className: 'stack', style: 'gap:2px; flex:1; min-width:0' }, [
      el('p', { className: 'title', text: planetDesignation(sys.name, planet.index), style: 'font-size:1.25rem' }),
      el('p', {
        className: 'subtitle',
        text: planet.binaryCompanion ? `${planet.label} · binary pair with ${withIndefiniteArticle(planet.binaryCompanion.label)}` : planet.label,
      }),
      el('p', { className: 'subtitle' }, [tempSpan, ' · ', radiusSpan, ' · ', massSpan, ` · ${moonCount} moon${moonCount === 1 ? '' : 's'}`]),
    ]),
    hazardChip(sys.hazard),
  ]);

  // Each mineral's "fullness" bar tracks remaining/total (of what the planet ever had),
  // not remaining/cargo-cap — it's a deposit-depletion gauge, not a buffer-room gauge.
  const mineralData = Object.entries(planet.minerals).map(([mineral, total]) => {
    const depleted = gs.save.mineralDepletion[planet.id]?.[mineral] || 0;
    const remaining = Math.max(0, total - depleted);
    const roomLeft = capFor(mineral) - getAmount(gs.save, mineral);
    return {
      mineral, total, remaining, roomLeft,
    };
  });
  const allDepleted = mineralData.length > 0 && mineralData.every((m) => m.remaining <= 0);
  const canHarvestAny = mineralData.some((m) => m.remaining > 0 && m.roomLeft > 0);

  let harvestLabel = 'Harvest All';
  if (mineralData.length === 0) harvestLabel = 'No Minerals';
  else if (mineralData.length === 1) harvestLabel = `Harvest ${mineralData[0].mineral}`;
  if (allDepleted) harvestLabel = 'Fully Harvested';
  else if (mineralData.length > 0 && !canHarvestAny) harvestLabel = 'Cargo Full';

  // Always rendered (into the action bar below), even with nothing to
  // harvest, so the bar's button count stays the same across every planet
  // instead of shifting depending on what's there.
  const harvestButton = iconButton({
    iconName: 'harvest',
    label: harvestLabel,
    className: 'btn btn-primary',
    disabled: mineralData.length === 0 || allDepleted || !canHarvestAny,
    onClick: () => {
      const beforeWidths = captureFillWidths(container);
      if (mineralData.length === 1) gs.harvest(planet.id, mineralData[0].mineral);
      else gs.harvestAll(planet.id);
      // gs.harvest[All]() re-renders this screen synchronously (into the
      // same `container`), so by the time control returns here the new
      // bars already exist — this just replays their width change as an
      // animation instead of leaving it as a silent instant jump.
      animateHarvestBars(container, beforeWidths);
    },
  });

  const sampled = !!gs.save.sampledPlanets[planet.id];

  // Always rendered (into the action bar below), grayed out unless there's
  // an unsampled biosignature on this planet — keeps the bar's button count
  // consistent across every planet instead of it appearing/vanishing.
  const sampleButton = iconButton({
    iconName: 'sample',
    label: 'Take Sample',
    className: 'btn btn-primary',
    disabled: !planet.life || sampled,
    onClick: () => gs.takeSample(planet.id),
  });

  // One line regardless of state (no life / detected-but-unsampled /
  // sampled) — a sampled planet used to add a whole second line of detail
  // (biochemistry/stage/tech-tier/encounter), making this panel taller than
  // every other planet's, which fought the "same size everywhere" goal this
  // whole surface panel exists for. Long detail still fits, just truncated
  // with an ellipsis (full text lives in the tooltip) instead of wrapping.
  let bioText = 'No biosignature detected.';
  if (planet.life) {
    bioText = sampled
      ? `${planet.life.speciesName} — ${planet.life.biochemistryLabel} · ${planet.life.stageLabel}${planet.life.stage === 'intelligent' ? ` · ${planet.life.techTierLabel}` : ''}`
      : 'Biosignature detected — take a sample to identify.';
  }
  const biosignatureRow = twoLineSection('dna', 'Biosignature', planet.life ? 'status-green' : null, el('p', {
    className: 'subtitle',
    style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
    title: bioText,
    text: bioText,
  }));

  // Unified surface panel — minerals and biosignature share one outlined
  // bar (matching the ship/cargo/health panel's row-per-topic layout)
  // instead of two separate panels whose combined height used to shift
  // around based on mineral count and life-sample state. Each section is
  // icon+label on its own line, data below — matching System View's
  // now-taller stack (its wormhole panel added a row Planetary View didn't
  // have), rather than a shorter one-line-per-topic layout that no longer
  // lined up between the two screens.
  const surfacePanel = el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    twoLineSection('planet', 'Minerals', null, el('div', { className: 'minerals-panel' }, [
      mineralData.length
        ? resourceIconRow(mineralData.map((m) => ({ key: m.mineral, amount: m.remaining, cap: m.total })))
        : el('p', { className: 'subtitle', text: 'None detected' }),
    ])),
    biosignatureRow,
  ]);

  const orbitFill = el('div', { className: 'diagram-fill' }, [
    // A binary planet replaces the usual still, centered portrait with both
    // bodies mutually orbiting their shared barycenter (§7a) — showing the
    // primary sitting still while only the companion moved around it used
    // to read as a satellite, not a pair.
    planet.binaryCompanion
      ? el('div', { html: binaryPairOverlayHtml(planet.id, planet) })
      : el('div', { style: 'position:absolute; left:25%; top:25%; width:50%; height:50%', html: planetPortrait(planet.id, planet, { decorate: false }) }),
    el('div', { html: moonOrbitOverlayHtml(planet.id, moonCount) }),
  ]);

  // A binary planet's System View orbit diagram shows it as two bodies
  // sharing one ring (§7a) — the caption here should say so too, not just
  // the overlay above, since a caption swap between "Orbital view"/"Moon
  // orbits" would otherwise silently drop the one word that actually
  // explains why there's an extra ring around a moonless planet.
  const diagramCaption = planet.binaryCompanion
    ? (moonCount ? 'Binary companion & moons' : 'Binary companion')
    : (moonCount ? 'Moon orbits' : 'Orbital view');

  const orbitPanel = el('div', { className: 'panel stack panel-compact diagram-panel' }, [
    el('p', { className: 'subtitle diagram-caption', text: diagramCaption }),
    orbitFill,
  ]);

  const actionRow = el('div', { className: 'action-bar' }, [
    backAction('Back', () => gs.show('SYSTEM_VIEW')),
    harvestButton,
    sampleButton,
    distressBeaconAction(gs),
    codexAction(gs),
    journalAction(gs),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('Planetary View', () => gs.show('SYSTEM_VIEW')),
    el('div', { className: 'screen-scroll-body' }, [
      planetPanel,
      shipStatusPanel(gs),
      orbitPanel,
      surfacePanel,
    ]),
    actionRow,
  ]));
}
