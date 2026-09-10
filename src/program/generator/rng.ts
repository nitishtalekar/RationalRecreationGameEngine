// Seeded RNG per docs/03-CORE-TYPES-AND-RNG.md (mulberry32).
// Same seed -> same sequence; used for every generative choice (§15).

export type SeededRng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: T[]) => T;
  pickIndex: (length: number) => number;
};

export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function pickIndex(length: number): number {
    if (length <= 0) {
      throw new Error("pickIndex requires a positive length");
    }
    return Math.floor(next() * length);
  }

  function int(min: number, max: number): number {
    if (max < min) {
      throw new Error("int requires max >= min");
    }
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error("pick requires a non-empty array");
    }
    return items[pickIndex(items.length)];
  }

  return { next, int, pick, pickIndex };
}
