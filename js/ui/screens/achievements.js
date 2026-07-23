import { el } from '../components/dom.js';
import { icon } from '../components/icons.js';
import { ACHIEVEMENTS } from '../../data/constants.js';
import { screenHeader } from '../components/screenHeader.js';

// Achievement progress is global (§11) — unlike the rest of the Codex, which
// scopes each track to the active save's own galaxy — so it lives as its own
// Main Menu entry rather than a Codex tab, reachable with or without an
// active expedition.
export function render(container, gs) {
  const rows = ACHIEVEMENTS.map((achievement) => {
    const unlocked = !!gs.global.achievements[achievement.key];
    return el('div', { className: 'panel row' }, [
      el('span', {
        className: `icon-chip status-${unlocked ? 'green' : 'red'}`,
        html: unlocked ? icon(achievement.iconName, 16) : '?',
      }),
      el('div', { className: 'stack' }, [
        el('span', { text: unlocked ? achievement.label : '???' }),
        el('span', { className: 'subtitle', text: unlocked ? achievement.description : 'Not yet unlocked' }),
      ]),
    ]);
  });

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('Achievements', () => gs.back()),
    el('div', { className: 'screen-scroll-body stack' }, [
      el('p', { className: 'subtitle', text: 'Milestones unlocked so far, across every expedition.' }),
      ...rows,
    ]),
  ]));
}
