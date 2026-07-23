import { el } from './dom.js';
import { iconButton } from './iconButton.js';

/**
 * Title row with the Back control next to it instead of at the bottom of the
 * screen — long/scrollable screens (Codex, Journal, Help, ...) used to
 * bury Back below all their content, forcing a scroll just to leave. `onBack`
 * is whatever that screen already used (some pop history via gs.back(),
 * others navigate to a specific parent screen), passed through unchanged.
 */
export function screenHeader(title, onBack) {
  return el('div', { className: 'row row-tight screen-header' }, [
    iconButton({
      iconName: 'back', label: 'Back', iconOnly: true, onClick: onBack,
    }),
    el('p', { className: 'title', text: title }),
  ]);
}
