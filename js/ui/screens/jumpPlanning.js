import { el } from '../components/dom.js';
import { getSystem } from '../../procgen/galaxy.js';
import { iconButton } from '../components/iconButton.js';

export function render(container, gs) {
  const systemId = gs.selectedSystemId;
  const discovery = gs.save.discoveries[systemId];
  const tier = discovery ? discovery.tier : 'detected';
  const preview = gs.previewJump(systemId);
  const viaWormhole = gs.viaWormhole;

  function backToStarmap() {
    gs.viaWormhole = false;
    gs.show('STARMAP');
  }

  const infoPanel = el('div', { className: 'panel stack' });

  if (tier === 'detected') {
    infoPanel.appendChild(el('p', {
      className: 'subtitle',
      text: 'Unscanned system — long-range scan from the starmap to learn more before committing.',
    }));
  } else {
    const sys = getSystem(gs.baseSeedInt, systemId);
    infoPanel.appendChild(el('p', {}, [`Star: ${sys.star.label}`]));
    infoPanel.appendChild(el('p', {}, [`Planets: ${sys.planets.length}`]));
    if (sys.hazard) {
      infoPanel.appendChild(el('p', { className: 'subtitle', text: `⚠ ${sys.hazard.label}` }));
    }
    if (tier === 'close') {
      for (const planet of sys.planets) {
        const mineralList = Object.keys(planet.minerals).join(', ') || 'none';
        const lifeText = planet.life ? ` — biosignature detected (${planet.life.speciesName})` : '';
        infoPanel.appendChild(el('p', {
          className: 'subtitle',
          text: `${planet.label} — minerals: ${mineralList}${lifeText}`,
        }));
      }
    }
  }

  const costPanel = el('div', { className: 'panel stack' }, [
    viaWormhole
      ? el('p', { className: 'subtitle', text: 'Wormhole route — flat cost regardless of distance.' })
      : el('p', {}, [`Distance: ${preview.distance.toFixed(1)} ly`]),
    el('p', {}, [`Fuel cost: ${preview.cost.fuel.toFixed(1)}`]),
    el('p', {}, [`Life-support draw: ${preview.cost.oxygen} oxygen, ${preview.cost.food} food`]),
    !preview.canAfford ? el('p', { className: 'banner banner-danger', text: 'Not enough fuel for this jump.' }) : null,
  ]);

  container.appendChild(el('div', { className: 'screen' }, [
    el('p', { className: 'title', text: viaWormhole ? 'Wormhole Jump' : 'Jump Planning' }),
    infoPanel,
    costPanel,
    el('div', { className: 'spacer' }),
    el('div', { className: 'row' }, [
      iconButton({ iconName: 'back', label: 'Back', onClick: backToStarmap }),
      el('div', { className: 'spacer' }),
      iconButton({
        iconName: viaWormhole ? 'wormhole' : 'rocket',
        label: viaWormhole ? 'Commit Wormhole Jump' : 'Commit Jump',
        className: 'btn btn-primary',
        disabled: !preview.canAfford,
        onClick: () => gs.commitJump(systemId),
      }),
    ]),
  ]));
}
