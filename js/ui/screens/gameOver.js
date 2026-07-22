import { el } from '../components/dom.js';

export function render(container, gs) {
  const save = gs.save;
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
    el('div', { className: 'spacer' }),
    el('button', {
      className: 'btn btn-primary btn-block',
      text: 'Start New Expedition',
      onClick: () => gs.show('NEW_EXPEDITION'),
    }),
  ]));
}
