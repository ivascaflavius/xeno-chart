// Lightweight hover tooltip for desktop/mouse pointers only (§8 — no keyboard
// or hover dependency for touch). Content is computed lazily on hover so
// building tooltip text for every rendered marker isn't paid up front.

let tooltipEl = null;

function isFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'hover-tooltip';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function positionTooltip(x, y) {
  const t = ensureTooltip();
  const offset = 14;
  let left = x + offset;
  const top = y + offset;
  if (left + 240 > window.innerWidth) left = x - offset - 240;
  t.style.left = `${Math.max(4, left)}px`;
  t.style.top = `${Math.max(4, top)}px`;
}

function showTooltip(html, x, y) {
  const t = ensureTooltip();
  t.innerHTML = html;
  t.style.display = 'block';
  positionTooltip(x, y);
}

export function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

/** Wires hover listeners onto `target`; `getHtml()` is called fresh on every mouseenter. No-ops entirely on touch/coarse pointers. */
export function attachHoverTooltip(target, getHtml) {
  if (!isFinePointer()) return;
  target.addEventListener('mouseenter', (e) => showTooltip(getHtml(), e.clientX, e.clientY));
  target.addEventListener('mousemove', (e) => positionTooltip(e.clientX, e.clientY));
  target.addEventListener('mouseleave', hideTooltip);
}
