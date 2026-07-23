import { el } from '../components/dom.js';
import { confirmModal, showModal } from '../components/modal.js';
import { iconButton } from '../components/iconButton.js';
import { exportSaveToFile, importSaveFromFile } from '../../save/saveManager.js';
import { SAVE_SLOT_COUNT } from '../../data/constants.js';
import { screenHeader } from '../components/screenHeader.js';

function renderSlot(gs, slot) {
  const save = gs.peekSave(slot);

  const fileInput = el('input', { type: 'file', accept: 'application/json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const result = await importSaveFromFile(file);
    fileInput.value = '';
    if (!result.ok) {
      showModal({ title: 'Import failed', body: result.error, buttons: [{ label: 'OK' }] });
      return;
    }
    const doImport = () => {
      gs.importSave(result.save, slot);
      gs.render();
    };
    if (save) {
      confirmModal({
        title: 'Overwrite this slot?',
        body: `Importing will replace what's in Slot ${slot + 1}.`,
        confirmLabel: 'Overwrite',
        onConfirm: doImport,
      });
    } else {
      doImport();
    }
  });

  if (!save) {
    return el('div', { className: 'panel stack panel-compact' }, [
      el('p', { className: 'title', text: `Slot ${slot + 1}`, style: 'font-size:1.05rem' }),
      el('p', { className: 'subtitle', text: 'Empty.' }),
      el('div', { className: 'row row-compact' }, [
        iconButton({
          iconName: 'rocket',
          label: 'Start New Expedition',
          className: 'btn btn-primary',
          onClick: () => gs.show('NEW_EXPEDITION', { presetSlot: slot }),
        }),
        iconButton({ iconName: 'importIcon', label: 'Import…', onClick: () => fileInput.click() }),
        fileInput,
      ]),
    ]);
  }

  const lastPlayed = save.lastPlayedAt ? new Date(save.lastPlayedAt).toLocaleString() : '—';
  return el('div', { className: 'panel stack panel-compact' }, [
    el('p', { className: 'title', text: `Slot ${slot + 1}: ${save.galaxyName}`, style: 'font-size:1.05rem' }),
    el('p', { className: 'subtitle', text: `${save.difficulty === 'relaxed' ? 'Relaxed' : 'Expedition'} · Ship: ${save.shipName}` }),
    el('p', { className: 'subtitle', text: `${save.stats.systemsVisited.length} systems visited · Cycle ${save.cycle} · Last played ${lastPlayed}` }),
    el('div', { className: 'row row-compact' }, [
      iconButton({
        iconName: 'resume', label: 'Resume', className: 'btn btn-primary', onClick: () => gs.loadExpedition(slot),
      }),
      iconButton({ iconName: 'exportIcon', label: 'Export', onClick: () => exportSaveToFile(save) }),
      iconButton({ iconName: 'importIcon', label: 'Import…', onClick: () => fileInput.click() }),
      fileInput,
      iconButton({
        iconName: 'trash',
        label: 'Delete',
        className: 'btn btn-danger',
        onClick: () => confirmModal({
          title: 'Delete this expedition?',
          body: 'This cannot be undone.',
          confirmLabel: 'Delete',
          onConfirm: () => {
            gs.deleteSave(slot);
            gs.render();
          },
        }),
      }),
    ]),
  ]);
}

export function render(container, gs) {
  const screen = el('div', { className: 'screen' }, [
    screenHeader('Saved Slots', () => gs.show('MAIN_MENU')),
  ]);

  for (let slot = 0; slot < SAVE_SLOT_COUNT; slot++) {
    screen.appendChild(renderSlot(gs, slot));
  }

  container.appendChild(screen);
}
