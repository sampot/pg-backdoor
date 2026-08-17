import { describe, it, expect } from "vitest";
import { createRun } from "../src/engine.js";
import { formatClock, gradeFor, mergeBest, scoreRun } from "../src/score.js";

describe("score", () => {
  it("scores only winning runs", () => {
    const lost = createRun("sneak");
    lost.status = "lost";
    expect(scoreRun(lost)).toBe(0);
  });

  it("rewards fast quiet clears", () => {
    const won = createRun("hack");
    won.status = "won";
    won.time = 40;
    won.peakAlarm = 10;
    won.detections = 0;
    expect(scoreRun(won)).toBeGreaterThan(700);
  });

  it("assigns letter grades", () => {
    expect(gradeFor(1100)).toBe("S");
    expect(gradeFor(400)).toBe("C");
  });

  it("keeps the higher best score", () => {
    expect(mergeBest(500, 480)).toBe(500);
    expect(mergeBest(500, 620)).toBe(620);
  });

  it("formats elapsed clock strings", () => {
    expect(formatClock(65)).toBe("1:05");
  });
});
