import { el } from './dom.js';

export function progressBar(amount, cap, status) {
  const pct = cap > 0 ? Math.max(0, Math.min(100, (amount / cap) * 100)) : 0;
  return el('div', { className: 'progress-track' }, [
    el('div', { className: `progress-fill status-${status}`, style: `width: ${pct}%` }),
  ]);
}
