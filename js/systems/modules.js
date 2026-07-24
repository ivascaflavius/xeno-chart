import { MODULES, HOSTILE_MODULE_DISABLE_CYCLES } from '../data/constants.js';
import { getAmount, addAmount, capFor, statusFor } from './resources.js';

const MODULE_ORDER = ['refinery', 'electrolysis', 'hydroponics', 'reactor'];

/** A hostile intelligent-life encounter (§3, Phase 3) disables one module for a set number of cycles. */
export function disableModule(save, key) {
  save.moduleDisabled = { key, cyclesLeft: HOSTILE_MODULE_DISABLE_CYCLES };
}

function runOneModule(save, key) {
  if (save.moduleDisabled?.key === key) return;

  const cfg = MODULES[key];
  let fraction = 1;

  const available = getAmount(save, cfg.input);
  fraction = Math.min(fraction, cfg.ratePerCycle > 0 ? available / cfg.ratePerCycle : 0);

  if (cfg.secondaryInput) {
    const secAvailable = getAmount(save, cfg.secondaryInput);
    fraction = Math.min(fraction, cfg.secondaryRatePerCycle > 0 ? secAvailable / cfg.secondaryRatePerCycle : 0);
  }

  fraction = Math.max(0, Math.min(1, fraction));
  if (fraction <= 0) return;

  addAmount(save, cfg.input, -cfg.ratePerCycle * fraction);
  if (cfg.secondaryInput) {
    addAmount(save, cfg.secondaryInput, -cfg.secondaryRatePerCycle * fraction);
  }
  for (const [outKey, outRate] of Object.entries(cfg.outputs)) {
    addAmount(save, outKey, outRate * fraction);
  }
}

/** Advance all modules by `cycles` (default 1), each running independently in a fixed order. */
export function runModules(save, cycles = 1) {
  for (let i = 0; i < cycles; i++) {
    for (const key of MODULE_ORDER) {
      runOneModule(save, key);
    }
    if (save.moduleDisabled) {
      save.moduleDisabled.cyclesLeft -= 1;
      if (save.moduleDisabled.cyclesLeft <= 0) save.moduleDisabled = null;
    }
  }
}

/** Status rows for the ship systems dashboard (§5). */
export function getModuleStatuses(save) {
  return MODULE_ORDER.map((key) => {
    const cfg = MODULES[key];
    const amount = getAmount(save, cfg.input);
    const cap = capFor(cfg.input);
    const disabled = save.moduleDisabled?.key === key;
    // Mirrors runOneModule's own fraction>0 check (without the ratePerCycle
    // scaling, just the "is there anything to consume" boolean) — true when
    // this module will actually convert something next cycle, false when
    // it's sitting idle for lack of input (dashboard spins a cogwheel icon
    // on the former, dims it on the latter).
    const secondaryAvailable = !cfg.secondaryInput || getAmount(save, cfg.secondaryInput) > 0;
    const active = !disabled && amount > 0 && secondaryAvailable;
    return {
      key,
      label: cfg.label,
      input: cfg.input,
      amount,
      cap,
      status: disabled ? 'disabled' : statusFor(amount, cap),
      disabledCyclesLeft: disabled ? save.moduleDisabled.cyclesLeft : 0,
      active,
    };
  });
}
