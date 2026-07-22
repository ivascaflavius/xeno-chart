import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';
import { confirmModal } from '../components/modal.js';
import * as saveManager from '../../save/saveManager.js';
import { isSupported as hapticsSupported } from '../../audio/hapticsManager.js';

export function render(container, gs) {
  const { global } = gs;

  const nameInput = el('input', {
    type: 'text',
    placeholder: 'Commander',
    value: global.commanderName || '',
    maxlength: 30,
    onChange: () => {
      global.commanderName = nameInput.value.trim().slice(0, 30);
      gs.persistGlobal();
    },
  });

  const audioToggle = el('input', {
    type: 'checkbox',
    checked: global.audio.enabled,
    onChange: () => {
      global.audio.enabled = audioToggle.checked;
      gs.persistGlobal();
      gs.applyGlobalSettings();
    },
  });

  const volumeSlider = el('input', {
    type: 'range',
    min: '0',
    max: '1',
    step: '0.05',
    value: global.audio.volume,
    onInput: () => {
      global.audio.volume = parseFloat(volumeSlider.value);
      gs.persistGlobal();
      gs.applyGlobalSettings();
    },
  });

  let hapticsRow;
  if (hapticsSupported()) {
    const hapticsToggle = el('input', {
      type: 'checkbox',
      checked: global.haptics.enabled,
      onChange: () => {
        global.haptics.enabled = hapticsToggle.checked;
        gs.persistGlobal();
        gs.applyGlobalSettings();
      },
    });
    hapticsRow = el('div', { className: 'row' }, [
      el('label', { text: 'Haptics' }),
      el('div', { className: 'spacer' }),
      hapticsToggle,
    ]);
  } else {
    hapticsRow = el('div', { className: 'row' }, [
      el('label', { text: 'Haptics' }),
      el('div', { className: 'spacer' }),
      el('span', { className: 'subtitle', text: 'Not supported on this browser' }),
    ]);
  }

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Settings' }),
    el('div', { className: 'panel stack field' }, [
      el('label', { text: 'Commander name' }),
      nameInput,
    ]),
    el('div', { className: 'panel stack' }, [
      el('div', { className: 'row' }, [
        el('label', { text: 'Audio' }),
        el('div', { className: 'spacer' }),
        audioToggle,
      ]),
      el('div', { className: 'field' }, [
        el('label', { text: 'Volume' }),
        volumeSlider,
      ]),
      hapticsRow,
    ]),
    el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Clears every save slot and all achievement/codex progress.' }),
      iconButton({
        iconName: 'trash',
        label: 'Reset All Data',
        className: 'btn btn-danger',
        onClick: () => confirmModal({
          title: 'Reset all data?',
          body: 'This clears every save slot and all achievement/codex progress. This cannot be undone.',
          confirmLabel: 'Reset Everything',
          onConfirm: () => {
            saveManager.resetAllData();
            gs.global = saveManager.loadGlobal();
            gs.applyGlobalSettings();
            gs.show('MAIN_MENU');
          },
        }),
      }),
    ]),
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.back() }),
  ]));
}
