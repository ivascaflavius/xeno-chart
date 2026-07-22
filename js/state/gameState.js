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
} from '../data/constants.js';
import {
  trySpend, addAmount, getAmount, capFor, updateLifeSupport,
} from '../systems/resources.js';
import { runModules } from '../systems/modules.js';
import {
  computeJumpCost,
  canAffordJump,
  performJump,
  updateStranded,
  sendDistressBeacon as travelSendDistressBeacon,
  effectiveSensorRange,
} from '../systems/travel.js';
import * as saveManager from '../save/saveManager.js';

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
};

/** Backfills fields added to the save shape after a save was written, so older saves don't crash on load. */
function normalizeSave(save) {
  if (!save.scanHistory) save.scanHistory = [];
  return save;
}

class GameState {
  constructor(rootEl) {
    this.root = rootEl;
    this.screen = 'MAIN_MENU';
    this.history = [];
    this.save = null;
    this.baseSeedInt = null;
    this.global = saveManager.loadGlobal();
    this.selectedSystemId = null;
    this.selectedPlanetId = null;
  }

  render() {
    this.root.innerHTML = '';
    SCREENS[this.screen].render(this.root, this);
  }

  /**
   * All screen transitions flow through here so nothing reaches into another
   * screen directly. Pushes onto a small history stack so screens reachable
   * from multiple parents (codex, how-to-fly, pause) can back() out to
   * wherever they were actually opened from, rather than a single
   * "previous screen" pointer that nested navigation (pause -> how to fly ->
   * back -> resume) would clobber.
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
    if (this.save) saveManager.writeSave(this.save);
  }

  persistGlobal() {
    saveManager.writeGlobal(this.global);
  }

  hasSave() {
    return !!saveManager.loadSave();
  }

  peekSave() {
    return saveManager.loadSave();
  }

  startNewExpedition(seedInput, difficulty) {
    const seed = (seedInput && seedInput.trim()) || String(Math.floor(Math.random() * 1e9));
    const baseSeedInt = seedToInt(seed);
    const startSystemId = getStartSystemId(baseSeedInt);
    const galaxyName = generateGalaxyName(baseSeedInt);

    const save = createEmptySave();
    save.seed = seed;
    save.galaxyName = galaxyName;
    save.difficulty = difficulty;
    save.createdAt = Date.now();
    save.position.systemId = startSystemId;
    save.resources = { ...STARTING_RESOURCES };
    save.buffers = { ...STARTING_BUFFERS };
    save.sensorRange = BASE_SENSOR_RANGE_LY;
    save.stats.systemsVisited = [startSystemId];

    this.save = save;
    this.baseSeedInt = baseSeedInt;
    this.persistSave();
    this.show('STARMAP');
  }

  loadExpedition() {
    const save = saveManager.loadSave();
    if (!save) return false;
    this.save = normalizeSave(save);
    this.baseSeedInt = seedToInt(save.seed);
    this.show('STARMAP');
    return true;
  }

  importSave(save) {
    this.save = normalizeSave(save);
    this.baseSeedInt = seedToInt(save.seed);
    saveManager.writeSave(this.save);
  }

  deleteSave() {
    saveManager.deleteSave();
  }

  currentSystem() {
    return getSystem(this.baseSeedInt, this.save.position.systemId);
  }

  /** Runs module processing + life-support check for one elapsed cycle. Returns true if this triggered game over. */
  advanceCycle() {
    this.save.cycle += 1;
    runModules(this.save, 1);
    updateStranded(this.save);
    updateLifeSupport(this.save);
    return this.save.gameOver;
  }

  longRangeScan() {
    if (!trySpend(this.save, 'charge', LONG_RANGE_SCAN_CHARGE_COST)) {
      return { ok: false, reason: 'insufficient-charge' };
    }
    const currentPos = this.currentSystem().pos;
    const range = effectiveSensorRange(this.save);
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

    const isGameOver = this.advanceCycle();
    this.persistSave();
    if (isGameOver) {
      this.show('GAME_OVER');
    } else {
      this.refresh();
    }
    return { ok: true };
  }

  recordCodex(track, key) {
    if (!this.global.codex[track][key]) {
      this.global.codex[track][key] = true;
      this.persistGlobal();
    }
  }

  closeRangeScan(systemId) {
    if (!trySpend(this.save, 'charge', CLOSE_RANGE_SCAN_CHARGE_COST)) {
      return { ok: false, reason: 'insufficient-charge' };
    }
    const sys = getSystem(this.baseSeedInt, systemId);
    const prior = this.save.discoveries[systemId];
    this.save.discoveries[systemId] = { tier: 'close', lifeCounted: prior?.lifeCounted || false };

    this.recordCodex('stellar', sys.star.class);
    for (const planet of sys.planets) {
      this.recordCodex('planetary', planet.class);
      if (planet.life) {
        this.recordCodex('biological', `${planet.life.biochemistry}:${planet.life.stage}`);
      }
    }
    const lifeCount = sys.planets.filter((p) => p.life).length;
    if (!this.save.discoveries[systemId].lifeCounted && lifeCount > 0) {
      this.save.stats.lifeFound += lifeCount;
      this.save.discoveries[systemId].lifeCounted = true;
    }

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
    const cost = computeJumpCost(this.save, distance);
    return { distance, cost, canAfford: canAffordJump(this.save, cost) };
  }

  commitJump(targetSystemId) {
    const currentPos = this.currentSystem().pos;
    const target = getSystem(this.baseSeedInt, targetSystemId);
    const distance = distanceLy(currentPos, target.pos);
    const result = performJump(this.save, distance, targetSystemId);
    if (!result.ok) return result;
    this.selectedSystemId = null;
    this.persistSave();
    this.show(this.save.gameOver ? 'GAME_OVER' : 'STARMAP');
    return result;
  }

  sendDistressBeacon() {
    const result = travelSendDistressBeacon(this.save);
    if (result.ok) {
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
