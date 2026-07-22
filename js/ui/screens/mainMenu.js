import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';
import { mainMenuSceneHtml } from '../../render/mainMenuScene.js';

export function render(container, gs) {
  const hasSave = gs.hasAnySave();
  const commanderName = gs.global.commanderName?.trim();

  container.appendChild(el('div', { className: 'screen screen-menu' }, [
    el('div', { className: 'menu-scene', html: mainMenuSceneHtml() }),
    el('div', { className: 'stack menu-title-block' }, [
      el('p', { className: 'title', text: 'Xeno-Chart' }),
      el('p', { className: 'subtitle', text: 'Scan the dark. Chart the unknown.' }),
      el('p', { className: 'subtitle', style: 'color:var(--warn)', text: 'Experimental build — still in active development.' }),
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
