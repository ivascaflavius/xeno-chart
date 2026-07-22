import { el } from '../components/dom.js';
import { confirmModal, showModal } from '../components/modal.js';
import { exportSaveToFile, importSaveFromFile } from '../../save/saveManager.js';

export function render(container, gs) {
  const save = gs.peekSave();

  const screen = el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Continue Expedition' }),
  ]);

  if (!save) {
    screen.appendChild(el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Slot 1 is empty.' }),
      el('button', {
        className: 'btn btn-primary',
        text: 'Start new expedition into this slot',
        onClick: () => gs.show('NEW_EXPEDITION'),
      }),
    ]));
  } else {
    const lastPlayed = save.lastPlayedAt ? new Date(save.lastPlayedAt).toLocaleString() : '—';
    screen.appendChild(el('div', { className: 'panel stack' }, [
      el('p', { className: 'title', text: save.galaxyName }),
      el('p', { className: 'subtitle', text: `${save.difficulty === 'relaxed' ? 'Relaxed' : 'Expedition'} mode` }),
      el('p', {}, [`Ship: ${save.shipName}`]),
      el('p', {}, [`Systems visited: ${save.stats.systemsVisited.length}`]),
      el('p', {}, [`Cycle: ${save.cycle}`]),
      el('p', { className: 'subtitle', text: `Last played: ${lastPlayed}` }),
      el('div', { className: 'row' }, [
        el('button', { className: 'btn btn-primary', text: 'Resume', onClick: () => gs.loadExpedition() }),
        el('button', { className: 'btn', text: 'Export', onClick: () => exportSaveToFile(save) }),
        el('button', {
          className: 'btn btn-danger',
          text: 'Delete',
          onClick: () => confirmModal({
            title: 'Delete this expedition?',
            body: 'This cannot be undone.',
            confirmLabel: 'Delete',
            onConfirm: () => {
              gs.deleteSave();
              gs.render();
            },
          }),
        }),
      ]),
    ]));
  }

  const fileInput = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const result = await importSaveFromFile(file);
    if (!result.ok) {
      showModal({ title: 'Import failed', body: result.error, buttons: [{ label: 'OK' }] });
      fileInput.value = '';
      return;
    }
    gs.importSave(result.save);
    gs.render();
  });

  screen.appendChild(el('div', { className: 'panel stack' }, [
    el('p', { className: 'subtitle', text: 'Import a save file' }),
    el('button', { className: 'btn', text: 'Import…', onClick: () => fileInput.click() }),
    fileInput,
  ]));

  screen.appendChild(el('div', { className: 'spacer' }));
  screen.appendChild(el('button', { className: 'btn', text: 'Back', onClick: () => gs.show('MAIN_MENU') }));

  container.appendChild(screen);
}
