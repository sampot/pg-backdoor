/**
 * 資料堡壘 — 同一關、四條路線（偷／騙／打／駭）。
 *
 * # wall   . floor   , shadow   x crate   g gravel
 * v vent (潛行)   T terminal (駭)   C checkpoint (騙)   V vault   E exit
 */

export const APPROACHES = ["sneak", "talk", "fight", "hack"];

export const APPROACH_LABELS = {
  sneak: "通風管潛入",
  talk: "偽造訪客證",
  fight: "突破保全",
  hack: "入侵門禁",
};

export const APPROACH_HINTS = {
  sneak: "蹲伏走陰影與通風管，避開視線錐。到核心機房取資料。",
  talk: "慢走維持偽裝，在哨站說服警衛。別在警衛旁奔跑。",
  fight: "硬闖走廊，出拳暈眩保全。注意血量與警報。",
  hack: "入侵終端機關閉攝影機，數位痕跡過高會觸發警報。",
};

export const FORTRESS = {
  id: "fortress",
  name: "資料堡壘",
  brief: "同一座核心機房，四條完整路線。取回資料後撤至出口。",
  rows: [
    "############################",
    "#,,v.......####.......T,,,,#",
    "#..####....#  #....####....#",
    "#..#  #....#  #....#  #....#",
    "#..####....####....####....#",
    "#..........................#",
    "#..,,,,......VV......,,,,..#",
    "#..,,,,................,,,,#",
    "#....####....####....####..#",
    "#....#  #....#  #....#  #..#",
    "#....####....####....####..#",
    "#..........................#",
    "#..C....................C..#",
    "#.####.####.####.####.####.#",
    "#.#  #.#  #.#  #.#  #.#  #.#",
    "#.#  #.#  #.#  #.#  #.#  #.#",
    "#.####.####.####.####.####.#",
    "#...........E..............#",
    "############################",
  ],
  spawns: {
    sneak: { x: 2.5, y: 1.5 },
    talk: { x: 14.5, y: 12.5 },
    fight: { x: 2.5, y: 14.5 },
    hack: { x: 25.5, y: 1.5 },
  },
  vault: { x: 14.5, y: 6.5 },
  exit: { x: 12.5, y: 17.5 },
  parTime: 90,
  guards: [
    {
      id: "g1",
      route: [
        [8.5, 5.5],
        [20.5, 5.5],
        [20.5, 10.5],
        [8.5, 10.5],
      ],
      speed: 1.45,
      range: 5.8,
      halfAngle: 0.48,
      wait: 0.9,
    },
    {
      id: "g2",
      route: [
        [6.5, 14.5],
        [21.5, 14.5],
        [21.5, 16.5],
        [6.5, 16.5],
      ],
      speed: 1.2,
      range: 5.2,
      halfAngle: 0.45,
      wait: 1.1,
    },
  ],
  cameras: [
    { id: "c1", x: 14.5, y: 5.5, baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.9 },
    { id: "c2", x: 7.5, y: 11.5, baseAngle: 0, sweep: 0.4, speed: 1.1 },
    { id: "c3", x: 21.5, y: 11.5, baseAngle: Math.PI, sweep: 0.4, speed: 1.1 },
  ],
};

export function getFortress() {
  return FORTRESS;
}

export function isValidApproach(value) {
  return APPROACHES.includes(value);
}

export function spawnFor(approach) {
  return FORTRESS.spawns[approach] || FORTRESS.spawns.sneak;
}
