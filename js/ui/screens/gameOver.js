import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';

export function render(container, gs) {
  const save = gs.save;
  const commanderName = gs.global.commanderName?.trim();
  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Expedition Over' }),
    el('p', { className: 'subtitle', text: 'Life support failed. The expedition ends here.' }),
    el('div', { className: 'panel stack' }, [
      el('p', {}, [`Galaxy: ${save.galaxyName}`]),
      el('p', {}, [`Seed: ${save.seed}`]),
      el('p', {}, [`Systems visited: ${save.stats.systemsVisited.length}`]),
      el('p', {}, [`Life discovered: ${save.stats.lifeFound}`]),
      el('p', {}, [`Distance traveled: ${save.stats.distanceTraveled.toFixed(1)} ly`]),
      el('p', {}, [`Cycles survived: ${save.cycle}`]),
    ]),
    commanderName ? el('p', { className: 'subtitle', text: `Fly safe, ${commanderName}.` }) : null,
    el('div', { className: 'spacer' }),
    iconButton({
      iconName: 'rocket',
      label: 'Start New Expedition',
      className: 'btn btn-primary btn-block',
      onClick: () => gs.show('NEW_EXPEDITION'),
    }),
  ]));
}
