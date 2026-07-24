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
        text: planet.binaryCompanion
          ? `${planet.label} · binary pair with ${withIndefiniteArticle(planet.binaryCompanion.label)} · ${moonCount} moon${moonCount === 1 ? '' : 's'}`
          : `${planet.label} · ${moonCount} moon${moonCount === 1 ? '' : 's'}`,
      }),
      el('p', { className: 'subtitle' }, [tempSpan, ' · ', radiusSpan, ' · ', massSpan]),
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

  let harvestLabel = 'Harvest';
  if (mineralData.length === 0) harvestLabel = 'No Minerals';
  else if (allDepleted) harvestLabel = 'Harvested';
  else if (!canHarvestAny) harvestLabel = 'Cargo Full';

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
    label: sampled ? 'Sampled' : 'Sample',
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

  // Minerals and biosignature as two separate panels (mirroring System
  // View's planet-grid / wormhole-panel split) rather than one combined
  // block — each now sits in the new top action bar's own row below it,
  // matching the same slot System View's Planets+Wormhole block occupies.
  const mineralsPanel = el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    twoLineSection('planet', 'Minerals', null, el('div', { className: 'minerals-panel' }, [
      mineralData.length
        ? resourceIconRow(mineralData.map((m) => ({ key: m.mineral, amount: m.remaining, cap: m.total })))
        : el('p', { className: 'subtitle', text: 'None detected' }),
    ])),
  ]);
  const biosignaturePanel = el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    biosignatureRow,
  ]);
  // Groups Minerals and Biosignature into one block, occupying the same
  // slot System View's Planets+Wormhole block does (directly above the
  // orbit diagram) — sized to its own natural content, so the diagram
  // panel's flex:1 gets whatever room is left instead of leaving it empty
  // here.
  const surfaceBlock = el('div', { className: 'surface-block' }, [mineralsPanel, biosignaturePanel]);

  // A moonless planet has no orbit rings to leave room for, so the old
  // fixed 50% sizing (a 25%-per-side margin meant to give moon rings space
  // to clear the portrait) just read as a big empty gap around a small
  // planet — fill the whole box instead when there's nothing orbiting it
  // (the portrait's own meet-scaling still keeps it uncropped and centered,
  // same as every other still portrait elsewhere in the game).
  const planetBoxPct = moonCount ? 50 : 100;
  const planetBoxOffset = (100 - planetBoxPct) / 2;

  const orbitFill = el('div', { className: 'diagram-fill' }, [
    // A binary planet replaces the usual still, centered portrait with both
    // bodies mutually orbiting their shared barycenter (§7a) — showing the
    // primary sitting still while only the companion moved around it used
    // to read as a satellite, not a pair.
    planet.binaryCompanion
      ? el('div', { html: binaryPairOverlayHtml(planet.id, planet) })
      : el('div', {
        style: `position:absolute; left:${planetBoxOffset}%; top:${planetBoxOffset}%; width:${planetBoxPct}%; height:${planetBoxPct}%`,
        html: planetPortrait(planet.id, planet, { decorate: false }),
      }),
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

  // Routine actions live here, next to the content they act on; the bottom
  // bar is pure navigation (same 3 buttons on every gameplay screen). A
  // second, labeled back button ("Star", short for Star System) sits here
  // too — quicker to reach mid-screen than the header's icon-only Back or
  // scrolling down to the bottom bar. All three labels here are kept short
  // since it's now a 3-button row sharing space evenly.
  const topActionRow = el('div', { className: 'action-bar action-bar-labeled' }, [
    backAction('Star', () => gs.show('SYSTEM_VIEW')),
    harvestButton,
    sampleButton,
  ]);

  const actionRow = el('div', { className: 'action-bar action-bar-labeled' }, [
    backAction('Back', () => gs.show('SYSTEM_VIEW')),
    codexAction(gs),
    journalAction(gs),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('Planetary View', () => gs.show('SYSTEM_VIEW'), 'back', distressBeaconAction(gs)),
    el('div', { className: 'screen-scroll-body' }, [
      planetPanel,
      shipStatusPanel(gs),
      topActionRow,
      surfaceBlock,
      orbitPanel,
    ]),
    actionRow,
  ]));
}
