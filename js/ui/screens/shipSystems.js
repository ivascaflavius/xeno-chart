import { el } from '../components/dom.js';
import { progressBar } from '../components/progressBar.js';
import { resourceIconRow } from '../components/cargoBar.js';
import { getModuleStatuses } from '../../systems/modules.js';
import { RESOURCE_CAPS, HULL_COLORS, SHIP_CLASSES } from '../../data/constants.js';
import { icon } from '../components/icons.js';
import { screenHeader } from '../components/screenHeader.js';
import { shipSchematicHtml } from '../../render/shipSchematic.js';

const RESOURCE_ORDER = ['fuel', 'charge', 'oxygen', 'food'];

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

  const moduleRows = orderedModuleStatuses.map((m) => el('div', { className: 'panel row panel-compact' }, [
    el('span', { className: `icon-chip status-${m.status}`, html: icon(MODULE_ICON[m.key], 16) }),
    el('div', { className: 'stack', style: 'flex:1; gap:2px' }, [
      el('span', { text: m.status === 'disabled' ? `${m.label} — malfunctioning (${m.disabledCyclesLeft} cycle${m.disabledCyclesLeft === 1 ? '' : 's'})` : m.label }),
      el('span', { className: 'subtitle', text: MODULE_SUBTEXT[m.key], style: 'font-size:0.75rem' }),
      progressBar(m.amount, m.cap, m.status),
    ]),
  ]));

  const hullColor = HULL_COLORS.find((h) => h.key === save.hullColor) || HULL_COLORS[0];
  const shipClass = SHIP_CLASSES.find((c) => c.key === save.shipClass) || SHIP_CLASSES[0];
  const shipPanel = el('div', { className: 'panel row panel-compact' }, [
    el('span', {
      style: `display:inline-block;width:20px;height:20px;border-radius:50%;background:${hullColor.color};flex-shrink:0`,
    }),
    el('div', { className: 'stack', style: 'gap:2px' }, [
      el('span', { text: save.shipName }),
      el('span', { className: 'subtitle', text: `${hullColor.label} · ${shipClass.label}` }),
    ]),
  ]);

  const resourcePanel = el('div', { className: 'panel stack panel-compact' }, [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: 'icon-chip', html: icon('charge', 16) }),
      el('span', { className: 'subtitle', text: 'Resources' }),
    ]),
    resourceIconRow(RESOURCE_ORDER.map((key) => ({
      key, label: key[0].toUpperCase() + key.slice(1), amount: save.resources[key], cap: RESOURCE_CAPS[key],
    })), null, { showLabels: true }),
  ]);

  const schematicPanel = el('div', { className: 'panel stack panel-compact diagram-panel' }, [
    el('p', { className: 'subtitle diagram-caption', text: 'Ship schematic' }),
    el('div', { className: 'diagram-fill', html: shipSchematicHtml(moduleStatuses, hullColor.color) }),
  ]);

  container.appendChild(el('div', { className: 'screen screen-wide' }, [
    screenHeader('Ship Systems', () => gs.show('STARMAP')),
    shipPanel,
    resourcePanel,
    el('p', { className: 'subtitle', text: 'Modules' }),
    ...moduleRows,
    schematicPanel,
  ]));
}
