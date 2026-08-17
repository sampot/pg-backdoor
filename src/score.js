export const SCORE = {
  BASE: 600,
  TIME_WEIGHT: 6,
  GHOST_BONUS: 250,
  ALARM_WEIGHT: 4,
  APPROACH_BONUS: 120,
};

export function scoreRun(state) {
  if (state.status !== "won") return 0;
  const par = state.level.parTime;
  const timeBonus = Math.max(0, Math.round((par - state.time) * SCORE.TIME_WEIGHT));
  const ghostBonus = state.detections === 0 && state.peakAlarm < 35 ? SCORE.GHOST_BONUS : 0;
  const alarmPenalty = Math.round(state.peakAlarm * SCORE.ALARM_WEIGHT);
  const approachBonus = SCORE.APPROACH_BONUS;
  return Math.max(0, SCORE.BASE + timeBonus + ghostBonus + approachBonus - alarmPenalty);
}

export function gradeFor(score) {
  if (score >= 1050) return "S";
  if (score >= 820) return "A";
  if (score >= 580) return "B";
  if (score >= 340) return "C";
  return "D";
}

export function mergeBest(current, incoming) {
  const a = Number(current) || 0;
  const b = Number(incoming) || 0;
  return b > a ? b : a;
}

export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function approachStats(state) {
  const a = state.approach;
  if (a === "sneak") return `暴露 ${Math.round(state.player.exposure * 100)}%`;
  if (a === "talk") return `偽裝 ${Math.round(state.disguise)}%`;
  if (a === "fight") return `生命 ${Math.round(state.hp)} · 暈眩 ${state.guardsStunned}`;
  if (a === "hack") return `痕跡 ${Math.round(state.trace)}% · 攝影機 ${state.hackedCameras}/${state.cameras.length}`;
  return "";
}
