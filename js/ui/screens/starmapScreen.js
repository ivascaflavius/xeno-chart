import { el } from '../components/dom.js';
import { createStarmap } from '../../render/starmap.js';
import { statusFor } from '../../systems/resources.js';
import { RESOURCE_CAPS, LONG_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { getSystemsInRadius } from '../../procgen/galaxy.js';
import { effectiveSensorRange } from '../../systems/travel.js';
import { icon } from '../components/icons.js';
import { iconButton } from '../components/iconButton.js';

function resourceChip(save, iconName, key) {
  const amount = Math.round(save.resources[key]);
  const cap = RESOURCE_CAPS[key];
  const status = statusFor(save.resources[key], cap);
  return el('div', { className: 'row resource-chip', style: 'gap:4px' }, [
    el('span', { className: `resource-icon status-${status}`, html: icon(iconName) }),
    el('span', { text: `${amount}/${cap}` }),
  ]);
}

export function render(container, gs) {
  const save = gs.save;
  const sys = gs.currentSystem();

  const hudTop = el('div', { className: 'row row-tight' }, [
    resourceChip(save, 'fuel', 'fuel'),
    resourceChip(save, 'charge', 'charge'),
    resourceChip(save, 'oxygen', 'oxygen'),
    resourceChip(save, 'food', 'food'),
    el('div', { className: 'spacer' }),
    iconButton({
      iconName: 'pause', label: 'Pause', iconOnly: true, onClick: () => gs.show('PAUSED'),
    }),
  ]);

  const lifeSupportBanner = save.lifeSupportCountdown !== null
    ? el('div', {
      className: 'banner banner-warn',
      text: `LIFE SUPPORT CRITICAL — ${save.lifeSupportCountdown} cycle${save.lifeSupportCountdown === 1 ? '' : 's'} remaining`,
    })
    : null;

  const hazardBanner = sys.hazard
    ? el('div', { className: 'banner banner-warn', text: `${sys.hazard.label} in this system.` })
    : null;

  const strandedBanner = save.stranded
    ? el('div', { className: 'banner banner-danger row' }, [
      el('span', { text: 'Stranded — insufficient fuel to jump.' }),
      el('div', { className: 'spacer' }),
      save.distressBeaconUsed
        ? el('span', { className: 'subtitle', text: 'Beacon used' })
        : iconButton({
          iconName: 'distress',
          label: 'Distress Beacon',
          className: 'btn btn-danger',
          onClick: () => gs.sendDistressBeacon(),
        }),
    ])
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

  container.appendChild(el('div', { className: 'screen' }, [
    hudTop,
    lifeSupportBanner,
    hazardBanner,
    strandedBanner,
    el('p', {
      className: 'subtitle',
      text: `${save.galaxyName} · Cycle ${save.cycle} · ${sys.star.label} · ${save.difficulty === 'relaxed' ? 'Relaxed' : 'Expedition'}`,
    }),
    starmap.el,
    actionRow,
  ]));

  starmap.update({ baseSeedInt: gs.baseSeedInt, save });
}
