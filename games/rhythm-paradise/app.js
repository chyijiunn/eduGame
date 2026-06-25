const STORAGE_KEY = "luminaria-rhythm-progress-v2";

const LEVELS = [
  {
    id: "01_glass_canon",
    title: "Glass Canon",
    audio: "audio/01_glass_canon.wav",
    chart: "charts/01_glass_canon_events.json",
    type: "glass",
    rule: "前兩顆玻璃鐘先敲，玩家控制最右邊第三顆接拍。",
    keys: [{ code: "Space", label: "SPACE", action: "hit" }],
    color: "#72e6b2",
    patternLimit: 2,
  },
  {
    id: "02_marimba_pulse",
    title: "Marimba Pulse",
    audio: "audio/02_marimba_pulse.wav",
    chart: "charts/02_marimba_pulse_events.json",
    type: "marimba",
    rule: "前兩隻敲槌示範節奏，玩家敲第三隻。",
    keys: [{ code: "Space", label: "SPACE", action: "hit" }],
    color: "#ffd166",
    patternLimit: 2,
  },
  {
    id: "03_raindrop_shuffle",
    title: "Raindrop Shuffle",
    audio: "audio/03_raindrop_shuffle.wav",
    chart: "charts/03_raindrop_shuffle_events.json",
    type: "rain",
    rule: "前兩朵傘接雨滴，玩家控制第三朵傘接下一拍。",
    keys: [{ code: "Space", label: "SPACE", action: "hit" }],
    color: "#72b8ff",
    patternLimit: 3,
  },
  {
    id: "04_mountain_bass",
    title: "Mountain Bass",
    audio: "audio/04_mountain_bass.wav",
    chart: "charts/04_mountain_bass_events.json",
    type: "mountain",
    rule: "山谷先呼喚兩次，玩家在第三次回聲時放開 Space。",
    keys: [{ code: "Space", label: "HOLD / RELEASE", action: "hold" }],
    color: "#c6a4ff",
    patternLimit: 4,
  },
  {
    id: "05_bird_crystal_run",
    title: "Bird Crystal Run",
    audio: "audio/05_bird_crystal_run.wav",
    chart: "charts/05_bird_crystal_run_events.json",
    type: "bird",
    rule: "前四隻鳥依序拍翼，玩家控制第五隻接最後一下。",
    keys: [{ code: "Space", label: "SPACE", action: "hit" }],
    color: "#ff8fb3",
    patternLimit: 5,
  },
  {
    id: "06_remix",
    title: "Luminaria Remix",
    audio: "audio/06_remix.wav",
    chart: "charts/06_remix_events.json",
    type: "remix",
    rule: "Remix 會切換五種角色規則，但都遵守示範後接拍。",
    keys: [{ code: "Space", label: "SPACE", action: "hit" }],
    color: "#ffffff",
    patternLimit: 6,
  },
];

const SOURCE_TO_TYPE = {
  "01_glass_canon": "glass",
  "02_marimba_pulse": "marimba",
  "03_raindrop_shuffle": "rain",
  "04_mountain_bass": "mountain",
  "05_bird_crystal_run": "bird",
};

const RHYTHM_RULES = {
  glass: { actors: 3, minGap: 0.24, maxGap: 1.05, action: "hit", voices: ["bass", "glow"] },
  marimba: { actors: 3, minGap: 0.24, maxGap: 0.78, action: "hit", voices: ["lead", "answer", "bass"] },
  rain: { actors: 3, minGap: 0.32, maxGap: 0.96, action: "hit", voices: ["answer", "lead", "bass"] },
  mountain: { actors: 3, minGap: 0.55, maxGap: 1.35, action: "release", voices: ["lead", "answer", "bass"] },
  bird: { actors: 5, minGap: 0.17, maxGap: 0.48, action: "hit", voices: ["lead", "answer", "bass"] },
};

const SOURCE_RHYTHM_INTERVALS = {
  "01_glass_canon": [0.25, 0.333333, 0.5, 1.0],
  "02_marimba_pulse": [0.3, 0.375, 0.5, 0.75],
  "03_raindrop_shuffle": [0.352941, 0.588235, 0.882353, 1.764706],
  "04_mountain_bass": [0.625, 0.833333, 1.25, 2.5],
  "05_bird_crystal_run": [0.194805, 0.272727, 0.38961, 0.545455],
};

const TYPE_TO_SOURCE = {
  glass: "01_glass_canon",
  marimba: "02_marimba_pulse",
  rain: "03_raindrop_shuffle",
  mountain: "04_mountain_bass",
  bird: "05_bird_crystal_run",
};

const PHRASE_PATTERNS = {
  "01_glass_canon": [0, 0, 2, 0, 0, 2, 0, 1],
  "02_marimba_pulse": [0, 1, 2, 0, 1, 2, 1, 0],
};

const menu = document.getElementById("menu");
const game = document.getElementById("game");
const levelGrid = document.getElementById("levelGrid");
const stage = document.getElementById("stage");
const ctx = stage.getContext("2d");
const inputRow = document.getElementById("inputRow");
const gameTitle = document.getElementById("gameTitle");
const gameRule = document.getElementById("gameRule");
const scoreText = document.getElementById("scoreText");
const comboText = document.getElementById("comboText");
const result = document.getElementById("result");
const rankText = document.getElementById("rankText");
const detailText = document.getElementById("detailText");
const feedbackToggle = document.getElementById("feedbackToggle");
const prevLevelBtn = document.getElementById("prevLevelBtn");
const restartLevelBtn = document.getElementById("restartLevelBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const levelStatusText = document.getElementById("levelStatusText");

let audio = new Audio();
let sfxCtx = null;
let activeLevel = null;
let activeChart = null;
let phrases = [];
let targets = [];
let visualPulses = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let stats = { perfect: 0, good: 0, ok: 0, miss: 0 };
let rafId = 0;
let keyDown = new Set();
let flash = [];
let ended = false;
let audioReady = false;
let startedAt = 0;
let holdArmed = false;
let currentLevelIndex = 0;
let feedbackVisible = false;
let progress = loadProgress();

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Number.isInteger(saved.unlocked)) return saved;
  } catch (_err) {}
  return { unlocked: 0, passed: {}, perfect: {} };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function makeMenu() {
  levelGrid.innerHTML = "";
  LEVELS.forEach((level, index) => {
    const locked = index > progress.unlocked;
    const passed = Boolean(progress.passed[level.id]);
    const perfect = Boolean(progress.perfect[level.id]);
    const card = document.createElement("button");
    card.className = `level-card${locked ? " locked" : ""}`;
    card.disabled = locked;
    card.innerHTML = `
      <div>
        <h2>${index + 1}. ${level.title}</h2>
        <p>${level.rule}</p>
      </div>
      <div class="chips">
        <span class="chip">${level.id === "06_remix" ? "Remix" : "關卡"}</span>
        <span class="chip">${locked ? "未解鎖" : perfect ? "完美" : passed ? "已過關" : "可遊玩"}</span>
      </div>
    `;
    if (!locked) card.addEventListener("click", () => startLevel(level, index));
    levelGrid.appendChild(card);
  });
}

async function startLevel(level, index = LEVELS.findIndex(item => item.id === level.id)) {
  if (index > progress.unlocked) return;
  activeLevel = level;
  currentLevelIndex = index;
  ended = false;
  holdArmed = false;
  result.classList.add("hidden");
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  gameTitle.textContent = level.title;
  gameRule.textContent = level.rule;
  score = 0;
  combo = 0;
  maxCombo = 0;
  stats = { perfect: 0, good: 0, ok: 0, miss: 0 };
  flash = [];
  visualPulses = [];
  updateScore();
  buildInput(level);
  updateNav();
  const response = await fetch(level.chart);
  activeChart = await response.json();
  phrases = buildPhrases(activeChart, level);
  targets = phrases.map(phrase => ({ ...phrase.target, judged: false, grade: null }));
  audio.pause();
  audio = new Audio(level.audio);
  audio.preload = "auto";
  audioReady = false;
  await tryStartAudio();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

async function tryStartAudio() {
  if (!audio || audioReady) return audioReady;
  try {
    await audio.play();
    ensureSfx();
    audioReady = true;
    startedAt = performance.now() - audio.currentTime * 1000;
    return true;
  } catch (_err) {
    addFeedback(0, "Click to start", "#ffd166");
    return false;
  }
}

function ensureSfx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sfxCtx.state === "suspended") sfxCtx.resume();
}

function buildInput(level) {
  inputRow.innerHTML = "";
  level.keys.forEach(key => {
    const button = document.createElement("button");
    button.className = "input-key";
    button.textContent = key.label;
    button.dataset.code = key.code;
    button.addEventListener("pointerdown", () => handleAction(key.action, true));
    button.addEventListener("pointerup", () => handleAction(key.action, false));
    inputRow.appendChild(button);
  });
}

function buildPhrases(chart, level) {
  if (level.type === "remix") {
    return (chart.sections || []).flatMap(section => {
      const type = SOURCE_TO_TYPE[section.sourceLevel] || "glass";
      const sectionEvents = chart.events.filter(event => event.time >= section.start && event.time < section.end);
      const sourceLevel = LEVELS.find(item => item.id === section.sourceLevel);
      const sectionKeyPoints = (chart.musicKeyPoints || []).filter(point => point.time >= section.start && point.time < section.end);
      return buildSectionPhrases(type, section.start, section.end, sectionEvents, sourceLevel?.patternLimit || 3, {
        keyPoints: sectionKeyPoints,
        intervals: section.rhythmIntervals,
        sourceLevel: section.sourceLevel,
      });
    });
  }
  return buildSectionPhrases(level.type, 0, chart.durationSeconds || 64, chart.events, level.patternLimit, {
    keyPoints: chart.musicKeyPoints,
    intervals: chart.rhythmIntervals,
    sourceLevel: TYPE_TO_SOURCE[level.type],
  });
}

function buildSectionPhrases(type, start, end, events, patternLimit, options = {}) {
  const rule = RHYTHM_RULES[type];
  const list = [];
  const keyPoints = normalizedKeyPoints(events, start, end, options.keyPoints);
  const intervals = musicalIntervals(type, options).slice(0, Math.max(1, patternLimit));
  const patternSource = options.sourceLevel || TYPE_TO_SOURCE[type];
  const candidates = [];
  const targetPoints = keyPoints
    .filter(point => point.time >= start + 1.0 && point.time < end - 0.45)
    .filter(point => point.accent !== "note" || point.score >= 1.15)
    .sort((a, b) => a.time - b.time);

  for (const targetPoint of targetPoints) {
    for (const gap of intervals) {
      const cuePoints = [];
      let valid = true;
      for (let actor = 0; actor < rule.actors - 1; actor++) {
        const wanted = targetPoint.time - gap * (rule.actors - 1 - actor);
        const cue = nearestKeyPoint(keyPoints, wanted, Math.min(0.13, Math.max(0.055, gap * 0.30)));
        if (!cue || cue.time < start + 0.35) {
          valid = false;
          break;
        }
        cuePoints.push(cue);
      }
      if (!valid) continue;
      const actorTimes = [...cuePoints.map(point => point.time), targetPoint.time];
      const gaps = actorTimes.slice(1).map((time, idx) => time - actorTimes[idx]);
      if (!gaps.every(item => item >= rule.minGap * 0.72 && item <= rule.maxGap * 1.18)) continue;
      const eventsNearTimes = actorTimes.map(time => nearestEvent(events, time));
      const signature = `${targetPoint.accent}:${Math.round(gap * 1000)}`;
      const strength = targetPoint.score + cuePoints.reduce((sum, point) => sum + point.score * 0.28, 0);
      candidates.push({ actorTimes, gaps, signature, strength, events: eventsNearTimes });
    }
  }

  const timeSorted = candidates
    .sort((a, b) => b.strength - a.strength)
    .slice(0, Math.max(180, patternLimit * 64))
    .sort((a, b) => a.actorTimes[0] - b.actorTimes[0]);
  const allowedSignatures = [];
  for (const interval of intervals) {
    const rounded = Math.round(interval * 1000);
    const candidate = timeSorted.find(item => item.signature.endsWith(`:${rounded}`));
    if (candidate && !allowedSignatures.includes(candidate.signature)) allowedSignatures.push(candidate.signature);
    if (allowedSignatures.length >= patternLimit) break;
  }
  for (const candidate of timeSorted) {
    if (allowedSignatures.length >= patternLimit) break;
    if (!allowedSignatures.includes(candidate.signature)) allowedSignatures.push(candidate.signature);
  }

  const maxRest = Math.max(
    type === "glass" ? 1.85 : type === "marimba" ? 1.65 : rule.maxGap * 1.85,
    1.25
  );
  let lastTarget = start;
  let lastSignature = "";
  let searchIndex = 0;
  let phraseIndex = 0;
  const signatureByInterval = intervals.map(interval => {
    const rounded = Math.round(interval * 1000);
    return allowedSignatures.find(signature => signature.endsWith(`:${rounded}`));
  }).filter(Boolean);
  const desiredPattern = PHRASE_PATTERNS[patternSource] || [];
  while (true) {
      const minStart = lastTarget + Math.max(0.26, type === "glass" ? 0.18 : candidateSafeGap(lastSignature, rule));
      const denseWindow = lastTarget + maxRest;
      const eligible = [];
      for (let idx = searchIndex; idx < timeSorted.length; idx++) {
        const candidate = timeSorted[idx];
        if (!allowedSignatures.includes(candidate.signature)) continue;
        if (candidate.actorTimes[0] < minStart) continue;
        eligible.push(candidate);
        if (candidate.actorTimes[0] > denseWindow) break;
      }
      if (!eligible.length) break;
      const inWindow = eligible.filter(item => item.actorTimes[0] <= denseWindow);
      const pool = inWindow.length ? inWindow : eligible;
      const desiredSignature = desiredPattern.length
        ? signatureByInterval[desiredPattern[phraseIndex % desiredPattern.length] % Math.max(signatureByInterval.length, 1)]
        : null;
      const candidate = pool.find(item => item.signature === desiredSignature)
        || pool.find(item => item.signature !== lastSignature)
        || pool[0];
      const { events: chunk, actorTimes, gaps, signature } = candidate;
      const expectedGap = gaps[gaps.length - 1];
      list.push({
        type,
        actorTimes,
        gaps,
        events: chunk,
        played: new Array(rule.actors).fill(false),
        target: {
          time: actorTimes[rule.actors - 1],
          action: rule.action,
          type,
          actorIndex: rule.actors - 1,
          expectedGap,
        },
      });
      lastTarget = actorTimes[rule.actors - 1];
      lastSignature = signature;
      searchIndex = Math.max(searchIndex, timeSorted.findIndex(item => item === candidate) + 1);
      phraseIndex++;
  }
  return list.sort((a, b) => a.actorTimes[0] - b.actorTimes[0]);
}

function candidateSafeGap(_lastSignature, rule) {
  return Math.max(0.28, rule.minGap * 0.42);
}

function musicalIntervals(type, options) {
  const source = options.sourceLevel || TYPE_TO_SOURCE[type];
  const intervals = SOURCE_RHYTHM_INTERVALS[source] || options.intervals || [0.5, 0.75, 1.0];
  return intervals
    .filter(item => item >= RHYTHM_RULES[type].minGap * 0.72 && item <= RHYTHM_RULES[type].maxGap * 1.18)
    .sort((a, b) => a - b);
}

function normalizedKeyPoints(events, start, end, provided = []) {
  const source = provided.length ? provided : events.map(event => ({
    time: event.time,
    score: event.velocity || 1,
    accent: "note",
    voices: [event.voice],
  }));
  return source
    .filter(point => point.time >= start && point.time < end)
    .map(point => ({
      ...point,
      time: Number(point.time),
      score: Number(point.score || 1),
      accent: point.accent || "note",
    }))
    .sort((a, b) => a.time - b.time);
}

function nearestKeyPoint(points, time, tolerance) {
  let best = null;
  let bestDiff = Infinity;
  for (const point of points) {
    const diff = Math.abs(point.time - time);
    if (diff < bestDiff) {
      best = point;
      bestDiff = diff;
    }
    if (point.time > time + tolerance) break;
  }
  return bestDiff <= tolerance ? best : null;
}

function nearestEvent(events, time) {
  let best = null;
  let bestDiff = Infinity;
  for (const event of events) {
    const diff = Math.abs(event.time - time);
    if (diff < bestDiff) {
      best = event;
      bestDiff = diff;
    }
  }
  return best || { time, voice: "cue", velocity: 1 };
}

function currentTime() {
  if (!audioReady) return 0;
  return audio.currentTime || Math.max(0, (performance.now() - startedAt) / 1000);
}

function loop() {
  const t = currentTime();
  triggerCueActors(t);
  judgeMisses(t);
  draw(t);
  if (!ended && (audio.ended || t > (activeChart.durationSeconds || 64) + 0.5)) endLevel();
  if (!ended) rafId = requestAnimationFrame(loop);
}

function triggerCueActors(t) {
  phrases.forEach(phrase => {
    phrase.actorTimes.forEach((time, actor) => {
      const isPlayer = actor === phrase.actorTimes.length - 1;
      if (isPlayer || phrase.played[actor] || t < time) return;
      phrase.played[actor] = true;
      visualPulses.push({ time, type: phrase.type, actor });
      playSfx(phrase.type, actor, "cue");
    });
  });
}

function judgeMisses(t) {
  targets.forEach(target => {
    const lateWindow = target.expectedGap * 0.25;
    if (!target.judged && t - target.time > lateWindow) {
      target.judged = true;
      registerMiss(target, t);
    }
  });
}

function handleAction(action, pressed) {
  if (!activeLevel || ended) return;
  if (!audioReady) {
    tryStartAudio();
    return;
  }
  const type = activeType();
  if (type === "mountain") {
    if (pressed && action === "hold") {
      holdArmed = true;
      return;
    }
    if (!pressed && action === "hold" && holdArmed) {
      action = "release";
      holdArmed = false;
    } else {
      return;
    }
  } else if (!pressed) {
    return;
  }
  judgeInput(action);
}

function judgeInput(action) {
  const t = currentTime();
  const type = activeType();
  const candidates = targets
    .filter(target => !target.judged && target.action === action && target.type === type)
    .map(target => ({ target, diff: Math.abs(target.time - t), ratio: Math.abs(target.time - t) / target.expectedGap }))
    .sort((a, b) => a.diff - b.diff);
  if (!candidates.length || candidates[0].ratio > 0.25) {
    const looseTarget = targets
      .filter(target => !target.judged && target.action === action && target.type === type)
      .map(target => ({ target, ratio: Math.abs(target.time - t) / target.expectedGap }))
      .sort((a, b) => a.ratio - b.ratio)[0]?.target;
    if (looseTarget && Math.abs(looseTarget.time - t) / looseTarget.expectedGap < 0.75) {
      looseTarget.judged = true;
      registerMiss(looseTarget, t);
    } else {
      registerMiss({ type, actorIndex: playerActorIndex(type) }, t, false);
    }
    return;
  }

  const best = candidates[0];
  const grade = best.ratio <= 0.05 ? "perfect" : best.ratio <= 0.15 ? "good" : "ok";
  best.target.judged = true;
  best.target.grade = grade;
  stats[grade]++;
  combo++;
  maxCombo = Math.max(maxCombo, combo);
  score += grade === "perfect" ? 1000 + combo * 6 : grade === "good" ? 700 + combo * 3 : 350;
  visualPulses.push({ time: t, type, actor: best.target.actorIndex, grade });
  playSfx(type, best.target.actorIndex, grade);
  addFeedback(t, grade.toUpperCase(), grade === "perfect" ? "#72e6b2" : grade === "good" ? "#ffd166" : "#72b8ff");
  pulseButtons();
  updateScore();
}

function registerMiss(target, time, count = true) {
  target.grade = "miss";
  if (count) stats.miss++;
  combo = 0;
  visualPulses.push({ time, type: target.type, actor: target.actorIndex ?? playerActorIndex(target.type), grade: "miss" });
  playSfx(target.type, target.actorIndex ?? playerActorIndex(target.type), "miss");
  addFeedback(time, "MISS", "#ff806d");
  updateScore();
}

function playerActorIndex(type) {
  return (RHYTHM_RULES[type]?.actors || 3) - 1;
}

function activeType() {
  if (activeLevel.type !== "remix") return activeLevel.type;
  const t = currentTime();
  const section = [...(activeChart.sections || [])].reverse().find(s => t >= s.start);
  return SOURCE_TO_TYPE[section?.sourceLevel] || "glass";
}

function playSfx(type, actor, grade) {
  ensureSfx();
  if (type === "marimba" && grade === "miss") return playMarimbaMiss(actor);
  if (type === "marimba" && grade !== "miss") return playMarimbaSfx(actor, grade);
  if (type === "rain" && grade !== "miss") return playRainSfx(actor, grade);
  if (type === "mountain" && grade !== "miss") return playMountainPercussion(actor, grade);
  const now = sfxCtx.currentTime;
  const osc = sfxCtx.createOscillator();
  const gain = sfxCtx.createGain();
  const base = { glass: 880, marimba: 420, rain: 760, mountain: 150, bird: 1180 }[type] || 620;
  const actorOffset = actor * 55;
  const gradeScale = grade === "miss" ? 0.58 : grade === "ok" ? 0.92 : grade === "good" ? 1.0 : grade === "perfect" ? 1.08 : 1.0;
  osc.type = grade === "miss" ? "sawtooth" : type === "mountain" ? "sine" : type === "marimba" ? "triangle" : "sine";
  osc.frequency.setValueAtTime((base + actorOffset) * gradeScale, now);
  if (grade === "miss") osc.frequency.exponentialRampToValueAtTime(Math.max(70, base * 0.18), now + 0.22);
  if (type === "rain") osc.frequency.exponentialRampToValueAtTime((base * 0.55) * gradeScale, now + 0.10);
  if (type === "bird") osc.frequency.exponentialRampToValueAtTime((base * 1.35) * gradeScale, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(grade === "cue" ? 0.055 : grade === "miss" ? 0.13 : 0.10, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (grade === "miss" ? 0.26 : type === "mountain" ? 0.34 : 0.16));
  osc.connect(gain);
  gain.connect(sfxCtx.destination);
  osc.start(now);
  osc.stop(now + (grade === "miss" ? 0.30 : type === "mountain" ? 0.38 : 0.18));
}

function playMarimbaSfx(actor, grade) {
  const now = sfxCtx.currentTime;
  const base = [392, 523, 659][Math.min(actor, 2)] || 523;
  [1, 3.02, 4.95].forEach((ratio, index) => {
    const osc = sfxCtx.createOscillator();
    const gain = sfxCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(base * ratio * (grade === "perfect" ? 1.02 : 1), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime((index === 0 ? 0.09 : 0.03) * (grade === "cue" ? 0.66 : 1), now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22 + index * 0.04);
    osc.connect(gain);
    gain.connect(sfxCtx.destination);
    osc.start(now);
    osc.stop(now + 0.28 + index * 0.04);
  });
  const click = sfxCtx.createOscillator();
  const clickGain = sfxCtx.createGain();
  click.type = "square";
  click.frequency.setValueAtTime(grade === "cue" ? 980 : actor === 2 ? 840 : 720, now);
  click.frequency.exponentialRampToValueAtTime(260, now + 0.05);
  clickGain.gain.setValueAtTime(0.0001, now);
  clickGain.gain.linearRampToValueAtTime(grade === "cue" ? 0.025 : actor === 2 ? 0.08 : 0.05, now + 0.003);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  click.connect(clickGain);
  clickGain.connect(sfxCtx.destination);
  click.start(now);
  click.stop(now + 0.08);
}

function playMarimbaMiss(actor) {
  const now = sfxCtx.currentTime;
  for (let n = 0; n < 3; n++) {
    const burst = sfxCtx.createBufferSource();
    const length = Math.floor(sfxCtx.sampleRate * 0.055);
    const buffer = sfxCtx.createBuffer(1, length, sfxCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    burst.buffer = buffer;
    const filter = sfxCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600 - n * 260 + actor * 60, now);
    const gain = sfxCtx.createGain();
    const start = now + n * 0.04;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.05, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
    burst.connect(filter);
    filter.connect(gain);
    gain.connect(sfxCtx.destination);
    burst.start(start);
    burst.stop(start + 0.07);
  }
  const buzz = sfxCtx.createOscillator();
  const buzzGain = sfxCtx.createGain();
  buzz.type = "sawtooth";
  buzz.frequency.setValueAtTime(240, now);
  buzz.frequency.exponentialRampToValueAtTime(110, now + 0.22);
  buzzGain.gain.setValueAtTime(0.0001, now);
  buzzGain.gain.linearRampToValueAtTime(0.035, now + 0.01);
  buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  buzz.connect(buzzGain);
  buzzGain.connect(sfxCtx.destination);
  buzz.start(now);
  buzz.stop(now + 0.26);
}

function playRainSfx(actor, grade) {
  const now = sfxCtx.currentTime;
  const osc = sfxCtx.createOscillator();
  const gain = sfxCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(720 + actor * 45, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.14);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(grade === "cue" ? 0.035 : 0.08, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain);
  gain.connect(sfxCtx.destination);
  osc.start(now);
  osc.stop(now + 0.18);

  const burst = sfxCtx.createBufferSource();
  const length = Math.floor(sfxCtx.sampleRate * 0.12);
  const buffer = sfxCtx.createBuffer(1, length, sfxCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const filter = sfxCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, now);
  const noiseGain = sfxCtx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.linearRampToValueAtTime(grade === "cue" ? 0.015 : 0.035, now + 0.008);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
  burst.buffer = buffer;
  burst.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(sfxCtx.destination);
  burst.start(now);
  burst.stop(now + 0.12);
}

function playMountainPercussion(actor, grade) {
  const now = sfxCtx.currentTime;
  const low = sfxCtx.createOscillator();
  const lowGain = sfxCtx.createGain();
  low.type = "sine";
  low.frequency.setValueAtTime(96 + actor * 10, now);
  low.frequency.exponentialRampToValueAtTime(74, now + 0.28);
  lowGain.gain.setValueAtTime(0.0001, now);
  lowGain.gain.linearRampToValueAtTime(grade === "cue" ? 0.05 : 0.12, now + 0.01);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
  low.connect(lowGain);
  lowGain.connect(sfxCtx.destination);
  low.start(now);
  low.stop(now + 0.56);

  const gong = sfxCtx.createOscillator();
  const gongGain = sfxCtx.createGain();
  gong.type = "triangle";
  gong.frequency.setValueAtTime(430 + actor * 20, now);
  gong.frequency.exponentialRampToValueAtTime(250, now + 0.46);
  gongGain.gain.setValueAtTime(0.0001, now);
  gongGain.gain.linearRampToValueAtTime(grade === "cue" ? 0.018 : 0.05, now + 0.015);
  gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
  gong.connect(gongGain);
  gongGain.connect(sfxCtx.destination);
  gong.start(now);
  gong.stop(now + 0.66);
}

function playResultSound(kind) {
  ensureSfx();
  const now = sfxCtx.currentTime;
  const master = sfxCtx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(kind === "fail" ? 0.18 : 0.13, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "perfect" ? 1.5 : 0.9));
  master.connect(sfxCtx.destination);

  const notes = kind === "perfect" ? [523, 659, 784, 1046, 1318] : kind === "pass" ? [784, 1046] : [620, 420, 260, 140];
  notes.forEach((freq, index) => {
    const osc = sfxCtx.createOscillator();
    const gain = sfxCtx.createGain();
    osc.type = kind === "fail" ? "sawtooth" : "triangle";
    const start = now + index * (kind === "perfect" ? 0.11 : 0.13);
    osc.frequency.setValueAtTime(freq, start);
    if (kind === "fail") osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.45), start + 0.22);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(kind === "fail" ? 0.9 : 0.5, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "perfect" ? 0.34 : 0.26));
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.42);
  });
}

function addFeedback(time, text, color) {
  if (!feedbackVisible && text !== "Click to start") return;
  flash.push({ time, text, color });
}

function pulseButtons() {
  [...inputRow.children].forEach(button => {
    button.classList.add("active");
    setTimeout(() => button.classList.remove("active"), 120);
  });
}

function updateScore() {
  const total = stats.perfect + stats.good + stats.ok + stats.miss;
  const correct = stats.perfect + stats.good + stats.ok;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  if (feedbackVisible) {
    scoreText.textContent = `${accuracy}%`;
    comboText.textContent = `combo ${combo}`;
  } else {
    scoreText.textContent = "--";
    comboText.textContent = "hidden";
  }
}

function draw(t) {
  fitCanvas();
  const w = stage.width;
  const h = stage.height;
  const type = activeType();
  const scene = sceneRect(w, h);
  drawBackground(w, h, type, t);
  ctx.save();
  ctx.translate(scene.x, scene.y);
  drawRhythmScene(scene.w, scene.h, type, t);
  ctx.restore();
  drawFlash(w, h, t);
  drawProgress(scene, t);
}

function fitCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (stage.width !== width || stage.height !== height) {
    stage.width = width;
    stage.height = height;
  }
}

function sceneRect(w, h) {
  const mobilePortrait = window.innerWidth < 780 && window.innerHeight > window.innerWidth;
  const aspect = mobilePortrait ? 1.06 : 16 / 9;
  const padX = Math.max(10, w * 0.03);
  const padY = Math.max(10, h * 0.04);
  const availW = w - padX * 2;
  const availH = h - padY * 2;
  let sceneW = availW;
  let sceneH = sceneW / aspect;
  if (sceneH > availH) {
    sceneH = availH;
    sceneW = sceneH * aspect;
  }
  return {
    x: Math.round((w - sceneW) / 2),
    y: Math.round((h - sceneH) / 2),
    w: Math.round(sceneW),
    h: Math.round(sceneH),
  };
}

function drawBackground(w, h, type, t) {
  const palettes = {
    glass: ["#081018", "#113736", "#72e6b2", "#080b10"],
    marimba: ["#f6edd5", "#e1bd72", "#8f5c1e", "#f3dfb2"],
    rain: ["#081018", "#102b45", "#72b8ff", "#080b10"],
    mountain: ["#0b0c12", "#2a2040", "#c6a4ff", "#080b10"],
    bird: ["#100c18", "#39203a", "#ff8fb3", "#080b10"],
  };
  const [a, b, c, d] = palettes[type] || palettes.glass;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a);
  g.addColorStop(.65, b);
  g.addColorStop(1, d);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = type === "marimba" ? .14 : .10;
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc((i * 137 + t * 18) % w, (i * 83) % h, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRhythmScene(w, h, type, t) {
  const activePhrases = phrases.filter(phrase => phrase.type === type && t >= phrase.actorTimes[0] - 0.7 && t <= phrase.actorTimes.at(-1) + 0.9);
  if (type === "glass") drawGlassLine(w, h, t, activePhrases);
  if (type === "marimba") drawMarimbaLine(w, h, t, activePhrases);
  if (type === "rain") drawRainLine(w, h, t, activePhrases);
  if (type === "mountain") drawMountainLine(w, h, t, activePhrases);
  if (type === "bird") drawBirdLine(w, h, t, activePhrases);
}

function pulseFor(type, actor, t) {
  const active = visualPulses.filter(pulse => pulse.type === type && pulse.actor === actor && t - pulse.time >= 0 && t - pulse.time < 0.32);
  if (!active.length) return 0;
  const age = t - active[active.length - 1].time;
  return Math.max(0, 1 - age / 0.32);
}

function pulseStateFor(type, actor, t) {
  const active = visualPulses.filter(pulse => pulse.type === type && pulse.actor === actor && t - pulse.time >= 0 && t - pulse.time < 0.42);
  if (!active.length) return { amount: 0, miss: false };
  const pulse = active[active.length - 1];
  const age = t - pulse.time;
  return { amount: Math.max(0, 1 - age / 0.42), miss: pulse.grade === "miss" };
}

function displayPhrase(activePhrases, t) {
  if (!activePhrases.length) return null;
  return activePhrases.reduce((best, phrase) => {
    const center = phrase.actorTimes[Math.floor((phrase.actorTimes.length - 1) / 2)];
    const bestCenter = best.actorTimes[Math.floor((best.actorTimes.length - 1) / 2)];
    return Math.abs(center - t) < Math.abs(bestCenter - t) ? phrase : best;
  });
}

function drawGlassLine(w, h, t) {
  const xs = [w * .30, w * .50, w * .70];
  xs.forEach((x, i) => {
    const state = pulseStateFor("glass", i, t);
    const p = state.amount;
    const isPlayer = i === 2;
    ctx.strokeStyle = isPlayer ? "#ffffff" : "#72e6b2";
    ctx.lineWidth = 5 + p * 8;
    ctx.beginPath();
    ctx.arc(x, h * .52, 62 + p * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isPlayer ? "#eff8ff" : "#72e6b2";
    ctx.beginPath();
    ctx.arc(x, h * .52 + Math.sin(t * 2 + i) * 8 - p * 18, 26 + p * 12, 0, Math.PI * 2);
    ctx.fill();
    if (state.miss && isPlayer) {
      ctx.strokeStyle = "#081018";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x - 15, h * .52 - 14);
      ctx.lineTo(x + 15, h * .52 + 14);
      ctx.moveTo(x + 15, h * .52 - 14);
      ctx.lineTo(x - 15, h * .52 + 14);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x + 32, h * .52 + 4, 18, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  });
}

function drawMarimbaLine(w, h, t, activePhrases) {
  const xs = [w * .22, w * .50, w * .78];
  const keyY = h * .66;
  const phrase = displayPhrase(activePhrases, t);
  const playerState = pulseStateFor("marimba", 2, t);
  xs.forEach((x, i) => {
    const isPlayer = i === 2;
    const state = pulseStateFor("marimba", i, t);
    ctx.fillStyle = isPlayer ? "#f4f4df" : "#d5a753";
    ctx.fillRect(x - 74, keyY, 148, 42);
    ctx.fillStyle = "#8f5c1e";
    ctx.fillRect(x - 78, keyY + 38, 156, 10);
    ctx.strokeStyle = isPlayer ? "#fff6d9" : "#f1ca7b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 74, keyY, 148, 42);
    if (state.miss && isPlayer) {
      ctx.strokeStyle = "#8d4d2a";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x - 38, keyY - 8);
      ctx.lineTo(x - 6, keyY - 38);
      ctx.moveTo(x + 10, keyY - 34);
      ctx.lineTo(x + 40, keyY - 6);
      ctx.stroke();
    }
  });

  let roachX = xs[0];
  let roachY = keyY - 20 + Math.sin(t * 8) * 2;
  let roachTilt = 0;
  let roachFly = false;
  if (phrase) {
    const [a, b, c] = phrase.actorTimes;
    const preA = Math.max(a - 0.18, a - (b - a) * 0.35);
    const hop1End = Math.min(b - 0.08, a + (b - a) * 0.72);
    const hop2Start = Math.max(b + 0.03, c - (c - b) * 0.34);
    if (t < preA) {
      roachX = xs[0];
      roachY = keyY - 18 + Math.sin(t * 9) * 1.5;
    } else if (t < hop1End) {
      const k = Math.max(0, Math.min(1, (t - preA) / Math.max(hop1End - preA, 0.001)));
      roachX = xs[0] + (xs[1] - xs[0]) * k;
      roachY = keyY - 18 - Math.sin(k * Math.PI) * 42;
      roachTilt = (k - 0.5) * 0.45;
    } else if (t < hop2Start) {
      roachX = xs[1];
      roachY = keyY - 18 + Math.sin((t - hop1End) * 16) * 1.2;
    } else if (t < c) {
      const k = Math.max(0, Math.min(1, (t - hop2Start) / Math.max(c - hop2Start, 0.001)));
      roachX = xs[1] + (xs[2] - xs[1]) * k;
      roachY = keyY - 18 - Math.sin(k * Math.PI) * 50;
      roachTilt = (k - 0.5) * 0.52;
    } else {
      roachX = xs[2];
      roachY = keyY - 18 + Math.sin((t - c) * 10) * Math.max(0, 1 - (t - c) / 0.18);
    }
  }
  if (playerState.miss) {
    roachFly = true;
    const flyK = 1 - playerState.amount;
    roachX += 30 + flyK * w * 0.26;
    roachY -= 18 + Math.sin(flyK * Math.PI) * 36 + flyK * h * 0.18;
    roachTilt = 0.55 + flyK * 0.9;
  }

  ctx.save();
  ctx.translate(roachX, roachY);
  ctx.rotate(roachTilt);
  ctx.fillStyle = roachFly ? "#3f1e0b" : "#2f1408";
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(16, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#231409";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-4, side * 3);
    ctx.lineTo(-14, side * 10);
    ctx.moveTo(2, side * 2);
    ctx.lineTo(14, side * 10);
    ctx.stroke();
  }
  ctx.restore();

  const slap = playerState.amount > 0 ? (1 - playerState.amount) * 44 : 0;
  const slipperX = xs[2] + 18;
  const slipperY = keyY - 30 + slap * 0.35;
  const slipperAngle = -0.98 + slap * 0.003;
  ctx.save();
  ctx.translate(slipperX, slipperY);
  ctx.rotate(slipperAngle);
  ctx.fillStyle = "#4b7fda";
  ctx.beginPath();
  ctx.roundRect(-8, 4, 28, 18, 6);
  ctx.fill();
  ctx.fillStyle = "#f6efe1";
  ctx.strokeStyle = "#c7a56a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-58, -2, 72, 18, 9);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (playerState.miss) {
    ctx.strokeStyle = "#ff806d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(roachX - 10, roachY - 10);
    ctx.lineTo(roachX + 10, roachY - 28);
    ctx.stroke();
  }
}

function drawBounceDroplet(x, y, k) {
  ctx.fillStyle = "#72b8ff";
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawRainLine(w, h, t, activePhrases) {
  const xs = [w * .30, w * .50, w * .70];
  const phrase = displayPhrase(activePhrases, t);
  const umbrellaY = h * .68;
  const closeStart = phrase ? phrase.actorTimes[2] + 0.18 : 0;
  const closeEnd = phrase ? phrase.actorTimes[2] + 0.40 : 0;
  xs.forEach((x, i) => {
    const state = pulseStateFor("rain", i, t);
    const hitTime = phrase?.actorTimes?.[i];
    let open = 0;
    if (hitTime != null && t >= hitTime) {
      open = Math.min(1, 0.28 + (t - hitTime) / 0.05);
      if (t >= closeStart) {
        const closeK = Math.max(0, Math.min(1, (t - closeStart) / Math.max(closeEnd - closeStart, 0.001)));
        open *= 1 - closeK;
      }
    }
    open = Math.max(open, state.amount * 0.8);
    const tilt = state.miss && i === 2 ? 0.22 : 0;
    ctx.save();
    ctx.translate(x, umbrellaY);
    ctx.rotate(tilt);
    ctx.strokeStyle = i === 2 ? "#eff8ff" : "#72b8ff";
    ctx.lineWidth = 8;
    if (open < 0.16) {
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, -38);
      ctx.quadraticCurveTo(0, -48, 12, -38);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 30 + open * 34, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(191,246,255,.95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -6, 18 + open * 22, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.strokeStyle = i === 2 ? "#eff8ff" : "#72b8ff";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 72);
    ctx.stroke();
    ctx.restore();
    if (hitTime != null) {
      const fallStart = hitTime - 0.52;
      const arcRadius = open < 0.16 ? 38 : 30 + open * 34;
      const impactY = umbrellaY - arcRadius + 2;
      const dropK = Math.max(0, Math.min(1, (t - fallStart) / Math.max(hitTime - fallStart, 0.001)));
      const dropY = h * .14 + dropK * (impactY - h * .14);
      const splashAge = t - hitTime;
      ctx.fillStyle = "#72b8ff";
      if (t < hitTime) {
        ctx.beginPath();
        ctx.arc(x, dropY, 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (splashAge < 0.34) {
        const splash = splashAge / 0.34;
        const bounceY = impactY - Math.sin(splash * Math.PI) * 52 - splash * 18;
        const drift = (i - 1) * 24 + (i === 1 ? 0 : (i === 0 ? -16 : 16)) * splash;
        drawBounceDroplet(x + drift, bounceY, splash);
        ctx.strokeStyle = "#bff6ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 10 - splash * 16, impactY - 2);
        ctx.lineTo(x - 24 - splash * 20, impactY - 18 - splash * 12);
        ctx.moveTo(x + 10 + splash * 16, impactY - 2);
        ctx.lineTo(x + 24 + splash * 20, impactY - 18 - splash * 12);
        ctx.stroke();
      }
    }
    if (state.miss && i === 2) {
      ctx.strokeStyle = "#ff806d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 16, umbrellaY - 48);
      ctx.lineTo(x + 16, umbrellaY - 24);
      ctx.moveTo(x + 16, umbrellaY - 48);
      ctx.lineTo(x - 16, umbrellaY - 24);
      ctx.stroke();
    }
  });
}

function drawMountainLine(w, h, t) {
  ctx.fillStyle = "rgba(198,164,255,.28)";
  ctx.beginPath();
  ctx.moveTo(0, h * .78);
  ctx.lineTo(w * .24, h * .38);
  ctx.lineTo(w * .46, h * .78);
  ctx.lineTo(w * .65, h * .32);
  ctx.lineTo(w, h * .78);
  ctx.closePath();
  ctx.fill();
  const xs = [w * .28, w * .50, w * .72];
  xs.forEach((x, i) => {
    const state = pulseStateFor("mountain", i, t);
    const p = state.amount;
    ctx.strokeStyle = i === 2 ? "#eff8ff" : "#c6a4ff";
    ctx.lineWidth = 4 + p * 7;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.arc(x, h * .52, 40 + r * 38 + p * 42, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (state.miss && i === 2) {
      ctx.strokeStyle = "#ff806d";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x - 34, h * .45);
      ctx.lineTo(x - 6, h * .52);
      ctx.lineTo(x - 22, h * .61);
      ctx.moveTo(x + 12, h * .43);
      ctx.lineTo(x + 36, h * .50);
      ctx.lineTo(x + 20, h * .62);
      ctx.stroke();
    }
  });
}

function drawBirdLine(w, h, t) {
  const xs = [w * .18, w * .34, w * .50, w * .66, w * .82];
  xs.forEach((x, i) => {
    const state = pulseStateFor("bird", i, t);
    const p = state.amount;
    const y = h * .50 - p * 70 + Math.sin(t * 4 + i) * 8 + (state.miss && i === 4 ? 70 * p : 0);
    ctx.strokeStyle = i === 4 ? "#eff8ff" : i % 2 ? "#ff8fb3" : "#72e6b2";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x - 34, y);
    ctx.quadraticCurveTo(x, y - 34 - p * 30, x + 34, y);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y + 18, 12 + p * 6, 0, Math.PI * 2);
    ctx.fill();
    if (state.miss && i === 4) {
      ctx.strokeStyle = "#ff806d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 13, y + 5);
      ctx.lineTo(x - 3, y + 15);
      ctx.moveTo(x - 3, y + 5);
      ctx.lineTo(x - 13, y + 15);
      ctx.moveTo(x + 3, y + 5);
      ctx.lineTo(x + 13, y + 15);
      ctx.moveTo(x + 13, y + 5);
      ctx.lineTo(x + 3, y + 15);
      ctx.stroke();
    }
  });
}

function drawFlash(w, h, t) {
  flash = flash.filter(item => t - item.time < .7);
  if (!flash.length) return;
  const item = flash[flash.length - 1];
  const age = t - item.time;
  ctx.globalAlpha = 1 - age / .7;
  ctx.fillStyle = item.color;
  ctx.font = `800 ${Math.max(28, w * .045)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(item.text, w / 2, h * .18);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawProgress(scene, t) {
  const duration = activeChart.durationSeconds || audio.duration || 64;
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fillRect(scene.x + scene.w * .06, scene.y + scene.h - 18, scene.w * .88, 6);
  ctx.fillStyle = activeLevel.color;
  ctx.fillRect(scene.x + scene.w * .06, scene.y + scene.h - 18, scene.w * .88 * Math.min(1, t / duration), 6);
}

function endLevel() {
  ended = true;
  cancelAnimationFrame(rafId);
  audio.pause();
  const total = stats.perfect + stats.good + stats.ok + stats.miss;
  const correct = stats.perfect + stats.good + stats.ok;
  const accuracy = total ? correct / total : 0;
  const levelIndex = LEVELS.findIndex(level => level.id === activeLevel.id);
  const passed = accuracy >= 0.75;
  const perfect = accuracy >= 0.95;
  if (passed) {
    progress.passed[activeLevel.id] = true;
    progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length - 1, levelIndex + 1));
    if (perfect) progress.perfect[activeLevel.id] = true;
    saveProgress();
  }
  result.classList.remove("fail", "pass", "perfect");
  result.classList.add(perfect ? "perfect" : passed ? "pass" : "fail");
  rankText.textContent = perfect ? "完美" : passed ? "過關" : "失敗";
  detailText.textContent = `正確率 ${Math.round(accuracy * 100)}%｜Perfect ${stats.perfect} / Good ${stats.good} / OK ${stats.ok} / Miss ${stats.miss}｜最高 combo ${maxCombo}`;
  document.getElementById("menuBtn").disabled = currentLevelIndex + 1 > progress.unlocked;
  document.getElementById("menuBtn").textContent = currentLevelIndex + 1 > progress.unlocked ? "下一關未解鎖" : "下一關";
  result.classList.remove("hidden");
  playResultSound(perfect ? "perfect" : passed ? "pass" : "fail");
  updateNav();
  makeMenu();
}

function goToLevel(index) {
  if (index < 0 || index >= LEVELS.length || index > progress.unlocked) return;
  ended = true;
  cancelAnimationFrame(rafId);
  audio.pause();
  result.classList.add("hidden");
  startLevel(LEVELS[index], index);
}

function restartLevel() {
  goToLevel(currentLevelIndex);
}

function updateNav() {
  prevLevelBtn.disabled = currentLevelIndex <= 0;
  nextLevelBtn.disabled = currentLevelIndex + 1 > progress.unlocked || currentLevelIndex >= LEVELS.length - 1;
  levelStatusText.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
}

document.addEventListener("keydown", event => {
  if (keyDown.has(event.code)) return;
  keyDown.add(event.code);
  const key = activeLevel?.keys.find(item => item.code === event.code);
  if (key) {
    event.preventDefault();
    handleAction(key.action, true);
  }
});

document.addEventListener("keyup", event => {
  keyDown.delete(event.code);
  const key = activeLevel?.keys.find(item => item.code === event.code);
  if (key) {
    event.preventDefault();
    handleAction(key.action, false);
  }
});

stage.addEventListener("pointerdown", () => {
  if (!audioReady) {
    tryStartAudio();
    return;
  }
  handleAction("hit", true);
});

feedbackToggle.addEventListener("click", () => {
  feedbackVisible = !feedbackVisible;
  feedbackToggle.setAttribute("aria-pressed", String(feedbackVisible));
  feedbackToggle.textContent = `回饋與分數 ${feedbackVisible ? "ON" : "OFF"}`;
  updateScore();
});

document.getElementById("menuBtn").addEventListener("click", () => goToLevel(currentLevelIndex + 1));
document.getElementById("retryBtn").addEventListener("click", restartLevel);
prevLevelBtn.addEventListener("click", () => goToLevel(currentLevelIndex - 1));
restartLevelBtn.addEventListener("click", restartLevel);
nextLevelBtn.addEventListener("click", () => goToLevel(currentLevelIndex + 1));

makeMenu();
startLevel(LEVELS[0], 0);
