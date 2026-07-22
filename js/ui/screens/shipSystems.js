import { el } from '../components/dom.js';
import { progressBar } from '../components/progressBar.js';
import { getModuleStatuses } from '../../systems/modules.js';
import { RESOURCE_CAPS, HULL_COLORS } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';
import { icon } from '../components/icons.js';
import { iconButton } from '../components/iconButton.js';

const RESOURCE_ORDER = ['fuel', 'charge', 'oxygen', 'food'];

// Modules are matched to the icon of the resource they primarily output.
const MODULE_ICON = {
  refinery: 'fuel',
  electrolysis: 'oxygen',
  hydroponics: 'food',
  reactor: 'charge',
};

export function render(container, gs) {
  const save = gs.save;
  const moduleStatuses = getModuleStatuses(save);

  const moduleRows = moduleStatuses.map((m) => el('div', { className: 'panel row' }, [
    el('span', { className: `resource-icon status-${m.status}`, html: icon(MODULE_ICON[m.key]) }),
    el('div', { className: 'stack', style: 'flex:1' }, [
      el('span', { text: m.label }),
      progressBar(m.amount, m.cap, m.status),
    ]),
  ]));

  const resourceRows = RESOURCE_ORDER.map((key) => {
    const amount = save.resources[key];
    const cap = RESOURCE_CAPS[key];
    const status = statusFor(amount, cap);
    return el('div', { className: 'stack' }, [
      el('div', { className: 'row' }, [
        el('span', { className: `resource-icon status-${status}`, html: icon(key) }),
        el('span', { text: key[0].toUpperCase() + key.slice(1) }),
        el('div', { className: 'spacer' }),
        el('span', { text: `${Math.round(amount)}/${cap}` }),
      ]),
      progressBar(amount, cap, status),
    ]);
  });

  const hullColor = HULL_COLORS.find((h) => h.key === save.hullColor) || HULL_COLORS[0];
  const shipPanel = el('div', { className: 'panel row' }, [
    el('span', {
      style: `display:inline-block;width:20px;height:20px;border-radius:50%;background:${hullColor.color};flex-shrink:0`,
    }),
    el('div', { className: 'stack' }, [
      el('span', { text: save.shipName }),
      el('span', { className: 'subtitle', text: hullColor.label }),
    ]),
  ]);

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Ship Systems' }),
    shipPanel,
    el('div', { className: 'panel stack' }, resourceRows),
    el('p', { className: 'subtitle', text: 'Modules' }),
    ...moduleRows,
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.show('STARMAP') }),
  ]));
}
