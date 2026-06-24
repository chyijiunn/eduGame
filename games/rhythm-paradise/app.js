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
const backBtn = document.getElementById("backBtn");
const feedbackToggle = document.getElementById("feedbackToggle");
const accuracyToggle = document.getElementById("accuracyToggle");
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
let accuracyVisible = false;
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
      return buildSectionPhrases(type, section.start, section.end, sectionEvents, sourceLevel?.patternLimit || 3);
    });
  }
  return buildSectionPhrases(level.type, 0, chart.durationSeconds || 64, chart.events, level.patternLimit);
}

function buildSectionPhrases(type, start, end, events, patternLimit) {
  const rule = RHYTHM_RULES[type];
  const filtered = events
    .filter(event => event.time >= start + 1 && event.time < end - 0.6)
    .filter(event => !rule.voices || rule.voices.includes(event.voice))
    .sort((a, b) => a.time - b.time);
  const candidates = [];
  const list = [];

  for (const voice of rule.voices) {
    const voiceEvents = filtered.filter(event => event.voice === voice);
    for (let i = 0; i <= voiceEvents.length - rule.actors; i++) {
      const chunk = voiceEvents.slice(i, i + rule.actors);
      const actorTimes = chunk.map(event => event.time);
      const gaps = actorTimes.slice(1).map((time, idx) => time - actorTimes[idx]);
      if (!gaps.every(gap => gap >= rule.minGap && gap <= rule.maxGap)) continue;
      const signature = `${voice}:` + gaps.map(gap => Math.round(gap / 0.05) * 0.05).join("-");
      candidates.push({ voice, chunk, actorTimes, gaps, signature });
    }
  }

  const timeSorted = candidates.sort((a, b) => a.actorTimes[0] - b.actorTimes[0]);
  const allowedSignatures = [];
  for (const voice of rule.voices) {
    const first = timeSorted.find(candidate => candidate.voice === voice && !allowedSignatures.includes(candidate.signature));
    if (first) allowedSignatures.push(first.signature);
    if (allowedSignatures.length >= patternLimit) break;
  }
  for (const candidate of timeSorted) {
    if (allowedSignatures.length >= patternLimit) break;
    if (!allowedSignatures.includes(candidate.signature)) allowedSignatures.push(candidate.signature);
  }

  let lastTarget = start;
  let lastSignature = "";
  while (true) {
      const eligible = timeSorted.filter(candidate =>
        allowedSignatures.includes(candidate.signature) &&
        candidate.actorTimes[0] >= lastTarget + 0.55
      );
      if (!eligible.length) break;
      const candidate = eligible.find(item => item.signature !== lastSignature) || eligible[0];
      const { chunk, actorTimes, gaps, signature } = candidate;
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
  }
  return list.sort((a, b) => a.actorTimes[0] - b.actorTimes[0]);
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
  if (accuracyVisible) {
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
  drawBackground(w, h, type, t);
  drawRhythmScene(w, h, type, t);
  drawFlash(w, h, t);
  drawProgress(w, h, t);
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

function drawBackground(w, h, type, t) {
  const palettes = {
    glass: ["#081018", "#113736", "#72e6b2"],
    marimba: ["#151109", "#463118", "#ffd166"],
    rain: ["#081018", "#102b45", "#72b8ff"],
    mountain: ["#0b0c12", "#2a2040", "#c6a4ff"],
    bird: ["#100c18", "#39203a", "#ff8fb3"],
  };
  const [a, b, c] = palettes[type] || palettes.glass;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, a);
  g.addColorStop(.65, b);
  g.addColorStop(1, "#080b10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = .10;
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc((i * 137 + t * 18) % w, (i * 83) % h, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRhythmScene(w, h, type, t) {
  const activePhrases = phrases.filter(phrase => phrase.type === type && t >= phrase.actorTimes[0] - 0.35 && t <= phrase.actorTimes.at(-1) + 0.55);
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
      ctx.strokeStyle = "#ff806d";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x - 31, h * .52 - 30);
      ctx.lineTo(x + 31, h * .52 + 30);
      ctx.moveTo(x + 31, h * .52 - 30);
      ctx.lineTo(x - 31, h * .52 + 30);
      ctx.stroke();
    }
  });
}

function drawMarimbaLine(w, h, t) {
  const xs = [w * .28, w * .50, w * .72];
  xs.forEach((x, i) => {
    const state = pulseStateFor("marimba", i, t);
    const p = state.amount;
    ctx.fillStyle = i === 2 ? "#eff8ff" : "#ffd166";
    ctx.fillRect(x - 50, h * .58, 100, 130);
    ctx.strokeStyle = "#d79642";
    ctx.lineWidth = 10;
    ctx.beginPath();
    if (state.miss && i === 2) {
      ctx.moveTo(x - 48, h * .52);
      ctx.lineTo(x - 8, h * .45);
      ctx.moveTo(x + 10, h * .47);
      ctx.lineTo(x + 46, h * .57);
    } else {
      ctx.moveTo(x - 44, h * .55 - p * 74);
      ctx.lineTo(x + 28, h * .41 + p * 116);
    }
    ctx.stroke();
    ctx.fillStyle = i === 2 ? "#72e6b2" : "#ff806d";
    ctx.beginPath();
    ctx.arc(x - 52 + p * 84, h * .52 + p * 54, 22, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRainLine(w, h, t) {
  const xs = [w * .30, w * .50, w * .70];
  for (let i = 0; i < 26; i++) {
    const y = (i * 71 + t * 180) % h;
    const x = (i * 101) % w;
    ctx.strokeStyle = "rgba(114,184,255,.25)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 10, y + 28);
    ctx.stroke();
  }
  xs.forEach((x, i) => {
    const state = pulseStateFor("rain", i, t);
    const p = state.amount;
    const tilt = state.miss && i === 2 ? 0.38 : 0;
    ctx.save();
    ctx.translate(x, h * .61);
    ctx.rotate(tilt);
    ctx.strokeStyle = i === 2 ? "#eff8ff" : "#72b8ff";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 62 + p * 18, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#72b8ff";
    ctx.beginPath();
    ctx.arc(x + (state.miss && i === 2 ? 34 : 0), h * .34 + p * h * .26, 12 + p * 10, 0, Math.PI * 2);
    ctx.fill();
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

function drawProgress(w, h, t) {
  const duration = activeChart.durationSeconds || audio.duration || 64;
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fillRect(w * .06, h - 24, w * .88, 8);
  ctx.fillStyle = activeLevel.color;
  ctx.fillRect(w * .06, h - 24, w * .88 * Math.min(1, t / duration), 8);
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
  backBtn.disabled = currentLevelIndex <= 0;
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
  feedbackToggle.textContent = `回饋 ${feedbackVisible ? "ON" : "OFF"}`;
});

accuracyToggle.addEventListener("click", () => {
  accuracyVisible = !accuracyVisible;
  accuracyToggle.setAttribute("aria-pressed", String(accuracyVisible));
  accuracyToggle.textContent = `答對率 ${accuracyVisible ? "ON" : "OFF"}`;
  updateScore();
});

backBtn.addEventListener("click", () => goToLevel(currentLevelIndex - 1));
document.getElementById("menuBtn").addEventListener("click", () => goToLevel(currentLevelIndex + 1));
document.getElementById("retryBtn").addEventListener("click", restartLevel);
prevLevelBtn.addEventListener("click", () => goToLevel(currentLevelIndex - 1));
restartLevelBtn.addEventListener("click", restartLevel);
nextLevelBtn.addEventListener("click", () => goToLevel(currentLevelIndex + 1));

makeMenu();
startLevel(LEVELS[0], 0);
