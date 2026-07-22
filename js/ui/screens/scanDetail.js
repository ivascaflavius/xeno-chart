import { el } from '../components/dom.js';
import { planetPortrait, lifePortrait } from '../../render/portraits.js';
import { getAmount, capFor } from '../../systems/resources.js';
import { cargoBar, resourceIconRow } from '../components/cargoBar.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { planetDesignation } from '../../procgen/names.js';
import { moonOrbitOverlayHtml } from '../../render/orbitDiagram.js';
import { planetStats } from '../../procgen/stats.js';

export function render(container, gs) {
  const sys = gs.currentSystem();
  const planet = sys.planets.find((p) => p.id === gs.selectedPlanetId);
  const flash = gs.takeFlashMessage();

  const stats = planetStats(planet);
  const moonCount = planet.moonCount || 0;
  const statsText = `${stats.surfaceTempK.toLocaleString()} K · ${stats.radiusEarth} R⊕ · ${stats.massEarth} M⊕ · ${moonCount} moon${moonCount === 1 ? '' : 's'}`;

  const planetIcon = el('div', { style: 'width:52px;height:52px;flex-shrink:0', html: planetPortrait(planet.id, planet) });
  const planetPanel = el('div', { className: 'panel row panel-compact' }, [
    planetIcon,
    el('div', { className: 'stack', style: 'gap:2px' }, [
      el('p', { className: 'title', text: planetDesignation(sys.name, planet.index), style: 'font-size:1.25rem' }),
      el('p', { className: 'subtitle', text: planet.label }),
      el('p', { className: 'subtitle', text: statsText }),
    ]),
  ]);

  // Each mineral's "fullness" bar tracks remaining/total (of what the planet ever had),
  // not remaining/cargo-cap — it's a deposit-depletion gauge, not a buffer-room gauge.
  const mineralData = Object.entries(planet.minerals).map(([mineral, total]) => {
    const depleted = gs.save.mineralDepletion[planet.id]?.[mineral] || 0;
    const remaining = Math.max(0, total - depleted);
    const roomLeft = capFor(mineral) - getAmount(gs.save, mineral);
    return {
      mineral, total, remaining, roomLeft,
    };
  });
  const allDepleted = mineralData.length > 0 && mineralData.every((m) => m.remaining <= 0);
  const canHarvestAny = mineralData.some((m) => m.remaining > 0 && m.roomLeft > 0);

  let harvestLabel = 'Harvest All';
  if (mineralData.length === 1) harvestLabel = `Harvest ${mineralData[0].mineral}`;
  if (allDepleted) harvestLabel = 'Fully Harvested';
  else if (!canHarvestAny) harvestLabel = 'Cargo Full';

  const harvestButton = mineralData.length
    ? iconButton({
      iconName: 'harvest',
      label: harvestLabel,
      className: 'btn btn-primary',
      disabled: allDepleted || !canHarvestAny,
      onClick: () => (mineralData.length === 1
        ? gs.harvest(planet.id, mineralData[0].mineral)
        : gs.harvestAll(planet.id)),
    })
    : null;

  const resourcesPanel = el('div', { className: 'panel stack panel-compact' }, [
    el('div', { className: 'row row-tight' }, [
      el('span', { className: 'icon-chip', html: icon('planet', 16) }),
      el('span', { className: 'subtitle', text: 'Minerals' }),
    ]),
    mineralData.length
      ? resourceIconRow(mineralData.map((m) => ({ key: m.mineral, amount: m.remaining, cap: m.total })), harvestButton)
      : el('p', { className: 'subtitle', text: 'No minerals detected.' }),
  ]);

  const flowArrow = el('div', { className: 'flow-arrow' }, [
    el('span', { className: 'resource-icon', html: icon('arrowUp', 16) }),
    el('span', { text: 'to cargo' }),
  ]);

  const sampled = !!gs.save.sampledPlanets[planet.id];

  const lifePanel = planet.life
    ? (sampled
      ? el('div', { className: 'panel stack panel-compact' }, [
        el('div', { className: 'row row-tight' }, [
          el('div', { className: 'lineage-icon', style: 'width:26px;height:26px;flex-shrink:0', html: lifePortrait(planet.id, planet.life) }),
          el('span', {
            style: 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
            title: `${planet.life.stage === 'intelligent' ? 'Intelligent life identified' : 'Biosignature identified'} — ${planet.life.speciesName}`,
            text: `${planet.life.stage === 'intelligent' ? 'Intelligent life identified' : 'Biosignature identified'} — ${planet.life.speciesName}`,
          }),
        ]),
        el('p', {
          className: 'subtitle',
          text: `${planet.life.biochemistryLabel} · ${planet.life.stageLabel}${planet.life.stage === 'intelligent' ? ` · ${planet.life.techTierLabel} · first contact was ${planet.life.encounter}` : ''}`,
        }),
      ])
      : el('div', { className: 'panel row panel-compact' }, [
        el('span', { className: 'icon-chip', html: icon('dna', 16) }),
        el('span', {
          style: 'flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
          title: 'Biosignature detected',
          text: 'Biosignature detected',
        }),
        iconButton({
          iconName: 'sample',
          label: 'Take Sample',
          className: 'btn btn-primary',
          onClick: () => gs.takeSample(planet.id),
        }),
      ]))
    : null;

  const orbitView = el('div', { style: 'position:relative; width:160px; height:160px; margin:0 auto' }, [
    el('div', { style: 'position:absolute; left:40px; top:40px; width:80px; height:80px', html: planetPortrait(planet.id, planet) }),
    el('div', { html: moonOrbitOverlayHtml(moonCount) }),
  ]);

  const orbitPanel = el('div', { className: 'panel stack panel-compact', style: 'align-items:center' }, [
    orbitView,
  ]);

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: 'Planetary View' }),
    planetPanel,
    flash ? el('div', { className: 'banner banner-info', text: flash }) : null,
    cargoBar(gs.save),
    flowArrow,
    resourcesPanel,
    lifePanel,
    orbitPanel,
    el('div', { className: 'spacer' }),
    iconButton({ iconName: 'back', label: 'Back', onClick: () => gs.show('SYSTEM_VIEW') }),
  ]));
}
