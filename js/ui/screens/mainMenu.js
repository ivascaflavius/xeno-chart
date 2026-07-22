import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';

export function render(container, gs) {
  const hasSave = gs.hasAnySave();
  const commanderName = gs.global.commanderName?.trim();

  container.appendChild(el('div', { className: 'screen' }, [
    el('div', { className: 'stack' }, [
      el('p', { className: 'title', text: 'Xeno-Chart' }),
      el('p', { className: 'subtitle', text: 'Scan the dark. Chart the unknown.' }),
      commanderName ? el('p', { className: 'subtitle', text: `Welcome back, ${commanderName}.` }) : null,
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'stack' }, [
      iconButton({
        iconName: 'rocket',
        label: 'New Expedition',
        className: 'btn btn-primary btn-block',
        onClick: () => gs.show('NEW_EXPEDITION'),
      }),
      iconButton({
        iconName: 'resume',
        label: 'Continue',
        className: 'btn btn-block',
        disabled: !hasSave,
        onClick: () => gs.show('SLOT_PICKER'),
      }),
      iconButton({
        iconName: 'codex', label: 'Codex', className: 'btn btn-block', onClick: () => gs.show('CODEX'),
      }),
      iconButton({
        iconName: 'help', label: 'How to fly', className: 'btn btn-block', onClick: () => gs.show('HOW_TO_FLY'),
      }),
      iconButton({
        iconName: 'settings', label: 'Settings', className: 'btn btn-block', onClick: () => gs.show('SETTINGS'),
      }),
      iconButton({
        iconName: 'credits', label: 'Credits', className: 'btn btn-block', onClick: () => gs.show('CREDITS'),
      }),
    ]),
    el('div', { className: 'spacer' }),
  ]));
}
