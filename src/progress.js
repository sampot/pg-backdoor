import { APPROACHES } from "./level.js";
import { mergeBest } from "./score.js";

export const PROGRESS_KEY = "backdoor:progress";

export function emptyProgress() {
  return { best: {}, clearedApproaches: [], sound: true };
}

export function decodeProgress(raw) {
  if (!raw) return emptyProgress();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!parsed || typeof parsed !== "object") return emptyProgress();
  const best = {};
  if (parsed.best && typeof parsed.best === "object") {
    for (const [key, value] of Object.entries(parsed.best)) {
      if (APPROACHES.includes(key)) {
        const score = Number(value);
        if (score > 0) best[key] = Math.floor(score);
      }
    }
  }
  const clearedApproaches = Array.isArray(parsed.clearedApproaches)
    ? parsed.clearedApproaches.filter((a) => APPROACHES.includes(a))
    : [];
  return { best, clearedApproaches, sound: parsed.sound !== false };
}

export function encodeProgress(progress) {
  return JSON.stringify({
    best: progress.best,
    clearedApproaches: progress.clearedApproaches,
    sound: progress.sound !== false,
  });
}

export function recordClear(progress, approach, score) {
  const cleared = new Set(progress.clearedApproaches);
  cleared.add(approach);
  return {
    best: { ...progress.best, [approach]: mergeBest(progress.best[approach], score) },
    clearedApproaches: [...cleared],
    sound: progress.sound !== false,
  };
}

export function totalScore(progress) {
  return Object.values(progress.best).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export async function loadProgress(pg) {
  try {
    const raw = await pg.kv.get(PROGRESS_KEY);
    return { progress: decodeProgress(raw), error: null };
  } catch (err) {
    return { progress: emptyProgress(), error: describeKvError(err) };
  }
}

export async function saveProgress(pg, progress) {
  try {
    await pg.kv.put(PROGRESS_KEY, encodeProgress(progress));
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: describeKvError(err) };
  }
}

export function describeKvError(err) {
  const code = err && err.code;
  if (code === "functions_no_leader" || code === "functions_unavailable") {
    return "存檔服務還沒就緒，本次成績只留在畫面上。";
  }
  if (code === "kv_key_too_large") return "存檔鍵值過大，進度未寫入。";
  return "存檔失敗，本次成績只留在畫面上。";
}
