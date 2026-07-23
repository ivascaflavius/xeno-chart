import { el } from '../components/dom.js';
import { confirmModal } from '../components/modal.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { SAVE_SLOT_COUNT, HULL_COLORS, SHIP_CLASSES } from '../../data/constants.js';
import { screenHeader } from '../components/screenHeader.js';

function sectionHeader(iconName, text) {
  return el('div', { className: 'row row-tight' }, [
    el('span', { className: 'icon-chip', html: icon(iconName, 16) }),
    el('span', { className: 'subtitle', text }),
  ]);
}

/** A compact segmented row of equal-width buttons sharing one description line below, instead of each option carrying its own full-height card. */
function segmented(wrap, descEl, options, activeKey, onPick) {
  wrap.innerHTML = '';
  wrap.className = 'row row-compact segmented';
  for (const opt of options) {
    wrap.appendChild(el('button', {
      className: `btn${activeKey === opt.key ? ' btn-primary' : ''}`,
      text: opt.label,
      onClick: () => onPick(opt.key),
    }));
  }
  descEl.textContent = options.find((o) => o.key === activeKey)?.description || '';
}

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
  let selectedShipClass = 'standard';

  const seedInput = el('input', { type: 'text', placeholder: 'Seed code (optional) — leave blank for random' });
  const shipNameInput = el('input', { type: 'text', placeholder: 'Leave blank for a random name', maxlength: 30 });
  const diffWrap = el('div', {});
  const diffDesc = el('p', { className: 'subtitle', style: 'margin-top:4px' });
  const slotWrap = el('div', { className: 'row row-compact' });
  const hullWrap = el('div', { className: 'row row-tight' });
  const hullDesc = el('p', { className: 'subtitle', style: 'margin-top:4px' });
  const classWrap = el('div', {});
  const classDesc = el('p', { className: 'subtitle', style: 'margin-top:4px' });

  function renderDifficulty() {
    segmented(diffWrap, diffDesc, [
      { key: 'expedition', label: 'Expedition', description: 'Full stakes — life-support failure ends the run.' },
      { key: 'relaxed', label: 'Relaxed', description: 'Life support never ends the run — systems degrade instead.' },
    ], difficulty, (key) => { difficulty = key; renderDifficulty(); });
  }

  function renderSlots() {
    slotWrap.innerHTML = '';
    saves.forEach((save, i) => {
      const label = save ? `Slot ${i + 1}` : `Slot ${i + 1} (empty)`;
      const btn = el('button', {
        className: `btn${selectedSlot === i ? ' btn-primary' : ''}`,
        text: label,
        onClick: () => {
          selectedSlot = i;
          renderSlots();
        },
      });
      if (save) attachHoverTooltip(btn, () => save.galaxyName);
      slotWrap.appendChild(btn);
    });
  }

  function renderHullColors() {
    hullWrap.innerHTML = '';
    for (const hull of HULL_COLORS) {
      const unlocked = !hull.unlockAchievement || !!gs.global.achievements[hull.unlockAchievement];
      const swatch = el('button', {
        className: `swatch${selectedHullColor === hull.key ? ' selected' : ''}`,
        style: `background:${hull.color}`,
        disabled: !unlocked,
        title: unlocked ? hull.label : `${hull.label} (locked)`,
        onClick: () => {
          selectedHullColor = hull.key;
          hullDesc.textContent = hull.label;
          renderHullColors();
        },
      });
      hullWrap.appendChild(swatch);
    }
    const active = HULL_COLORS.find((h) => h.key === selectedHullColor);
    hullDesc.textContent = active ? active.label : '';
  }

  function renderShipClasses() {
    segmented(classWrap, classDesc, SHIP_CLASSES.map((c) => ({ key: c.key, label: c.label, description: c.description })), selectedShipClass, (key) => { selectedShipClass = key; renderShipClasses(); });
  }

  renderDifficulty();
  renderSlots();
  renderHullColors();
  renderShipClasses();

  function launch() {
    gs.startNewExpedition({
      seedInput: seedInput.value,
      difficulty,
      shipName: shipNameInput.value,
      hullColor: selectedHullColor,
      shipClass: selectedShipClass,
      slot: selectedSlot,
    });
  }

  container.appendChild(el('div', { className: 'screen' }, [
    screenHeader('New Expedition', () => gs.show('MAIN_MENU')),
    el('div', { className: 'panel stack panel-compact' }, [
      sectionHeader('save', 'Save Slot'),
      slotWrap,
    ]),
    el('div', { className: 'panel stack panel-compact' }, [
      sectionHeader('ship', 'Ship'),
      shipNameInput,
      hullWrap,
      hullDesc,
      classWrap,
      classDesc,
    ]),
    el('div', { className: 'panel stack panel-compact' }, [
      sectionHeader('difficulty', 'Expedition Settings'),
      diffWrap,
      diffDesc,
      seedInput,
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'row' }, [
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
