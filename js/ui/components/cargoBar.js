import { el } from './dom.js';
import { progressBar } from './progressBar.js';
import { icon } from './icons.js';
import { attachHoverTooltip } from './tooltip.js';
import { healthStrip } from './healthStrip.js';
import {
  BUFFER_CAPS, RESOURCE_CAPS, STARTING_RESOURCES, STARTING_BUFFERS,
} from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

const BUFFER_ORDER = ['ore', 'ice', 'water', 'hydrogen'];
const RESOURCE_ORDER = ['fuel', 'charge', 'oxygen', 'food'];

/**
 * A single compact icon + amount + thin fullness bar, one per item, all on
 * one line — shared layout for the ship cargo bar and a planet's
 * surface-mineral readout so the two read as one visual system (source ->
 * destination).
 */
export function resourceIconRow(items) {
  const children = items.map(({ key, label, amount, cap }) => {
    const status = statusFor(amount, cap);
    const niceLabel = label || (key[0].toUpperCase() + key.slice(1));
    const item = el('div', { className: 'cargo-item', 'data-resource-key': key }, [
      el('span', { className: `resource-icon status-${status}`, html: icon(key, 18) }),
      el('span', { className: 'cargo-amount', text: `${Math.round(amount)}` }),
      progressBar(amount, cap, status, 'thin'),
    ]);
    attachHoverTooltip(item, () => `${niceLabel}: ${Math.round(amount)}/${Math.round(cap)}`);
    return item;
  });
  return el('div', { className: 'cargo-row' }, children);
}

/**
 * One icon-chip + label + data row, all on a single line — shared by
 * Health/Ship/Cargo below. The label gets a fixed width (`cargo-section-label`)
 * instead of sizing to its own text, so "Health"/"Ship"/"Cargo" — different
 * lengths — don't leave the data column starting at a different x position
 * on each row.
 */
export function statusSection(iconName, label, dataRow) {
  return el('div', { className: 'row row-tight cargo-section' }, [
    el('span', { className: 'icon-chip', html: icon(iconName, 16) }),
    el('span', { className: 'subtitle cargo-section-label', text: label }),
    dataRow,
  ]);
}

/**
 * Ship status summary — warning-light health chips, the four life-critical
 * resources (fuel/charge/oxygen/food), and the four raw mineral buffers
 * (ore/ice/water/hydrogen) — always shown together in one outlined panel so
 * it's recognizable on every gameplay screen (Galactic View, System View,
 * Planetary View, Ship Systems). Health leads the panel since it's the one
 * section that demands attention; Ship/Cargo below it are steady reference
 * data.
 */
export function shipStatusPanel(gs) {
  const { save } = gs;
  return el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    statusSection('lifebuoy', 'Health', healthStrip(gs)),
    statusSection('ship', 'Ship', resourceIconRow(RESOURCE_ORDER.map((key) => ({ key, amount: save.resources[key], cap: RESOURCE_CAPS[key] })))),
    statusSection('cargo', 'Cargo', resourceIconRow(BUFFER_ORDER.map((key) => ({ key, amount: save.buffers[key], cap: BUFFER_CAPS[key] })))),
  ]);
}

/**
 * Same Ship/Cargo layout as shipStatusPanel, but for New Expedition — before
 * an expedition exists there's no save to read live amounts from, so this
 * shows the fixed starting values every run begins with instead (no Health
 * section, since there's nothing yet to be unhealthy).
 */
export function startingResourcesPanel() {
  return el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    statusSection('ship', 'Ship', resourceIconRow(RESOURCE_ORDER.map((key) => ({ key, amount: STARTING_RESOURCES[key], cap: RESOURCE_CAPS[key] })))),
    statusSection('cargo', 'Cargo', resourceIconRow(BUFFER_ORDER.map((key) => ({ key, amount: STARTING_BUFFERS[key], cap: BUFFER_CAPS[key] })))),
  ]);
}
