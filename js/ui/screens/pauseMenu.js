import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';

export function render(container, gs) {
  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Paused' }),
    el('div', { className: 'spacer' }),
    el('div', { className: 'stack' }, [
      iconButton({
        iconName: 'resume', label: 'Resume', className: 'btn btn-primary btn-block', onClick: () => gs.back(),
      }),
      iconButton({
        iconName: 'help', label: 'Help', className: 'btn btn-block', onClick: () => gs.show('HOW_TO_FLY'),
      }),
      iconButton({
        iconName: 'settings', label: 'Settings', className: 'btn btn-block', onClick: () => gs.show('SETTINGS'),
      }),
      iconButton({
        iconName: 'home', label: 'Main menu', className: 'btn btn-block', onClick: () => gs.show('MAIN_MENU'),
      }),
    ]),
    el('div', { className: 'spacer' }),
  ]));
}
