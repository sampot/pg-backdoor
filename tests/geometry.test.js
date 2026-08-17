import { describe, it, expect } from "vitest";
import { clamp, clampToUnit, inCone, normalizeAngle } from "../src/geometry.js";

describe("geometry", () => {
  it("clamps values into range", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-2, 0, 3)).toBe(0);
  });

  it("normalizes vectors to unit length", () => {
    const v = clampToUnit(3, 4);
    expect(v.len).toBe(1);
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it("folds angles into (-PI, PI]", () => {
    expect(normalizeAngle(Math.PI * 2.5)).toBeCloseTo(Math.PI / 2);
  });

  it("detects targets inside a cone", () => {
    const viewer = { x: 0, y: 0, facing: 0 };
    expect(inCone(viewer, { x: 3, y: 0 }, { range: 5, halfAngle: 0.5 })).toBe(true);
    expect(inCone(viewer, { x: 0, y: 4 }, { range: 5, halfAngle: 0.2 })).toBe(false);
  });
});
