import { el } from '../components/dom.js';
import { icon } from '../components/icons.js';
import { screenHeader } from '../components/screenHeader.js';

const TABS = [
  {
    key: 'overview',
    iconName: 'help',
    label: 'Overview',
    subtitle: 'The basic loop, start to finish.',
    sections: [
      {
        heading: 'The Loop',
        iconName: 'scan',
        body: 'Long-range scan (cheap) reveals nearby systems. Commit a jump to one, then close-range scan on '
          + 'arrival for full detail — planet classes, minerals, hazards, and any biosignature. Harvest minerals to '
          + "feed your ship's automated modules, which keep fuel, charge, oxygen, and food topped up. If oxygen or "
          + 'food hits zero, a countdown to expedition failure begins.',
      },
      {
        heading: 'Ship Setup',
        iconName: 'shipClass',
        body: 'At New Expedition you choose a ship class (Standard, Scanner-Focused, or Fuel-Efficient) and a hull '
          + 'color — some hull colors unlock only after specific achievements.',
      },
    ],
  },
  {
    key: 'galactic',
    iconName: 'currentSystem',
    label: 'Galactic View',
    subtitle: 'The starmap you travel and scan from.',
    sections: [
      {
        heading: 'The Starmap',
        iconName: 'currentSystem',
        body: 'Drag or swipe to pan, scroll or pinch to zoom. Tap a system to open its Jump Planning preview. Fog '
          + 'of war hides anything you have not scanned; a soft trail marks your scan history and travel path.',
      },
      {
        heading: 'HUD',
        iconName: 'menu',
        body: 'The top row shows your four resource gauges plus a hamburger menu (pause) on the left and the '
          + 'Journal on the right. Below that, a compact row shows your ship name, current cycle, and current '
          + 'system.',
      },
    ],
  },
  {
    key: 'system',
    iconName: 'star',
    label: 'System View',
    subtitle: 'A star and its planets, once you have jumped there.',
    sections: [
      {
        heading: 'Star & Orbits',
        iconName: 'star',
        body: "Shows the star's stats (temperature, radius, mass) and an orbit diagram of its planets, with a soft "
          + 'green band marking the habitable zone where life is more likely. Tap a planet to open its Planetary '
          + 'View.',
      },
      {
        heading: 'Planet Grid',
        iconName: 'planet',
        body: 'Planets without any minerals are grayed out; fully-harvested planets are marked so you know at a '
          + 'glance which are still worth a visit.',
      },
    ],
  },
  {
    key: 'planetary',
    iconName: 'planet',
    label: 'Planetary View',
    subtitle: 'A single planet up close.',
    sections: [
      {
        heading: 'Planet Detail',
        iconName: 'planet',
        body: "Shows the planet's stats (surface temperature, radius, mass, moon count), its mineral deposits, and "
          + 'an orbital view of any moons. Any detected biosignature also shows here — see the Biosignatures tab.',
      },
      {
        heading: 'Harvesting',
        iconName: 'harvest',
        body: "Harvest All (or a single mineral, if there's only one) drains the planet's deposit into your ship's "
          + 'cargo hold — see the Resources tab for how cargo feeds your modules.',
      },
    ],
  },
  {
    key: 'ship',
    iconName: 'ship',
    label: 'Ship Systems',
    subtitle: "Your ship's gauges and automated modules.",
    sections: [
      {
        heading: 'Resources & Modules',
        iconName: 'ship',
        body: 'Four gauges (fuel, charge, oxygen, food) plus four automated modules: the refinery turns ore into '
          + 'fuel, the electrolysis unit turns ice into oxygen and hydrogen, the hydroponics bay turns water and '
          + 'oxygen into food, and the reactor turns fuel into charge.',
      },
      {
        heading: 'Ship Schematic',
        iconName: 'shipClass',
        body: "The diagram at the bottom mirrors each module's status — green is healthy, amber is low on input, "
          + 'red/pulsing means disabled (most often from a hostile first-contact encounter) for a few cycles.',
      },
    ],
  },
  {
    key: 'codex',
    iconName: 'codex',
    label: 'Codex',
    subtitle: 'Everything you have discovered, across expeditions.',
    sections: [
      {
        heading: 'Discovery Tracks',
        iconName: 'codex',
        body: 'Stellar, Planetary, and Biological tabs fill in as you close-range scan and sample new classes and '
          + 'lifeforms — these persist between expeditions.',
      },
      {
        heading: 'Lineage & Achievements',
        iconName: 'lineage',
        body: 'Lineage groups sampled lifeforms from the current expedition into shared-ancestry clades. '
          + 'Achievements track one-time milestones like first contact or surviving a stranding.',
      },
    ],
  },
  {
    key: 'resources',
    iconName: 'cargo',
    label: 'Resources',
    subtitle: 'What each gauge does and how they feed each other.',
    sections: [
      {
        heading: 'Ship Gauges',
        iconName: 'charge',
        body: 'Fuel powers jumps, charge powers scans. Oxygen and food are life support — if either runs out, a '
          + 'countdown to expedition failure begins.',
      },
      {
        heading: 'Cargo & Minerals',
        iconName: 'cargo',
        body: 'Harvested ore, ice, water, and hydrogen sit in your cargo hold until an automated module converts '
          + 'them: ore into fuel, ice into oxygen and hydrogen, water (with oxygen) into food, and fuel into '
          + 'charge.',
      },
      {
        heading: 'Stranded',
        iconName: 'distress',
        body: 'Running out of fuel leaves you stranded — a distress beacon grants emergency fuel, usable up to '
          + 'three times per expedition. If you are ever stranded with no beacons left, and nothing left to scan '
          + 'or harvest either, the expedition ends there — drifting with no way to call for help again.',
      },
    ],
  },
  {
    key: 'hazards',
    iconName: 'distress',
    label: 'Hazards',
    subtitle: 'System-level dangers and shortcuts.',
    sections: [
      {
        heading: 'System Hazards',
        iconName: 'distress',
        body: 'Flagged the moment you long-range scan a system: solar flares reduce your scan range, radiation '
          + 'zones raise close-scan costs, and asteroid fields raise the fuel cost to jump in. They never ambush '
          + 'you — plan around them before committing a jump.',
      },
      {
        heading: 'Wormholes',
        iconName: 'wormhole',
        body: 'Some systems hide a wormhole — a cheap, flat-cost shortcut to a distant system, revealed once you '
          + 'close-range scan it.',
      },
    ],
  },
  {
    key: 'bio',
    iconName: 'dna',
    label: 'Biosignatures',
    subtitle: 'Detecting and sampling life.',
    sections: [
      {
        heading: 'Detecting Life',
        iconName: 'dna',
        body: 'A close-range scan reveals whether a planet carries a biosignature, but identifying it — and '
          + 'crediting the Codex/achievements — requires a deliberate Take Sample action from the Planetary View.',
      },
      {
        heading: 'First Contact',
        iconName: 'sample',
        body: 'Rare biosignatures turn out to be intelligent. Sampling one triggers first contact, either peaceful '
          + 'or, occasionally, hostile — a hostile encounter disables one random ship module for a few cycles.',
      },
    ],
  },
];

export function render(container, gs) {
  let active = 'overview';
  const contentWrap = el('div', { className: 'panel stack howtofly-panel' });
  const tabRow = el('div', { className: 'tabs' });
  const tabSubtitle = el('p', { className: 'subtitle' });

  function renderContent() {
    const tab = TABS.find((t) => t.key === active);
    tabSubtitle.textContent = tab?.subtitle || '';
    contentWrap.innerHTML = '';
    for (const s of tab.sections) {
      contentWrap.appendChild(el('div', { className: 'howtofly-section stack' }, [
        el('div', { className: 'row', style: 'gap:8px' }, [
          el('span', { className: 'resource-icon', style: 'color:var(--accent)', html: icon(s.iconName, 18) }),
          el('p', { text: s.heading, style: 'font-weight:600' }),
        ]),
        el('p', { className: 'subtitle', text: s.body }),
      ]));
    }
  }

  function renderTabs() {
    tabRow.innerHTML = '';
    for (const tab of TABS) {
      tabRow.appendChild(el('button', {
        className: `tab-btn${active === tab.key ? ' active' : ''}`,
        title: tab.label,
        html: icon(tab.iconName, 20),
        onClick: () => {
          active = tab.key;
          renderTabs();
          renderContent();
        },
      }));
    }
  }

  renderTabs();
  renderContent();

  container.appendChild(el('div', { className: 'screen screen-pinned-header' }, [
    screenHeader('Help', () => gs.back()),
    tabRow,
    el('div', { className: 'screen-scroll-body' }, [
      tabSubtitle,
      contentWrap,
    ]),
  ]));
}
