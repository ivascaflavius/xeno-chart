import { createEmptySave } from '../data/schema.js';
import { seedToInt } from '../procgen/prng.js';
import { getStartSystemId, getSystem, getSystemsInRadius, distanceLy } from '../procgen/galaxy.js';
import { generateGalaxyName, generateShipName } from '../procgen/names.js';
import {
  BASE_SENSOR_RANGE_LY,
  STARTING_RESOURCES,
  STARTING_BUFFERS,
  LONG_RANGE_SCAN_CHARGE_COST,
  CLOSE_RANGE_SCAN_CHARGE_COST,
  STAR_CLASSES,
  PLANET_CLASSES,
  ACHIEVEMENTS,
  MODULES,
  HOSTILE_MODULE_DISABLE_CYCLES,
} from '../data/constants.js';
import {
  trySpend, addAmount, getAmount, capFor, updateLifeSupport,
} from '../systems/resources.js';
import { runModules, disableModule } from '../systems/modules.js';
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
import { hideTooltip } from '../ui/components/tooltip.js';
import {
  playStinger, playWarning, configure as configureAudio,
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
  if (!save.shipClass) save.shipClass = 'standard';
  if (!save.lifeDiscoveries) save.lifeDiscoveries = {};
  if (!save.sampledPlanets) save.sampledPlanets = {};
  if (save.moduleDisabled === undefined) save.moduleDisabled = null;
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
    // A hover tooltip lives in a body-level singleton div (see ui/components/tooltip.js),
    // outside this.root, so wiping this.root alone can leave a stale one on screen if a
    // screen change happens before the mouse fires its own mouseleave.
    hideTooltip();
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
    seedInput, difficulty, shipName, hullColor, shipClass, slot,
  }) {
    const seed = (seedInput && seedInput.trim()) || String(Math.floor(Math.random() * 1e9));
    const baseSeedInt = seedToInt(seed);
    const startSystemId = getStartSystemId(baseSeedInt);
    const galaxyName = generateGalaxyName(baseSeedInt);

    const save = createEmptySave();
    save.seed = seed;
    save.galaxyName = galaxyName;
    save.difficulty = difficulty;
    save.shipName = (shipName && shipName.trim()) || generateShipName(baseSeedInt);
    save.hullColor = hullColor || 'default';
    save.shipClass = shipClass || 'standard';
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
    this.save.discoveries[systemId] = { tier: 'close' };

    const starDef = STAR_CLASSES.find((c) => c.key === sys.star.class);
    this.recordCodex('stellar', sys.star.class, starDef.weight <= 2 ? 'notable' : 'minor', sys.star.label);
    if (sys.star.class === 'NS') this.unlockAchievement('first-pulsar');

    for (const planet of sys.planets) {
      const planetDef = PLANET_CLASSES.find((c) => c.key === planet.class);
      this.recordCodex('planetary', planet.class, planetDef.weight <= 2 ? 'notable' : 'minor', planet.label);
      // Biosignature presence is revealed by the scan itself (visible in Scan Detail);
      // codex/achievement crediting waits for a deliberate takeSample() action (§11, Phase 3 polish).
    }

    if (sys.star.class === 'BH') this.unlockAchievement('first-black-hole');
    if (sys.star.class === 'MAG') this.unlockAchievement('first-magnetar');

    if (sys.wormholeTo && !alreadyClose) {
      this.unlockAchievement('first-wormhole');
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
   * Credits a detected biosignature to the codex/achievements — deliberately
   * separate from closeRangeScan (§11, Phase 3 polish): the scan reveals that
   * something is there, but recording it (and triggering a first-contact
   * encounter for intelligent life) waits for the player to choose to act on
   * it. Idempotent per planet via save.sampledPlanets.
   */
  takeSample(planetId) {
    const [systemId] = planetId.split(':p');
    if (systemId !== this.save.position.systemId) return { ok: false };
    if (this.save.sampledPlanets[planetId]) return { ok: false, reason: 'already-sampled' };

    const sys = this.currentSystem();
    const planet = sys.planets.find((p) => p.id === planetId);
    if (!planet?.life) return { ok: false, reason: 'no-biosignature' };

    this.save.sampledPlanets[planetId] = true;
    this.save.stats.lifeFound += 1;

    this.recordCodex('biological', `${planet.life.biochemistry}:${planet.life.stage}`, 'rare', planet.life.speciesName);
    this.unlockAchievement('first-life');
    if (planet.life.biochemistry === 'silicon') this.unlockAchievement('first-silicon-life');

    this.save.lifeDiscoveries[planetId] = {
      genesisMarkerId: planet.life.genesisMarkerId,
      speciesName: planet.life.speciesName,
      biochemistry: planet.life.biochemistry,
      biochemistryLabel: planet.life.biochemistryLabel,
      stage: planet.life.stage,
      stageLabel: planet.life.stageLabel,
      systemId: sys.id,
    };

    if (planet.life.stage === 'intelligent') {
      this.unlockAchievement('first-intelligent-life');
      if (planet.life.encounter === 'hostile') {
        disableModule(this.save, planet.life.hostileModuleKey);
        this.flashMessage = `First contact with ${planet.life.speciesName} (${planet.life.techTierLabel}) turned hostile — the ${MODULES[planet.life.hostileModuleKey].label} has been disabled for ${HOSTILE_MODULE_DISABLE_CYCLES} cycles.`;
      } else {
        this.flashMessage = `First contact with ${planet.life.speciesName} (${planet.life.techTierLabel}) was peaceful.`;
      }
    }

    this.persistSave();
    this.refresh();
    return { ok: true };
  }

  /**
   * Core harvest loop for a single mineral on a planet — pulls as much as the
   * planet has left and the ship's buffer has room for. If the buffer caps
   * out before the planet is drained, this keeps advancing cycles (letting
   * modules consume from the buffer) and retrying, stopping only once the
   * planet is fully depleted or a cycle passes with no change in available
   * room — i.e. genuinely stuck (e.g. hydroponics can't free up the water
   * buffer without oxygen to pair it with). That leaves the rest for a later
   * visit rather than requiring the player to mash the button to slowly
   * drain a capped buffer. Mutates save in place; does not persist, flash, or
   * refresh — callers (harvest/harvestAll) do that once, after everything.
   */
  harvestOneMineral(planetId, mineralKey) {
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

    return { totalHarvested, cyclesElapsed: this.save.cycle - cycleBefore, isGameOver };
  }

  harvest(planetId, mineralKey) {
    const [systemId] = planetId.split(':p');
    if (systemId !== this.save.position.systemId) return { ok: false };

    const { totalHarvested, cyclesElapsed, isGameOver } = this.harvestOneMineral(planetId, mineralKey);

    if (totalHarvested > 0) {
      enqueueCelebration('minor', {
        title: 'Harvested',
        body: `${Math.round(totalHarvested)} ${mineralKey}${cyclesElapsed > 1 ? ` · ${cyclesElapsed} cycles` : ''}`,
      });
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

  /**
   * Harvests every mineral type present on a planet in one action — same
   * per-mineral loop as harvest(), just run once per mineral key in turn, so
   * a multi-mineral planet doesn't need a separate button press per mineral.
   * Stops early if a life-support failure hits mid-harvest.
   */
  harvestAll(planetId) {
    const [systemId] = planetId.split(':p');
    if (systemId !== this.save.position.systemId) return { ok: false };

    const sys = this.currentSystem();
    const planet = sys.planets.find((p) => p.id === planetId);
    if (!planet) return { ok: false };

    const totals = {};
    let isGameOver = false;

    for (const mineralKey of Object.keys(planet.minerals)) {
      if (isGameOver) break;
      const result = this.harvestOneMineral(planetId, mineralKey);
      if (result.totalHarvested > 0) totals[mineralKey] = result.totalHarvested;
      isGameOver = result.isGameOver;
    }

    const harvestedAny = Object.keys(totals).length > 0;
    if (harvestedAny) {
      enqueueCelebration('minor', {
        title: 'Harvested',
        body: Object.entries(totals).map(([k, v]) => `${Math.round(v)} ${k}`).join(', '),
      });
      this.unlockAchievement('first-harvest');
    }

    this.persistSave();
    if (isGameOver) {
      this.show('GAME_OVER');
    } else {
      this.refresh();
    }
    return { ok: harvestedAny };
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
