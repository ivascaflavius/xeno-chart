import { el } from '../components/dom.js';
import { starPortrait, planetPortrait, lifePortrait, lockedPortrait } from '../../render/portraits.js';
import { STAR_CLASSES, PLANET_CLASSES, BIOCHEMISTRY_TYPES, LIFE_STAGES } from '../../data/constants.js';

const TABS = ['stellar', 'planetary', 'biological'];

function buildItems(track) {
  if (track === 'stellar') {
    return STAR_CLASSES.map((cls) => ({
      key: cls.key,
      label: cls.label,
      portrait: () => starPortrait(`codex:${cls.key}`, { class: cls.key, color: cls.color, massRoll: 0.5 }),
    }));
  }
  if (track === 'planetary') {
    return PLANET_CLASSES.map((cls) => ({
      key: cls.key,
      label: cls.label,
      portrait: () => planetPortrait(`codex:${cls.key}`, {
        class: cls.key, color: cls.color, minerals: {}, sizeRoll: 0.5, index: 0,
      }),
    }));
  }
  const items = [];
  for (const bio of BIOCHEMISTRY_TYPES) {
    for (const stage of LIFE_STAGES) {
      const key = `${bio.key}:${stage.key}`;
      items.push({
        key,
        label: `${bio.label} · ${stage.label}`,
        portrait: () => lifePortrait(`codex:${key}`, { biochemistry: bio.key, stage: stage.key }),
      });
    }
  }
  return items;
}

export function render(container, gs) {
  let active = 'stellar';
  const gridWrap = el('div', { className: 'codex-grid' });
  const tabRow = el('div', { className: 'tabs' });

  function renderGrid() {
    gridWrap.innerHTML = '';
    const discovered = gs.global.codex[active];
    for (const item of buildItems(active)) {
      const isDiscovered = !!discovered[item.key];
      const entry = el('div', { className: 'codex-entry' });
      entry.innerHTML = isDiscovered ? item.portrait() : lockedPortrait();
      entry.title = isDiscovered ? item.label : 'Undiscovered';
      gridWrap.appendChild(entry);
    }
  }

  function renderTabs() {
    tabRow.innerHTML = '';
    for (const tab of TABS) {
      tabRow.appendChild(el('button', {
        className: `tab-btn${active === tab ? ' active' : ''}`,
        text: tab[0].toUpperCase() + tab.slice(1),
        onClick: () => {
          active = tab;
          renderTabs();
          renderGrid();
        },
      }));
    }
  }

  renderTabs();
  renderGrid();

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Codex' }),
    tabRow,
    gridWrap,
    el('div', { className: 'spacer' }),
    el('button', { className: 'btn', text: 'Back', onClick: () => gs.back() }),
  ]));
}
