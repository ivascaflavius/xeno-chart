import { el } from './dom.js';
import { progressBar } from './progressBar.js';
import { icon } from './icons.js';
import { attachHoverTooltip } from './tooltip.js';
import { BUFFER_CAPS, RESOURCE_CAPS } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

const BUFFER_ORDER = ['ore', 'ice', 'water', 'hydrogen'];
const RESOURCE_ORDER = ['fuel', 'charge', 'oxygen', 'food'];

/**
 * A single row of icon + thin fullness bar + amount, one per item — shared
 * layout for the ship cargo bar and a planet's surface-mineral readout so the
 * two read as one visual system (source -> destination). `trailing`, if
 * given, is appended as one more row item after the resources (e.g. a
 * Harvest button) so an action can share the same single line instead of
 * needing its own row underneath.
 */
export function resourceIconRow(items, trailing = null, { showLabels = false } = {}) {
  const children = items.map(({ key, label, amount, cap }) => {
    const status = statusFor(amount, cap);
    const niceLabel = label || (key[0].toUpperCase() + key.slice(1));
    const item = el('div', { className: 'cargo-item', 'data-resource-key': key }, [
      el('span', { className: `resource-icon status-${status}`, html: icon(key, 20) }),
      showLabels ? el('span', { className: 'cargo-label', text: niceLabel }) : null,
      progressBar(amount, cap, status, 'thin'),
      el('span', { className: 'cargo-amount', text: `${Math.round(amount)}` }),
    ]);
    attachHoverTooltip(item, () => `${niceLabel}: ${Math.round(amount)}/${Math.round(cap)}`);
    return item;
  });
  if (trailing) children.push(trailing);
  return el('div', { className: 'cargo-row' }, children);
}

function shipResourceRows(save) {
  return [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: 'icon-chip', html: icon('ship', 16) }),
      el('span', { className: 'subtitle', text: 'Ship' }),
    ]),
    resourceIconRow(RESOURCE_ORDER.map((key) => ({ key, amount: save.resources[key], cap: RESOURCE_CAPS[key] }))),
  ];
}

/**
 * The four life-critical resources (fuel/charge/oxygen/food) on their own —
 * the same panel/markup as the top half of cargoBar(), reused stand-alone on
 * the Galactic View (which has no mineral cargo section of its own).
 */
export function shipResourceBar(save) {
  return el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, shipResourceRows(save));
}

/**
 * Compact ship status summary — the four life-critical resources (fuel/
 * charge/oxygen/food) on top, so a slide toward empty is visible while
 * browsing System/Planetary View, not just back on the Galactic View — and
 * the four raw mineral buffers below, so storage room is visible while
 * browsing planets.
 */
export function cargoBar(save) {
  return el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    ...shipResourceRows(save),
    el('div', { className: 'row row-tight', style: 'margin-top:4px' }, [
      el('span', { className: 'icon-chip', html: icon('cargo', 16) }),
      el('span', { className: 'subtitle', text: 'Cargo' }),
    ]),
    resourceIconRow(BUFFER_ORDER.map((key) => ({ key, amount: save.buffers[key], cap: BUFFER_CAPS[key] }))),
  ]);
}
