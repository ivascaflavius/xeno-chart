import { el } from './dom.js';
import { progressBar } from './progressBar.js';
import { BUFFER_CAPS } from '../../data/constants.js';
import { statusFor } from '../../systems/resources.js';

const BUFFER_ORDER = ['ore', 'ice', 'water', 'hydrogen'];

/** Compact ship cargo summary — current/cap for each raw mineral buffer, so storage room is visible while browsing planets. */
export function cargoBar(save) {
  return el('div', { className: 'panel stack' }, [
    el('p', { className: 'subtitle', text: 'Ship cargo' }),
    ...BUFFER_ORDER.map((key) => {
      const amount = save.buffers[key];
      const cap = BUFFER_CAPS[key];
      return el('div', { className: 'stack' }, [
        el('div', { className: 'row' }, [
          el('span', { text: key[0].toUpperCase() + key.slice(1) }),
          el('div', { className: 'spacer' }),
          el('span', { className: 'subtitle', text: `${Math.round(amount)}/${cap}` }),
        ]),
        progressBar(amount, cap, statusFor(amount, cap)),
      ]);
    }),
  ]);
}
