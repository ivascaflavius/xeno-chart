import { el } from '../components/dom.js';
import { planetPortrait, starPortrait, lockedPortrait } from '../../render/portraits.js';
import { CLOSE_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { shipStatusPanel } from '../components/cargoBar.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { iconButton } from '../components/iconButton.js';
import { closeScanChargeMultiplier } from '../../systems/hazards.js';
import { planetDesignation } from '../../procgen/names.js';
import { icon } from '../components/icons.js';
import { systemOrbitHtml } from '../../render/orbitDiagram.js';
import { starStats } from '../../procgen/stats.js';
import { relativeColorFor, SUN_TEMP_K } from '../../render/tempColor.js';
import { hazardChip } from '../components/hazardChip.js';
import { screenHeader } from '../components/screenHeader.js';
import { openJumpModal } from './jumpPlanning.js';
import {
  backAction, distressBeaconAction, codexAction, journalAction,
} from '../components/commonActions.js';

function planetHasMinerals(planet) {
  return planet.minerals && Object.keys(planet.minerals).length > 0;
}

/** All of a planet's known minerals fully extracted — mirrors render/starmap.js's system-level check, but per planet. */
function isPlanetFullyHarvested(save, planet) {
  const mineralEntries = Object.entries(planet.minerals);
  if (mineralEntries.length === 0) return false;
  return mineralEntries.every(([mineral, total]) => {
    const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
    return total - depleted <= 0;
  });
}

function planetTooltipHtml(planet, systemName, save, scanned) {
  if (!scanned) return '<em>Unscanned — tap to close-range scan the system</em>';
  const lines = [`<strong>${planetDesignation(systemName, planet.index)}</strong> · ${planet.label}`];
  const mineralEntries = Object.entries(planet.minerals).map(([mineral, total]) => {
    const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
    return [mineral, Math.max(0, total - depleted)];
  });
  lines.push(mineralEntries.length
    ? `Minerals left: ${mineralEntries.map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}`
    : 'No minerals');
  if (isPlanetFullyHarvested(save, planet)) lines.push('<em>Fully harvested</em>');
  if (planet.life) {
    lines.push(save.sampledPlanets[planet.id] ? `Biosignature: ${planet.life.speciesName}` : 'Unidentified biosignature');
  }
  return lines.join('<br>');
}

export function render(container, gs) {
  const sys = gs.currentSystem();
  const discovery = gs.save.discoveries[sys.id];
  const scanned = discovery?.tier === 'close';
  const scanCost = Math.round(CLOSE_RANGE_SCAN_CHARGE_COST * closeScanChargeMultiplier(sys.hazard));
  const canAffordScan = gs.save.resources.charge >= scanCost;

  function doScan() {
    gs.closeRangeScan(sys.id);
  }

  const starIcon = el('div', { style: 'width:52px;height:52px;flex-shrink:0', html: starPortrait(sys.id, sys.star) });
  attachHoverTooltip(starIcon, () => `<strong>${sys.name}</strong><br>${sys.star.label} · ${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'}`);

  const stats = starStats(sys.star);
  // Color-graded against the Sun — blue smaller/cooler, green Sun-like, red
  // bigger/hotter — so a glance at each number places it without doing the
  // mental math against a spectral-class letter. Radius/mass are already
  // expressed as a ratio to the Sun, so 1 is the reference for those.
  const tempColor = relativeColorFor(stats.temperatureK, SUN_TEMP_K);
  const tempSpan = el('span', {
    style: tempColor ? `color:${tempColor}` : undefined,
    text: stats.temperatureK !== null ? `${stats.temperatureK.toLocaleString()} K` : 'N/A',
  });
  const radiusColor = relativeColorFor(stats.radiusSolar, 1);
  const radiusSpan = el('span', { style: radiusColor ? `color:${radiusColor}` : undefined, text: `${stats.radiusSolar} R☉` });
  const massColor = relativeColorFor(stats.massSolar, 1);
  const massSpan = el('span', { style: massColor ? `color:${massColor}` : undefined, text: `${stats.massSolar} M☉` });
  const starPanel = el('div', { className: 'panel row panel-compact' }, [
    starIcon,
    el('div', { className: 'stack', style: 'gap:2px; flex:1; min-width:0' }, [
      el('p', { className: 'title', text: sys.name, style: 'font-size:1.25rem' }),
      el('p', { className: 'subtitle', text: `${sys.star.label} · ${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'}` }),
      el('p', { className: 'subtitle' }, [tempSpan, ' · ', radiusSpan, ' · ', massSpan]),
    ]),
    hazardChip(sys.hazard),
  ]);

  // Always rendered — pre-scan a wormhole's presence stays hidden the same
  // way planet colors/minerals do, so this can't read "no wormhole" before
  // that's actually known, but the row itself (and the panel's height) never
  // appears/disappears depending on what's here. Info-only now — the Jump
  // button moved up into the new top action bar alongside Scan.
  const wormholeKnown = scanned;
  const wormholePresent = wormholeKnown && !!sys.wormholeTo;
  const wormholePanel = el('div', { className: 'panel row panel-compact' }, [
    el('span', { className: 'icon-chip', html: icon('wormhole', 16) }),
    el('span', {
      text: !wormholeKnown
        ? 'Wormhole presence unknown — close-range scan for detail.'
        : (wormholePresent ? 'A wormhole connects this system to a distant one.' : 'No wormhole in this system.'),
      style: 'flex:1',
    }),
  ]);

  const grid = el('div', { className: 'panel panel-compact planet-bar' });
  if (scanned && sys.planets.length === 0) {
    grid.appendChild(el('p', { className: 'subtitle', style: 'width:100%; text-align:center;', text: 'No planets detected' }));
  }
  for (const planet of sys.planets) {
    const dimmed = scanned && !planetHasMinerals(planet);
    const entry = el('div', {
      className: `codex-entry${dimmed ? ' codex-entry-dim' : ''}`,
      html: scanned ? planetPortrait(planet.id, planet) : lockedPortrait(),
      onClick: () => {
        if (!scanned) {
          if (canAffordScan) doScan();
          return;
        }
        gs.show('SCAN_DETAIL', { selectedPlanetId: planet.id });
      },
    });
    if (scanned && isPlanetFullyHarvested(gs.save, planet)) {
      entry.appendChild(el('span', { className: 'codex-entry-badge', html: icon('check', 12) }));
    }
    attachHoverTooltip(entry, () => planetTooltipHtml(planet, sys.name, gs.save, scanned));
    grid.appendChild(entry);
  }

  // Rendered even before a close-range scan — the star and planet count are
  // already known (see the subtitle above), so a placeholder ring-per-planet
  // reads as "there's something here, scan for detail" instead of leaving a
  // gap where the action bar looks like it's floating in empty space.
  const orbitPanel = el('div', { className: 'panel stack panel-compact diagram-panel' }, [
    el('p', { className: 'subtitle diagram-caption', text: scanned ? 'Orbital view' : 'Orbital view (scan for detail)' }),
    el('div', { className: 'diagram-fill', html: systemOrbitHtml(sys, { scanned }) }),
  ]);

  // Routine actions live here, next to the content they act on; the bottom
  // bar is pure navigation (same 3 buttons on every gameplay screen). Jump
  // only lights up once a wormhole has actually been detected this system —
  // same condition the old inline wormhole-panel Jump button used. A second,
  // labeled "Galaxy" back button sits here too — quicker to reach mid-screen
  // than the header's icon-only Back or scrolling down to the bottom bar.
  const topActionRow = el('div', { className: 'action-bar action-bar-labeled' }, [
    backAction('Galaxy', () => gs.show('STARMAP')),
    iconButton({
      iconName: 'closeScan',
      label: scanned ? 'Scanned' : `Scan (${scanCost})`,
      className: 'btn btn-primary',
      disabled: scanned || !canAffordScan,
      onClick: doScan,
    }),
    iconButton({
      iconName: 'wormhole',
      label: 'Jump',
      className: wormholePresent ? 'btn btn-primary' : 'btn',
      disabled: !wormholePresent,
      onClick: () => openJumpModal(gs, sys.wormholeTo, { viaWormhole: true }),
    }),
  ]);

  const actionRow = el('div', { className: 'action-bar action-bar-labeled' }, [
    backAction('Back', () => gs.show('STARMAP')),
    codexAction(gs),
    journalAction(gs),
  ]);

  // Groups the planet grid and wormhole row into one block, occupying the
  // same slot Planetary View's Minerals+Biosignature block does (directly
  // above the orbit diagram) — sized to its own natural content, so the
  // diagram panel's flex:1 gets whatever room is left instead of leaving it
  // empty here.
  const surfaceBlock = el('div', { className: 'surface-block' }, [grid, wormholePanel]);

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('System View', () => gs.show('STARMAP'), 'back', distressBeaconAction(gs)),
    el('div', { className: 'screen-scroll-body' }, [
      starPanel,
      shipStatusPanel(gs),
      topActionRow,
      surfaceBlock,
      orbitPanel,
    ]),
    actionRow,
  ]));
}
