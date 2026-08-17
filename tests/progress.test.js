import { describe, it, expect } from "vitest";
import {
  decodeProgress,
  encodeProgress,
  emptyProgress,
  recordClear,
  totalScore,
} from "../src/progress.js";

describe("progress", () => {
  it("starts empty", () => {
    const p = emptyProgress();
    expect(p.best).toEqual({});
    expect(p.clearedApproaches).toEqual([]);
  });

  it("round-trips through encode/decode", () => {
    const raw = encodeProgress({
      best: { sneak: 900 },
      clearedApproaches: ["sneak"],
      sound: true,
    });
    const decoded = decodeProgress(raw);
    expect(decoded.best.sneak).toBe(900);
    expect(decoded.clearedApproaches).toContain("sneak");
  });

  it("records best score per approach", () => {
    let p = emptyProgress();
    p = recordClear(p, "hack", 700);
    p = recordClear(p, "hack", 650);
    expect(p.best.hack).toBe(700);
    expect(p.clearedApproaches).toContain("hack");
  });

  it("sums total score across approaches", () => {
    const p = { best: { sneak: 500, fight: 300 }, clearedApproaches: ["sneak", "fight"], sound: true };
    expect(totalScore(p)).toBe(800);
  });
});
