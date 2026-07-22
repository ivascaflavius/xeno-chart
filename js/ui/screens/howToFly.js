import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';

const SECTIONS = [
  {
    heading: 'Controls',
    body: 'Drag or swipe to pan the starmap. Scroll or pinch to zoom. Tap a system to open it.',
  },
  {
    heading: 'Resources',
    body: 'Fuel powers jumps. Charge powers scans. Oxygen and food are your life-support reserves — '
      + 'if either hits zero, a countdown to expedition failure begins.',
  },
  {
    heading: 'Scanning',
    body: 'A long-range scan (cheap, costs charge) reveals rough info about systems within sensor range. '
      + 'A close-range scan (costs more charge) reveals full detail once you have arrived at a system.',
  },
  {
    heading: 'Jumping',
    body: 'Open a system from the starmap to preview distance and fuel cost, then commit to jump there '
      + 'instantly. Running out of fuel strands your ship — a one-time distress beacon can bail you out.',
  },
  {
    heading: 'Harvesting & Modules',
    body: 'Harvest minerals from close-scanned planets to feed automated modules: the refinery turns ore '
      + 'into fuel, the electrolysis unit turns ice into oxygen and hydrogen, the hydroponics bay turns '
      + 'water and oxygen into food, and the reactor turns fuel into charge.',
  },
  {
    heading: 'Wormholes & Hazards',
    body: 'Some systems hide a wormhole — a cheap, flat-cost shortcut to a distant system, revealed once '
      + "you close-range scan it. Others carry a hazard flagged as soon as you long-range scan them: solar "
      + 'flares reduce your scan range, radiation zones raise close-scan costs, and asteroid fields raise '
      + 'the fuel cost to jump in — plan around them, they never ambush you.',
  },
];

export function render(container, gs) {
  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'How to Fly' }),
    ...SECTIONS.map((s) => el('div', { className: 'panel stack' }, [
      el('p', { text: s.heading, style: 'font-weight:600' }),
      el('p', { className: 'subtitle', text: s.body }),
    ])),
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.back() }),
  ]));
}
