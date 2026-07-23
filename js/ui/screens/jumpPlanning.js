import { el } from '../components/dom.js';
import { getSystem } from '../../procgen/galaxy.js';
import { planetDesignation } from '../../procgen/names.js';
import { icon } from '../components/icons.js';
import { showModal } from '../components/modal.js';

function infoRow(iconName, text) {
  return el('div', { className: 'row', style: 'gap:8px' }, [
    el('span', { className: 'resource-icon', html: icon(iconName) }),
    el('span', { text }),
  ]);
}

/**
 * Jump planning as a pop-up over the Galactic View, rather than a separate
 * full screen — the map stays visible (dimmed) behind it, so committing to a
 * jump feels connected to what's actually on screen instead of a detour to a
 * disconnected page. Works identically whether opened from a starmap marker
 * tap or System View's wormhole button.
 */
export function openJumpModal(gs, systemId, { viaWormhole = false } = {}) {
  gs.viaWormhole = viaWormhole;
  const discovery = gs.save.discoveries[systemId];
  const tier = discovery ? discovery.tier : 'detected';
  const preview = gs.previewJump(systemId);

  const infoPanel = el('div', { className: 'panel stack' });
  if (tier === 'detected') {
    infoPanel.appendChild(el('p', {
      className: 'subtitle',
      text: 'Unscanned system — long-range scan from the starmap to learn more before committing.',
    }));
  } else {
    const sys = getSystem(gs.baseSeedInt, systemId);
    infoPanel.appendChild(el('p', { className: 'title', text: sys.name, style: 'font-size:1.1rem' }));
    infoPanel.appendChild(el('p', { className: 'subtitle', text: `${sys.star.label} · ${sys.planets.length} planet${sys.planets.length === 1 ? '' : 's'}` }));
    if (sys.hazard) {
      infoPanel.appendChild(el('p', { className: 'subtitle', text: `⚠ ${sys.hazard.label}` }));
    }
    if (tier === 'close') {
      for (const planet of sys.planets) {
        const mineralList = Object.keys(planet.minerals).join(', ') || 'none';
        const lifeText = planet.life
          ? (gs.save.sampledPlanets[planet.id] ? ` — biosignature detected (${planet.life.speciesName})` : ' — unidentified biosignature detected')
          : '';
        infoPanel.appendChild(el('p', {
          className: 'subtitle',
          text: `${planetDesignation(sys.name, planet.index)} — minerals: ${mineralList}${lifeText}`,
        }));
      }
    }
  }

  const costPanel = el('div', { className: 'panel stack' }, [
    viaWormhole
      ? el('div', { className: 'row', style: 'gap:8px' }, [
        el('span', { className: 'resource-icon', html: icon('wormhole') }),
        el('span', { className: 'subtitle', text: 'Wormhole route — flat cost regardless of distance.' }),
      ])
      : infoRow('currentSystem', `Distance: ${preview.distance.toFixed(1)} ly`),
    infoRow('fuel', `Fuel cost: ${preview.cost.fuel.toFixed(1)}`),
    infoRow('oxygen', `Life-support draw: ${preview.cost.oxygen} oxygen, ${preview.cost.food} food`),
    !preview.canAfford ? el('p', { className: 'banner banner-danger', text: 'Not enough fuel for this jump.' }) : null,
  ]);

  const body = el('div', { className: 'stack' }, [infoPanel, costPanel]);

  showModal({
    title: viaWormhole ? 'Wormhole Jump' : 'Jump Planning',
    body,
    buttons: [
      { label: 'Cancel', className: 'btn' },
      {
        label: viaWormhole ? 'Commit Wormhole Jump' : 'Commit Jump',
        className: 'btn btn-primary',
        disabled: !preview.canAfford,
        closeOnClick: false,
        onClick: (close) => {
          const result = gs.commitJump(systemId);
          if (!result.ok) return;
          close();
          if (gs.save.gameOver) return; // commitJump already navigated to GAME_OVER
          gs.show('STARMAP', {
            pendingJumpAnimation: {
              fromPos: result.fromPos, toPos: result.toPos, destinationName: result.destinationName,
            },
          });
        },
      },
    ],
  });
}
