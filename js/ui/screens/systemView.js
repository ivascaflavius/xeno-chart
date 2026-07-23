import { el } from '../components/dom.js';
import { planetPortrait, starPortrait, lockedPortrait } from '../../render/portraits.js';
import { CLOSE_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { cargoBar } from '../components/cargoBar.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { iconButton } from '../components/iconButton.js';
import { closeScanChargeMultiplier } from '../../systems/hazards.js';
import { planetDesignation } from '../../procgen/names.js';
import { icon } from '../components/icons.js';
import { systemOrbitHtml } from '../../render/orbitDiagram.js';
import { starStats } from '../../procgen/stats.js';
import { screenHeader } from '../components/screenHeader.js';
import { statusBanners } from '../components/statusBanners.js';

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
  const flash = gs.takeFlashMessage();

  function doScan() {
    gs.closeRangeScan(sys.id);
  }

  const starIcon = el('div', { style: 'width:52px;height:52px;flex-shrink:0', html: starPortrait(sys.id, sys.star) });
  attachHoverTooltip(starIcon, () => `<strong>${sys.name}</strong><br>${sys.star.label} · ${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'}`);

  const stats = starStats(sys.star);
  const statsText = `${stats.temperatureK !== null ? `${stats.temperatureK.toLocaleString()} K` : 'N/A'} · ${stats.radiusSolar} R☉ · ${stats.massSolar} M☉`;
  const starPanel = el('div', { className: 'panel row panel-compact' }, [
    starIcon,
    el('div', { className: 'stack', style: 'gap:2px' }, [
      el('p', { className: 'title', text: sys.name, style: 'font-size:1.25rem' }),
      el('p', { className: 'subtitle', text: `${sys.star.label} · ${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'} detected` }),
      el('p', { className: 'subtitle', text: statsText }),
    ]),
  ]);

  const hazardPanel = sys.hazard
    ? el('div', { className: 'banner banner-warn', text: `${sys.hazard.label} — this system's hazards are already factoring into your costs here.` })
    : null;

  const wormholePanel = (sys.wormholeTo && scanned)
    ? el('div', { className: 'panel row panel-compact' }, [
      el('span', { className: 'icon-chip', html: icon('wormhole', 16) }),
      el('span', { text: 'A wormhole connects this system to a distant one.', style: 'flex:1' }),
      iconButton({
        iconName: 'wormhole',
        label: 'Jump',
        className: 'btn btn-primary',
        onClick: () => gs.show('JUMP_PLANNING', { selectedSystemId: sys.wormholeTo, viaWormhole: true }),
      }),
    ])
    : null;

  const grid = el('div', { className: 'planet-grid' });
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

  const orbitPanel = scanned
    ? el('div', { className: 'panel stack panel-compact diagram-panel' }, [
      el('p', { className: 'subtitle diagram-caption', text: 'Orbital view' }),
      el('div', { className: 'diagram-fill', html: systemOrbitHtml(sys) }),
    ])
    : null;

  const scanRow = !scanned
    ? el('div', { className: 'panel row panel-compact' }, [
      el('span', {
        className: 'subtitle',
        text: 'Planets are unscanned — close-range scan for full detail.',
        style: 'flex:1',
      }),
      iconButton({
        iconName: 'closeScan',
        label: `Scan (${scanCost})`,
        className: 'btn btn-primary',
        disabled: !canAffordScan,
        onClick: doScan,
      }),
    ])
    : null;

  container.appendChild(el('div', { className: 'screen screen-wide' }, [
    screenHeader('System View', () => gs.show('STARMAP')),
    starPanel,
    flash ? el('div', { className: 'banner banner-info', text: flash }) : null,
    hazardPanel,
    ...statusBanners(gs),
    cargoBar(gs.save),
    wormholePanel,
    scanRow,
    grid,
    orbitPanel,
  ]));
}
