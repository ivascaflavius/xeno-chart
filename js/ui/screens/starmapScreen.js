import { el } from '../components/dom.js';
import { createStarmap } from '../../render/starmap.js';
import { LONG_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { getSystemsInRadius } from '../../procgen/galaxy.js';
import { effectiveSensorRange } from '../../systems/travel.js';
import { icon } from '../components/icons.js';
import { iconButton } from '../components/iconButton.js';
import { statusBanners } from '../components/statusBanners.js';
import { cargoBar } from '../components/cargoBar.js';
import { openJumpModal } from './jumpPlanning.js';
import { enqueueCelebration } from '../components/celebration.js';

export function render(container, gs) {
  const save = gs.save;
  const sys = gs.currentSystem();

  // Journal used to sit at the top-right of the header, but that's the exact
  // corner celebration toasts pop up in (§11a) — the two kept covering each
  // other. Moved down to the action row, next to Codex, instead.
  const headerRow = el('div', { className: 'row row-tight screen-header' }, [
    iconButton({
      iconName: 'menu', label: 'Menu', iconOnly: true, onClick: () => gs.show('PAUSED'),
    }),
    el('p', { className: 'title', text: 'Galactic View' }),
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
      openJumpModal(gs, systemId);
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
    iconButton({ iconName: 'journal', label: 'Journal', onClick: () => gs.show('JOURNAL') }),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide' }, [
    headerRow,
    galaxyPanel,
    hazardBanner,
    ...statusBanners(gs),
    cargoBar(save),
    starmap.el,
    actionRow,
  ]));

  starmap.update({ baseSeedInt: gs.baseSeedInt, save });

  // A jump just committed (see jumpPlanning.js's openJumpModal) — the save
  // already reflects arrival, but the camera hasn't "traveled" there yet.
  // Play that beat now that the map is actually mounted, then confirm arrival
  // once it's done, rather than the destination just silently appearing.
  if (gs.pendingJumpAnimation) {
    const { fromPos, toPos, destinationName } = gs.pendingJumpAnimation;
    gs.pendingJumpAnimation = null;
    starmap.animateJump(fromPos, toPos, 1200, () => {
      enqueueCelebration('minor', {
        title: 'Arrived',
        body: `${destinationName} — 1 cycle elapsed`,
      });
    });
  }
}
