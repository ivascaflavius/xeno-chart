import { el } from '../components/dom.js';
import { planetPortrait, lifePortrait } from '../../render/portraits.js';
import { getAmount, capFor } from '../../systems/resources.js';
import { cargoBar } from '../components/cargoBar.js';
import { iconButton } from '../components/iconButton.js';
import { planetDesignation } from '../../procgen/names.js';
import { moonOrbitOverlayHtml } from '../../render/orbitDiagram.js';
import { planetStats } from '../../procgen/stats.js';

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

  const sampled = !!gs.save.sampledPlanets[planet.id];

  const lifePanel = planet.life
    ? el('div', { className: 'panel stack' }, sampled ? [
      el('div', { className: 'row' }, [
        el('div', { className: 'lineage-icon', style: 'width:40px;height:40px', html: lifePortrait(planet.id, planet.life) }),
        el('div', { className: 'stack', style: 'gap:2px' }, [
          el('p', { className: 'title', text: planet.life.stage === 'intelligent' ? 'Intelligent Life Identified' : 'Biosignature Identified', style: 'font-size:1.1rem' }),
          el('p', { text: planet.life.speciesName }),
        ]),
      ]),
      el('p', { className: 'subtitle', text: `${planet.life.biochemistryLabel} · ${planet.life.stageLabel}` }),
      planet.life.stage === 'intelligent'
        ? el('p', { className: 'subtitle', text: `Tech level: ${planet.life.techTierLabel} · First contact was ${planet.life.encounter}.` })
        : null,
    ] : [
      el('p', { className: 'title', text: 'Biosignature Detected' }),
      el('p', { className: 'subtitle', text: 'An unidentified organism — take a sample to identify it and log it in the Codex.' }),
      iconButton({
        iconName: 'sample',
        label: 'Take Sample',
        className: 'btn btn-primary',
        onClick: () => gs.takeSample(planet.id),
      }),
    ])
    : null;

  const moonCount = planet.moonCount || 0;
  const orbitView = el('div', { style: 'position:relative; width:220px; height:220px; margin:0 auto' }, [
    el('div', { style: 'position:absolute; left:55px; top:55px; width:110px; height:110px', html: planetPortrait(planet.id, planet) }),
    el('div', { html: moonOrbitOverlayHtml(moonCount) }),
  ]);

  const stats = planetStats(planet);
  const statsText = `${stats.surfaceTempK.toLocaleString()} K · ${stats.radiusEarth} R⊕ · ${stats.massEarth} M⊕`;

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: planetDesignation(sys.name, planet.index) }),
    el('p', { className: 'subtitle', text: planet.label, style: 'margin-top:-12px' }),
    el('p', { className: 'subtitle', style: 'text-align:center', text: statsText }),
    orbitView,
    el('p', {
      className: 'subtitle',
      style: 'text-align:center',
      text: moonCount === 0 ? 'No moons detected.' : `${moonCount} moon${moonCount === 1 ? '' : 's'} orbiting.`,
    }),
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
