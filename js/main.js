import { boot } from './state/gameState.js';

function showFatalError(err) {
  console.error('Xeno-Chart fatal error:', err);
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'error-screen';
  const title = document.createElement('p');
  title.className = 'title';
  title.textContent = 'Something went wrong.';
  const sub = document.createElement('p');
  sub.className = 'subtitle';
  sub.textContent = 'Xeno-Chart hit an unexpected error and needs to reload.';
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Reload';
  btn.addEventListener('click', () => window.location.reload());
  wrap.append(title, sub, btn);
  app.appendChild(wrap);
}

window.addEventListener('error', (e) => showFatalError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason));

try {
  boot(document.getElementById('app'));
} catch (err) {
  showFatalError(err);
}
