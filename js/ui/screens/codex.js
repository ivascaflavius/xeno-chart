import { el } from '../components/dom.js';
import { starPortrait, planetPortrait, lifePortrait, lockedPortrait } from '../../render/portraits.js';
import {
  STAR_CLASSES, PLANET_CLASSES, BIOCHEMISTRY_TYPES, LIFE_STAGES, ACHIEVEMENTS,
} from '../../data/constants.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { iconButton } from '../components/iconButton.js';

const TABS = ['stellar', 'planetary', 'biological', 'achievements'];

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
  const contentWrap = el('div', {});
  const tabRow = el('div', { className: 'tabs' });

  function renderGrid() {
    contentWrap.className = 'codex-grid';
    contentWrap.innerHTML = '';
    const discovered = gs.global.codex[active];
    for (const item of buildItems(active)) {
      const isDiscovered = !!discovered[item.key];
      const entry = el('div', { className: 'codex-entry' });
      entry.innerHTML = isDiscovered ? item.portrait() : lockedPortrait();
      attachHoverTooltip(entry, () => (isDiscovered
        ? `<strong>${item.label}</strong>`
        : '<em>Undiscovered</em>'));
      contentWrap.appendChild(entry);
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

  function renderContent() {
    if (active === 'achievements') {
      renderAchievements();
    } else {
      renderGrid();
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
          renderContent();
        },
      }));
    }
  }

  renderTabs();
  renderContent();

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Codex' }),
    tabRow,
    contentWrap,
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.back() }),
  ]));
}
