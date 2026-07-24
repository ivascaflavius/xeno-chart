// Small animated illustration of how this expedition ended, shown under the
// Game Over screen's Details tab stat panel — a life-support failure (the
// ship's own systems flickering out) reads very differently from a deadlock
// (the ship left adrift with nothing left to try), so each ending gets its
// own scene rather than a single generic "you lost" graphic.

function shipOutline(cx, cy, scale, color, opacity = 0.85) {
  return `<path d="M${cx} ${(cy - 40 * scale).toFixed(1)} L${(cx + 29 * scale).toFixed(1)} ${(cy + 30 * scale).toFixed(1)} L${cx} ${(cy + 16 * scale).toFixed(1)} L${(cx - 29 * scale).toFixed(1)} ${(cy + 30 * scale).toFixed(1)} Z" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity}"/>`;
}

/** The ship's own life-support light dimming toward failure, with a handful of other systems already flickering out around it. */
function lifeSupportSceneHtml() {
  const size = 260;
  const c = size / 2;
  const flickerDots = [
    [c - 46, c - 60, 1.6, 0], [c + 58, c - 40, 1.3, 0.6], [c + 40, c + 66, 1.4, 1.1], [c - 60, c + 50, 1.2, 1.6],
  ];
  const dots = flickerDots.map(([x, y, r, delay]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#8b93a8" class="gameover-flicker-dot" style="animation-delay:${delay}s"/>`).join('');
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
      <circle cx="${c}" cy="${c}" r="100" fill="none" stroke="#2a3145" stroke-width="1" stroke-dasharray="2 5" opacity="0.4"/>
      ${shipOutline(c, c, 1, '#8b93a8', 0.6)}
      <circle cx="${c}" cy="${(c + 6)}" r="7" fill="var(--danger)" class="gameover-pulse-core"/>
      ${dots}
    </svg>
  `;
}

/** The ship adrift with no engine trail, a quiet dark void nearby — nothing left nearby to reach. */
function deadlockSceneHtml() {
  const size = 260;
  const c = size / 2;
  const stars = [
    [40, 50, 1.2], [210, 35, 1], [70, 200, 1.4], [190, 180, 1], [30, 130, 0.9], [230, 110, 1.1], [130, 30, 0.8], [150, 220, 1],
  ];
  const starDots = stars.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8b93a8" opacity="0.5"/>`).join('');
  return `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
      ${starDots}
      <circle cx="${c}" cy="${c}" r="34" fill="#05070d" stroke="#3a2030" stroke-width="1.5" opacity="0.9" class="gameover-void-pulse"/>
      <circle cx="${c}" cy="${c}" r="50" fill="none" stroke="#3a2030" stroke-width="1" stroke-dasharray="2 4" opacity="0.5" class="gameover-void-pulse"/>
      <g class="gameover-drift">
        ${shipOutline(c + 70, c - 10, 0.6, '#8b93a8', 0.8)}
      </g>
    </svg>
  `;
}

export function gameOverSceneHtml(reason) {
  return reason === 'life-support' ? lifeSupportSceneHtml() : deadlockSceneHtml();
}
