import { el } from '../components/dom.js';
import { planetPortrait, starPortrait, lockedPortrait } from '../../render/portraits.js';
import { CLOSE_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { cargoBar } from '../components/cargoBar.js';

export function render(container, gs) {
  const sys = gs.currentSystem();
  const discovery = gs.save.discoveries[sys.id];
  const scanned = discovery?.tier === 'close';
  const canAffordScan = gs.save.resources.charge >= CLOSE_RANGE_SCAN_CHARGE_COST;

  function doScan() {
    gs.closeRangeScan(sys.id);
  }

  const starPanel = el('div', { className: 'panel row' }, [
    el('div', { style: 'width:64px;height:64px;flex-shrink:0', html: starPortrait(sys.id, sys.star) }),
    el('div', { className: 'stack' }, [
      el('p', { className: 'title', text: sys.star.label }),
      el('p', { className: 'subtitle', text: `${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'} detected` }),
    ]),
  ]);

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
    grid.appendChild(entry);
  }

  const scanRow = !scanned
    ? el('div', { className: 'panel stack' }, [
      el('p', {
        className: 'subtitle',
        text: 'Planets are unscanned. Close-range scan to reveal full detail, minerals, and biosignatures.',
      }),
      el('button', {
        className: 'btn btn-primary',
        text: `Close-range Scan (${CLOSE_RANGE_SCAN_CHARGE_COST} charge)`,
        disabled: !canAffordScan,
        onClick: doScan,
      }),
    ])
    : null;

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'System View' }),
    starPanel,
    cargoBar(gs.save),
    scanRow,
    grid,
    el('div', { className: 'spacer' }),
    el('button', { className: 'btn', text: 'Back to Starmap', onClick: () => gs.show('STARMAP') }),
  ]));
}
