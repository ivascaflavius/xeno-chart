import { el } from './dom.js';
import { iconButton } from './iconButton.js';

/**
 * Title row with a Back (or, for Galactic View, Menu) control next to it —
 * long/scrollable screens (Codex, Journal, Help, ...) used to bury Back
 * below all their content, forcing a scroll just to leave, and the four
 * gameplay screens' bottom action bar isn't always in reach either while
 * scrolled through a tall middle section, so the same control is repeated
 * up here too. `onBack` is whatever that screen already used (some pop
 * history via gs.back(), others navigate to a specific parent screen),
 * passed through unchanged. `iconName` defaults to the literal back arrow;
 * Galactic View passes 'menu' since it has no parent screen to leave to.
 * `rightAction`, if given, renders after the title — the title's own
 * `flex:1` already pushes it to the far edge, so no separate spacer element
 * is needed. Used for the Distress Beacon, an emergency action that doesn't
 * belong in the routine bottom action bar.
 */
export function screenHeader(title, onBack, iconName = 'back', rightAction = null) {
  const children = [
    iconButton({
      iconName, label: 'Back', iconOnly: true, onClick: onBack,
    }),
    el('p', { className: 'title', text: title }),
  ];
  if (rightAction) children.push(rightAction);
  return el('div', { className: 'row row-tight screen-header' }, children);
}
