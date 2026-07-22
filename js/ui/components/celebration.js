// Tiered discovery/achievement celebrations (§11a). A single reusable queue
// driven purely by (tier, content) — screens never build one-off effects,
// they just call enqueueCelebration(). Queued, not stacked: only one shows
// at a time, and it never blocks input (tap anywhere on it to dismiss early).

const queue = [];
let processing = false;
let rootEl = null;

const TIER_DURATION_MS = {
  minor: 2000,
  notable: 3500,
  rare: 5000,
  landmark: 7000,
};

const CONFETTI_COLORS = ['#5fc9d8', '#e8a34c', '#5fd88a', '#d8615f', '#b98ce0'];

function ensureRoot() {
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.className = 'celebration-root';
    document.body.appendChild(rootEl);
  }
  return rootEl;
}

/** content: { title, body, portraitHtml? } */
export function enqueueCelebration(tier, content) {
  queue.push({ tier, content });
  processQueue();
}

function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;
  const { tier, content } = queue.shift();
  showCelebration(tier, content, () => {
    processing = false;
    processQueue();
  });
}

function burstConfetti(wrap, count) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    piece.style.setProperty('--dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
    piece.style.setProperty('--dy', `${(Math.sin(angle) * dist - 40).toFixed(1)}px`);
    piece.style.setProperty('--rot', `${(Math.random() * 720 - 360).toFixed(0)}deg`);
    piece.style.animationDelay = `${(Math.random() * 0.15).toFixed(2)}s`;
    wrap.appendChild(piece);
    setTimeout(() => piece.remove(), 1400);
  }
}

function showCelebration(tier, content, onDone) {
  const root = ensureRoot();

  const wrap = document.createElement('div');
  wrap.className = `celebration-wrap tier-${tier}`;

  const card = document.createElement('div');
  card.className = 'celebration-card';
  if (content.portraitHtml) {
    const portrait = document.createElement('div');
    portrait.className = 'celebration-portrait';
    portrait.innerHTML = content.portraitHtml;
    card.appendChild(portrait);
  }
  const title = document.createElement('p');
  title.className = 'celebration-title';
  title.textContent = content.title || '';
  const body = document.createElement('p');
  body.className = 'celebration-body';
  body.textContent = content.body || '';
  card.append(title, body);
  wrap.appendChild(card);

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    wrap.classList.add('dismissing');
    setTimeout(() => {
      wrap.remove();
      onDone();
    }, 250);
  }
  wrap.addEventListener('click', dismiss);

  root.appendChild(wrap);

  if (tier === 'rare' || tier === 'landmark') {
    burstConfetti(wrap, tier === 'landmark' ? 40 : 24);
  }

  setTimeout(dismiss, TIER_DURATION_MS[tier] || TIER_DURATION_MS.minor);
}
