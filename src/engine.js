import { clamp, distance, hasLineOfSight, inCone, turnToward } from "./geometry.js";
import {
  createMap,
  isCheckpointAt,
  isExitAt,
  isGravelAt,
  isShadowAt,
  isTerminalAt,
  isVaultAt,
  isVentAt,
  moveBody,
  tileAtPoint,
} from "./map.js";
import { getFortress, spawnFor } from "./level.js";

export const RULES = {
  PLAYER_SPEED: 2.85,
  CROUCH_SPEED: 0.55,
  PLAYER_RADIUS: 0.28,
  GUARD_RADIUS: 0.3,
  SHADOW_CONCEAL: 0.35,
  VENT_CONCEAL: 0.15,
  CROUCH_CONCEAL: 0.45,
  GRAVEL_NOISE: 1.8,
  MOVE_NOISE: 0.55,
  CROUCH_NOISE: 0.12,
  ALARM_MAX: 100,
  ALARM_ON_SPOT: 14,
  ALARM_DECAY: 1.8,
  ALARM_CAMERA: 9,
  ALARM_HACK: 0.35,
  CAPTURE_RADIUS: 0.75,
  CAPTURE_TIME: 0.55,
  CHASE_SPEED: 1.35,
  INTERACT_RADIUS: 0.9,
  EXTRACT_TIME: 1.4,
  HACK_TIME: 1.6,
  CONVINCE_TIME: 1.2,
  PUNCH_RANGE: 0.85,
  PUNCH_STUN: 2.4,
  PUNCH_DAMAGE: 28,
  GUARD_PUNCH: 12,
  FIGHT_HP: 100,
  DISGUISE_MAX: 100,
  DISGUISE_RUN: 18,
  DISGUISE_NEAR: 8,
  TRACE_MAX: 100,
  TRACE_HACK: 12,
  TRACE_DECAY: 4,
};

export const EMPTY_INPUT = { moveX: 0, moveY: 0, crouch: false, primary: false };

export function createRun(approach = "sneak") {
  const level = getFortress();
  const map = createMap(level.rows);
  const spawn = spawnFor(approach);

  return {
    approach,
    level,
    map,
    time: 0,
    status: "playing",
    lostReason: null,
    alarm: 0,
    peakAlarm: 0,
    detections: 0,
    dataTaken: false,
    hackedCameras: 0,
    clearedCheckpoints: new Set(),
    guardsStunned: 0,
    trace: 0,
    disguise: approach === "talk" ? RULES.DISGUISE_MAX : 0,
    hp: approach === "fight" ? RULES.FIGHT_HP : 0,
    player: {
      x: spawn.x,
      y: spawn.y,
      facing: -Math.PI / 2,
      crouch: false,
      speed: 0,
      noise: 0,
      exposure: 0,
      inShadow: isShadowAt(map, spawn.x, spawn.y),
    },
    guards: level.guards.map((def) => ({
      id: def.id,
      def,
      x: def.route[0][0],
      y: def.route[0][1],
      facing: 0,
      mode: "patrol",
      routeIndex: 1 % def.route.length,
      waitTimer: 0,
      stunTimer: 0,
      captureTimer: 0,
      memory: 0,
    })),
    cameras: level.cameras.map((def) => ({
      id: def.id,
      def,
      x: def.x,
      y: def.y,
      facing: def.baseAngle,
      phase: 0,
      disabled: false,
    })),
    interactId: null,
    interactProgress: 0,
    events: [],
  };
}

export function pushEvent(state, type, payload = {}) {
  state.events.push({ type, ...payload });
}

export function drainEvents(state) {
  const out = state.events.slice();
  state.events.length = 0;
  return out;
}

export function playerExposure(state) {
  const { player, map, approach } = state;
  let exposure = 1;
  if (isShadowAt(map, player.x, player.y)) exposure *= RULES.SHADOW_CONCEAL;
  if (isVentAt(map, player.x, player.y) && approach === "sneak") exposure *= RULES.VENT_CONCEAL;
  if (player.crouch) {
    if (approach === "sneak") exposure *= RULES.CROUCH_CONCEAL;
    if (approach === "talk") exposure *= 0.5;
    if (approach === "hack") exposure *= 0.65;
  }
  if (approach === "talk" && state.disguise <= 0) exposure = 1.4;
  return clamp(exposure, 0.08, 1.5);
}

export function nearestInteractable(state) {
  const { player, map, approach } = state;
  const px = player.x;
  const py = player.y;
  let best = null;
  let bestDist = RULES.INTERACT_RADIUS;

  if (!state.dataTaken && distance(px, py, state.level.vault.x, state.level.vault.y) <= bestDist) {
    return { kind: "vault", label: "提取資料", x: state.level.vault.x, y: state.level.vault.y };
  }

  if (state.dataTaken && distance(px, py, state.level.exit.x, state.level.exit.y) <= bestDist) {
    return { kind: "exit", label: "撤離出口", x: state.level.exit.x, y: state.level.exit.y };
  }

  if (approach === "hack") {
    for (const cam of state.cameras) {
      if (cam.disabled) continue;
      const d = distance(px, py, cam.x, cam.y);
      if (d <= bestDist) {
        best = { kind: "camera", id: cam.id, label: "入侵攝影機", x: cam.x, y: cam.y };
        bestDist = d;
      }
    }
    for (let cy = 0; cy < map.height; cy++) {
      for (let cx = 0; cx < map.width; cx++) {
        if (!isTerminalAt(map, cx + 0.5, cy + 0.5)) continue;
        const tx = cx + 0.5;
        const ty = cy + 0.5;
        const d = distance(px, py, tx, ty);
        if (d <= bestDist) {
          best = { kind: "terminal", label: "駭入終端", x: tx, y: ty };
          bestDist = d;
        }
      }
    }
  }

  if (approach === "talk") {
    for (let cy = 0; cy < map.height; cy++) {
      for (let cx = 0; cx < map.width; cx++) {
        if (!isCheckpointAt(map, cx + 0.5, cy + 0.5)) continue;
        const tx = cx + 0.5;
        const ty = cy + 0.5;
        const key = `${cx},${cy}`;
        if (state.clearedCheckpoints.has(key)) continue;
        const d = distance(px, py, tx, ty);
        if (d <= bestDist) {
          best = { kind: "checkpoint", key, label: "說服警衛", x: tx, y: ty };
          bestDist = d;
        }
      }
    }
  }

  if (approach === "fight") {
    for (const guard of state.guards) {
      if (guard.stunTimer > 0) continue;
      const d = distance(px, py, guard.x, guard.y);
      if (d <= RULES.PUNCH_RANGE && d < bestDist) {
        best = { kind: "punch", id: guard.id, label: "出拳", x: guard.x, y: guard.y };
        bestDist = d;
      }
    }
  }

  return best;
}

function isBlocked(map, cx, cy) {
  const t = tileAtPoint(map, cx + 0.5, cy + 0.5);
  return t === "#" || t === "x";
}

function updateGuards(state, dt) {
  const { map } = state;
  const exposure = playerExposure(state);

  for (const guard of state.guards) {
    if (guard.stunTimer > 0) {
      guard.stunTimer -= dt;
      continue;
    }

    const viewer = { x: guard.x, y: guard.y, facing: guard.facing };
    const target = { x: state.player.x, y: state.player.y };
    const canSee =
      inCone(viewer, target, {
        range: guard.def.range,
        halfAngle: guard.def.halfAngle,
        nearRadius: 0.7,
      }) &&
      hasLineOfSight(
        (cx, cy) => isBlocked(map, cx, cy),
        guard.x,
        guard.y,
        state.player.x,
        state.player.y,
      );

    if (canSee && exposure > 0.55) {
      guard.mode = "chase";
      guard.memory = 2.5;
      const ang = Math.atan2(target.y - guard.y, target.x - guard.x);
      guard.facing = turnToward(guard.facing, ang, RULES.CHASE_SPEED * dt * 3);
      const spd = RULES.CHASE_SPEED * dt;
      const dx = Math.cos(ang) * spd;
      const dy = Math.sin(ang) * spd;
      const moved = moveBody(map, guard, dx, dy, RULES.GUARD_RADIUS);
      guard.x = moved.x;
      guard.y = moved.y;

      if (distance(guard.x, guard.y, state.player.x, state.player.y) <= RULES.CAPTURE_RADIUS) {
        guard.captureTimer += dt;
        if (guard.captureTimer >= RULES.CAPTURE_TIME) {
          if (state.approach === "fight") {
            state.hp -= RULES.GUARD_PUNCH * dt * 3;
          } else {
            state.alarm = RULES.ALARM_MAX;
            state.lostReason = "captured";
            state.status = "lost";
            pushEvent(state, "captured");
          }
        }
      } else {
        guard.captureTimer = Math.max(0, guard.captureTimer - dt);
      }

      if (canSee && exposure > 0.75) {
        state.alarm = clamp(state.alarm + RULES.ALARM_ON_SPOT * dt, 0, RULES.ALARM_MAX);
        state.detections += dt > 0 ? 0 : 0;
      }
    } else {
      guard.captureTimer = Math.max(0, guard.captureTimer - dt * 2);
      guard.memory = Math.max(0, guard.memory - dt);
      if (guard.memory <= 0) guard.mode = "patrol";

      if (guard.mode === "patrol") {
        const waypoint = guard.def.route[guard.routeIndex];
        const wx = waypoint[0];
        const wy = waypoint[1];
        const ang = Math.atan2(wy - guard.y, wx - guard.x);
        guard.facing = turnToward(guard.facing, ang, guard.def.speed * dt * 2.5);
        const dist = distance(guard.x, guard.y, wx, wy);
        if (dist < 0.12) {
          guard.waitTimer += dt;
          if (guard.waitTimer >= guard.def.wait) {
            guard.waitTimer = 0;
            guard.routeIndex = (guard.routeIndex + 1) % guard.def.route.length;
          }
        } else {
          const spd = guard.def.speed * dt;
          const moved = moveBody(map, guard, Math.cos(ang) * spd, Math.sin(ang) * spd, RULES.GUARD_RADIUS);
          guard.x = moved.x;
          guard.y = moved.y;
        }
      }
    }
  }
}

function updateCameras(state, dt) {
  const exposure = playerExposure(state);
  for (const cam of state.cameras) {
    if (cam.disabled) continue;
    cam.phase += dt * cam.def.speed;
    cam.facing = cam.def.baseAngle + Math.sin(cam.phase) * cam.def.sweep;
    const viewer = { x: cam.x, y: cam.y, facing: cam.facing };
    const target = { x: state.player.x, y: state.player.y };
    const spotted =
      inCone(viewer, target, { range: 7.5, halfAngle: 0.35, nearRadius: 0 }) &&
      exposure > (state.approach === "hack" ? 0.85 : 0.65);
    if (spotted) {
      state.alarm = clamp(state.alarm + RULES.ALARM_CAMERA * dt, 0, RULES.ALARM_MAX);
      pushEvent(state, "cameraSpot");
    }
  }
}

function updateDisguise(state, dt, input) {
  if (state.approach !== "talk") return;
  const moving = Math.hypot(input.moveX, input.moveY) > 0.12;
  if (moving && !input.crouch) state.disguise -= RULES.DISGUISE_RUN * dt;
  for (const guard of state.guards) {
    if (guard.stunTimer > 0) continue;
    const d = distance(state.player.x, state.player.y, guard.x, guard.y);
    if (d < 2.2 && moving && !input.crouch) state.disguise -= RULES.DISGUISE_NEAR * dt;
  }
  state.disguise = clamp(state.disguise, 0, RULES.DISGUISE_MAX);
  if (state.disguise <= 0 && state.alarm < RULES.ALARM_MAX) {
    state.alarm = clamp(state.alarm + 6 * dt, 0, RULES.ALARM_MAX);
  }
}

function updateTrace(state, dt, interacting) {
  if (state.approach !== "hack") return;
  if (interacting) {
    state.trace = clamp(state.trace + RULES.TRACE_HACK * dt, 0, RULES.TRACE_MAX);
    state.alarm = clamp(state.alarm + RULES.ALARM_HACK * dt, 0, RULES.ALARM_MAX);
  } else {
    state.trace = clamp(state.trace - RULES.TRACE_DECAY * dt, 0, RULES.TRACE_MAX);
  }
}

function handleInteract(state, dt, input) {
  const target = nearestInteractable(state);
  state.interactId = target ? target.kind : null;

  if (!input.primary || !target) {
    state.interactProgress = Math.max(0, state.interactProgress - dt * 2);
    return false;
  }

  let duration = RULES.EXTRACT_TIME;
  if (target.kind === "vault" || target.kind === "exit") duration = RULES.EXTRACT_TIME;
  else if (target.kind === "terminal" || target.kind === "camera") duration = RULES.HACK_TIME;
  else if (target.kind === "checkpoint") duration = RULES.CONVINCE_TIME;
  else if (target.kind === "punch") duration = 0.35;

  state.interactProgress += dt;

  if (target.kind === "punch" && state.interactProgress >= duration) {
    const guard = state.guards.find((g) => g.id === target.id);
    if (guard) {
      guard.stunTimer = RULES.PUNCH_STUN;
      state.guardsStunned += 1;
      pushEvent(state, "punch");
    }
    state.interactProgress = 0;
    return true;
  }

  if (state.interactProgress >= duration) {
    if (target.kind === "vault") {
      state.dataTaken = true;
      pushEvent(state, "extract");
    } else if (target.kind === "exit" && state.dataTaken) {
      state.status = "won";
      pushEvent(state, "win");
    } else if (target.kind === "camera") {
      const cam = state.cameras.find((c) => c.id === target.id);
      if (cam) {
        cam.disabled = true;
        state.hackedCameras += 1;
        pushEvent(state, "hack");
      }
    } else if (target.kind === "terminal") {
      for (const cam of state.cameras) cam.disabled = true;
      state.hackedCameras = state.cameras.length;
      pushEvent(state, "hack");
    } else if (target.kind === "checkpoint") {
      state.clearedCheckpoints.add(target.key);
      pushEvent(state, "convince");
    }
    state.interactProgress = 0;
    return true;
  }
  return false;
}

export function step(state, input, dt) {
  if (state.status !== "playing") return state;
  const s = state;
  s.time += dt;

  const moveLen = Math.hypot(input.moveX, input.moveY);
  const crouching = Boolean(input.crouch);
  s.player.crouch = crouching;

  let speed = RULES.PLAYER_SPEED;
  if (crouching) speed = RULES.CROUCH_SPEED;
  if (s.approach === "talk" && crouching) speed = RULES.CROUCH_SPEED * 1.1;
  if (s.approach === "fight" && crouching) speed = RULES.CROUCH_SPEED * 1.3;

  const dx = input.moveX * speed * dt;
  const dy = input.moveY * speed * dt;
  if (moveLen > 0.08) {
    s.player.facing = Math.atan2(input.moveY, input.moveX);
  }
  const moved = moveBody(s.map, s.player, dx, dy, RULES.PLAYER_RADIUS);
  s.player.x = moved.x;
  s.player.y = moved.y;
  s.player.speed = moveLen * speed;
  s.player.inShadow = isShadowAt(s.map, s.player.x, s.player.y);
  s.player.exposure = playerExposure(s);
  s.player.noise =
    moveLen > 0.08
      ? (crouching ? RULES.CROUCH_NOISE : RULES.MOVE_NOISE) * (isGravelAt(s.map, s.player.x, s.player.y) ? RULES.GRAVEL_NOISE : 1)
      : 0;

  if (moveLen > 0.08) pushEvent(s, "step");

  updateDisguise(s, dt, input);
  updateGuards(s, dt);
  updateCameras(s, dt);

  const interacting = handleInteract(s, dt, input);
  updateTrace(s, dt, interacting && input.primary);

  if (s.alarm < RULES.ALARM_MAX * 0.4 && !interacting) {
    s.alarm = clamp(s.alarm - RULES.ALARM_DECAY * dt, 0, RULES.ALARM_MAX);
  }
  s.peakAlarm = Math.max(s.peakAlarm, s.alarm);

  if (s.alarm >= RULES.ALARM_MAX && s.status === "playing") {
    s.status = "lost";
    s.lostReason = "alarm";
    pushEvent(s, "alarm");
  }
  if (s.approach === "fight" && s.hp <= 0 && s.status === "playing") {
    s.status = "lost";
    s.lostReason = "hp";
    pushEvent(s, "down");
  }
  if (s.approach === "hack" && s.trace >= RULES.TRACE_MAX && s.status === "playing") {
    s.alarm = RULES.ALARM_MAX;
    s.lostReason = "trace";
    s.status = "lost";
    pushEvent(s, "trace");
  }

  if (s.dataTaken && isExitAt(s.map, s.player.x, s.player.y) && s.status === "playing") {
    s.status = "won";
    pushEvent(s, "win");
  }

  return s;
}

export function hudHint(state, interactable) {
  if (state.status !== "playing") return "";
  const a = state.approach;
  if (!state.dataTaken) {
    if (interactable?.kind === "vault") return "按住「互動」提取核心資料。";
    if (a === "sneak") return "蹲伏走陰影／通風管，避開巡邏視線。";
    if (a === "talk") return "慢走維持偽裝，在哨站說服警衛。";
    if (a === "fight") return "靠近保全出拳，衝向核心機房。";
    if (a === "hack") return "駭入終端或攝影機，降低暴露後取資料。";
  }
  if (state.dataTaken) return "資料已到手——撤至下方出口。";
  return "";
}

export function approachMeter(state) {
  const a = state.approach;
  if (a === "talk") return { label: "偽裝", value: state.disguise, max: RULES.DISGUISE_MAX };
  if (a === "fight") return { label: "生命", value: state.hp, max: RULES.FIGHT_HP };
  if (a === "hack") return { label: "數位痕跡", value: state.trace, max: RULES.TRACE_MAX };
  return { label: "暴露", value: Math.round(state.player.exposure * 100), max: 100 };
}
