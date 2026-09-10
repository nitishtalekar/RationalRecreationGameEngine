import { describe, expect, it } from "vitest";

import { createSeededRng } from "@/program/generator/rng";

describe("createSeededRng", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);

    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRng(42);
    const b = createSeededRng(43);

    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("next() stays within [0, 1)", () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("int(min, max) stays within bounds inclusive", () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(3, 8);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(8);
    }
  });

  it("pick returns an element from the array, deterministically per seed", () => {
    const items = ["a", "b", "c", "d"];
    const a = createSeededRng(99);
    const b = createSeededRng(99);

    const pickedA = a.pick(items);
    const pickedB = b.pick(items);

    expect(items).toContain(pickedA);
    expect(pickedA).toBe(pickedB);
  });

  it("pickIndex returns a valid index within length", () => {
    const rng = createSeededRng(123);
    for (let i = 0; i < 1000; i++) {
      const index = rng.pickIndex(10);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(10);
    }
  });

  it("pick throws on an empty array", () => {
    const rng = createSeededRng(1);
    expect(() => rng.pick([])).toThrow();
  });
});
