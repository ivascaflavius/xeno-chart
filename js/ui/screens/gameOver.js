import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import {
  LIFE_SUPPORT_COUNTDOWN_CYCLES, DISTRESS_BEACON_MAX_USES, BIOCHEMISTRY_TYPES, LIFE_STAGES, ACHIEVEMENTS,
} from '../../data/constants.js';
import { buildItems as buildCodexItems } from './codex.js';
import { gameOverSceneHtml } from '../../render/gameOverScene.js';

// `subtitle` is always a short one-line summary shown right under the title;
// the Details tab always shows a distinct, longer explanation built from the
// actual save state (see below) — never the same sentence twice. `iconName`
// puts a distinct glyph next to the title per ending, instead of every
// ending looking identical apart from its wording.
const ENDINGS = {
  'life-support': {
    title: 'Expedition Over',
    subtitle: 'Life support failed. The expedition ends here.',
    iconName: 'lifebuoy',
  },
  deadlock: {
    title: 'Lost in the Dark',
    subtitle: 'Stranded with nothing left to try — the expedition drifts into the void.',
    iconName: 'blackhole',
  },
};

const TABS = [
  { key: 'details', iconName: 'info', label: 'Details' },
  { key: 'journal', iconName: 'journal', label: 'Journal' },
  { key: 'codex', iconName: 'codex', label: 'Codex' },
];

/** Retrospective cause of a life-support ending — the abrupt one-line subtitle alone reads as "out of nowhere," so this spells out which resource ran dry and how the countdown mechanic actually works. */
function lifeSupportExplanation(save) {
  const oxygenOut = save.resources.oxygen <= 0;
  const foodOut = save.resources.food <= 0;
  const cause = oxygenOut && foodOut
    ? 'Oxygen and food both ran out'
    : `${oxygenOut ? 'Oxygen' : 'Food'} ran out`;
  return `${cause} completely and stayed empty for ${LIFE_SUPPORT_COUNTDOWN_CYCLES} straight cycles with no way to refill it — long enough for life support to fail outright and end the expedition. Watch the life-support banner on the Galactic View: once it turns critical, reaching a system with resources (or sending a distress beacon) before that grace period runs out is what keeps a run alive.`;
}

/** Retrospective cause of a deadlock ending — spells out exactly which of the four escape routes (jump, scan, harvest, beacon) was actually exhausted, since "nothing left to try" alone doesn't say why. */
function deadlockExplanation(save) {
  return `With no fuel to reach another system, nothing new nearby left to scan, nothing left to harvest in this system, and all ${DISTRESS_BEACON_MAX_USES} distress beacons already used, there was no action left to take. A beacon only ever refuels the ship, not the other options — keeping at least one in reserve for when you're truly out of alternatives is the way to avoid this ending.`;
}

function statRow(iconName, label, value) {
  return el('div', { className: 'row row-tight' }, [
    el('span', { className: 'icon-chip', html: icon(iconName, 16) }),
    el('span', { className: 'subtitle', style: 'margin:0', text: label }),
    el('div', { className: 'spacer' }),
    el('span', { text: value }),
  ]);
}

function renderDetailsTab(gs) {
  const { save } = gs;
  const explanation = save.gameOverReason === 'life-support' ? lifeSupportExplanation(save) : deadlockExplanation(save);
  return el('div', { className: 'stack' }, [
    el('p', { className: 'subtitle', style: 'margin:0', text: explanation }),
    el('div', { className: 'panel stack panel-compact' }, [
      statRow('star', 'Galaxy', save.galaxyName),
      statRow('seed', 'Seed', save.seed),
      statRow('currentSystem', 'Systems visited', save.stats.systemsVisited.length),
      statRow('dna', 'Life discovered', save.stats.lifeFound),
      statRow('rocket', 'Distance traveled', `${save.stats.distanceTraveled.toFixed(1)} ly`),
      statRow('cycle', 'Cycles survived', save.cycle),
    ]),
    el('div', { className: 'panel stack panel-compact', style: 'height:200px' }, [
      el('p', { className: 'subtitle diagram-caption', text: 'Final moments' }),
      el('div', { className: 'diagram-fill', html: gameOverSceneHtml(save.gameOverReason) }),
    ]),
  ]);
}

function renderJournalTab(gs) {
  const entries = [...(gs.save.journal || [])].reverse();
  if (entries.length === 0) {
    return el('p', { className: 'subtitle', text: 'No events recorded this expedition.' });
  }
  return el('div', { className: 'stack' }, entries.map((entry) => el('div', { className: 'panel row panel-compact' }, [
    el('span', { className: 'icon-chip', html: icon(entry.iconName || 'journal', 14) }),
    el('span', { style: 'flex:1; min-width:0', text: entry.text }),
    el('span', { className: 'subtitle', text: `Cycle ${entry.cycle}` }),
  ])));
}

function renderCodexTab(gs) {
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => gs.global.achievements[a.key]).length;
  const discoveredIn = (track) => Object.keys(gs.save.codex[track] || {}).length;
  return el('div', { className: 'stack' }, [
    el('div', { className: 'panel stack panel-compact' }, [
      statRow('star', 'Stellar classes', `${discoveredIn('stellar')}/${buildCodexItems('stellar').length}`),
      statRow('planet', 'Planet types', `${discoveredIn('planetary')}/${buildCodexItems('planetary').length}`),
      statRow('dna', 'Biosignature types', `${discoveredIn('biological')}/${BIOCHEMISTRY_TYPES.length * LIFE_STAGES.length}`),
      statRow('trophy', 'Achievements', `${unlockedAchievements}/${ACHIEVEMENTS.length}`),
    ]),
    iconButton({ iconName: 'codex', label: 'Open full Codex', onClick: () => gs.show('CODEX') }),
  ]);
}

export function render(container, gs) {
  const { save } = gs;
  const commanderName = gs.global.commanderName?.trim();
  const ending = ENDINGS[save.gameOverReason] || ENDINGS['life-support'];

  let active = 'details';
  const tabRow = el('div', { className: 'tabs' });
  const contentWrap = el('div', { className: 'stack' });

  function renderContent() {
    contentWrap.innerHTML = '';
    if (active === 'journal') contentWrap.appendChild(renderJournalTab(gs));
    else if (active === 'codex') contentWrap.appendChild(renderCodexTab(gs));
    else contentWrap.appendChild(renderDetailsTab(gs));
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

  const copyBtn = iconButton({
    iconName: 'copy',
    label: 'Copy Seed',
    onClick: async () => {
      try {
        await navigator.clipboard.writeText(save.seed);
        copyBtn.children[1].textContent = 'Copied!';
      } catch {
        copyBtn.children[1].textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.children[1].textContent = 'Copy Seed'; }, 1500);
    },
  });

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    el('div', { className: 'row row-tight' }, [
      el('div', {
        style: 'width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--danger)',
        html: icon(ending.iconName, 32),
      }),
      el('p', { className: 'title', text: ending.title }),
    ]),
    el('p', { className: 'subtitle', style: 'margin-top:-4px', text: ending.subtitle }),
    tabRow,
    el('div', { className: 'screen-scroll-body' }, [
      contentWrap,
    ]),
    commanderName ? el('p', { className: 'subtitle', style: 'margin:0', text: `Fly safe, ${commanderName}.` }) : null,
    el('div', { className: 'row row-compact' }, [
      iconButton({
        iconName: 'rocket',
        label: 'Start New Expedition',
        className: 'btn btn-primary',
        onClick: () => gs.show('NEW_EXPEDITION'),
      }),
      copyBtn,
      iconButton({
        iconName: 'home',
        label: 'Main Menu',
        onClick: () => gs.show('MAIN_MENU'),
      }),
    ]),
  ]));
}
