import { el } from '../components/dom.js';
import { starPortrait, planetPortrait, lifePortrait, lockedPortrait } from '../../render/portraits.js';
import {
  STAR_CLASSES, PLANET_CLASSES, BIOCHEMISTRY_TYPES, LIFE_STAGES, ACHIEVEMENTS,
} from '../../data/constants.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { iconButton } from '../components/iconButton.js';
import { generateCladeName } from '../../procgen/names.js';

const TABS = ['stellar', 'planetary', 'biological', 'lineage', 'achievements'];

/** genesisMarkerId -> discovery[] this expedition, for the lineage-web view (§3, §11, Phase 3). */
function groupByClade(lifeDiscoveries) {
  const groups = new Map();
  for (const discovery of Object.values(lifeDiscoveries)) {
    if (!groups.has(discovery.genesisMarkerId)) groups.set(discovery.genesisMarkerId, []);
    groups.get(discovery.genesisMarkerId).push(discovery);
  }
  return groups;
}

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
        ...members.map((m) => el('div', { className: 'row' }, [
          el('div', {
            className: 'lineage-icon',
            html: lifePortrait(`${m.genesisMarkerId}:${m.speciesName}`, m),
          }),
          el('span', { text: m.speciesName }),
          el('div', { className: 'spacer' }),
          el('span', { className: 'subtitle', text: `${m.biochemistryLabel} · ${m.stageLabel}` }),
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

  function renderContent() {
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
