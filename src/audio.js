const SFX = {
  step1: { src: "./assets/sfx/step1.ogg", volume: 0.22 },
  step2: { src: "./assets/sfx/step2.ogg", volume: 0.22 },
  step3: { src: "./assets/sfx/step3.ogg", volume: 0.22 },
  hack: { src: "./assets/sfx/hack.ogg", volume: 0.45 },
  spotted: { src: "./assets/sfx/spotted.ogg", volume: 0.5 },
  alarm: { src: "./assets/sfx/alarm.ogg", volume: 0.42 },
  door: { src: "./assets/sfx/door.ogg", volume: 0.4 },
  punch: { src: "./assets/sfx/punch.ogg", volume: 0.48 },
  ui: { src: "./assets/sfx/ui.ogg", volume: 0.35 },
  fail: { src: "./assets/sfx/fail.ogg", volume: 0.5 },
  win: { src: "./assets/sfx/win.ogg", volume: 0.45 },
  extract: { src: "./assets/sfx/extract.ogg", volume: 0.48 },
};

const MUSIC = {
  stealth: { src: "./assets/music/stealth.ogg", volume: 0.28 },
  alert: { src: "./assets/music/alert.ogg", volume: 0.32 },
};

const POOL_SIZE = 3;

export function createAudio(enabled = true) {
  const pools = new Map();
  const tracks = new Map();
  const state = { enabled, unlocked: false, music: null, suspended: false };
  let stepIndex = 0;

  function pool(name) {
    if (!pools.has(name)) {
      const def = SFX[name];
      if (!def) return null;
      const elements = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const el = new Audio(def.src);
        el.preload = "auto";
        el.volume = def.volume;
        elements.push(el);
      }
      pools.set(name, { elements, cursor: 0 });
    }
    return pools.get(name);
  }

  function track(name) {
    if (!tracks.has(name)) {
      const def = MUSIC[name];
      if (!def) return null;
      const el = new Audio(def.src);
      el.loop = true;
      el.volume = def.volume;
      el.preload = "auto";
      tracks.set(name, el);
    }
    return tracks.get(name);
  }

  function play(name, options = {}) {
    if (!state.enabled || state.suspended) return;
    const group = pool(name);
    if (!group) return;
    const el = group.elements[group.cursor];
    group.cursor = (group.cursor + 1) % group.elements.length;
    try {
      el.currentTime = 0;
      el.volume = Math.min(1, (SFX[name].volume || 0.5) * (options.volume ?? 1));
      const promise = el.play();
      if (promise && promise.catch) promise.catch(() => {});
    } catch {
      /* optional */
    }
  }

  function playStep() {
    stepIndex = (stepIndex % 3) + 1;
    play(`step${stepIndex}`, { volume: 0.18 });
  }

  function stopMusic() {
    for (const el of tracks.values()) el.pause();
    state.music = null;
  }

  function setMusic(name) {
    if (!state.enabled || state.suspended) return;
    if (state.music === name) return;
    stopMusic();
    const el = track(name);
    if (!el) return;
    state.music = name;
    const promise = el.play();
    if (promise && promise.catch) promise.catch(() => {});
  }

  return {
    play,
    playStep,
    setMusic,
    stopMusic,
    async unlock() {
      state.unlocked = true;
    },
    setEnabled(value) {
      state.enabled = Boolean(value);
      if (!state.enabled) stopMusic();
    },
    suspend() {
      state.suspended = true;
      stopMusic();
      for (const group of pools.values()) {
        for (const el of group.elements) el.pause();
      }
    },
    resume(wasPlaying) {
      state.suspended = false;
      if (wasPlaying && state.enabled) setMusic(wasPlaying);
    },
    get playing() {
      return state.music;
    },
  };
}
