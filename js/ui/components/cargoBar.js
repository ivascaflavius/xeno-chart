import { el } from './dom.js';
import { progressBar } from './progressBar.js';
import { icon } from './icons.js';
import { attachHoverTooltip } from './tooltip.js';
import { BUFFER_CAPS } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

const BUFFER_ORDER = ['ore', 'ice', 'water', 'hydrogen'];

/**
 * A single row of icon + thin fullness bar + amount, one per item — shared
 * layout for the ship cargo bar and a planet's surface-mineral readout so the
 * two read as one visual system (source -> destination). `trailing`, if
 * given, is appended as one more row item after the resources (e.g. a
 * Harvest button) so an action can share the same single line instead of
 * needing its own row underneath.
 */
export function resourceIconRow(items, trailing = null) {
  const children = items.map(({ key, label, amount, cap }) => {
    const status = statusFor(amount, cap);
    const item = el('div', { className: 'cargo-item' }, [
      el('span', { className: `resource-icon status-${status}`, html: icon(key, 20) }),
      progressBar(amount, cap, status, 'thin'),
      el('span', { className: 'cargo-amount', text: `${Math.round(amount)}` }),
    ]);
    const niceLabel = label || (key[0].toUpperCase() + key.slice(1));
    attachHoverTooltip(item, () => `${niceLabel}: ${Math.round(amount)}/${Math.round(cap)}`);
    return item;
  });
  if (trailing) children.push(trailing);
  return el('div', { className: 'cargo-row' }, children);
}

/** Compact ship cargo summary — one row, all four raw mineral buffers, so storage room is visible while browsing planets. */
export function cargoBar(save) {
  return el('div', { className: 'panel stack panel-compact' }, [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: 'icon-chip', html: icon('cargo', 16) }),
      el('span', { className: 'subtitle', text: 'Cargo' }),
    ]),
    resourceIconRow(BUFFER_ORDER.map((key) => ({ key, amount: save.buffers[key], cap: BUFFER_CAPS[key] }))),
  ]);
}
