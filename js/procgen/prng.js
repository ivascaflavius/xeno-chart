// Seeded PRNG utilities. Everything here is a pure function of its inputs —
// no hidden mutable module state — so the same seed always reproduces the
// same galaxy.

/** xmur3 string hash -> 32-bit int generator, used to turn seeds/ids into ints. */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 PRNG core — given a 32-bit int seed, returns a () => float[0,1) generator. */
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn an arbitrary seed string into a stable 32-bit int. */
export function seedToInt(seedStr) {
  return xmur3(String(seedStr))();
}

/** Derive a new deterministic 32-bit int from a base seed int + any number of id parts. */
export function deriveSeedInt(baseSeedInt, ...parts) {
  return xmur3(`${baseSeedInt}:${parts.join(':')}`)();
}

export class Rng {
  constructor(seedInt) {
    this._next = mulberry32(seedInt >>> 0);
  }

  /** Float in [0, 1). */
  float() {
    return this._next();
  }

  /** Integer in [min, max], inclusive. */
  int(min, max) {
    return min + Math.floor(this._next() * (max - min + 1));
  }

  /** Boolean true with probability p. */
  chance(p) {
    return this._next() < p;
  }

  pick(arr) {
    return arr[Math.floor(this._next() * arr.length)];
  }

  /** items: array of objects each with a numeric `weight`. */
  weightedPick(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let r = this._next() * total;
    for (const item of items) {
      if (r < item.weight) return item;
      r -= item.weight;
    }
    return items[items.length - 1];
  }
}

/** Convenience: build an Rng deterministically derived from (baseSeedInt, ...idParts). */
export function rngFor(baseSeedInt, ...idParts) {
  return new Rng(deriveSeedInt(baseSeedInt, ...idParts));
}
