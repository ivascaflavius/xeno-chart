import { el } from '../components/dom.js';
import { createStarmap } from '../../render/starmap.js';
import { statusFor } from '../../systems/resources.js';
import { RESOURCE_CAPS, LONG_RANGE_SCAN_CHARGE_COST } from '../../data/constants.js';
import { getSystemsInRadius } from '../../procgen/galaxy.js';
import { effectiveSensorRange } from '../../systems/travel.js';

function resourceChip(save, label, key) {
  const amount = Math.round(save.resources[key]);
  const cap = RESOURCE_CAPS[key];
  const status = statusFor(save.resources[key], cap);
  return el('div', { className: 'row', style: 'gap:6px' }, [
    el('span', { className: `status-dot status-${status}` }),
    el('span', { text: `${label} ${amount}/${cap}` }),
  ]);
}

export function render(container, gs) {
  const save = gs.save;
  const sys = gs.currentSystem();

  const hudTop = el('div', { className: 'row' }, [
    resourceChip(save, 'Fuel', 'fuel'),
    resourceChip(save, 'Charge', 'charge'),
    resourceChip(save, 'Oxygen', 'oxygen'),
    resourceChip(save, 'Food', 'food'),
    el('div', { className: 'spacer' }),
    el('button', { className: 'btn', text: 'Pause', onClick: () => gs.show('PAUSED') }),
  ]);

  const lifeSupportBanner = save.lifeSupportCountdown !== null
    ? el('div', {
      className: 'banner banner-warn',
      text: `LIFE SUPPORT CRITICAL — ${save.lifeSupportCountdown} cycle${save.lifeSupportCountdown === 1 ? '' : 's'} remaining`,
    })
    : null;

  const strandedBanner = save.stranded
    ? el('div', { className: 'banner banner-danger row' }, [
      el('span', { text: 'Stranded — insufficient fuel to jump.' }),
      el('div', { className: 'spacer' }),
      save.distressBeaconUsed
        ? el('span', { className: 'subtitle', text: 'Distress beacon already used' })
        : el('button', { className: 'btn btn-danger', text: 'Send Distress Beacon', onClick: () => gs.sendDistressBeacon() }),
    ])
    : null;

  const starmap = createStarmap((systemId) => {
    if (systemId === save.position.systemId) {
      gs.show('SYSTEM_VIEW');
    } else {
      gs.show('JUMP_PLANNING', { selectedSystemId: systemId });
    }
  });

  const nearby = getSystemsInRadius(gs.baseSeedInt, sys.pos, effectiveSensorRange(save));
  const hasNewToReveal = nearby.some((stub) => !save.discoveries[stub.id]);
  const canAffordScan = save.resources.charge >= LONG_RANGE_SCAN_CHARGE_COST;
  const canScan = canAffordScan && hasNewToReveal;
  const actionRow = el('div', { className: 'row' }, [
    el('button', {
      className: 'btn btn-primary',
      text: hasNewToReveal ? `Long-range Scan (${LONG_RANGE_SCAN_CHARGE_COST} charge)` : 'Long-range Scan (nothing new nearby)',
      disabled: !canScan,
      onClick: () => gs.longRangeScan(),
    }),
    el('button', { className: 'btn', text: 'Ship Systems', onClick: () => gs.show('SHIP_SYSTEMS') }),
    el('button', { className: 'btn', text: 'Codex', onClick: () => gs.show('CODEX') }),
  ]);

  container.appendChild(el('div', { className: 'screen' }, [
    hudTop,
    lifeSupportBanner,
    strandedBanner,
    el('p', { className: 'subtitle', text: `${save.galaxyName} · Cycle ${save.cycle} · ${sys.star.label}` }),
    starmap.el,
    actionRow,
  ]));

  starmap.update({ baseSeedInt: gs.baseSeedInt, save });
}
