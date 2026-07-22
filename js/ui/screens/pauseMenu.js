import { el } from '../components/dom.js';

export function render(container, gs) {
  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Paused' }),
    el('div', { className: 'spacer' }),
    el('div', { className: 'stack' }, [
      el('button', { className: 'btn btn-primary btn-block', text: 'Resume', onClick: () => gs.back() }),
      el('button', { className: 'btn btn-block', text: 'How to fly', onClick: () => gs.show('HOW_TO_FLY') }),
      el('button', { className: 'btn btn-block', text: 'Main menu', onClick: () => gs.show('MAIN_MENU') }),
    ]),
    el('div', { className: 'spacer' }),
  ]));
}
