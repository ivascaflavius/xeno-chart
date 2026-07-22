import { el } from './dom.js';

export function progressBar(amount, cap, status, sizeClass = '') {
  const pct = cap > 0 ? Math.max(0, Math.min(100, (amount / cap) * 100)) : 0;
  return el('div', { className: `progress-track${sizeClass ? ` ${sizeClass}` : ''}` }, [
    el('div', { className: `progress-fill status-${status}`, style: `width: ${pct}%` }),
  ]);
}
