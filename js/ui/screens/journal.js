import { el } from '../components/dom.js';
import { icon } from '../components/icons.js';
import { starPortrait, planetPortrait } from '../../render/portraits.js';
import { getSystem } from '../../procgen/galaxy.js';
import { screenHeader } from '../components/screenHeader.js';

// `tabLabel` is the short caption that actually fits five-across on a phone
// screen; `label` stays full-length for the "No ... recorded yet" message.
const FILTERS = [
  {
    key: 'all', label: 'events', tabLabel: 'All', iconName: 'journal', types: null,
  },
  {
    key: 'scans', label: 'scans', tabLabel: 'Scans', iconName: 'scan', types: ['scan-long', 'scan-close'],
  },
  {
    key: 'jumps', label: 'jumps', tabLabel: 'Jumps', iconName: 'rocket', types: ['jump', 'distress'],
  },
  {
    key: 'harvests', label: 'harvests', tabLabel: 'Harvest', iconName: 'harvest', types: ['harvest'],
  },
  {
    key: 'bio', label: 'biosignatures', tabLabel: 'Bio', iconName: 'dna', types: ['sample'],
  },
];

/** A small visual for one entry — the real star/planet portrait when the entry names one, else a generic action-icon chip. */
function entryThumbnail(gs, entry) {
  if (entry.systemId) {
    const sys = getSystem(gs.baseSeedInt, entry.systemId);
    if (sys) {
      if (entry.planetId) {
        const planet = sys.planets.find((p) => p.id === entry.planetId);
        if (planet) return el('div', { className: 'journal-thumb', html: planetPortrait(planet.id, planet) });
      }
      return el('div', { className: 'journal-thumb', html: starPortrait(sys.id, sys.star) });
    }
  }
  return el('span', { className: 'icon-chip', html: icon(entry.iconName || 'journal', 14) });
}

export function render(container, gs) {
  const allEntries = [...(gs.save.journal || [])].reverse();
  let active = 'all';

  const tabRow = el('div', { className: 'tabs' });
  const listWrap = el('div', { className: 'stack' });

  function renderList() {
    const filter = FILTERS.find((f) => f.key === active);
    const entries = filter.types ? allEntries.filter((e) => filter.types.includes(e.type)) : allEntries;
    listWrap.innerHTML = '';
    if (entries.length === 0) {
      listWrap.appendChild(el('p', {
        className: 'subtitle',
        text: allEntries.length
          ? `No ${filter.label} recorded yet.`
          : 'No events recorded yet — scan, jump, and harvest to build a log of this expedition.',
      }));
      return;
    }
    for (const entry of entries) {
      listWrap.appendChild(el('div', { className: 'panel row panel-compact' }, [
        entryThumbnail(gs, entry),
        el('span', { style: 'flex:1; min-width:0', text: entry.text }),
        el('span', { className: 'subtitle', text: `Cycle ${entry.cycle}` }),
      ]));
    }
  }

  function renderTabs() {
    tabRow.innerHTML = '';
    for (const filter of FILTERS) {
      tabRow.appendChild(el('button', {
        className: `tab-btn tab-btn-labeled${active === filter.key ? ' active' : ''}`,
        onClick: () => {
          active = filter.key;
          renderTabs();
          renderList();
        },
      }, [
        el('span', { className: 'resource-icon', html: icon(filter.iconName, 16) }),
        el('span', { text: filter.tabLabel }),
      ]));
    }
  }

  renderTabs();
  renderList();

  container.appendChild(el('div', { className: 'screen' }, [
    screenHeader('Journal', () => gs.back()),
    tabRow,
    listWrap,
  ]));
}
