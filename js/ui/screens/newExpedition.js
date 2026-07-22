import { el } from '../components/dom.js';
import { confirmModal } from '../components/modal.js';
import { iconButton } from '../components/iconButton.js';
import { SAVE_SLOT_COUNT, HULL_COLORS } from '../../data/constants.js';

export function render(container, gs) {
  let difficulty = 'expedition';
  const saves = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) saves.push(gs.peekSave(i));
  let selectedSlot = gs.presetSlot;
  if (selectedSlot === undefined || selectedSlot === null) {
    selectedSlot = saves.findIndex((s) => s === null);
    if (selectedSlot === -1) selectedSlot = 0;
  }
  gs.presetSlot = null;
  let selectedHullColor = 'default';

  const seedInput = el('input', { type: 'text', placeholder: 'Leave blank for random' });
  const shipNameInput = el('input', { type: 'text', placeholder: 'Unnamed Vessel', maxlength: 30 });
  const diffWrap = el('div', { className: 'stack' });
  const slotWrap = el('div', { className: 'stack' });
  const hullWrap = el('div', { className: 'row' });

  function difficultyButton(key, label, desc) {
    return el('button', {
      className: `btn btn-block${difficulty === key ? ' btn-primary' : ''}`,
      onClick: () => {
        difficulty = key;
        renderDifficulty();
      },
    }, [
      el('div', {}, [
        el('div', { text: label }),
        el('div', { className: 'subtitle', text: desc }),
      ]),
    ]);
  }

  function renderDifficulty() {
    diffWrap.innerHTML = '';
    diffWrap.appendChild(difficultyButton('expedition', 'Expedition', 'Full stakes — life-support failure ends the run.'));
    diffWrap.appendChild(difficultyButton('relaxed', 'Relaxed', 'Life support never ends the run — systems degrade instead.'));
  }

  function renderSlots() {
    slotWrap.innerHTML = '';
    saves.forEach((save, i) => {
      const label = save ? `Slot ${i + 1}: ${save.galaxyName}` : `Slot ${i + 1} (empty)`;
      slotWrap.appendChild(el('button', {
        className: `btn btn-block${selectedSlot === i ? ' btn-primary' : ''}`,
        text: label,
        onClick: () => {
          selectedSlot = i;
          renderSlots();
        },
      }));
    });
  }

  function renderHullColors() {
    hullWrap.innerHTML = '';
    for (const hull of HULL_COLORS) {
      const unlocked = !hull.unlockAchievement || !!gs.global.achievements[hull.unlockAchievement];
      const btn = el('button', {
        className: `btn${selectedHullColor === hull.key ? ' btn-primary' : ''}`,
        style: `border-color:${hull.color}`,
        disabled: !unlocked,
        text: unlocked ? hull.label : `${hull.label} (locked)`,
        onClick: () => {
          selectedHullColor = hull.key;
          renderHullColors();
        },
      });
      hullWrap.appendChild(btn);
    }
  }

  renderDifficulty();
  renderSlots();
  renderHullColors();

  function launch() {
    gs.startNewExpedition({
      seedInput: seedInput.value,
      difficulty,
      shipName: shipNameInput.value,
      hullColor: selectedHullColor,
      slot: selectedSlot,
    });
  }

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'New Expedition' }),
    el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Save slot' }),
      slotWrap,
    ]),
    el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Difficulty' }),
      diffWrap,
    ]),
    el('div', { className: 'panel stack field' }, [
      el('label', { text: 'Ship name' }),
      shipNameInput,
    ]),
    el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Hull color' }),
      hullWrap,
    ]),
    el('div', { className: 'panel stack field' }, [
      el('label', { text: 'Seed code (optional)' }),
      seedInput,
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'row' }, [
      iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.show('MAIN_MENU') }),
      el('div', { className: 'spacer' }),
      iconButton({
        iconName: 'rocket',
        label: 'Launch',
        className: 'btn btn-primary',
        onClick: () => {
          if (saves[selectedSlot]) {
            confirmModal({
              title: 'Overwrite saved expedition?',
              body: `Starting a new expedition will replace what's in Slot ${selectedSlot + 1}.`,
              confirmLabel: 'Overwrite',
              onConfirm: launch,
            });
          } else {
            launch();
          }
        },
      }),
    ]),
  ]));
}
