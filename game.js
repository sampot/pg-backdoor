/** pg-backdoor — 後門任務 (Immersive sim) */

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function deep(o) { return JSON.parse(JSON.stringify(o)); }


export function createGame({ seed = 1 } = {}) {
  return { seed, turn: 0, score: 0, level: 1, meter: 0, resources: 10, flags: {}, log: ["後門任務：多解法"], outcome: "playing", msg: "後門任務：多解法" };
}
export function getLegalActions(s) {
  if (s.outcome !== "playing") return [];
  return ["sneak","talk","fight","hack"];
}
export function applyAction(state, action) {
  const s = deep(state);
  if (s.outcome !== "playing") return s;
  const rnd = mulberry32(s.seed + s.turn * 19);
  s.turn++;
  
  s.flags.path = s.flags.path ?? null;
  s.flags.progress = s.flags.progress ?? 0;
  if (!s.flags.path) { s.flags.path = action; s.msg = "選定路線："+action; }
  if (action !== s.flags.path) { s.msg = "本關專精 "+s.flags.path+"（可重開另選）"; }
  else {
    s.flags.progress += 25;
    s.meter = s.flags.progress;
    s.score += 25;
    s.msg = action + " 推進 "+s.flags.progress+"%";
  }
  if (s.flags.progress >= 100) { s.level = 5; s.meter = 100; s.msg = "任務完成（"+s.flags.path+"）"; }

  if (s.resources < 0) s.resources = 0;
  if (s.outcome === "playing" && s.level >= 5 && s.meter >= 100) {
    s.outcome = "won";
    s.msg = "目標達成！";
  }
  if (s.outcome === "playing" && (s.resources <= 0 && s.meter < 20 && s.turn > 8)) {
    s.outcome = "lost";
    s.msg = "資源崩盤";
  }
  return s;
}
export function summarize(s) {
  return { turn: s.turn, level: s.level, meter: s.meter, score: s.score, resources: s.resources, msg: s.msg, outcome: s.outcome, flags: s.flags };
}
export function getOutcome(s) { return s.outcome; }

