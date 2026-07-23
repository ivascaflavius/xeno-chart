import { el } from '../components/dom.js';
import { screenHeader } from '../components/screenHeader.js';

export function render(container, gs) {
  const commanderName = gs.global.commanderName?.trim() || 'Commander';

  container.appendChild(el('div', { className: 'screen' }, [
    screenHeader('Credits', () => gs.back()),
    el('div', { className: 'panel stack' }, [
      el('p', {
        text: 'Xeno-Chart is an original concept, designed and refined through, and '
          + 'built with the assistance of, Claude Code (Anthropic).',
      }),
      el('p', {}, [
        'By ',
        el('a', {
          href: 'https://github.com/ivascaflavius', target: '_blank', rel: 'noopener noreferrer', text: 'ivascaflavius',
        }),
        ' on GitHub.',
      ]),
      el('p', { className: 'subtitle', text: `Thanks for playing, ${commanderName}.` }),
    ]),
  ]));
}
