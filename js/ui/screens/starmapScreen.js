import { el } from '../components/dom.js';
import { createStarmap } from '../../render/starmap.js';
import { LONG_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { getSystemsInRadius } from '../../procgen/galaxy.js';
import { effectiveSensorRange } from '../../systems/travel.js';
import { icon } from '../components/icons.js';
import { iconButton } from '../components/iconButton.js';
import { statusBanners } from '../components/statusBanners.js';
import { shipResourceBar } from '../components/cargoBar.js';

export function render(container, gs) {
  const save = gs.save;
  const sys = gs.currentSystem();

  const headerRow = el('div', { className: 'row row-tight screen-header' }, [
    iconButton({
      iconName: 'menu', label: 'Menu', iconOnly: true, onClick: () => gs.show('PAUSED'),
    }),
    el('p', { className: 'title', text: 'Galactic View' }),
    iconButton({
      iconName: 'journal', label: 'Journal', iconOnly: true, onClick: () => gs.show('JOURNAL'),
    }),
  ]);

  const galaxyIcon = el('div', { style: 'width:52px;height:52px;flex-shrink:0; display:flex; align-items:center; justify-content:center; color:var(--text-dim)', html: icon('galaxy', 32) });
  const galaxyPanel = el('div', { className: 'panel row panel-compact' }, [
    galaxyIcon,
    el('div', { className: 'stack', style: 'gap:2px' }, [
      el('p', { className: 'title', text: save.galaxyName, style: 'font-size:1.25rem' }),
      el('p', { className: 'subtitle', text: `${save.difficulty === 'relaxed' ? 'Relaxed' : 'Expedition'} · Cycle ${save.cycle}` }),
      el('p', { className: 'subtitle', text: `${save.shipName} · ${sys.name}` }),
    ]),
  ]);

  const hazardBanner = sys.hazard
    ? el('div', { className: 'banner banner-warn', text: `${sys.hazard.label} in this system.` })
    : null;

  const starmap = createStarmap((systemId) => {
    if (systemId === save.position.systemId) {
      gs.show('SYSTEM_VIEW');
    } else {
      gs.show('JUMP_PLANNING', { selectedSystemId: systemId });
    }
  });

  const nearby = getSystemsInRadius(gs.baseSeedInt, sys.pos, effectiveSensorRange(save, sys.hazard));
  const hasNewToReveal = nearby.some((stub) => !save.discoveries[stub.id]);
  const canAffordScan = save.resources.charge >= LONG_RANGE_SCAN_CHARGE_COST;
  const canScan = canAffordScan && hasNewToReveal;
  const actionRow = el('div', { className: 'row row-compact' }, [
    iconButton({
      iconName: 'scan',
      label: hasNewToReveal ? `Scan (${LONG_RANGE_SCAN_CHARGE_COST})` : 'Done',
      className: 'btn btn-primary',
      disabled: !canScan,
      onClick: () => gs.longRangeScan(),
    }),
    iconButton({ iconName: 'currentSystem', label: 'System', onClick: () => gs.show('SYSTEM_VIEW') }),
    iconButton({ iconName: 'ship', label: 'Ship', onClick: () => gs.show('SHIP_SYSTEMS') }),
    iconButton({ iconName: 'codex', label: 'Codex', onClick: () => gs.show('CODEX') }),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide' }, [
    headerRow,
    galaxyPanel,
    hazardBanner,
    ...statusBanners(gs),
    shipResourceBar(save),
    starmap.el,
    actionRow,
  ]));

  starmap.update({ baseSeedInt: gs.baseSeedInt, save });
}
