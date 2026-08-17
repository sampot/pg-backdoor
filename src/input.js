import { clampToUnit } from "./geometry.js";

const STICK_RADIUS = 54;
const DEAD_ZONE = 0.15;

const KEY_MAP = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export function createController() {
  const input = { moveX: 0, moveY: 0, crouch: false, primary: false };
  const held = new Set();
  const stick = { x: 0, y: 0 };
  const flags = { keyCrouch: false, padCrouch: false, keyPrimary: false, padPrimary: false };
  const listeners = [];

  function sync() {
    const kx = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0);
    const ky = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0);
    const merged = clampToUnit(kx + stick.x, ky + stick.y);
    input.moveX = merged.x;
    input.moveY = merged.y;
    input.crouch = flags.keyCrouch || flags.padCrouch;
    input.primary = flags.keyPrimary || flags.padPrimary;
  }

  function setStick(x, y) {
    stick.x = x;
    stick.y = y;
    sync();
  }

  function reset() {
    held.clear();
    stick.x = 0;
    stick.y = 0;
    flags.keyCrouch = false;
    flags.keyPrimary = false;
    flags.padPrimary = false;
    sync();
    for (const fn of listeners) fn();
  }

  function onReset(fn) {
    listeners.push(fn);
  }

  return {
    input,
    flags,
    sync,
    setStick,
    reset,
    onReset,
    setPadCrouch(value) {
      flags.padCrouch = Boolean(value);
      sync();
    },
    setPadPrimary(value) {
      flags.padPrimary = Boolean(value);
      sync();
    },
  };
}

export function attachKeyboard(controller, hooks = {}) {
  const { held, flags, sync } = controller;

  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      if (KEY_MAP[event.code] || event.code === "Space") event.preventDefault();
      return;
    }
    const dir = KEY_MAP[event.code];
    if (dir) {
      held.add(dir);
      sync();
      event.preventDefault();
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyC") {
      flags.keyCrouch = true;
      sync();
      return;
    }
    if (event.code === "KeyE" || event.code === "Space" || event.code === "Enter") {
      flags.keyPrimary = true;
      sync();
      if (event.code === "Space") event.preventDefault();
      return;
    }
    if (event.code === "Escape" || event.code === "KeyP") hooks.onPause?.();
    if (event.code === "KeyR") hooks.onRestart?.();
  });

  window.addEventListener("keyup", (event) => {
    const dir = KEY_MAP[event.code];
    if (dir) {
      held.delete(dir);
      sync();
      return;
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "KeyC") {
      flags.keyCrouch = false;
      sync();
    }
    if (event.code === "KeyE" || event.code === "Space" || event.code === "Enter") {
      flags.keyPrimary = false;
      sync();
    }
  });

  window.addEventListener("blur", () => controller.reset());
  return controller.input;
}

export function attachStick(controller, zone, visuals) {
  let pointerId = null;
  const { base, knob } = visuals;
  let originX = 0;
  let originY = 0;

  function show(x, y) {
    const rect = zone.getBoundingClientRect();
    base.hidden = false;
    base.style.left = `${x - rect.left}px`;
    base.style.top = `${y - rect.top}px`;
    knob.style.transform = "translate(0px, 0px)";
  }

  function hide() {
    base.hidden = true;
    controller.setStick(0, 0);
  }

  zone.addEventListener("pointerdown", (event) => {
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    zone.setPointerCapture(pointerId);
    show(originX, originY);
    event.preventDefault();
  });

  zone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = (event.clientX - originX) / STICK_RADIUS;
    const dy = (event.clientY - originY) / STICK_RADIUS;
    const v = clampToUnit(dx, dy);
    const len = Math.hypot(v.x, v.y);
    if (len < DEAD_ZONE) {
      controller.setStick(0, 0);
      knob.style.transform = "translate(0px, 0px)";
      return;
    }
    const scaled = (len - DEAD_ZONE) / (1 - DEAD_ZONE);
    const nx = (v.x / len) * scaled;
    const ny = (v.y / len) * scaled;
    controller.setStick(nx, ny);
    knob.style.transform = `translate(${nx * STICK_RADIUS * 0.7}px, ${ny * STICK_RADIUS * 0.7}px)`;
  });

  const release = (event) => {
    if (event && event.pointerId !== pointerId) return;
    pointerId = null;
    hide();
  };

  zone.addEventListener("pointerup", release);
  zone.addEventListener("pointercancel", release);
  zone.addEventListener("lostpointercapture", release);
  controller.onReset(() => {
    pointerId = null;
    hide();
  });
}

export function attachNipple(controller, nipplejs, zone) {
  const manager = nipplejs.create({
    zone,
    mode: "dynamic",
    size: 108,
    restOpacity: 0.4,
    color: "#ff6b5f",
    threshold: 0.14,
  });
  manager.on("move", (_event, data) => {
    const force = Math.min(1, data.force || 0);
    const rad = data.angle ? data.angle.radian : 0;
    controller.setStick(Math.cos(rad) * force, -Math.sin(rad) * force);
  });
  manager.on("end", () => controller.setStick(0, 0));
  controller.onReset(() => controller.setStick(0, 0));
  return manager;
}

export function attachHoldButton(controller, button, setter) {
  const press = (event) => {
    setter(true);
    button.classList.add("holding");
    if (event.pointerId !== undefined && button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        /* optional */
      }
    }
    event.preventDefault();
  };
  const release = () => {
    setter(false);
    button.classList.remove("holding");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("lostpointercapture", release);
  controller.onReset(release);
}
