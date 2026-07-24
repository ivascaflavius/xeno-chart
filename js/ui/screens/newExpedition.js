import { el } from '../components/dom.js';
import { confirmModal } from '../components/modal.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { startingResourcesPanel } from '../components/cargoBar.js';
import { SAVE_SLOT_COUNT, HULL_COLORS, SHIP_CLASSES } from '../../data/constants.js';
import { shipSchematicHtml } from '../../render/shipSchematic.js';
import { generateShipName } from '../../procgen/names.js';
import { seedToInt } from '../../procgen/prng.js';
import { screenHeader } from '../components/screenHeader.js';
import { backAction } from '../components/commonActions.js';

// Ship Systems shows the schematic colored by module status; there's no
// save yet here to read real statuses from, so every bay just previews as
// "nominal" — this is a preview of the hull, not a live dashboard.
const PREVIEW_MODULE_STATUSES = ['refinery', 'electrolysis', 'hydroponics', 'reactor']
  .map((key) => ({ key, status: 'green' }));

function sectionHeader(iconName, text) {
  return el('div', { className: 'row row-tight' }, [
    el('span', { className: 'icon-chip', html: icon(iconName, 16) }),
    el('span', { className: 'subtitle', text }),
  ]);
}

/**
 * A compact segmented row of equal-width buttons — each option's
 * description lives in a hover tooltip (desktop) instead of an
 * always-visible caption line below, since the option labels themselves
 * ("Expedition"/"Relaxed", "Standard"/"Scanner-Focused"/"Fuel-Efficient")
 * already say most of what matters; saving that line is one of several
 * condensing passes so this whole screen fits without a scrollbar on a
 * short phone.
 */
function segmented(wrap, options, activeKey, onPick) {
  wrap.innerHTML = '';
  wrap.className = 'row row-compact segmented';
  for (const opt of options) {
    const btn = el('button', {
      className: `btn${activeKey === opt.key ? ' btn-primary' : ''}`,
      text: opt.label,
      onClick: () => onPick(opt.key),
    });
    attachHoverTooltip(btn, () => opt.description);
    wrap.appendChild(btn);
  }
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

  // Pre-filled with an actual random suggestion (not just a placeholder
  // hint) so there's a real seed/name to look at and tweak instead of an
  // empty box — the seed drives the name (same as a real launch would),
  // so the two stay consistent with each other. Both stay freely editable;
  // leaving either blank at launch still falls back to a fresh random one.
  const randomSeed = String(Math.floor(Math.random() * 1e9));
  const randomShipName = generateShipName(seedToInt(randomSeed));

  const seedInput = el('input', { type: 'text', value: randomSeed, placeholder: 'Seed code' });
  const shipNameInput = el('input', { type: 'text', value: randomShipName, placeholder: 'Ship name', maxlength: 30 });
  const diffWrap = el('div', {});
  // 'segmented' gives every slot button the same height regardless of
  // whether its label wraps to one line ("Slot 1") or two ("Slot 2" /
  // "(empty)") — same fix already used for the difficulty/ship-class rows.
  const slotWrap = el('div', { className: 'row row-compact segmented' });
  // Sits below the ship preview itself, not squeezed alongside the name
  // input — picking a hull color is a visual choice about the ship you're
  // already looking at, so it reads better right under it.
  const hullWrap = el('div', { className: 'row row-tight', style: 'justify-content:center;' });
  const classWrap = el('div', {});
  const schematicFill = el('div', { className: 'diagram-fill' });

  function renderSchematic() {
    const hullColor = HULL_COLORS.find((h) => h.key === selectedHullColor) || HULL_COLORS[0];
    schematicFill.innerHTML = shipSchematicHtml(PREVIEW_MODULE_STATUSES, hullColor.color);
  }

  function renderDifficulty() {
    segmented(diffWrap, [
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
      const swatch = el('button', {
        className: `swatch${selectedHullColor === hull.key ? ' selected' : ''}`,
        style: `background:${hull.color}`,
        title: hull.label,
        onClick: () => {
          selectedHullColor = hull.key;
          renderHullColors();
          renderSchematic();
        },
      });
      hullWrap.appendChild(swatch);
    }
  }

  function renderShipClasses() {
    segmented(classWrap, SHIP_CLASSES.map((c) => ({ key: c.key, label: c.label, description: c.description })), selectedShipClass, (key) => { selectedShipClass = key; renderShipClasses(); });
  }

  renderDifficulty();
  renderSlots();
  renderHullColors();
  renderShipClasses();
  renderSchematic();

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

  const schematicPanel = el('div', { className: 'panel stack panel-compact diagram-panel' }, [
    el('p', { className: 'subtitle diagram-caption', text: 'Ship preview' }),
    schematicFill,
    hullWrap,
  ]);

  const actionRow = el('div', { className: 'action-bar action-bar-labeled' }, [
    backAction('Back', () => gs.show('MAIN_MENU')),
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
  ]);

  // Save Slot / Ship / Expedition Settings share one outlined panel with
  // divider lines between sections (same treatment as the Help screen)
  // instead of three separate bordered panels — removes two full panels'
  // worth of border/padding/gap overhead so the whole settings stack is
  // short enough to leave real room for the scalable ship-preview area
  // below on a short phone.
  const settingsPanel = el('div', { className: 'panel stack howtofly-panel' }, [
    el('div', { className: 'howtofly-section stack' }, [
      sectionHeader('save', 'Save Slot'),
      slotWrap,
    ]),
    el('div', { className: 'howtofly-section stack' }, [
      sectionHeader('ship', 'Ship'),
      shipNameInput,
      classWrap,
    ]),
    el('div', { className: 'howtofly-section stack' }, [
      sectionHeader('difficulty', 'Expedition Settings'),
      diffWrap,
      seedInput,
    ]),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('New Expedition', () => gs.show('MAIN_MENU')),
    el('div', { className: 'screen-scroll-body' }, [
      settingsPanel,
      startingResourcesPanel(),
      schematicPanel,
    ]),
    actionRow,
  ]));
}
