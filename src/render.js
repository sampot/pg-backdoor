import { RULES } from "./engine.js";
import { TILE, blocksSight, tileAt } from "./map.js";
import { APPROACH_LABELS } from "./level.js";

const ART = {
  player: "./assets/art/player.png",
  guard: "./assets/art/guard.png",
  floor: "./assets/art/floor.png",
  wall: "./assets/art/wall.png",
  crate: "./assets/art/crate.png",
  terminal: "./assets/art/terminal.png",
  vault: "./assets/art/vault.png",
  exit: "./assets/art/exit.png",
};

function loadArt() {
  const images = {};
  for (const [key, src] of Object.entries(ART)) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    images[key] = img;
  }
  return images;
}

function ready(img) {
  return img && img.complete && img.naturalWidth > 0;
}

function hash(cx, cy) {
  const n = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const art = loadArt();
  const view = { tile: 32, camX: 0, camY: 0, w: 0, h: 0, dpr: 1 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    view.w = cssW;
    view.h = cssH;
    view.dpr = dpr;
    view.tile = Math.min(Math.max(cssW / 11, 26), 46, Math.max(cssH / 9, 26));
  }

  function focus(state) {
    const map = state.map;
    const tilesX = view.w / view.tile;
    const tilesY = view.h / view.tile;
    const cx = state.player.x - tilesX / 2;
    const cy = state.player.y - tilesY / 2;
    view.camX = map.width <= tilesX ? (map.width - tilesX) / 2 : Math.min(Math.max(cx, 0), map.width - tilesX);
    view.camY = map.height <= tilesY ? (map.height - tilesY) / 2 : Math.min(Math.max(cy, 0), map.height - tilesY);
  }

  const sx = (wx) => (wx - view.camX) * view.tile;
  const sy = (wy) => (wy - view.camY) * view.tile;

  function drawFloor(state) {
    const t = view.tile;
    const map = state.map;
    const x0 = Math.max(0, Math.floor(view.camX) - 1);
    const y0 = Math.max(0, Math.floor(view.camY) - 1);
    const x1 = Math.min(map.width - 1, Math.ceil(view.camX + view.w / t) + 1);
    const y1 = Math.min(map.height - 1, Math.ceil(view.camY + view.h / t) + 1);

    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const tile = tileAt(map, cx, cy);
        const px = sx(cx);
        const py = sy(cy);
        const size = t + 1;

        if (tile === TILE.WALL) {
          if (ready(art.wall)) ctx.drawImage(art.wall, px, py, size, size);
          else {
            ctx.fillStyle = "#1a2230";
            ctx.fillRect(px, py, size, size);
          }
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(px, py, size, size);
          continue;
        }

        if (ready(art.floor)) ctx.drawImage(art.floor, px, py, size, size);
        else {
          ctx.fillStyle = "#1e2836";
          ctx.fillRect(px, py, size, size);
        }
        ctx.fillStyle = `rgba(8,12,18,${0.28 + hash(cx, cy) * 0.1})`;
        ctx.fillRect(px, py, size, size);

        if (tile === TILE.SHADOW || tile === TILE.VENT) {
          ctx.fillStyle = tile === TILE.VENT ? "rgba(20,40,60,0.55)" : "rgba(4,8,14,0.58)";
          ctx.fillRect(px, py, size, size);
        } else if (tile === TILE.GRAVEL) {
          ctx.fillStyle = "rgba(90,70,40,0.25)";
          ctx.fillRect(px, py, size, size);
        } else if (tile === TILE.CRATE) {
          if (ready(art.crate)) ctx.drawImage(art.crate, px, py, size, size);
          else ctx.fillStyle = "#4a3828";
          ctx.fillRect(px, py, size, size);
        } else if (tile === TILE.TERMINAL) {
          if (ready(art.terminal)) ctx.drawImage(art.terminal, px + 4, py + 4, t - 8, t - 8);
          ctx.fillStyle = "rgba(80,200,255,0.25)";
          ctx.fillRect(px + 4, py + 4, t - 8, t - 8);
        } else if (tile === TILE.CHECKPOINT) {
          ctx.fillStyle = "rgba(255,180,80,0.22)";
          ctx.fillRect(px + 2, py + 2, t - 4, t - 4);
          ctx.strokeStyle = "rgba(255,180,80,0.5)";
          ctx.strokeRect(px + 4, py + 4, t - 8, t - 8);
        } else if (tile === TILE.VAULT) {
          if (ready(art.vault)) ctx.drawImage(art.vault, px + 6, py + 6, t - 12, t - 12);
          ctx.fillStyle = state.dataTaken ? "rgba(80,255,160,0.2)" : "rgba(255,107,95,0.35)";
          ctx.beginPath();
          ctx.arc(px + t / 2, py + t / 2, t * 0.28, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TILE.EXIT) {
          if (ready(art.exit)) ctx.drawImage(art.exit, px + 4, py + 4, t - 8, t - 8);
          ctx.fillStyle = state.dataTaken ? "rgba(126,226,176,0.35)" : "rgba(60,80,90,0.25)";
          ctx.fillRect(px + 2, py + 2, t - 4, t - 4);
        }
      }
    }
  }

  function drawCone(x, y, facing, range, halfAngle, color) {
    const px = sx(x);
    const py = sy(y);
    const r = range * view.tile;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px + view.tile / 2, py + view.tile / 2);
    ctx.arc(px + view.tile / 2, py + view.tile / 2, r, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    ctx.fill();
  }

  function drawEntities(state) {
    const t = view.tile;
    for (const cam of state.cameras) {
      if (cam.disabled) continue;
      drawCone(cam.x, cam.y, cam.facing, 7.5, 0.35, "rgba(255,90,70,0.12)");
      const px = sx(cam.x) + t / 2;
      const py = sy(cam.y) + t / 2;
      ctx.fillStyle = "#ff6b5f";
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const guard of state.guards) {
      drawCone(guard.x, guard.y, guard.facing, guard.def.range, guard.def.halfAngle, "rgba(255,200,80,0.1)");
      const px = sx(guard.x);
      const py = sy(guard.y);
      const alpha = guard.stunTimer > 0 ? 0.45 : 1;
      ctx.globalAlpha = alpha;
      if (ready(art.guard)) ctx.drawImage(art.guard, px, py, t, t);
      else {
        ctx.fillStyle = "#c44";
        ctx.fillRect(px + 4, py + 4, t - 8, t - 8);
      }
      ctx.globalAlpha = 1;
    }

    const px = sx(state.player.x);
    const py = sy(state.player.y);
    ctx.save();
    ctx.translate(px + t / 2, py + t / 2);
    ctx.rotate(state.player.facing + Math.PI / 2);
    if (ready(art.player)) ctx.drawImage(art.player, -t / 2, -t / 2, t, t);
    else {
      ctx.fillStyle = "#7ee2b0";
      ctx.fillRect(-t / 3, -t / 3, (t * 2) / 3, (t * 2) / 3);
    }
    ctx.restore();

    if (state.interactProgress > 0) {
      const barW = t * 0.9;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(px + (t - barW) / 2, py - 8, barW, 5);
      ctx.fillStyle = "#ff6b5f";
      ctx.fillRect(px + (t - barW) / 2, py - 8, barW * Math.min(1, state.interactProgress / RULES.EXTRACT_TIME), 5);
    }
  }

  function drawOverlay(state) {
    const t = view.tile;
    ctx.fillStyle = "rgba(4,8,12,0.42)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e8f0f8";
    ctx.font = `600 ${Math.round(14 * view.dpr)}px "Noto Sans TC", system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(APPROACH_LABELS[state.approach] || "後門任務", 12 * view.dpr, 22 * view.dpr);

    ctx.textAlign = "right";
    ctx.fillStyle = "#90a5b0";
    ctx.font = `${Math.round(11 * view.dpr)}px system-ui, sans-serif`;
    ctx.fillText(state.dataTaken ? "撤離中" : "目標：核心資料", canvas.width - 12 * view.dpr, 22 * view.dpr);
  }

  function render(state) {
    resize();
    focus(state);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, view.w, view.h);
    drawFloor(state);
    drawEntities(state);
    drawOverlay(state);
  }

  /** Fixed 640×480 snapshot for thumbnail generation. */
  function renderSnapshot(state, width = 640, height = 480) {
    const prev = { ...view, w: view.w, h: view.h, dpr: view.dpr, tile: view.tile };
    view.w = width;
    view.h = height;
    view.dpr = 1;
    view.tile = 28;
    canvas.width = width;
    canvas.height = height;
    focus(state);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, width, height);
    drawFloor(state);
    drawEntities(state);
    drawOverlay(state);
    view.w = prev.w;
    view.h = prev.h;
    view.dpr = prev.dpr;
    view.tile = prev.tile;
  }

  return { render, renderSnapshot, resize };
}

export function exportCanvasPng(canvas) {
  return canvas.toDataURL("image/png");
}
