import { el } from './dom.js';
import { icon } from './icons.js';
import { showModal } from './modal.js';
import { attachHoverTooltip } from './tooltip.js';
import { statusFor } from '../../systems/resources.js';
import { RESOURCE_CAPS, DISTRESS_BEACON_MAX_USES } from '../../data/constants.js';

const RESOURCE_WARNING_INFO = {
  fuel: { mineral: 'ore', module: 'Refinery' },
  oxygen: { mineral: 'ice', module: 'Electrolysis Unit' },
  food: { mineral: 'water', module: 'Hydroponics Bay' },
};

function detailModal(title, body) {
  showModal({ title, body, buttons: [{ label: 'Close', className: 'btn' }] });
}

/**
 * A single warning-light chip — no `status` class (and no onClick) reads as
 * the base grayed-out `.icon-chip` look; a status class lights it up.
 * Icon-only on mobile; tablet/desktop show `label` too (`.chip-label`,
 * shared with the hazard chip) since there's room to spell out what each
 * light actually means instead of relying on hover (which touch has none of
 * anyway — the tooltip is a desktop-only bonus, tapping for the detail modal
 * is the real affordance everywhere).
 */
function chip({
  iconName, status, tooltip, label, onClick,
}) {
  const btn = el('button', {
    className: `icon-chip health-chip${status ? ` status-${status}` : ''}`,
    disabled: !onClick,
    onClick,
  }, [
    el('span', { className: 'btn-icon', html: icon(iconName, 16) }),
    el('span', { className: 'chip-label', text: label }),
  ]);
  attachHoverTooltip(btn, () => tooltip);
  return btn;
}

/**
 * Fixed-height row of warning-light chips — grayed out ("nominal") by
 * default, lit amber/red when something needs attention, tap a lit one for
 * detail. Nested as the "Health" section of shipStatusPanel (cargoBar.js),
 * shared across every gameplay screen instead of the old statusBanners()
 * full-text banners. Those banners' combined height grew without bound as
 * more warnings stacked up (stranded + low fuel + critical life support
 * could all fire at once), eating into whatever vertical space the main
 * view (starmap, orbit diagram, ship schematic) had left — worst on short
 * mobile viewports. This strip is the same height regardless of how many
 * things are wrong.
 */
export function healthStrip(gs) {
  const { save } = gs;
  const chips = [];

  for (const [key, info] of Object.entries(RESOURCE_WARNING_INFO)) {
    const amount = save.resources[key];
    const cap = RESOURCE_CAPS[key];
    const status = statusFor(amount, cap);
    const label = key[0].toUpperCase() + key.slice(1);
    const active = status !== 'green';
    chips.push(chip({
      iconName: key,
      status: active ? status : null,
      label,
      tooltip: active
        ? `${label} ${status === 'red' ? 'critical' : 'running low'} (${Math.round(amount)}/${cap})`
        : `${label}: nominal`,
      onClick: active ? () => detailModal(
        `${label} ${status === 'red' ? 'Critical' : 'Running Low'}`,
        `${Math.round(amount)}/${cap} — mine ${info.mineral} to keep the ${info.module} topped up before it runs out.`,
      ) : null,
    }));
  }

  const critical = save.lifeSupportCountdown !== null;
  chips.push(chip({
    iconName: 'lifebuoy',
    status: critical ? 'red' : null,
    label: 'Life Support',
    tooltip: critical
      ? `Life support critical — ${save.lifeSupportCountdown} cycle${save.lifeSupportCountdown === 1 ? '' : 's'} left`
      : 'Life support: nominal',
    onClick: critical ? () => detailModal(
      'Life Support Critical',
      `${save.lifeSupportCountdown} cycle${save.lifeSupportCountdown === 1 ? '' : 's'} remaining before failure — get oxygen and food back above zero immediately.`,
    ) : null,
  }));

  const beaconsLeft = DISTRESS_BEACON_MAX_USES - save.distressBeaconsUsed;
  chips.push(chip({
    iconName: 'distress',
    status: save.stranded ? 'red' : null,
    label: 'Distress',
    tooltip: save.stranded ? 'Stranded — insufficient fuel to jump' : 'Jump range: nominal',
    onClick: save.stranded ? () => showModal({
      title: 'Stranded',
      body: 'Insufficient fuel to reach any known system.',
      buttons: [
        { label: 'Close', className: 'btn' },
        beaconsLeft > 0
          ? { label: `Send Distress Beacon (${beaconsLeft} left)`, className: 'btn btn-danger', onClick: () => gs.sendDistressBeacon() }
          : { label: 'No beacons left', className: 'btn', disabled: true },
      ],
    }) : null,
  }));

  return el('div', { className: 'health-strip' }, chips);
}
