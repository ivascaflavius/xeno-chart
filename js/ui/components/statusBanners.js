import { el } from './dom.js';
import { iconButton } from './iconButton.js';
import { RESOURCE_CAPS, DISTRESS_BEACON_MAX_USES } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

// Early, lower-urgency heads-up for each resource whose depletion eventually
// ends the run (oxygen/food -> life-support failure, fuel -> stranding) —
// fires at the same "amber" threshold already used to color the HUD chips,
// well before the resource actually hits zero and the critical/danger
// banners below take over, so there's a chance to react instead of the
// ending arriving with no warning. Points at the specific mineral/module
// that resource depends on, since mining that is the actual fix.
const EARLY_WARNING_INFO = {
  oxygen: { mineral: 'ice', module: 'Electrolysis Unit' },
  food: { mineral: 'water', module: 'Hydroponics Bay' },
  fuel: { mineral: 'ore', module: 'Refinery' },
};

function earlyWarningBanners(save) {
  return Object.entries(EARLY_WARNING_INFO)
    .filter(([key]) => statusFor(save.resources[key], RESOURCE_CAPS[key]) === 'amber')
    .map(([key, info]) => el('div', {
      className: 'banner banner-info',
      text: `${key[0].toUpperCase()}${key.slice(1)} running low (${Math.round(save.resources[key])}/${RESOURCE_CAPS[key]}) — mine ${info.mineral} to keep the ${info.module} topped up before it runs out.`,
    }));
}

/**
 * Ship-status banners (life-support critical, stranded, early low-resource
 * warnings) shared across every gameplay screen — Galactic View, System
 * View, Planetary View — so a problem that started while mining a planet is
 * visible right there instead of only showing up back on the starmap. The
 * distress beacon button works the same way here as on the Galactic View:
 * gs.sendDistressBeacon() just refreshes whichever screen is currently
 * showing, no navigation needed.
 */
export function statusBanners(gs) {
  const { save } = gs;
  const banners = [];

  if (save.lifeSupportCountdown !== null) {
    banners.push(el('div', {
      className: 'banner banner-warn',
      text: `LIFE SUPPORT CRITICAL — ${save.lifeSupportCountdown} cycle${save.lifeSupportCountdown === 1 ? '' : 's'} remaining`,
    }));
  }

  if (save.stranded) {
    const beaconsLeft = DISTRESS_BEACON_MAX_USES - save.distressBeaconsUsed;
    banners.push(el('div', { className: 'banner banner-danger row' }, [
      el('span', { text: 'Stranded — insufficient fuel to jump.' }),
      el('div', { className: 'spacer' }),
      beaconsLeft <= 0
        ? el('span', { className: 'subtitle', text: 'No beacons left' })
        : iconButton({
          iconName: 'distress',
          label: `Distress Beacon (${beaconsLeft} left)`,
          className: 'btn btn-danger',
          onClick: () => gs.sendDistressBeacon(),
        }),
    ]));
  }

  banners.push(...earlyWarningBanners(save));
  return banners;
}
