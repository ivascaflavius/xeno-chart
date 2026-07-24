import { playGameOverCue } from '../../audio/audioManager.js';
import { vibrateGameOver } from '../../audio/hapticsManager.js';

/**
 * A brief full-screen dark-red flash, played right as the Game Over screen
 * mounts underneath it — a run can end as a side effect of an ordinary
 * action (a jump, a scan, a harvest, a beacon) with no warning banner ever
 * having shown, so swapping screens instantly read as "out of nowhere."
 * This inserts a deliberate beat (fade in, hold, fade out) plus a matching
 * audio/haptic cue, so the ending actually registers as an event rather than
 * just the next screen loading. Appended to <body> (not the screen root) so
 * it sits above the newly-rendered content regardless of render timing, and
 * removes itself once the animation finishes.
 */
export function playGameOverTransition() {
  playGameOverCue();
  vibrateGameOver();
  const overlay = document.createElement('div');
  overlay.className = 'gameover-transition';
  overlay.addEventListener('animationend', () => overlay.remove());
  document.body.appendChild(overlay);
}
