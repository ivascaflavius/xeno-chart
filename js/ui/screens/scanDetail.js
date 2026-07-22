import { el } from '../components/dom.js';
import { planetPortrait } from '../../render/portraits.js';
import { getAmount, capFor } from '../../systems/resources.js';
import { cargoBar } from '../components/cargoBar.js';
import { iconButton } from '../components/iconButton.js';

export function render(container, gs) {
  const sys = gs.currentSystem();
  const planet = sys.planets.find((p) => p.id === gs.selectedPlanetId);
  const flash = gs.takeFlashMessage();

  const mineralRows = Object.entries(planet.minerals).map(([mineral, total]) => {
    const depleted = gs.save.mineralDepletion[planet.id]?.[mineral] || 0;
    const remaining = Math.max(0, Math.round(total - depleted));
    const roomLeft = capFor(mineral) - getAmount(gs.save, mineral);
    const bufferFull = roomLeft <= 0;
    return el('div', { className: 'row' }, [
      el('span', { text: `${mineral}: ${remaining} remaining` }),
      el('div', { className: 'spacer' }),
      iconButton({
        iconName: 'harvest',
        label: bufferFull ? 'Full' : 'Harvest',
        disabled: remaining <= 0 || bufferFull,
        onClick: () => gs.harvest(planet.id, mineral),
      }),
    ]);
  });

  const lifePanel = planet.life
    ? el('div', { className: 'panel stack' }, [
      el('p', { className: 'title', text: 'Biosignature Detected' }),
      el('p', { text: planet.life.speciesName }),
      el('p', { className: 'subtitle', text: `${planet.life.biochemistryLabel} · ${planet.life.stageLabel}` }),
    ])
    : null;

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: planet.label }),
    el('div', { style: 'width:140px;height:140px;margin:0 auto', html: planetPortrait(planet.id, planet) }),
    flash ? el('div', { className: 'banner banner-info', text: flash }) : null,
    cargoBar(gs.save),
    el('div', { className: 'panel stack' }, mineralRows.length
      ? mineralRows
      : [el('p', { className: 'subtitle', text: 'No minerals detected.' })]),
    lifePanel,
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.show('SYSTEM_VIEW') }),
  ]));
}
