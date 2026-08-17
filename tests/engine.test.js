import { describe, it, expect } from "vitest";
import {
  createRun,
  nearestInteractable,
  playerExposure,
  step,
  EMPTY_INPUT,
  RULES,
} from "../src/engine.js";

const move = (x, y, extra = {}) => ({ ...EMPTY_INPUT, moveX: x, moveY: y, ...extra });

describe("engine", () => {
  it("creates structured state for each approach", () => {
    for (const approach of ["sneak", "talk", "fight", "hack"]) {
      const run = createRun(approach);
      expect(run.status).toBe("playing");
      expect(run.map.rows.length).toBeGreaterThan(10);
      expect(run.guards.length).toBeGreaterThan(0);
      expect(run.cameras.length).toBeGreaterThan(0);
    }
  });

  it("moves the player when input is applied", () => {
    let run = createRun("sneak");
    const startX = run.player.x;
    run = step(run, move(1, 0), 0.5);
    expect(run.player.x).toBeGreaterThan(startX);
  });

  it("reduces sneak exposure while crouching in shadow", () => {
    const run = createRun("sneak");
    run.player.crouch = true;
    run.player.x = 2.5;
    run.player.y = 1.5;
    const exposure = playerExposure(run);
    expect(exposure).toBeLessThan(0.5);
  });

  it("raises alarm when standing in camera view", () => {
    let run = createRun("fight");
    run.player.x = 14.5;
    run.player.y = 5.5;
    run.player.crouch = false;
    for (let i = 0; i < 120; i++) run = step(run, EMPTY_INPUT, 0.05);
    expect(run.alarm).toBeGreaterThan(0);
  });

  it("allows hack interactables near terminals", () => {
    const run = createRun("hack");
    run.player.x = 22.5;
    run.player.y = 1.5;
    const target = nearestInteractable(run);
    expect(target?.kind === "terminal" || target?.kind === "camera").toBe(true);
  });

  it("extracts data at the vault with sustained interact", () => {
    let run = createRun("sneak");
    run.player.x = run.level.vault.x;
    run.player.y = run.level.vault.y;
    for (let i = 0; i < 80; i++) {
      run = step(run, move(0, 0, { primary: true }), 0.05);
    }
    expect(run.dataTaken).toBe(true);
  });

  it("wins after extraction and reaching exit", () => {
    let run = createRun("sneak");
    run.dataTaken = true;
    run.player.x = run.level.exit.x;
    run.player.y = run.level.exit.y;
    run = step(run, EMPTY_INPUT, 0.05);
    expect(run.status).toBe("won");
  });

  it("loses when alarm maxes out", () => {
    let run = createRun("talk");
    run.alarm = RULES.ALARM_MAX - 1;
    run = step(run, EMPTY_INPUT, 0.2);
    expect(run.status).toBe("lost");
    expect(run.lostReason).toBe("alarm");
  });

  it("drains disguise when talk approach runs", () => {
    let run = createRun("talk");
    const start = run.disguise;
    for (let i = 0; i < 20; i++) run = step(run, move(1, 0), 0.1);
    expect(run.disguise).toBeLessThan(start);
  });

  it("stuns a guard on fight primary action", () => {
    let run = createRun("fight");
    const guard = run.guards[0];
    run.player.x = guard.x + 0.4;
    run.player.y = guard.y;
    for (let i = 0; i < 12; i++) run = step(run, move(0, 0, { primary: true }), 0.05);
    expect(run.guardsStunned).toBeGreaterThan(0);
  });
});