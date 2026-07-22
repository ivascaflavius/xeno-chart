import { el } from '../components/dom.js';
import { planetPortrait, starPortrait, lockedPortrait } from '../../render/portraits.js';
import { CLOSE_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { cargoBar } from '../components/cargoBar.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { iconButton } from '../components/iconButton.js';
import { closeScanChargeMultiplier } from '../../systems/hazards.js';

function planetTooltipHtml(planet, save, scanned) {
  if (!scanned) return '<em>Unscanned — tap to close-range scan the system</em>';
  const lines = [`<strong>${planet.label}</strong>`];
  const mineralEntries = Object.entries(planet.minerals).map(([mineral, total]) => {
    const depleted = save.mineralDepletion[planet.id]?.[mineral] || 0;
    return [mineral, Math.max(0, total - depleted)];
  });
  lines.push(mineralEntries.length
    ? `Minerals left: ${mineralEntries.map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')}`
    : 'No minerals');
  if (planet.life) lines.push(`Biosignature: ${planet.life.speciesName}`);
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

  const starIcon = el('div', { style: 'width:64px;height:64px;flex-shrink:0', html: starPortrait(sys.id, sys.star) });
  attachHoverTooltip(starIcon, () => `<strong>${sys.star.label}</strong><br>${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'}`);

  const starPanel = el('div', { className: 'panel row' }, [
    starIcon,
    el('div', { className: 'stack' }, [
      el('p', { className: 'title', text: sys.star.label }),
      el('p', { className: 'subtitle', text: `${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'} detected` }),
    ]),
  ]);

  const hazardPanel = sys.hazard
    ? el('div', { className: 'banner banner-warn', text: `${sys.hazard.label} — this system's hazards are already factoring into your costs here.` })
    : null;

  const wormholePanel = (sys.wormholeTo && scanned)
    ? el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'A wormhole connects this system to a distant one.' }),
      iconButton({
        iconName: 'wormhole',
        label: 'Plan Wormhole Jump',
        className: 'btn btn-primary',
        onClick: () => gs.show('JUMP_PLANNING', { selectedSystemId: sys.wormholeTo, viaWormhole: true }),
      }),
    ])
    : null;

  const grid = el('div', { className: 'codex-grid' });
  for (const planet of sys.planets) {
    const entry = el('div', {
      className: 'codex-entry',
      html: scanned ? planetPortrait(planet.id, planet) : lockedPortrait(),
      onClick: () => {
        if (!scanned) {
          if (canAffordScan) doScan();
          return;
        }
        gs.show('SCAN_DETAIL', { selectedPlanetId: planet.id });
      },
    });
    attachHoverTooltip(entry, () => planetTooltipHtml(planet, gs.save, scanned));
    grid.appendChild(entry);
  }

  const scanRow = !scanned
    ? el('div', { className: 'panel stack' }, [
      el('p', {
        className: 'subtitle',
        text: 'Planets are unscanned. Close-range scan to reveal full detail, minerals, and biosignatures.',
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

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'System View' }),
    starPanel,
    hazardPanel,
    cargoBar(gs.save),
    wormholePanel,
    scanRow,
    grid,
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.show('STARMAP') }),
  ]));
}
