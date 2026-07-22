import { SAVE_STORAGE_KEY_PREFIX, SAVE_SLOT_COUNT, GLOBAL_STORAGE_KEY } from '../data/constants.js';
import { createEmptyGlobal, validateSave, validateGlobal } from '../data/schema.js';

function keyForSlot(slot) {
  return `${SAVE_STORAGE_KEY_PREFIX}${slot}`;
}

export function loadSave(slot) {
  const raw = localStorage.getItem(keyForSlot(slot));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validateSave(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** One entry per slot, in slot order; null for empty slots. */
export function loadAllSaves() {
  const saves = [];
  for (let slot = 0; slot < SAVE_SLOT_COUNT; slot++) {
    saves.push(loadSave(slot));
  }
  return saves;
}

export function writeSave(slot, save) {
  save.lastPlayedAt = Date.now();
  localStorage.setItem(keyForSlot(slot), JSON.stringify(save));
}

export function deleteSave(slot) {
  localStorage.removeItem(keyForSlot(slot));
}

export function loadGlobal() {
  const raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
  if (!raw) return createEmptyGlobal();
  try {
    const parsed = JSON.parse(raw);
    if (!validateGlobal(parsed)) return createEmptyGlobal();
    return normalizeGlobal(parsed);
  } catch {
    return createEmptyGlobal();
  }
}

/** Backfills fields added to the global shape after it was written, so older globals don't crash on load. */
function normalizeGlobal(global) {
  const empty = createEmptyGlobal();
  return {
    ...empty,
    ...global,
    audio: { ...empty.audio, ...global.audio },
    haptics: { ...empty.haptics, ...global.haptics },
    achievements: global.achievements || {},
  };
}

export function writeGlobal(global) {
  localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(global));
}

/** Clears every save slot and all global codex/achievement progress (§14). */
export function resetAllData() {
  for (let slot = 0; slot < SAVE_SLOT_COUNT; slot++) {
    localStorage.removeItem(keyForSlot(slot));
  }
  localStorage.removeItem(GLOBAL_STORAGE_KEY);
}

export function exportSaveToFile(save) {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (save.galaxyName || 'xeno-chart-save').replace(/[^a-z0-9-]+/gi, '_');
  a.href = url;
  a.download = `${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Resolves { ok: true, save } or { ok: false, error }. Never throws. */
export function importSaveFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!validateSave(parsed)) {
          resolve({ ok: false, error: "Couldn't read that save file." });
          return;
        }
        resolve({ ok: true, save: parsed });
      } catch {
        resolve({ ok: false, error: "Couldn't read that save file." });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: "Couldn't read that save file." });
    reader.readAsText(file);
  });
}
