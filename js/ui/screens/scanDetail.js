import { el } from '../components/dom.js';
import { planetPortrait, lifePortrait } from '../../render/portraits.js';
import { getAmount, capFor } from '../../systems/resources.js';
import { cargoBar, resourceIconRow } from '../components/cargoBar.js';
import { iconButton } from '../components/iconButton.js';
import { icon } from '../components/icons.js';
import { planetDesignation } from '../../procgen/names.js';
import { moonOrbitOverlayHtml } from '../../render/orbitDiagram.js';
import { planetStats } from '../../procgen/stats.js';
import { screenHeader } from '../components/screenHeader.js';

const BAR_SCOPES = '.minerals-panel [data-resource-key], .cargo-bar-panel [data-resource-key]';

/** Snapshot every mineral/cargo bar's current rendered width, keyed by panel-scope + resource key. */
function captureFillWidths(container) {
  const widths = new Map();
  container.querySelectorAll(BAR_SCOPES).forEach((itemEl) => {
    const scope = itemEl.closest('.minerals-panel') ? 'minerals' : 'cargo';
    const fill = itemEl.querySelector('.progress-fill');
    if (fill) widths.set(`${scope}:${itemEl.dataset.resourceKey}`, fill.style.width);
  });
  return widths;
}

/**
 * Replays a from -> to width transition on the (freshly re-rendered) bars
 * after a harvest — the mineral deposit bar drains first, then the ship
 * cargo bar fills in shortly after, echoing the "to cargo" flow arrow
 * between the two panels. Both finish well under a second.
 */
function animateHarvestBars(container, beforeWidths) {
  const mineralFills = [];
  const cargoFills = [];
  container.querySelectorAll(BAR_SCOPES).forEach((itemEl) => {
    const scope = itemEl.closest('.minerals-panel') ? 'minerals' : 'cargo';
    const before = beforeWidths.get(`${scope}:${itemEl.dataset.resourceKey}`);
    const fill = itemEl.querySelector('.progress-fill');
    if (!fill || before === undefined) return;
    const after = fill.style.width;
    fill.style.transition = 'none';
    fill.style.width = before;
    (scope === 'minerals' ? mineralFills : cargoFills).push({ fill, after });
  });
  if (mineralFills.length === 0 && cargoFills.length === 0) return;

  // Force a reflow so the browser actually paints the "before" width above
  // before we schedule the "after" width — otherwise both changes could get
  // batched into one frame and the transition would never fire.
  // eslint-disable-next-line no-unused-expressions
  container.offsetHeight;

  requestAnimationFrame(() => {
    mineralFills.forEach(({ fill }) => { fill.style.transition = ''; });
    mineralFills.forEach(({ fill, after }) => { fill.style.width = after; });
    setTimeout(() => {
      cargoFills.forEach(({ fill }) => { fill.style.transition = ''; });
      cargoFills.forEach(({ fill, after }) => { fill.style.width = after; });
    }, 150);
  });
}

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
      onClick: () => {
        const beforeWidths = captureFillWidths(container);
        if (mineralData.length === 1) gs.harvest(planet.id, mineralData[0].mineral);
        else gs.harvestAll(planet.id);
        // gs.harvest[All]() re-renders this screen synchronously (into the
        // same `container`), so by the time control returns here the new
        // bars already exist — this just replays their width change as an
        // animation instead of leaving it as a silent instant jump.
        animateHarvestBars(container, beforeWidths);
      },
    })
    : null;

  const resourcesPanel = el('div', { className: 'panel stack panel-compact minerals-panel' }, [
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
    screenHeader('Planetary View', () => gs.show('SYSTEM_VIEW')),
    planetPanel,
    flash ? el('div', { className: 'banner banner-info', text: flash }) : null,
    cargoBar(gs.save),
    flowArrow,
    resourcesPanel,
    lifePanel,
    orbitPanel,
  ]));
}
