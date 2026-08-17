export const TILE = {
  WALL: "#",
  FLOOR: ".",
  SHADOW: ",",
  CRATE: "x",
  GRAVEL: "g",
  VENT: "v",
  TERMINAL: "T",
  CHECKPOINT: "C",
  VAULT: "V",
  EXIT: "E",
};

const SOLID = new Set([TILE.WALL, TILE.CRATE]);

export function createMap(rows) {
  return { rows: rows.slice(), width: rows[0].length, height: rows.length };
}

export function tileAt(map, cx, cy) {
  if (cx < 0 || cy < 0 || cy >= map.height || cx >= map.width) return TILE.WALL;
  return map.rows[cy][cx];
}

export function blocksMove(map, cx, cy) {
  return SOLID.has(tileAt(map, cx, cy));
}

export function blocksSight(map, cx, cy) {
  return blocksMove(map, cx, cy);
}

export function tileAtPoint(map, x, y) {
  return tileAt(map, Math.floor(x), Math.floor(y));
}

export function isShadowAt(map, x, y) {
  const t = tileAtPoint(map, x, y);
  return t === TILE.SHADOW || t === TILE.VENT;
}

export function isGravelAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.GRAVEL;
}

export function isVentAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.VENT;
}

export function isTerminalAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.TERMINAL;
}

export function isCheckpointAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.CHECKPOINT;
}

export function isVaultAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.VAULT;
}

export function isExitAt(map, x, y) {
  return tileAtPoint(map, x, y) === TILE.EXIT;
}

export function canStand(map, x, y, radius) {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius);
  const maxY = Math.floor(y + radius);
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      if (blocksMove(map, cx, cy)) return false;
    }
  }
  return true;
}

export function moveBody(map, body, dx, dy, radius) {
  let x = body.x;
  let y = body.y;
  if (dx !== 0 && canStand(map, x + dx, y, radius)) x += dx;
  if (dy !== 0 && canStand(map, x, y + dy, radius)) y += dy;
  return { x, y, blocked: x === body.x && y === body.y && (dx !== 0 || dy !== 0) };
}

export function findTiles(map, char) {
  const out = [];
  for (let cy = 0; cy < map.height; cy++) {
    for (let cx = 0; cx < map.width; cx++) {
      if (map.rows[cy][cx] === char) out.push({ x: cx + 0.5, y: cy + 0.5 });
    }
  }
  return out;
}
