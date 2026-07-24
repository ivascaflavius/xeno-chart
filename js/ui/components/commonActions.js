// Action-bar buttons shared across every gameplay screen (Galactic/System/
// Planetary/Ship View) — kept in one place so "Distress Beacon" and
// "Codex"/"Journal" behave identically everywhere instead of four
// almost-but-not-quite-matching copies.

import { iconButton } from './iconButton.js';
import { DISTRESS_BEACON_MAX_USES } from '../../data/constants.js';

/** First slot in System/Planetary/Ship View's action bar — leaves to that screen's actual parent. */
export function backAction(label, onClick) {
  return iconButton({ iconName: 'back', label, onClick });
}

/** Galactic View has no parent screen to leave to — its leading action opens the pause menu instead. */
export function menuAction(gs) {
  return iconButton({ iconName: 'menu', label: 'Menu', onClick: () => gs.show('PAUSED') });
}

/**
 * Always present, grayed out until the ship is actually stranded (no
 * discovered/detected system in jump range on current fuel) and a beacon is
 * still available — tapping it while lit sends the beacon directly, same as
 * the health strip's stranded chip.
 */
export function distressBeaconAction(gs) {
  const { save } = gs;
  const beaconsLeft = DISTRESS_BEACON_MAX_USES - save.distressBeaconsUsed;
  const available = save.stranded && beaconsLeft > 0;
  return iconButton({
    iconName: 'distress',
    label: available ? `Beacon (${beaconsLeft})` : 'Beacon',
    className: available ? 'btn btn-danger' : 'btn',
    disabled: !available,
    onClick: () => gs.sendDistressBeacon(),
  });
}

export function codexAction(gs) {
  return iconButton({ iconName: 'codex', label: 'Codex', onClick: () => gs.show('CODEX') });
}

export function journalAction(gs) {
  return iconButton({ iconName: 'journal', label: 'Journal', onClick: () => gs.show('JOURNAL') });
}
