// Small monochrome icon set (24x24 viewBox, currentColor) for the HUD and
// action buttons — mainly to cut down on button-label clutter on narrow
// mobile viewports. Cheap inline SVG, consistent with the rest of the
// project's generated-art approach (no icon font/external assets).

const PATHS = {
  fuel: '<path d="M12 2c1.5 3-1 4.5-1 7.5a1 1 0 0 0 2 0c0-.8-.5-1.5-.5-2.3 1.8 1.3 3 3.6 3 5.8a4 4 0 1 1-8 0c0-4.5 2.7-7.3 4.5-11z" fill="currentColor"/>',
  charge: '<path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/>',
  oxygen: '<circle cx="9" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  food: '<path d="M20 4C10 4 4 10 4 20c8 0 14-6 14-14 .8 0 1.6.1 2 .2A8 8 0 0 0 20 4z" fill="currentColor"/>',
  scan: '<circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>',
  closeScan: '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  currentSystem: '<circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/>',
  ship: '<path d="M12 2 20 20 12 16 4 20Z" fill="currentColor"/>',
  codex: '<path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" fill="none" stroke="currentColor" stroke-width="2"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  back: '<path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  harvest: '<path d="M12 3v12M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 19h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  distress: '<path d="M12 3 2 20h20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  rocket: '<path d="M12 2 15 12 9 12Z" fill="currentColor"/><rect x="9" y="12" width="6" height="6" fill="currentColor"/><path d="M10 18 12 22 14 18Z" fill="currentColor" opacity="0.75"/>',
  resume: '<path d="M4 12a8 8 0 1 1 2.5 5.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 12v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.3a2.7 2.7 0 1 1 3.7 2.5c-.7.4-.9.9-.9 1.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="16.3" r="1.1" fill="currentColor"/>',
  settings: '<circle cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'
    + [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="10.8" y="1.6" width="2.4" height="3.6" rx="0.6" fill="currentColor" transform="rotate(${a} 12 12)"/>`).join(''),
  menu: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  star: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="2"/>',
  credits: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  exportIcon: '<path d="M12 15V4M8 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  importIcon: '<path d="M12 4v11M8 11l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  trash: '<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  home: '<path d="M4 11 12 4l8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  wormhole: '<ellipse cx="12" cy="12" rx="9" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4.5" ry="2.5" fill="currentColor" opacity="0.7"/>',
  sample: '<path d="M9 2v6.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 8.5V2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 2h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6.5 14h11" stroke="currentColor" stroke-width="1.5"/>',
  check: '<path d="M4 12.5 9.5 18 20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  // Mineral/buffer icons (ship cargo bar + planet resource bar).
  ore: '<path d="M12 2 21 9 16.5 22 7.5 22 3 9Z" fill="currentColor"/>',
  ice: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  water: '<path d="M12 2c4.5 5.5 7.5 9.3 7.5 13A7.5 7.5 0 1 1 4.5 15C4.5 11.3 7.5 7.5 12 2z" fill="currentColor"/>',
  hydrogen: '<circle cx="7.5" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.4 12h3.2" stroke="currentColor" stroke-width="2"/>',
  // Cargo container (ship hold) and ringed-planet glyph (mirrors favicon.svg's brand mark) — used as
  // source/destination markers so the resource-flow arrow between them reads at a glance.
  cargo: '<path d="M3 8 12 3l9 5v9l-9 5-9-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 8l9 5 9-5M12 13v9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  planet: '<circle cx="12" cy="13" r="6" fill="currentColor"/><ellipse cx="12" cy="13" rx="10" ry="3" fill="none" stroke="currentColor" stroke-width="1.8" transform="rotate(-20 12 13)"/>',
  dna: '<path d="M8 2c6 4 2 8 8 12M8 22c6-4 2-8 8-12" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M9.3 5.3h5.4M8 9.3h8M8 14.7h8M9.3 18.7h5.4" stroke="currentColor" stroke-width="1.2"/>',
  arrowUp: '<path d="M12 20V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  edit: '<path d="M4 20 5 15 16 4 20 8 9 19Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" stroke-width="2"/>',
  lineage: '<circle cx="12" cy="4.5" r="2.5" fill="currentColor"/><circle cx="5" cy="19" r="2.5" fill="currentColor"/><circle cx="19" cy="19" r="2.5" fill="currentColor"/><path d="M12 7v4M12 11 5 16.5M12 11l7 5.5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 14v3M8 21h8M9 21v-2.5a3 3 0 0 1 3-3 3 3 0 0 1 3 3V21" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  cycle: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  save: '<path d="M5 3h11l3 3v15H5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 3v6h7V3M7 14h10v7H7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  difficulty: '<path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  palette: '<path d="M12 3a9 8 0 1 0 0 16c1.4 0 2-1 2-2s-.6-1.6-.6-2.4c0-1.1.9-1.6 2-1.6H17a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="11" r="1.4" fill="currentColor"/><circle cx="9.5" cy="7.2" r="1.4" fill="currentColor"/><circle cx="14.5" cy="7.2" r="1.4" fill="currentColor"/>',
  shipClass: '<path d="M12 2 21 6v6c0 5-4 8.5-9 10-5-1.5-9-5-9-10V6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12.3l2 2 4-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  seed: '<path d="M12 21c-4-2-6-5-6-9a6 6 0 0 1 12 0c0 4-2 7-6 9Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 21V9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  journal: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 3v18" stroke="currentColor" stroke-width="1.6"/>',
};

export function icon(name, size = 18) {
  const path = PATHS[name];
  if (!path) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}
