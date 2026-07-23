import { icon } from '../ui/components/icons.js';

// A small top-down schematic of the ship's hull with its four automated
// modules positioned as labeled bays — the Ship Systems dashboard's answer
// to the orbit diagrams System View/Scan Detail already show, just for the
// ship itself instead of a system. Purely decorative/informational; module
// status still comes from getModuleStatuses(), this only visualizes it.

const MODULE_ICON = {
  refinery: 'fuel', electrolysis: 'oxygen', hydroponics: 'food', reactor: 'charge',
};

// Positions in the 160x220 viewBox, nose at the top (matches the brand ship
// glyph's own orientation) — reactor centered near the engine at the rear,
// refinery/electrolysis/hydroponics arranged around the mid hull.
const MODULE_POSITIONS = {
  refinery: { x: 45, y: 75 },
  electrolysis: { x: 115, y: 75 },
  hydroponics: { x: 45, y: 150 },
  reactor: { x: 115, y: 150 },
};

const STATUS_COLOR = {
  green: 'var(--ok)', amber: 'var(--warn)', red: 'var(--danger)', disabled: 'var(--danger)',
};

function moduleBay(m, hullColorHex) {
  const pos = MODULE_POSITIONS[m.key];
  if (!pos) return '';
  const color = STATUS_COLOR[m.status] || 'var(--text-faint)';
  const pulse = m.status === 'disabled' ? ' schematic-bay-fault' : '';
  return `
    <g transform="translate(${pos.x},${pos.y})">
      <rect x="-24" y="-18" width="48" height="36" rx="7" fill="none" style="stroke:${color}" stroke-width="2" class="${pulse.trim()}" opacity="0.9"/>
      <rect x="-24" y="-18" width="48" height="36" rx="7" style="fill:${color}" opacity="0.08"/>
      <g style="color:${color}" transform="translate(-10,-10)">${icon(MODULE_ICON[m.key], 20)}</g>
    </g>
  `;
}

export function shipSchematicHtml(moduleStatuses, hullColorHex) {
  const hull = `
    <path d="M80 8 L138 78 L118 208 L42 208 L22 78 Z" fill="none" style="stroke:${hullColorHex}" stroke-width="2.5" opacity="0.85"/>
    <path d="M80 8 L138 78 L118 208 L42 208 L22 78 Z" style="fill:${hullColorHex}" opacity="0.06"/>
    <path d="M80 8 L96 40 L64 40 Z" style="fill:${hullColorHex}" opacity="0.25"/>
  `;
  const bays = moduleStatuses.map((m) => moduleBay(m, hullColorHex)).join('');
  return `
    <svg viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%; display:block;">
      ${hull}
      ${bays}
    </svg>
  `;
}
