import { el } from './dom.js';
import { icon } from './icons.js';

/** A <button> with a small icon and a short label, laid out to stay compact on narrow viewports. `iconOnly` drops the visible label (kept as a title tooltip) for tight rows like the in-run HUD. */
export function iconButton({
  iconName, label, className = 'btn', disabled = false, onClick, iconOnly = false,
}) {
  const children = [el('span', { className: 'btn-icon', html: icon(iconName) })];
  if (!iconOnly) children.push(el('span', { text: label }));
  const btn = el('button', {
    className: `${className} icon-btn${iconOnly ? ' icon-only' : ''}`,
    disabled,
    onClick,
    title: iconOnly ? label : undefined,
  }, children);
  return btn;
}
