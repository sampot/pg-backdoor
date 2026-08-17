import { describe, it, expect } from "vitest";
import { APPROACHES, FORTRESS, isValidApproach, spawnFor } from "../src/level.js";

describe("level", () => {
  it("defines four approaches", () => {
    expect(APPROACHES).toEqual(["sneak", "talk", "fight", "hack"]);
  });

  it("validates approach ids", () => {
    expect(isValidApproach("hack")).toBe(true);
    expect(isValidApproach("cheat")).toBe(false);
  });

  it("provides distinct spawn points per approach", () => {
    const points = APPROACHES.map((a) => spawnFor(a));
    const keys = new Set(points.map((p) => `${p.x},${p.y}`));
    expect(keys.size).toBe(4);
  });

  it("keeps vault and exit inside the fortress", () => {
    const { vault, exit } = FORTRESS;
    expect(vault.x).toBeGreaterThan(1);
    expect(exit.y).toBeGreaterThan(vault.y);
    expect(exit.x).toBe(12.5);
  });
});
