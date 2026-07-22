import { SAVE_STORAGE_KEY, GLOBAL_STORAGE_KEY } from '../data/constants.js';
import { createEmptyGlobal, validateSave, validateGlobal } from '../data/schema.js';

export function loadSave() {
  const raw = localStorage.getItem(SAVE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validateSave(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSave(save) {
  save.lastPlayedAt = Date.now();
  localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
}

export function deleteSave() {
  localStorage.removeItem(SAVE_STORAGE_KEY);
}

export function loadGlobal() {
  const raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
  if (!raw) return createEmptyGlobal();
  try {
    const parsed = JSON.parse(raw);
    return validateGlobal(parsed) ? parsed : createEmptyGlobal();
  } catch {
    return createEmptyGlobal();
  }
}

export function writeGlobal(global) {
  localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(global));
}

/** Clears the save slot and all global codex/achievement progress (§14). */
export function resetAllData() {
  localStorage.removeItem(SAVE_STORAGE_KEY);
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
