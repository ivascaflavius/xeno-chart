import { el } from '../components/dom.js';
import { progressBar } from '../components/progressBar.js';
import { shipStatusPanel } from '../components/cargoBar.js';
import { attachHoverTooltip } from '../components/tooltip.js';
import { getModuleStatuses } from '../../systems/modules.js';
import { HULL_COLORS, SHIP_CLASSES } from '../../data/constants.js';
import { icon } from '../components/icons.js';
import { shipSchematicHtml } from '../../render/shipSchematic.js';
import { hazardChip } from '../components/hazardChip.js';
import { screenHeader } from '../components/screenHeader.js';
import {
  backAction, distressBeaconAction, codexAction, journalAction,
} from '../components/commonActions.js';

// Modules are matched to the icon of the resource they primarily output, and
// listed in the same left-to-right order as RESOURCE_ORDER above so each
// module lines up with the gauge it feeds.
const MODULE_ICON = {
  refinery: 'fuel',
  reactor: 'charge',
  electrolysis: 'oxygen',
  hydroponics: 'food',
};
const MODULE_DISPLAY_ORDER = Object.keys(MODULE_ICON);

// One line explaining what each automated module actually does — the
// system's own health rows don't say what "Refinery" *means* otherwise.
// Shown as a hover tooltip now (desktop-only) rather than always-visible
// text, so each module fits on a single compact row.
const MODULE_SUBTEXT = {
  refinery: 'Converts ore into fuel.',
  electrolysis: 'Converts ice into oxygen and hydrogen.',
  hydroponics: 'Converts water (with oxygen) into food.',
  reactor: 'Converts fuel into charge.',
};

export function render(container, gs) {
  const save = gs.save;
  const moduleStatuses = getModuleStatuses(save);
  const orderedModuleStatuses = MODULE_DISPLAY_ORDER
    .map((key) => moduleStatuses.find((m) => m.key === key))
    .filter(Boolean);

  // One compact row per module, all inside a single outlined "Modules" panel
  // — matching the Health/Ship/Cargo panel's row-per-topic layout instead of
  // four separate bordered panels, each with their own padding/border/shadow
  // overhead. Frees up enough height that the schematic below can actually
  // grow to fill the screen instead of pushing the action bar into a
  // scrollbar on short viewports.
  const moduleRows = orderedModuleStatuses.map((m) => {
    const row = el('div', { className: 'row row-tight module-row' }, [
      el('span', { className: `icon-chip status-${m.status}`, html: icon(MODULE_ICON[m.key], 16) }),
      el('span', {
        style: 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
        text: m.status === 'disabled' ? `${m.label} (${m.disabledCyclesLeft}c)` : m.label,
      }),
      el('div', { style: 'width:70px; flex-shrink:0;' }, [progressBar(m.amount, m.cap, m.status, 'thin')]),
      // Spinning while actually converting something this cycle, still and
      // dimmed when idle (blocked on input, or disabled) — a module can
      // look "green" (plenty of output banked) while doing nothing right
      // now because its input just ran dry, which the status dot alone
      // can't distinguish from actively topping that same buffer up.
      el('span', {
        className: `module-cog${m.active ? ' spinning' : ' idle'}`,
        title: m.active ? 'Running' : 'Idle',
        html: icon('settings', 22),
      }),
    ]);
    attachHoverTooltip(row, () => MODULE_SUBTEXT[m.key]);
    return row;
  });
  const modulesPanel = el('div', { className: 'panel stack panel-compact cargo-bar-panel' }, [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: 'icon-chip', html: icon('settings', 16) }),
      el('span', { className: 'subtitle', text: 'Modules' }),
    ]),
    ...moduleRows,
  ]);

  const hullColor = HULL_COLORS.find((h) => h.key === save.hullColor) || HULL_COLORS[0];
  const shipClass = SHIP_CLASSES.find((c) => c.key === save.shipClass) || SHIP_CLASSES[0];
  const shipIcon = el('div', {
    style: `width:52px;height:52px;flex-shrink:0; display:flex; align-items:center; justify-content:center; color:${hullColor.color}`,
    html: icon('ship', 34),
  });
  const shipPanel = el('div', { className: 'panel row panel-compact' }, [
    shipIcon,
    el('div', { className: 'stack', style: 'gap:2px; flex:1; min-width:0' }, [
      el('p', { className: 'title', text: save.shipName, style: 'font-size:1.25rem' }),
      el('p', { className: 'subtitle', text: hullColor.label }),
      el('p', { className: 'subtitle', text: shipClass.label }),
    ]),
    hazardChip(gs.currentSystem().hazard),
  ]);

  const schematicPanel = el('div', { className: 'panel stack panel-compact diagram-panel' }, [
    el('p', { className: 'subtitle diagram-caption', text: 'Ship schematic' }),
    el('div', { className: 'diagram-fill', html: shipSchematicHtml(moduleStatuses, hullColor.color) }),
  ]);

  const actionRow = el('div', { className: 'action-bar' }, [
    backAction('Back', () => gs.show('STARMAP')),
    distressBeaconAction(gs),
    codexAction(gs),
    journalAction(gs),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide screen-pinned-header' }, [
    screenHeader('Ship Systems', () => gs.show('STARMAP')),
    el('div', { className: 'screen-scroll-body' }, [
      shipPanel,
      shipStatusPanel(gs),
      modulesPanel,
      schematicPanel,
    ]),
    actionRow,
  ]));
}
