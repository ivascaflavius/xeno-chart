import { el } from '../components/dom.js';
import {
  starPortrait, planetPortrait, lifePortrait, lockedPortrait, HOT_JUPITER_COLOR,
} from '../../render/portraits.js';
import {
  STAR_CLASSES, PLANET_CLASSES, BIOCHEMISTRY_TYPES, LIFE_STAGES, ACHIEVEMENTS,
} from '../../data/constants.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { icon } from '../components/icons.js';
import { generateCladeName } from '../../procgen/names.js';
import { screenHeader } from '../components/screenHeader.js';

const TABS = [
  {
    key: 'stellar', iconName: 'star', label: 'Stellar', subtitle: 'Stars discovered across your travels.',
  },
  {
    key: 'planetary', iconName: 'planet', label: 'Planetary', subtitle: 'Planet types you have surveyed.',
  },
  {
    key: 'biological', iconName: 'dna', label: 'Biological', subtitle: 'Life forms sampled or identified.',
  },
  {
    key: 'lineage', iconName: 'lineage', label: 'Lineage', subtitle: 'Genesis clades traced from your discoveries.',
  },
  {
    key: 'achievements', iconName: 'trophy', label: 'Achievements', subtitle: 'Milestones unlocked so far.',
  },
];

/** genesisMarkerId -> discovery[] this expedition, for the lineage-web view (§3, §11, Phase 3). */
function groupByClade(lifeDiscoveries) {
  const groups = new Map();
  for (const discovery of Object.values(lifeDiscoveries)) {
    if (!groups.has(discovery.genesisMarkerId)) groups.set(discovery.genesisMarkerId, []);
    groups.get(discovery.genesisMarkerId).push(discovery);
  }
  return groups;
}

export function buildItems(track) {
  if (track === 'stellar') {
    return STAR_CLASSES.map((cls) => ({
      key: cls.key,
      label: cls.label,
      caption: cls.short,
      portrait: () => starPortrait(`codex:${cls.key}`, cls.key === 'BIN'
        // The real generateStar() output includes a `companion` sub-record for
        // binaries; this preview tile isn't tied to any real system, so it
        // synthesizes a plausible stand-in companion just for the thumbnail.
        ? {
          class: cls.key, color: cls.color, massRoll: 0.5, companion: { color: '#ffb066', massRoll: 0.6 },
        }
        : { class: cls.key, color: cls.color, massRoll: 0.5 }),
    }));
  }
  if (track === 'planetary') {
    const classItems = PLANET_CLASSES.map((cls) => ({
      key: cls.key,
      label: cls.label,
      caption: cls.label,
      portrait: () => planetPortrait(`codex:${cls.key}`, {
        class: cls.key, color: cls.color, minerals: {}, sizeRoll: 0.5, index: 0,
      }),
    }));
    // Hot Jupiters and binary planets are modifiers on top of an ordinary
    // class (a gas giant that migrated in close; any planet with a second
    // body sharing its orbit) rather than classes of their own, so they get
    // their own synthetic codex entries instead of a PLANET_CLASSES row.
    return [
      ...classItems,
      {
        key: 'hot-jupiter',
        label: 'Gas giant (Hot Jupiter)',
        caption: 'Hot Jupiter',
        portrait: () => planetPortrait('codex:hot-jupiter', {
          class: 'gas-giant', color: HOT_JUPITER_COLOR, minerals: {}, sizeRoll: 0.7, index: 0, hotJupiter: true,
        }),
      },
      {
        key: 'binary-planet',
        label: 'Binary planet pair',
        caption: 'Binary Planet',
        portrait: () => planetPortrait('codex:binary-planet', {
          class: 'rocky', color: '#a68a6d', minerals: {}, sizeRoll: 0.5, index: 0,
        }),
      },
    ];
  }
  const items = [];
  for (const bio of BIOCHEMISTRY_TYPES) {
    for (const stage of LIFE_STAGES) {
      const key = `${bio.key}:${stage.key}`;
      items.push({
        key,
        label: `${bio.label} · ${stage.label}`,
        caption: `${bio.short} · ${stage.short}`,
        portrait: () => lifePortrait(`codex:${key}`, { biochemistry: bio.key, stage: stage.key }),
      });
    }
  }
  return items;
}

export function render(container, gs) {
  let active = 'stellar';
  const contentWrap = el('div', {});
  const tabRow = el('div', { className: 'tabs' });

  function renderGrid() {
    contentWrap.className = 'codex-grid';
    contentWrap.innerHTML = '';
    const discovered = gs.global.codex[active];
    for (const item of buildItems(active)) {
      const isDiscovered = !!discovered[item.key];
      const entry = el('div', { className: 'codex-entry' }, [
        el('div', { className: 'codex-entry-icon', html: isDiscovered ? item.portrait() : lockedPortrait() }),
        isDiscovered ? el('span', { className: 'codex-entry-caption', text: item.caption }) : null,
      ]);
      attachHoverTooltip(entry, () => (isDiscovered
        ? `<strong>${item.label}</strong>`
        : '<em>Undiscovered</em>'));
      contentWrap.appendChild(entry);
    }
  }

  function renderLineage() {
    contentWrap.className = 'stack';
    contentWrap.innerHTML = '';

    if (!gs.save || !gs.baseSeedInt) {
      contentWrap.appendChild(el('p', {
        className: 'subtitle',
        text: 'Start or resume an expedition to see the lineage web for its galaxy — genesis markers are tied to one specific seed.',
      }));
      return;
    }

    const groups = groupByClade(gs.save.lifeDiscoveries || {});
    if (groups.size === 0) {
      contentWrap.appendChild(el('p', { className: 'subtitle', text: 'No life discoveries yet this expedition.' }));
      return;
    }

    for (const [genesisMarkerId, members] of groups) {
      const cladeName = generateCladeName(gs.baseSeedInt, genesisMarkerId);
      contentWrap.appendChild(el('div', { className: 'panel stack' }, [
        el('p', { className: 'title', text: cladeName }),
        el('p', { className: 'subtitle', text: `${members.length} ${members.length === 1 ? 'discovery' : 'discoveries'} sharing this genesis marker` }),
        ...members.map((m) => el('div', { className: 'row row-tight', style: 'flex-wrap:nowrap' }, [
          el('div', {
            className: 'lineage-icon',
            html: lifePortrait(`${m.genesisMarkerId}:${m.speciesName}`, m),
          }),
          el('span', { style: 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;', text: m.speciesName }),
          el('span', { className: 'subtitle', style: 'flex-shrink:0', text: `${m.biochemistryLabel} · ${m.stageLabel}` }),
        ])),
      ]));
    }
  }

  function renderAchievements() {
    contentWrap.className = 'stack';
    contentWrap.innerHTML = '';
    for (const achievement of ACHIEVEMENTS) {
      const unlocked = !!gs.global.achievements[achievement.key];
      contentWrap.appendChild(el('div', { className: 'panel row' }, [
        el('span', { className: `status-dot status-${unlocked ? 'green' : 'red'}` }),
        el('div', { className: 'stack' }, [
          el('span', { text: unlocked ? achievement.label : '???' }),
          el('span', { className: 'subtitle', text: unlocked ? achievement.description : 'Not yet unlocked' }),
        ]),
      ]));
    }
  }

  const tabSubtitle = el('p', { className: 'subtitle' });

  function renderContent() {
    tabSubtitle.textContent = TABS.find((t) => t.key === active)?.subtitle || '';
    if (active === 'achievements') {
      renderAchievements();
    } else if (active === 'lineage') {
      renderLineage();
    } else {
      renderGrid();
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

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('Codex', () => gs.back()),
    tabRow,
    el('div', { className: 'screen-scroll-body' }, [
      tabSubtitle,
      contentWrap,
    ]),
  ]));
}
