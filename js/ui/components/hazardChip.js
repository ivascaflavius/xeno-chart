import { el } from './dom.js';
import { icon } from './icons.js';
import { showModal } from './modal.js';
import {
  SOLAR_FLARE_SCAN_MULTIPLIER, RADIATION_ZONE_SCAN_CHARGE_MULTIPLIER, ASTEROID_FIELD_FUEL_MULTIPLIER,
} from '../../data/constants.js';

const HAZARD_EFFECT = {
  'solar-flare': `Long-range sensor reach is cut to ${Math.round(SOLAR_FLARE_SCAN_MULTIPLIER * 100)}% of normal in this system.`,
  'radiation-zone': `Close-range scans cost ${RADIATION_ZONE_SCAN_CHARGE_MULTIPLIER}x charge in this system.`,
  'asteroid-field': `Jumps departing this system cost ${ASTEROID_FIELD_FUEL_MULTIPLIER}x fuel.`,
};

/**
 * Always-present hazard indicator for a system's info panel (Galactic/
 * System/Planetary View all show info about whatever system the ship is
 * currently in) — grayed out when the system is clear, so the panel's
 * height never changes depending on whether a hazard rolled; lit amber and
 * tappable for detail when one is present. Replaces the old inline "⚠ Label"
 * subtitle line, which only existed when a hazard was present and so made
 * the same info panel a different height screen-to-screen. Icon-only on
 * mobile; tablet/desktop have room to spell out the label too (`.chip-label`,
 * shared with the health strip's chips).
 */
export function hazardChip(hazard) {
  const active = !!hazard;
  const label = active ? hazard.label : 'No Hazards Detected';
  return el('button', {
    className: `icon-chip hazard-chip${active ? ' status-amber' : ''}`,
    onClick: () => showModal({
      title: label,
      body: active
        ? (HAZARD_EFFECT[hazard.type] || 'This system has an environmental hazard affecting operations here.')
        : 'This system has no environmental hazards — scans and jumps cost the usual amount here.',
      buttons: [{ label: 'Close', className: 'btn' }],
    }),
  }, [
    el('span', { className: 'btn-icon', html: icon('distress', 18) }),
    el('span', { className: 'chip-label', text: label }),
  ]);
}
