import { el } from '../components/dom.js';
import { progressBar } from '../components/progressBar.js';
import { getModuleStatuses } from '../../systems/modules.js';
import { RESOURCE_CAPS } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

const RESOURCE_ORDER = ['fuel', 'charge', 'oxygen', 'food'];

export function render(container, gs) {
  const save = gs.save;
  const moduleStatuses = getModuleStatuses(save);

  const moduleRows = moduleStatuses.map((m) => el('div', { className: 'panel row' }, [
    el('span', { className: `status-dot status-${m.status}` }),
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
        el('span', { text: key[0].toUpperCase() + key.slice(1) }),
        el('div', { className: 'spacer' }),
        el('span', { text: `${Math.round(amount)}/${cap}` }),
      ]),
      progressBar(amount, cap, status),
    ]);
  });

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Ship Systems' }),
    el('div', { className: 'panel stack' }, resourceRows),
    el('p', { className: 'subtitle', text: 'Modules' }),
    ...moduleRows,
    el('div', { className: 'spacer' }),
    el('button', { className: 'btn', text: 'Back', onClick: () => gs.show('STARMAP') }),
  ]));
}
