import { describe, it, expect } from "vitest";
import { createMap, moveBody, canStand, isVaultAt, TILE } from "../src/map.js";
import { FORTRESS } from "../src/level.js";

describe("map", () => {
  const map = createMap(FORTRESS.rows);

  it("creates a rectangular map", () => {
    expect(map.width).toBe(28);
    expect(map.height).toBe(FORTRESS.rows.length);
  });

  it("blocks movement on walls", () => {
    expect(canStand(map, 0.5, 0.5, 0.3)).toBe(false);
    expect(canStand(map, 5.5, 5.5, 0.3)).toBe(true);
  });

  it("slides along walls instead of sticking", () => {
    const body = { x: 8.5, y: 8.5 };
    const moved = moveBody(map, body, 1.2, 0, 0.28);
    expect(moved.x).toBeGreaterThan(body.x);
  });

  it("marks vault tiles", () => {
    expect(isVaultAt(map, 14.5, 6.5)).toBe(true);
    expect(isVaultAt(map, 2.5, 2.5)).toBe(false);
  });

  it("uses expected tile constants", () => {
    expect(TILE.VAULT).toBe("V");
    expect(TILE.VENT).toBe("v");
  });
});
