import { createEmptySave } from '../data/schema.js';
import { seedToInt } from '../procgen/prng.js';
import { getStartSystemId, getSystem, getSystemsInRadius, distanceLy } from '../procgen/galaxy.js';
import { generateGalaxyName } from '../procgen/names.js';
import {
  BASE_SENSOR_RANGE_LY,
  STARTING_RESOURCES,
  STARTING_BUFFERS,
  LONG_RANGE_SCAN_CHARGE_COST,
  CLOSE_RANGE_SCAN_CHARGE_COST,
  STAR_CLASSES,
  PLANET_CLASSES,
  ACHIEVEMENTS,
} from '../data/constants.js';
import {
  trySpend, addAmount, getAmount, capFor, updateLifeSupport,
} from '../systems/resources.js';
import { runModules } from '../systems/modules.js';
import {
  computeJumpCost,
  computeWormholeJumpCost,
  canAffordJump,
  performJump,
  updateStranded,
  sendDistressBeacon as travelSendDistressBeacon,
  effectiveSensorRange,
} from '../systems/travel.js';
import { closeScanChargeMultiplier } from '../systems/hazards.js';
import * as saveManager from '../save/saveManager.js';
import { enqueueCelebration } from '../ui/components/celebration.js';
import {
  playStinger, playWarning, configure as configureAudio, startAmbient,
} from '../audio/audioManager.js';
import {
  vibrateForTier, vibrateWarning, configure as configureHaptics,
} from '../audio/hapticsManager.js';

import * as mainMenu from '../ui/screens/mainMenu.js';
import * as newExpedition from '../ui/screens/newExpedition.js';
import * as slotPicker from '../ui/screens/slotPicker.js';
import * as starmapScreen from '../ui/screens/starmapScreen.js';
import * as jumpPlanning from '../ui/screens/jumpPlanning.js';
import * as systemView from '../ui/screens/systemView.js';
import * as scanDetail from '../ui/screens/scanDetail.js';
import * as shipSystems from '../ui/screens/shipSystems.js';
import * as codex from '../ui/screens/codex.js';
import * as howToFly from '../ui/screens/howToFly.js';
import * as pauseMenu from '../ui/screens/pauseMenu.js';
import * as gameOver from '../ui/screens/gameOver.js';
import * as settings from '../ui/screens/settings.js';
import * as credits from '../ui/screens/credits.js';

const SCREENS = {
  MAIN_MENU: mainMenu,
  NEW_EXPEDITION: newExpedition,
  SLOT_PICKER: slotPicker,
  STARMAP: starmapScreen,
  JUMP_PLANNING: jumpPlanning,
  SYSTEM_VIEW: systemView,
  SCAN_DETAIL: scanDetail,
  SHIP_SYSTEMS: shipSystems,
  CODEX: codex,
  HOW_TO_FLY: howToFly,
  PAUSED: pauseMenu,
  GAME_OVER: gameOver,
  SETTINGS: settings,
  CREDITS: credits,
};

/** Backfills fields added to the save shape after a save was written, so older saves don't crash on load. */
function normalizeSave(save) {
  if (!save.scanHistory) save.scanHistory = [];
  if (!save.hullColor) save.hullColor = 'default';
  return save;
}

class GameState {
  constructor(rootEl) {
    this.root = rootEl;
    this.screen = 'MAIN_MENU';
    this.history = [];
    this.save = null;
    this.currentSlot = 0;
    this.baseSeedInt = null;
    this.global = saveManager.loadGlobal();
    this.selectedSystemId = null;
    this.selectedPlanetId = null;
    this.viaWormhole = false;
    this.flashMessage = null;
    this.presetSlot = null;
    configureAudio(this.global.audio);
    configureHaptics(this.global.haptics);
  }

  /** Call after any change to global audio/haptics settings (from the Settings screen). */
  applyGlobalSettings() {
    configureAudio(this.global.audio);
    configureHaptics(this.global.haptics);
  }

  /** Read-and-clear so a flash message is shown exactly once, on the next render. */
  takeFlashMessage() {
    const msg = this.flashMessage;
    this.flashMessage = null;
    return msg;
  }

  render() {
    this.root.innerHTML = '';
    SCREENS[this.screen].render(this.root, this);
  }

  /**
   * All screen transitions flow through here so nothing reaches into another
   * screen directly. Pushes onto a small history stack so screens reachable
   * from multiple parents (codex, how-to-fly, pause, settings) can back() out
   * to wherever they were actually opened from, rather than a single
   * "previous screen" pointer that nested navigation would clobber.
   */
  show(screenName, opts = {}) {
    if (screenName === 'MAIN_MENU' || screenName === 'GAME_OVER') {
      this.history = [];
    } else if (this.screen !== screenName) {
      this.history.push(this.screen);
      if (this.history.length > 10) this.history.shift();
    }
    this.screen = screenName;
    Object.assign(this, opts);
    if (screenName === 'STARMAP') startAmbient();
    this.render();
  }

  /** Pop the history stack and show whatever screen was there. */
  back() {
    this.screen = this.history.pop() || 'STARMAP';
    this.render();
  }

  /** Re-render the current screen without navigating (used after actions that mutate state in place). */
  refresh() {
    this.render();
  }

  persistSave() {
    if (this.save) saveManager.writeSave(this.currentSlot, this.save);
  }

  persistGlobal() {
    saveManager.writeGlobal(this.global);
  }

  hasAnySave() {
    return saveManager.loadAllSaves().some((s) => s !== null);
  }

  peekSave(slot) {
    return saveManager.loadSave(slot);
  }

  startNewExpedition({
    seedInput, difficulty, shipName, hullColor, slot,
  }) {
    const seed = (seedInput && seedInput.trim()) || String(Math.floor(Math.random() * 1e9));
    const baseSeedInt = seedToInt(seed);
    const startSystemId = getStartSystemId(baseSeedInt);
    const galaxyName = generateGalaxyName(baseSeedInt);

    const save = createEmptySave();
    save.seed = seed;
    save.galaxyName = galaxyName;
    save.difficulty = difficulty;
    save.shipName = (shipName && shipName.trim()) || 'Unnamed Vessel';
    save.hullColor = hullColor || 'default';
    save.createdAt = Date.now();
    save.position.systemId = startSystemId;
    save.resources = { ...STARTING_RESOURCES };
    save.buffers = { ...STARTING_BUFFERS };
    save.sensorRange = BASE_SENSOR_RANGE_LY;
    save.stats.systemsVisited = [startSystemId];

    this.save = save;
    this.currentSlot = slot;
    this.baseSeedInt = baseSeedInt;
    this.persistSave();
    this.show('STARMAP');
  }

  loadExpedition(slot) {
    const save = saveManager.loadSave(slot);
    if (!save) return false;
    this.save = normalizeSave(save);
    this.currentSlot = slot;
    this.baseSeedInt = seedToInt(save.seed);
    this.show('STARMAP');
    return true;
  }

  importSave(save, slot) {
    this.save = normalizeSave(save);
    this.currentSlot = slot;
    this.baseSeedInt = seedToInt(save.seed);
    saveManager.writeSave(slot, this.save);
  }

  deleteSave(slot) {
    saveManager.deleteSave(slot);
  }

  currentSystem() {
    return getSystem(this.baseSeedInt, this.save.position.systemId);
  }

  /** Unlocks a global achievement (idempotent) and queues its celebration + stinger + haptic. */
  unlockAchievement(key) {
    if (this.global.achievements[key]) return false;
    this.global.achievements[key] = true;
    this.persistGlobal();
    const def = ACHIEVEMENTS.find((a) => a.key === key);
    const tier = def?.tier || 'notable';
    enqueueCelebration(tier, { title: def?.label || key, body: def?.description || '' });
    playStinger(tier);
    vibrateForTier(tier);
    return true;
  }

  /** Records a first-time codex discovery (idempotent) and queues its celebration + stinger + haptic. */
  recordCodex(track, key, tier, label) {
    if (this.global.codex[track][key]) return;
    this.global.codex[track][key] = true;
    this.persistGlobal();
    enqueueCelebration(tier, { title: label, body: `New ${track} discovery` });
    playStinger(tier);
    vibrateForTier(tier);
  }

  checkMappingAchievement() {
    if (Object.keys(this.save.discoveries).length >= 10) {
      this.unlockAchievement('ten-systems-mapped');
    }
  }

  /** Runs module processing + life-support check for one elapsed cycle. Returns true if this triggered game over. */
  advanceCycle() {
    const wasStranded = this.save.stranded;
    const wasCritical = this.save.lifeSupportCountdown !== null;
    this.save.cycle += 1;
    runModules(this.save, 1);
    updateStranded(this.save);
    updateLifeSupport(this.save);
    if (wasStranded && !this.save.stranded) {
      this.unlockAchievement('survive-stranding');
    }
    if (!wasCritical && this.save.lifeSupportCountdown !== null) {
      playWarning();
      vibrateWarning();
    }
    return this.save.gameOver;
  }

  longRangeScan() {
    const currentSystem = this.currentSystem();
    if (!trySpend(this.save, 'charge', LONG_RANGE_SCAN_CHARGE_COST)) {
      return { ok: false, reason: 'insufficient-charge' };
    }
    const currentPos = currentSystem.pos;
    const range = effectiveSensorRange(this.save, currentSystem.hazard);
    const nearby = getSystemsInRadius(this.baseSeedInt, currentPos, range);
    for (const stub of nearby) {
      const existing = this.save.discoveries[stub.id];
      if (!existing) {
        this.save.discoveries[stub.id] = { tier: 'long' };
      }
    }

    const alreadyCovered = this.save.scanHistory.some(
      (s) => distanceLy(s, currentPos) < 1 && s.range >= range,
    );
    if (!alreadyCovered) {
      this.save.scanHistory.push({ x: currentPos.x, y: currentPos.y, range });
    }

    this.checkMappingAchievement();
    const isGameOver = this.advanceCycle();
    this.persistSave();
    if (isGameOver) {
      this.show('GAME_OVER');
    } else {
      this.refresh();
    }
    return { ok: true };
  }

  closeRangeScan(systemId) {
    const sys = getSystem(this.baseSeedInt, systemId);
    const cost = CLOSE_RANGE_SCAN_CHARGE_COST * closeScanChargeMultiplier(sys.hazard);
    if (!trySpend(this.save, 'charge', cost)) {
      return { ok: false, reason: 'insufficient-charge' };
    }
    const prior = this.save.discoveries[systemId];
    const alreadyClose = prior?.tier === 'close';
    this.save.discoveries[systemId] = { tier: 'close', lifeCounted: prior?.lifeCounted || false };

    const starDef = STAR_CLASSES.find((c) => c.key === sys.star.class);
    this.recordCodex('stellar', sys.star.class, starDef.weight <= 2 ? 'notable' : 'minor', sys.star.label);
    if (sys.star.class === 'NS') this.unlockAchievement('first-pulsar');

    for (const planet of sys.planets) {
      const planetDef = PLANET_CLASSES.find((c) => c.key === planet.class);
      this.recordCodex('planetary', planet.class, planetDef.weight <= 2 ? 'notable' : 'minor', planet.label);
      if (planet.life) {
        this.recordCodex('biological', `${planet.life.biochemistry}:${planet.life.stage}`, 'rare', planet.life.speciesName);
        this.unlockAchievement('first-life');
        if (planet.life.biochemistry === 'silicon') this.unlockAchievement('first-silicon-life');
      }
    }

    if (sys.wormholeTo && !alreadyClose) {
      this.unlockAchievement('first-wormhole');
    }

    const lifeCount = sys.planets.filter((p) => p.life).length;
    if (!this.save.discoveries[systemId].lifeCounted && lifeCount > 0) {
      this.save.stats.lifeFound += lifeCount;
      this.save.discoveries[systemId].lifeCounted = true;
    }

    this.checkMappingAchievement();
    const isGameOver = this.advanceCycle();
    this.persistSave();
    if (isGameOver) {
      this.show('GAME_OVER');
    } else {
      this.refresh();
    }
    return { ok: true };
  }

  /**
   * Harvests as much of one mineral as the planet has left and the ship's
   * buffer has room for. If the buffer caps out before the planet is
   * drained, this keeps advancing cycles (letting modules consume from the
   * buffer) and retrying, stopping only once the planet is fully depleted or
   * a cycle passes with no change in available room — i.e. genuinely stuck
   * (e.g. hydroponics can't free up the water buffer without oxygen to pair
   * it with). That leaves the rest for a later visit rather than requiring
   * the player to mash the button to slowly drain a capped buffer.
   */
  harvest(planetId, mineralKey) {
    const [systemId] = planetId.split(':p');
    if (systemId !== this.save.position.systemId) return { ok: false };

    const cycleBefore = this.save.cycle;
    let totalHarvested = 0;
    let isGameOver = false;

    for (let i = 0; i < 200; i++) {
      const sys = this.currentSystem();
      const planet = sys.planets.find((p) => p.id === planetId);
      if (!planet || !(mineralKey in planet.minerals)) break;

      const depleted = this.save.mineralDepletion[planetId]?.[mineralKey] || 0;
      const remaining = planet.minerals[mineralKey] - depleted;
      if (remaining <= 0) break;

      const roomLeft = capFor(mineralKey) - getAmount(this.save, mineralKey);
      if (roomLeft <= 0) {
        isGameOver = this.advanceCycle();
        if (isGameOver) break;
        const roomAfter = capFor(mineralKey) - getAmount(this.save, mineralKey);
        if (roomAfter <= 0) break; // stuck — no module freed any room this cycle
        continue;
      }

      const amount = Math.min(remaining, roomLeft);
      addAmount(this.save, mineralKey, amount);
      if (!this.save.mineralDepletion[planetId]) this.save.mineralDepletion[planetId] = {};
      this.save.mineralDepletion[planetId][mineralKey] = depleted + amount;
      totalHarvested += amount;

      isGameOver = this.advanceCycle();
      if (isGameOver) break;
    }

    const cyclesElapsed = this.save.cycle - cycleBefore;
    if (totalHarvested > 0) {
      this.flashMessage = cyclesElapsed > 1
        ? `Harvested ${Math.round(totalHarvested)} ${mineralKey}. That took ${cyclesElapsed} cycles to fit it all in — modules kept consuming from the buffer as it filled, so the stored amount may be lower than what you took.`
        : `Harvested ${Math.round(totalHarvested)} ${mineralKey}.`;
      this.unlockAchievement('first-harvest');
    }

    this.persistSave();
    if (isGameOver) {
      this.show('GAME_OVER');
    } else {
      this.refresh();
    }
    return { ok: totalHarvested > 0, amount: totalHarvested };
  }

  previewJump(targetSystemId) {
    const currentPos = this.currentSystem().pos;
    const target = getSystem(this.baseSeedInt, targetSystemId);
    const distance = distanceLy(currentPos, target.pos);
    const cost = this.viaWormhole
      ? computeWormholeJumpCost(this.save, target.hazard)
      : computeJumpCost(this.save, distance, target.hazard);
    return {
      distance, cost, canAfford: canAffordJump(this.save, cost), viaWormhole: this.viaWormhole,
    };
  }

  commitJump(targetSystemId) {
    const currentPos = this.currentSystem().pos;
    const target = getSystem(this.baseSeedInt, targetSystemId);
    const distance = distanceLy(currentPos, target.pos);
    const cost = this.viaWormhole
      ? computeWormholeJumpCost(this.save, target.hazard)
      : computeJumpCost(this.save, distance, target.hazard);
    const result = performJump(this.save, cost, distance, targetSystemId);
    if (!result.ok) return result;
    this.selectedSystemId = null;
    this.viaWormhole = false;
    this.persistSave();
    this.show(this.save.gameOver ? 'GAME_OVER' : 'STARMAP');
    return result;
  }

  sendDistressBeacon() {
    const wasStranded = this.save.stranded;
    const result = travelSendDistressBeacon(this.save);
    if (result.ok) {
      if (wasStranded && !this.save.stranded) {
        this.unlockAchievement('survive-stranding');
      }
      this.persistSave();
      this.refresh();
    }
    return result;
  }
}

let instance = null;

export function boot(rootEl) {
  instance = new GameState(rootEl);
  instance.render();
}

export function getGameState() {
  return instance;
}
