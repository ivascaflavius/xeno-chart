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
 */
export function screenHeader(title, onBack, iconName = 'back') {
  return el('div', { className: 'row row-tight screen-header' }, [
    iconButton({
      iconName, label: 'Back', iconOnly: true, onClick: onBack,
    }),
    el('p', { className: 'title', text: title }),
  ]);
}
