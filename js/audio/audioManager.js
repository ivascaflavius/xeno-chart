// All audio is synthesized via the Web Audio API — no external audio files
// (§15, §21). Short envelope-shaped tones for stingers/warnings only — no
// continuous ambient loop, so nothing hums away while browsing menus; sound
// only ever plays in direct response to a player action.

let ctx = null;
let masterGain = null;
let settings = { enabled: true, volume: 0.5 };

function ensureContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    masterGain = ctx.createGain();
    masterGain.gain.value = settings.enabled ? settings.volume : 0;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export function configure(newSettings) {
  settings = newSettings;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(settings.enabled ? settings.volume : 0, ctx.currentTime, 0.05);
  }
}

function playToneAt(startTime, freq, duration, peakGain = 0.3, { freqEnd } = {}) {
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

const STINGER_NOTES = {
  minor: [{ freq: 700, dur: 0.1 }],
  notable: [{ freq: 600, dur: 0.09 }, { freq: 900, dur: 0.14 }],
  rare: [{ freq: 500, dur: 0.1 }, { freq: 750, dur: 0.1 }, { freq: 1000, dur: 0.2 }],
  landmark: [
    { freq: 400, dur: 0.14 }, { freq: 600, dur: 0.14 }, { freq: 800, dur: 0.14 }, { freq: 1100, dur: 0.3 },
  ],
};

/** Distinct short cue for a discovery/achievement, scaled by celebration tier (§11a, §15). */
export function playStinger(tier) {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const notes = STINGER_NOTES[tier] || STINGER_NOTES.minor;
  let t = audioCtx.currentTime;
  for (const note of notes) {
    playToneAt(t, note.freq, note.dur);
    t += note.dur * 0.8;
  }
}

/** Warning cue for life-support turning critical (§15). */
export function playWarning() {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playToneAt(t, 880, 0.15, 0.35);
  playToneAt(t + 0.25, 880, 0.15, 0.35);
}

// Everyday-action cues — quieter and simpler than the discovery stingers
// above (those are reserved for a genuinely new codex entry/achievement),
// so routine scanning/jumping/harvesting doesn't compete for attention with
// an actual "you found something new" moment. Each shape (single rising
// sweep, paired sweep, ascending chime, flat repeated beep) is chosen to be
// tellable apart by ear alone, not just by pitch.

/** Quick rising sonar-style ping for a completed long- or close-range scan. */
export function playScanCue() {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  playToneAt(audioCtx.currentTime, 700, 0.11, 0.22, { freqEnd: 1200 });
}

/** Paired rising sweep ("warp-out") for a committed jump. */
export function playJumpCue() {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playToneAt(t, 320, 0.14, 0.26, { freqEnd: 620 });
  playToneAt(t + 0.09, 620, 0.2, 0.22, { freqEnd: 980 });
}

/** Short ascending two-note chime for a successful harvest. */
export function playHarvestCue() {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playToneAt(t, 600, 0.07, 0.22);
  playToneAt(t + 0.08, 950, 0.12, 0.26);
}

/** Three flat, evenly-spaced low beeps — an alarm cue, distinct from the sweeps/chimes above — for sending a distress beacon. */
export function playDistressCue() {
  if (!settings.enabled) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playToneAt(t, 440, 0.1, 0.3);
  playToneAt(t + 0.16, 440, 0.1, 0.3);
  playToneAt(t + 0.32, 440, 0.1, 0.3);
}

// Pause all audio when the tab is backgrounded, regardless of the on/off
// setting, so nothing keeps playing unattended (§15).
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) {
    if (ctx.state === 'running') ctx.suspend();
  } else if (settings.enabled) {
    ctx.resume();
  }
});
