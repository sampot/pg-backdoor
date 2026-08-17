import {
  approachMeter,
  createRun,
  drainEvents,
  hudHint,
  nearestInteractable,
  step,
} from "./src/engine.js";
import { APPROACHES, APPROACH_HINTS, APPROACH_LABELS } from "./src/level.js";
import { createRenderer } from "./src/render.js";
import { createAudio } from "./src/audio.js";
import {
  attachHoldButton,
  attachKeyboard,
  attachNipple,
  attachStick,
  createController,
} from "./src/input.js";
import {
  describeKvError,
  emptyProgress,
  loadProgress,
  recordClear,
  saveProgress,
  totalScore,
} from "./src/progress.js";
import { approachStats, formatClock, gradeFor, scoreRun } from "./src/score.js";

function standalonePg() {
  const memory = new Map();
  return {
    ready: Promise.resolve(),
    kv: {
      async get(key) {
        return memory.has(key) ? memory.get(key) : null;
      },
      async put(key, value) {
        memory.set(key, String(value));
      },
      async delete(key) {
        memory.delete(key);
      },
    },
  };
}

const PG = window.PG || standalonePg();

const el = {
  stage: document.getElementById("stage"),
  hud: document.getElementById("hud"),
  approach: document.getElementById("hud-approach"),
  alarmFill: document.getElementById("alarm-fill"),
  alarmValue: document.getElementById("alarm-value"),
  meterFill: document.getElementById("meter-fill"),
  meterLabel: document.getElementById("meter-label"),
  meterValue: document.getElementById("meter-value"),
  time: document.getElementById("hud-time"),
  hint: document.getElementById("hud-hint"),
  pause: document.getElementById("pause-btn"),
  touch: document.getElementById("touch-layer"),
  stickZone: document.getElementById("stick-zone"),
  stickBase: document.getElementById("stick-base"),
  stickKnob: document.getElementById("stick-knob"),
  crouch: document.getElementById("crouch-btn"),
  act: document.getElementById("act-btn"),
  panel: document.getElementById("panel"),
  panelInner: document.getElementById("panel-inner"),
  toast: document.getElementById("toast"),
};

const renderer = createRenderer(el.stage);
const controller = createController();
let audio;
let progress = emptyProgress();
let run = null;
let scene = "boot";
let lastFrame = 0;
let accumulator = 0;
let stepAudioMark = 0;
let toastTimer = 0;
let paused = false;
let selectedApproach = "sneak";
const FIXED_DT = 1 / 60;

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.toast.hidden = true;
  }, 4200);
}

function clearPanel() {
  el.panel.classList.remove("open");
  el.panelInner.replaceChildren();
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function button(label, className, onClick) {
  const b = node("button", className, label);
  b.type = "button";
  b.addEventListener("click", () => {
    audio?.play("ui");
    onClick();
  });
  return b;
}

function openPanel(children) {
  el.panelInner.replaceChildren(...children);
  el.panel.classList.add("open");
}

function approachActionLabels(approach) {
  if (approach === "sneak") return { crouch: "蹲伏", act: "互動" };
  if (approach === "talk") return { crouch: "慢走", act: "說服" };
  if (approach === "fight") return { crouch: "閃避", act: "出拳" };
  if (approach === "hack") return { crouch: "專注", act: "入侵" };
  return { crouch: "蹲伏", act: "互動" };
}

function updateTouchLabels() {
  const labels = approachActionLabels(run?.approach || selectedApproach);
  el.crouch.textContent = labels.crouch;
  el.act.textContent = labels.act;
}

function updateHud() {
  if (!run || scene !== "play") return;
  const interact = nearestInteractable(run);
  el.approach.textContent = APPROACH_LABELS[run.approach];
  el.alarmFill.style.width = `${Math.round(run.alarm)}%`;
  el.alarmValue.textContent = `${Math.round(run.alarm)}%`;
  el.time.textContent = formatClock(run.time);
  const meter = approachMeter(run);
  el.meterLabel.textContent = meter.label;
  el.meterValue.textContent = `${Math.round(meter.value)}%`;
  el.meterFill.style.width = `${Math.round((meter.value / meter.max) * 100)}%`;
  el.hint.textContent = hudHint(run, interact);
  el.act.disabled = !interact;
  el.act.textContent = interact?.label || approachActionLabels(run.approach).act;
}

function suspend() {
  controller.reset();
  paused = true;
  const playing = audio?.playing;
  audio?.suspend();
  audio?._wasPlaying = playing;
}

function resume() {
  paused = false;
  controller.reset();
  audio?.resume(audio?._wasPlaying || "stealth");
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") suspend();
  else if (scene === "play") resume();
});
window.addEventListener("pagehide", suspend);

function startRun(approach) {
  run = createRun(approach);
  scene = "play";
  paused = false;
  accumulator = 0;
  lastFrame = performance.now();
  stepAudioMark = 0;
  clearPanel();
  el.hud.hidden = false;
  el.touch.hidden = false;
  updateTouchLabels();
  updateHud();
  audio?.setMusic("stealth");
}

function endRun() {
  scene = "result";
  el.touch.hidden = true;
  audio?.stopMusic();
}

function showBriefing() {
  scene = "briefing";
  el.hud.hidden = true;
  el.touch.hidden = true;
  const cards = APPROACHES.map((id) => {
    const card = node("article", `approach-card${selectedApproach === id ? " selected" : ""}`);
    card.append(node("h3", null, APPROACH_LABELS[id]), node("p", null, APPROACH_HINTS[id]));
    const best = progress.best[id];
    if (best) card.append(node("small", "best", `最佳 ${best} 分`));
    card.addEventListener("click", () => {
      selectedApproach = id;
      showBriefing();
    });
    return card;
  });

  openPanel([
    node("h2", null, "後門任務"),
    node("p", "lede", "同一座資料堡壘，選一條路線潛入。取回核心資料後撤離。"),
    node("div", "approach-grid", null),
    button("開始滲透", "primary", async () => {
      await audio?.unlock();
      startRun(selectedApproach);
    }),
    button("製作署名", "ghost", () => {
      window.open("./ATTRIBUTION.md", "_blank", "noopener");
    }),
  ]);
  el.panelInner.querySelector(".approach-grid").append(...cards);
}

function showResult() {
  const won = run.status === "won";
  const score = scoreRun(run);
  const grade = gradeFor(score);
  if (won) {
    progress = recordClear(progress, run.approach, score);
    void saveProgress(PG, progress).then(({ error }) => {
      if (error) showToast(error);
    });
    audio?.play("win");
  } else {
    audio?.play("fail");
  }

  const reasons = {
    alarm: "警報滿格，保全封鎖堡壘。",
    captured: "被巡邏當場制伏。",
    hp: "硬闖失敗，你已無法戰鬥。",
    trace: "數位痕跡觸發資安鎖死。",
  };

  openPanel([
    node("h2", null, won ? "任務完成" : "行動失敗"),
    node("p", "lede", won ? "資料已離堡，後門任務成功。" : reasons[run.lostReason] || "未能完成任務。"),
    node("p", "scoreline", `得分 ${score} · 評級 ${grade} · ${approachStats(run)}`),
    node("p", "meta", `耗時 ${formatClock(run.time)} · 峰值警報 ${Math.round(run.peakAlarm)}%`),
    button("再試這條路線", "primary", () => startRun(run.approach)),
    button("更換路線", "ghost", () => showBriefing()),
  ]);
  endRun();
}

function showPause() {
  paused = true;
  openPanel([
    node("h2", null, "暫停"),
    node("p", null, APPROACH_LABELS[run.approach]),
    button("繼續", "primary", () => {
      clearPanel();
      paused = false;
    }),
    button("重新開始", "ghost", () => startRun(run.approach)),
    button("更換路線", "ghost", () => showBriefing()),
  ]);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === "step") {
      stepAudioMark += 1;
      if (stepAudioMark % 8 === 0) audio?.playStep();
    }
    if (event.type === "cameraSpot" || event.type === "captured") audio?.play("spotted");
    if (event.type === "alarm" || event.type === "trace") audio?.play("alarm");
    if (event.type === "hack") audio?.play("hack");
    if (event.type === "punch") audio?.play("punch");
    if (event.type === "extract") audio?.play("extract");
    if (event.type === "convince") audio?.play("door");
    if (event.type === "win") audio?.play("win");
  }
  if (run && run.alarm > 55) audio?.setMusic("alert");
  else if (run && scene === "play") audio?.setMusic("stealth");
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!run || scene !== "play" || paused) {
    if (run) renderer.render(run);
    return;
  }

  const frameDt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  accumulator += frameDt;

  while (accumulator >= FIXED_DT) {
    run = step(run, controller.input, FIXED_DT);
    accumulator -= FIXED_DT;
  }

  handleEvents(drainEvents(run));
  updateHud();
  renderer.render(run);

  if (run.status === "won" || run.status === "lost") showResult();
}

attachKeyboard(controller, {
  onPause: () => {
    if (scene === "play") showPause();
  },
  onRestart: () => {
    if (run) startRun(run.approach);
  },
});

attachStick(controller, el.stickZone, { base: el.stickBase, knob: el.stickKnob });
attachHoldButton(controller, el.crouch, (v) => controller.setPadCrouch(v));
attachHoldButton(controller, el.act, (v) => controller.setPadPrimary(v));

el.pause.addEventListener("click", () => {
  if (scene === "play") showPause();
});

async function boot() {
  await PG.ready;
  audio = createAudio(true);

  try {
    const nipplejs = await PG.libs.load("nipple");
    attachNipple(controller, nipplejs, el.stickZone);
  } catch {
    /* fallback stick already attached */
  }

  const loaded = await loadProgress(PG);
  progress = loaded.progress;
  if (loaded.error) showToast(loaded.error);

  openPanel([
    node("h2", null, "後門任務"),
    node("p", "lede", "沉浸式劫案小品：同一關、四種解法。拖曳左下移动，右側按鈕操作。"),
    node("p", "meta", progress.clearedApproaches.length
      ? `已通關 ${progress.clearedApproaches.length}/4 路線 · 累計 ${totalScore(progress)} 分`
      : "選定路線後立即滲透資料堡壘。"),
    button("選擇路線", "primary", async () => {
      await audio.unlock();
      showBriefing();
    }),
    button("音效 " + (progress.sound ? "開" : "關"), "ghost", async () => {
      progress = { ...progress, sound: !progress.sound };
      audio.setEnabled(progress.sound);
      const result = await saveProgress(PG, progress);
      if (result.error) showToast(result.error);
      openPanel([
        node("h2", null, "後門任務"),
        node("p", "lede", "沉浸式劫案小品：同一關、四種解法。拖曳左下移動，右側按鈕操作。"),
        node("p", "meta", progress.clearedApproaches.length
          ? `已通關 ${progress.clearedApproaches.length}/4 路線 · 累計 ${totalScore(progress)} 分`
          : "選定路線後立即滲透資料堡壘。"),
        button("選擇路線", "primary", async () => {
          await audio.unlock();
          showBriefing();
        }),
        button("音效 " + (progress.sound ? "開" : "關"), "ghost", async () => {
          progress = { ...progress, sound: !progress.sound };
          audio.setEnabled(progress.sound);
          await saveProgress(PG, progress);
        }),
      ]);
    }),
  ]);

  requestAnimationFrame(tick);
}

if (new URLSearchParams(location.search).get("snapshot") === "1") {
  void (async () => {
    await PG.ready;
    run = createRun("sneak");
    run.player.x = 14.5;
    run.player.y = 8.5;
    run.alarm = 18;
    run.time = 42;
    scene = "play";
    el.panel.classList.remove("open");
    el.panelInner.replaceChildren();
    el.hud.hidden = false;
    el.touch.hidden = true;
    renderer.render(run);
    document.body.dataset.snapshotReady = "1";
  })();
} else {
  boot();
}
