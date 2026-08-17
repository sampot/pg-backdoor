export const TAU = Math.PI * 2;

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n;
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function clampToUnit(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 1 || len === 0) return { x, y, len };
  return { x: x / len, y: y / len, len: 1 };
}

export function normalizeAngle(a) {
  let out = a % TAU;
  if (out <= -Math.PI) out += TAU;
  if (out > Math.PI) out -= TAU;
  return out;
}

export function angleDelta(a, b) {
  return Math.abs(normalizeAngle(a - b));
}

export function turnToward(from, to, maxStep) {
  const diff = normalizeAngle(to - from);
  if (Math.abs(diff) <= maxStep) return normalizeAngle(to);
  return normalizeAngle(from + Math.sign(diff) * maxStep);
}

export function inCone(viewer, target, opts) {
  const { range, halfAngle, nearRadius = 0 } = opts;
  const dx = target.x - viewer.x;
  const dy = target.y - viewer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist <= nearRadius) return true;
  if (dist === 0) return true;
  return angleDelta(Math.atan2(dy, dx), viewer.facing) <= halfAngle;
}

export function hasLineOfSight(isBlocked, ax, ay, bx, by) {
  let cx = Math.floor(ax);
  let cy = Math.floor(ay);
  const endX = Math.floor(bx);
  const endY = Math.floor(by);
  if (isBlocked(cx, cy) || isBlocked(endX, endY)) return false;

  const dx = bx - ax;
  const dy = by - ay;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const invX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const invY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let tMaxX = dx === 0 ? Infinity : (stepX > 0 ? cx + 1 - ax : ax - cx) * invX;
  let tMaxY = dy === 0 ? Infinity : (stepY > 0 ? cy + 1 - ay : ay - cy) * invY;

  let guard = 0;
  while ((cx !== endX || cy !== endY) && guard++ < 512) {
    if (tMaxX < tMaxY) {
      cx += stepX;
      tMaxX += invX;
    } else {
      cy += stepY;
      tMaxY += invY;
    }
    if (isBlocked(cx, cy)) return false;
  }
  return true;
}
