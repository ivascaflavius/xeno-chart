import { el } from '../components/dom.js';

export function render(container, gs) {
  const hasSave = gs.hasSave();

  container.appendChild(el('div', { className: 'screen' }, [
    el('div', { className: 'stack' }, [
      el('p', { className: 'title', text: 'Xeno-Chart' }),
      el('p', { className: 'subtitle', text: 'Scan the dark. Chart the unknown.' }),
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'stack' }, [
      el('button', {
        className: 'btn btn-primary btn-block',
        text: 'New Expedition',
        onClick: () => gs.show('NEW_EXPEDITION'),
      }),
      el('button', {
        className: 'btn btn-block',
        text: 'Continue',
        disabled: !hasSave,
        onClick: () => gs.show('SLOT_PICKER'),
      }),
      el('button', {
        className: 'btn btn-block',
        text: 'Codex',
        onClick: () => gs.show('CODEX'),
      }),
      el('button', {
        className: 'btn btn-block',
        text: 'How to fly',
        onClick: () => gs.show('HOW_TO_FLY'),
      }),
    ]),
    el('div', { className: 'spacer' }),
  ]));
}
