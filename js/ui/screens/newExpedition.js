import { el } from '../components/dom.js';
import { confirmModal } from '../components/modal.js';

export function render(container, gs) {
  let difficulty = 'expedition';

  const seedInput = el('input', { type: 'text', placeholder: 'Leave blank for random' });
  const diffWrap = el('div', { className: 'stack' });

  function difficultyButton(key, label, desc) {
    return el('button', {
      className: `btn btn-block${difficulty === key ? ' btn-primary' : ''}`,
      onClick: () => {
        difficulty = key;
        renderDifficulty();
      },
    }, [
      el('div', {}, [
        el('div', { text: label }),
        el('div', { className: 'subtitle', text: desc }),
      ]),
    ]);
  }

  function renderDifficulty() {
    diffWrap.innerHTML = '';
    diffWrap.appendChild(difficultyButton('expedition', 'Expedition', 'Full stakes — life-support failure ends the run.'));
    diffWrap.appendChild(difficultyButton('relaxed', 'Relaxed', 'Life support never ends the run — systems degrade instead.'));
  }
  renderDifficulty();

  function launch() {
    gs.startNewExpedition(seedInput.value, difficulty);
  }

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'New Expedition' }),
    el('div', { className: 'panel stack' }, [
      el('p', { className: 'subtitle', text: 'Difficulty' }),
      diffWrap,
    ]),
    el('div', { className: 'panel stack field' }, [
      el('label', { text: 'Seed code (optional)' }),
      seedInput,
    ]),
    el('div', { className: 'spacer' }),
    el('div', { className: 'row' }, [
      el('button', { className: 'btn', text: 'Back', onClick: () => gs.show('MAIN_MENU') }),
      el('div', { className: 'spacer' }),
      el('button', {
        className: 'btn btn-primary',
        text: 'Launch',
        onClick: () => {
          if (gs.hasSave()) {
            confirmModal({
              title: 'Overwrite saved expedition?',
              body: 'Starting a new expedition will replace your current save slot.',
              confirmLabel: 'Overwrite',
              onConfirm: launch,
            });
          } else {
            launch();
          }
        },
      }),
    ]),
  ]));
}
