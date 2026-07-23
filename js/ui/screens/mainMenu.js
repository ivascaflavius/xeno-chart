import { el } from '../components/dom.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { mainMenuSceneHtml } from '../../render/mainMenuScene.js';
import { SAVE_SLOT_COUNT } from '../../data/constants.js';

// Same ringed-planet mark as favicon.svg, inlined so the title reads as a
// small logo lockup instead of bare text — kept in sync by hand since
// favicon.svg itself has to stay a standalone file for the browser tab icon.
const BRAND_MARK_SVG = `
  <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="17" r="8" fill="#e8a34c"/>
    <ellipse cx="16" cy="17" rx="14" ry="4" fill="none" stroke="#d9d9e8" stroke-width="2.5" transform="rotate(-20 16 17)"/>
  </svg>
`;

/** The slot with the most recent lastPlayedAt, or null if no slot has a save. */
function latestPlayedSlot(gs) {
  let best = null;
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const save = gs.peekSave(i);
    if (!save) continue;
    if (!best || (save.lastPlayedAt || 0) > (best.lastPlayedAt || 0)) best = { slot: i, lastPlayedAt: save.lastPlayedAt };
  }
  return best ? best.slot : null;
}

export function render(container, gs) {
  const hasSave = gs.hasAnySave();
  const commanderName = gs.global.commanderName?.trim();

  const welcomeRow = el('div', { className: 'row row-tight', style: 'justify-content:center' }, [
    el('button', {
      className: 'link-button subtitle',
      text: `Welcome back, ${commanderName || 'Commander'}.`,
      onClick: () => gs.show('SETTINGS'),
    }),
    el('button', {
      className: 'icon-chip',
      title: 'Edit commander name',
      html: icon('edit', 13),
      onClick: () => gs.show('SETTINGS'),
    }),
  ]);

  container.appendChild(el('div', { className: 'screen screen-menu' }, [
    el('div', { className: 'menu-scene', html: mainMenuSceneHtml() }),
    el('div', { className: 'stack menu-title-block' }, [
      el('div', { className: 'row row-tight', style: 'justify-content:center; align-items:center' }, [
        el('span', { style: 'width:30px; height:30px; flex-shrink:0', html: BRAND_MARK_SVG }),
        el('p', { className: 'title', text: 'Xeno-Chart' }),
      ]),
      el('p', { className: 'subtitle', text: 'Scan the dark. Chart the unknown.' }),
      el('p', { className: 'subtitle', style: 'color:var(--warn)', text: 'Experimental build — still in active development.' }),
      welcomeRow,
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'stack' }, [
      iconButton({
        iconName: 'rocket',
        label: 'New Expedition',
        className: 'btn btn-primary btn-block',
        onClick: () => gs.show('NEW_EXPEDITION'),
      }),
      iconButton({
        iconName: 'resume',
        label: 'Continue',
        className: 'btn btn-block',
        disabled: !hasSave,
        onClick: () => {
          const slot = latestPlayedSlot(gs);
          if (slot !== null) gs.loadExpedition(slot);
        },
      }),
      iconButton({
        iconName: 'save',
        label: 'Saved Slots',
        className: 'btn btn-block',
        onClick: () => gs.show('SLOT_PICKER'),
      }),
      iconButton({
        iconName: 'help', label: 'Help', className: 'btn btn-block', onClick: () => gs.show('HOW_TO_FLY'),
      }),
      iconButton({
        iconName: 'settings', label: 'Settings', className: 'btn btn-block', onClick: () => gs.show('SETTINGS'),
      }),
      iconButton({
        iconName: 'credits', label: 'Credits', className: 'btn btn-block', onClick: () => gs.show('CREDITS'),
      }),
    ]),
    el('div', { className: 'spacer' }),
  ]));
}
