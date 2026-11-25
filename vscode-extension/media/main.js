import { buildTree } from "./tree.js";

const TAU = Math.PI * 2;
const STORAGE_KEY = "perennial.session.v4";
const MAX_STORED_GAP = 6 * 60 * 60 * 1000;
const GERMINATION_SECONDS = 12;
const TREE_FULL_AT = 8 * 60 * 60;
const GROWTH_CURVE = 120;
const LEAF_BURST_MS = 1500;
const MONO = '"DM Mono", "Cascadia Mono", Menlo, Consolas, monospace';

const STAGES = [
  {
    at: 0,
    name: "GERMINATION",
    label: "SEED",
    caption: "The seed is listening for a reason to begin.",
  },
  {
    at: 20,
    name: "SPROUT",
    label: "SPROUT",
    caption: "A small fracture of green, looking for the sun.",
  },
  {
    at: 600,
    name: "SAPLING",
    label: "SAPLING",
    caption: "It has decided that up is worth the effort.",
  },
  {
    at: 3600,
    name: "YOUNG TREE",
    label: "YOUNG TREE",
    caption: "Branches negotiate their share of the sky.",
  },
  {
    at: 7200,
    name: "CANOPY",
    label: "CANOPY",
    caption: "A private climate is assembling overhead.",
  },
  {
    at: 28800,
    name: "OLD GROWTH",
    label: "OLD GROWTH",
    caption: "What started as syntax is now a silhouette.",
  },
  {
    at: 86400,
    name: "ANCIENT",
    label: "ANCIENT",
    caption: "Still adding to itself, one character at a time.",
  },
];

const FIELD_NOTES = [
  { at: 0, text: "a seed is tucked into the dark." },
  { at: 8, text: "a first root finds the bottom of the world." },
  { at: 30, text: "something green breaks the surface." },
  { at: 600, text: "the first true leaves open." },
  { at: 1800, text: "the trunk commits to a direction." },
  { at: 7200, text: "branches begin to share the light." },
  { at: 28800, text: "the canopy closes over the session." },
  { at: 43200, text: "one more ring, laid down in silence." },
  { at: 86400, text: "old growth. still adding to itself." },
  { at: 172800, text: "a small forest of decisions." },
];

const P = {
  trunk: 1,
  wood: 2,
  branch: 3,
  twig: 4,
  leafA: 5,
  leafB: 6,
  leafC: 7,
  leafNew: 8,
  bloom: 9,
  fruit: 10,
  ground: 11,
  root: 12,
  speck: 13,
};

const SKIES = {
  dawn: {
    label: "DAWN",
    theme: "#0e120a",
    speckAlpha: 0.46,
    fireflies: false,
    palette: [
      "transparent",
      "rgba(222, 190, 139, 0.97)",
      "rgba(155, 158, 105, 0.82)",
      "rgba(124, 139, 94, 0.74)",
      "rgba(99, 119, 84, 0.64)",
      "rgba(236, 244, 157, 0.99)",
      "rgba(192, 220, 131, 0.95)",
      "rgba(143, 181, 111, 0.92)",
      "rgba(255, 247, 190, 1)",
      "rgba(255, 208, 144, 0.99)",
      "rgba(226, 170, 103, 0.97)",
      "rgba(131, 148, 116, 0.58)",
      "rgba(108, 126, 96, 0.42)",
      "rgba(216, 230, 177, 0.26)",
    ],
  },
  day: {
    label: "DAY",
    theme: "#08140d",
    speckAlpha: 0.32,
    fireflies: false,
    palette: [
      "transparent",
      "rgba(190, 171, 126, 0.96)",
      "rgba(100, 127, 88, 0.72)",
      "rgba(85, 114, 78, 0.64)",
      "rgba(74, 100, 69, 0.54)",
      "rgba(208, 247, 143, 0.98)",
      "rgba(168, 214, 116, 0.95)",
      "rgba(126, 175, 102, 0.9)",
      "rgba(238, 255, 188, 1)",
      "rgba(247, 197, 122, 0.99)",
      "rgba(224, 160, 90, 0.97)",
      "rgba(129, 150, 120, 0.58)",
      "rgba(105, 128, 98, 0.42)",
      "rgba(193, 230, 159, 0.22)",
    ],
  },
  dusk: {
    label: "DUSK",
    theme: "#0e0f0a",
    speckAlpha: 0.5,
    fireflies: true,
    palette: [
      "transparent",
      "rgba(219, 177, 133, 0.97)",
      "rgba(153, 136, 94, 0.82)",
      "rgba(122, 118, 84, 0.74)",
      "rgba(97, 101, 75, 0.64)",
      "rgba(227, 221, 130, 0.98)",
      "rgba(191, 195, 114, 0.95)",
      "rgba(145, 161, 101, 0.9)",
      "rgba(255, 226, 155, 1)",
      "rgba(255, 183, 112, 0.99)",
      "rgba(229, 157, 92, 0.97)",
      "rgba(139, 137, 112, 0.58)",
      "rgba(110, 113, 94, 0.42)",
      "rgba(230, 205, 163, 0.28)",
    ],
  },
  night: {
    label: "NIGHT",
    theme: "#050c0b",
    speckAlpha: 1,
    fireflies: true,
    palette: [
      "transparent",
      "rgba(155, 177, 146, 0.92)",
      "rgba(83, 114, 89, 0.72)",
      "rgba(68, 98, 79, 0.66)",
      "rgba(58, 84, 71, 0.55)",
      "rgba(180, 233, 172, 0.94)",
      "rgba(132, 200, 158, 0.91)",
      "rgba(92, 154, 128, 0.86)",
      "rgba(225, 255, 212, 1)",
      "rgba(255, 223, 155, 0.98)",
      "rgba(230, 173, 107, 0.95)",
      "rgba(111, 132, 117, 0.58)",
      "rgba(88, 111, 99, 0.42)",
      "rgba(206, 238, 201, 0.3)",
    ],
  },
};

let skyName = "day";
let PALETTE = SKIES.day.palette;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const VSCODE_MODE = typeof acquireVsCodeApi === "function";

const els = {};
let vscodeApi = null;
let vscodeConnected = false;
let vscodeActive = false;
let lastVscodeSync = 0;
let state;
let tree;
let camera;
let render;
let lastWall = Date.now();
let lastSaveAt = 0;
let lastUiAt = 0;
let resetArmed = false;
let resetTimer = 0;
let feedTimer = 0;
let toastTimer = 0;
let lastNoteKey = "";
let lastStageIndex = -1;
let lastTypedAt = 0;
let firstPausedTyping = false;
let isZen = false;

const uiCache = new Map();
const particles = [];

function init() {
  cacheElements();
  if (VSCODE_MODE) {
    try {
      vscodeApi = acquireVsCodeApi();
    } catch {
      // If the bridge is not available, fall back to a normal local session.
    }
    state = freshState();
    document.body.classList.add("is-vscode");
    document.querySelector(".brand")?.addEventListener("click", (event) => {
      event.preventDefault();
    });
  } else {
    state = loadState();
  }
  tree = buildTree(state.seed);
  camera = { scale: 0, cx: 0, ready: false };
  render = {
    canvas: els.canvas,
    ctx: els.canvas.getContext("2d"),
    W: 0,
    H: 0,
    cols: 0,
    rows: 0,
    fontSize: 14,
    charW: 8,
    lineH: 16,
    offsetX: 0,
    offsetY: 0,
    gridW: 0,
    gridH: 0,
    dpr: 1,
    chars: [],
    colors: null,
    priorities: null,
    canopy: null,
    canopyTmp: null,
    cellX: [],
    cellY: [],
    specks: [],
    visible: null,
    frame: 0,
    glyphs: 0,
    ambientLeaves: 0,
    ready: false,
  };

  bindEvents();
  updateStaticLabels();
  updateSky(true);
  resizeCanvas();
  updateLocalClock();
  updateUI(true);

  if (VSCODE_MODE) {
    window.addEventListener("message", handleVSCodeMessage);
    vscodeApi?.postMessage({ type: "perennial:ready" });
  }

  setInterval(tick, 250);
  setInterval(updateLocalClock, 1000);
  requestAnimationFrame(loop);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      resizeCanvas();
      draw(performance.now());
    });
  }
}

function cacheElements() {
  const ids = [
    "treeCanvas",
    "treeAccessible",
    "stage",
    "stageIndex",
    "stageName",
    "stageCaption",
    "stageHint",
    "fileName",
    "seedShort",
    "localClock",
    "skyPhase",
    "liveChip",
    "liveChipText",
    "growthStatus",
    "statusLight",
    "growthRate",
    "glyphCount",
    "frameCount",
    "sessionDate",
    "sessionTime",
    "sessionState",
    "sessionNote",
    "progressFill",
    "progressStage",
    "progressEta",
    "progressNext",
    "ringMetric",
    "tendedMetric",
    "ageMetric",
    "heightMetric",
    "branchMetric",
    "leafMetric",
    "eventLog",
    "keyCount",
    "feedInput",
    "feedCaret",
    "pauseButton",
    "pauseIcon",
    "pauseLabel",
    "resetButton",
    "resetLabel",
    "copyButton",
    "exportButton",
    "zenButton",
    "zenExit",
    "toast",
    "toastText",
    "session",
    "specimen",
  ];
  for (const id of ids) {
    els[id] = document.getElementById(id);
  }
  els.canvas = els.treeCanvas;
  els.sessionBlock = document.querySelector(".session");
}

function bindEvents() {
  els.feedInput.addEventListener("input", handleTyping);
  els.pauseButton.addEventListener("click", togglePause);
  els.resetButton.addEventListener("click", handleReset);
  els.copyButton.addEventListener("click", copyAscii);
  els.exportButton.addEventListener("click", exportAscii);
  els.stageHint.addEventListener("click", () => els.feedInput.focus());
  els.zenButton.addEventListener("click", toggleZen);
  els.zenExit.addEventListener("click", () => setZen(false));

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pagehide", saveState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveState();
    } else {
      lastWall = Date.now();
      updateLocalClock();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.target.matches("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    if (event.key === "Escape" && isZen) {
      event.preventDefault();
      setZen(false);
      return;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleZen();
    }
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(els.stage);
  }
}

/* ── State ──────────────────────────────────────────────────── */

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      stored &&
      typeof stored.seed === "number" &&
      Number.isFinite(stored.elapsedMs) &&
      Number.isFinite(stored.growthMs)
    ) {
      return {
        seed: stored.seed,
        elapsedMs: Math.max(0, stored.elapsedMs),
        growthMs: Math.max(0, stored.growthMs),
        keys: Math.max(0, Number(stored.keys) || 0),
        paused: Boolean(stored.paused),
        createdAt: Number(stored.createdAt) || Date.now(),
      };
    }
  } catch {
    // A fresh seed is a fine fallback.
  }

  return freshState();
}

function freshState() {
  return {
    seed: makeSeed(),
    // Every specimen begins as a seed in the dark.
    elapsedMs: 0,
    growthMs: 0,
    keys: 0,
    paused: false,
    createdAt: Date.now(),
  };
}

function saveState() {
  if (VSCODE_MODE) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        seed: state.seed,
        elapsedMs: Math.round(state.elapsedMs),
        growthMs: Math.round(state.growthMs),
        keys: state.keys,
        paused: state.paused,
        createdAt: state.createdAt,
      })
    );
    lastSaveAt = Date.now();
  } catch {
    // Storage can be unavailable in private contexts. The tree keeps growing.
  }
}

function makeSeed() {
  if (window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return buffer[0] >>> 0;
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function tick() {
  const now = Date.now();

  if (VSCODE_MODE) {
    lastWall = now;
    if (now - lastUiAt > 240) {
      updateUI();
      lastUiAt = now;
    }
    return;
  }

  const delta = Math.min(MAX_STORED_GAP, Math.max(0, now - lastWall));
  lastWall = now;

  if (!state.paused) {
    state.elapsedMs += delta;
    state.growthMs += delta;
  }

  if (now - lastSaveAt > 2200) {
    saveState();
  }

  if (now - lastUiAt > 240) {
    updateUI();
    lastUiAt = now;
  }
}

function handleVSCodeMessage(event) {
  const message = event.data;
  if (!message || message.type !== "perennial:sync") return;

  const wasConnected = vscodeConnected;
  const previousSeed = state.seed;
  vscodeConnected = true;
  vscodeActive = Boolean(message.active);
  lastVscodeSync = Date.now();

  const nextSeed = Number(message.seed);
  if (Number.isFinite(nextSeed) && nextSeed !== state.seed) {
    state.seed = nextSeed >>> 0;
    tree = buildTree(state.seed);
    camera = { scale: 0, cx: 0, ready: false };
    render.specks = makeSpecks(render.cols, render.rows, state.seed);
    particles.length = 0;
    lastNoteKey = "";
    lastStageIndex = -1;
    uiCache.clear();
    handleTyping.previous = "";
    els.feedInput.value = "";
  }

  state.elapsedMs = Math.max(0, Number(message.elapsedMs) || 0);
  state.growthMs = Math.max(0, Number(message.growthMs) || 0);
  state.keys = Math.max(0, Number(message.keys) || 0);
  state.paused = Boolean(message.paused);
  state.createdAt = Number(message.createdAt) || state.createdAt;

  updateStaticLabels();
  updateUI(true);

  if (!wasConnected) {
    showToast("VS Code time connected. Your editor is feeding the tree.");
  } else if (previousSeed !== state.seed && state.elapsedMs === 0) {
    showToast(`a new seed from VS Code. specimen ${seedHex(state.seed)}.`);
  }
}

/* ── Clock mapping ──────────────────────────────────────────── */

function growthClock() {
  const seconds = state.growthMs / 1000;
  const activeSeconds = Math.max(0, seconds - GERMINATION_SECONDS);
  const normalized =
    Math.log1p(activeSeconds / GROWTH_CURVE) /
    Math.log1p(TREE_FULL_AT / GROWTH_CURVE);
  const clamped = clamp(normalized, 0, 1);
  const late = Math.max(0, activeSeconds - TREE_FULL_AT) * 0.7;
  return {
    clock: clamped * tree.completion + late,
    progress: clamped,
    seconds,
  };
}

function currentStage(seconds) {
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (seconds >= candidate.at) stage = candidate;
  }
  return stage;
}

function stageProgress(seconds) {
  const currentIndex = STAGES.findLastIndex((stage) => seconds >= stage.at);
  const current = STAGES[Math.max(0, currentIndex)];
  const next = STAGES[currentIndex + 1];
  if (!next) return { ratio: 1, current, next: null };
  const ratio = clamp((seconds - current.at) / (next.at - current.at), 0, 1);
  return { ratio, current, next };
}

/* ── Canvas sizing ──────────────────────────────────────────── */

function resizeCanvas() {
  if (!render || !render.canvas) return;
  const rect = els.stage.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const fontSize = clamp(
    8.5,
    Math.min(15.5, height / 43 / 1.1, width / 62 / 0.6),
    15.5
  );
  const charW = fontSize * 0.6;
  const lineH = fontSize * 1.1;
  const cols = Math.max(30, Math.floor((width - 18) / charW));
  const rows = Math.max(20, Math.floor((height - 18) / lineH));
  const gridW = cols * charW;
  const gridH = rows * lineH;

  render.W = width;
  render.H = height;
  render.dpr = dpr;
  render.fontSize = fontSize;
  render.charW = charW;
  render.lineH = lineH;
  render.cols = cols;
  render.rows = rows;
  render.offsetX = (width - gridW) / 2;
  render.offsetY = (height - gridH) / 2;
  render.gridW = gridW;
  render.gridH = gridH;

  render.canvas.width = Math.round(width * dpr);
  render.canvas.height = Math.round(height * dpr);
  render.canvas.style.width = `${width}px`;
  render.canvas.style.height = `${height}px`;

  const count = cols * rows;
  render.chars = new Array(count).fill("");
  render.colors = new Uint8Array(count);
  render.priorities = new Uint8Array(count);
  render.canopy = new Float32Array(count);
  render.canopyTmp = new Float32Array(count);
  render.cellX = new Array(cols);
  render.cellY = new Array(rows);

  for (let col = 0; col < cols; col += 1) {
    render.cellX[col] = render.offsetX + (col + 0.5) * charW;
  }
  for (let row = 0; row < rows; row += 1) {
    render.cellY[row] = render.offsetY + (row + 0.54) * lineH;
  }

  render.specks = makeSpecks(cols, rows, state.seed);
  camera.ready = false;
  render.ready = true;

  draw(performance.now());
}

function makeSpecks(cols, rows, seed) {
  const specks = [];
  let value = seed || 1;
  const random = () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
  const amount = clamp(Math.floor(cols / 7), 9, 22);
  for (let i = 0; i < amount; i += 1) {
    specks.push({
      col: 1 + Math.floor(random() * (cols - 2)),
      row: 1 + Math.floor(random() * Math.max(1, rows * 0.58)),
      phase: random() * TAU,
      speed: 0.00018 + random() * 0.00036,
      char: random() > 0.78 ? "+" : ".",
      tone: random() > 0.5 ? 13 : 4,
    });
  }
  return specks;
}

/* ── Drawing ────────────────────────────────────────────────── */

function loop(now) {
  requestAnimationFrame(loop);
  if (!render || !render.ready) return;
  if (now - (loop.lastDraw || 0) < 32) return;
  loop.lastDraw = now;
  draw(now);
}

function draw(now) {
  if (!render || !render.ready) return;
  const ctx = render.ctx;
  const growth = growthClock();

  const visible = measureVisible(growth.clock);
  render.visible = visible;
  updateCamera(visible);

  clearGrid();
  const seeding = state.elapsedMs < (GERMINATION_SECONDS + 8) * 1000;
  drawSoil(growth.clock, seeding);
  drawBranches(growth.clock, now);
  drawAmbientCrown(growth.clock, now);
  drawEarlyLeaves(growth.clock, now);
  drawLeaves(growth.clock, now);
  drawCanopyFill(growth.clock);
  drawBlossoms(growth.clock, now);

  ctx.setTransform(render.dpr, 0, 0, render.dpr, 0, 0);
  ctx.clearRect(0, 0, render.W, render.H);
  drawGerminationGlow(ctx, now, seeding);
  drawSpecks(ctx, now);
  paintGrid(ctx);
  drawFireflies(ctx, now);
  drawParticles(ctx, now);

  render.frame += 1;
}

function clearGrid() {
  render.chars.fill("");
  render.colors.fill(0);
  render.priorities.fill(0);
  render.canopy.fill(0);
}

function setCell(col, row, char, color, priority) {
  if (col < 0 || row < 0 || col >= render.cols || row >= render.rows) return false;
  const index = row * render.cols + col;
  if (priority < render.priorities[index]) return false;
  render.chars[index] = char;
  render.colors[index] = color;
  render.priorities[index] = priority;
  return true;
}

function measureVisible(clock) {
  let minX = 0;
  let maxX = 0;
  let maxY = 0;
  let branches = 0;
  let leaves = 0;
  let blossoms = 0;

  for (const branch of tree.branches) {
    const progress = clamp((clock - branch.start) / branch.duration, 0, 1);
    if (progress <= 0) continue;
    branches += 1;
    const maxIndex = Math.max(
      1,
      Math.ceil(progress * (branch.points.length - 1))
    );
    for (let i = 0; i < maxIndex; i += 1) {
      const point = branch.points[i];
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }

  for (const leaf of tree.leaves) {
    if (leaf.born > clock) continue;
    if (leaf.y < tree.fullHeight * 0.28) continue;
    leaves += 1;
    if (leaf.x < minX) minX = leaf.x;
    if (leaf.x > maxX) maxX = leaf.x;
    if (leaf.y > maxY) maxY = leaf.y;
  }

  for (const blossom of tree.blossoms) {
    if (blossom.born > clock) continue;
    blossoms += 1;
    if (blossom.x < minX) minX = blossom.x;
    if (blossom.x > maxX) maxX = blossom.x;
    if (blossom.y > maxY) maxY = blossom.y;
  }

  return { minX, maxX, maxY, branches, leaves, blossoms };
}

function updateCamera(visible) {
  const { W, H } = render;
  const sidePad = clamp(W * 0.032, 10, 48);
  const topPad = clamp(H * 0.09, 34, 72);
  const basePad = clamp(H * 0.085, 36, 68);
  const baseY = H - basePad;
  const availableW = W - sidePad * 2;
  const availableH = baseY - topPad;

  const minimumHeight = tree.fullHeight * (W < 540 ? 0.52 : 0.48);
  const minimumWidth = tree.fullWidth * (W < 540 ? 0.24 : 0.18);
  const worldHeight = Math.max(visible.maxY, minimumHeight) * 1.02;
  const worldWidth = Math.max(visible.maxX - visible.minX, minimumWidth) * 1.02;
  const targetScale = Math.min(
    availableW / worldWidth,
    availableH / worldHeight
  );
  const targetCx = (visible.minX + visible.maxX) / 2;

  camera.baseY = baseY;
  if (!camera.ready) {
    camera.scale = targetScale;
    camera.cx = targetCx;
    camera.ready = true;
  } else {
    camera.scale += (targetScale - camera.scale) * 0.045;
    camera.cx += (targetCx - camera.cx) * 0.04;
  }
}

function project(x, y, swayPx = 0) {
  return {
    px: render.W / 2 + (x - camera.cx) * camera.scale + swayPx,
    py: camera.baseY - y * camera.scale,
  };
}

function drawBranches(clock, now) {
  for (const branch of tree.branches) {
    if (branch.depth >= 2) continue;
    const progress = clamp((clock - branch.start) / branch.duration, 0, 1);
    if (progress <= 0) continue;

    const pointCount = branch.points.length;
    const lastIndex = Math.floor(progress * (pointCount - 1));
    const remainder = progress * (pointCount - 1) - lastIndex;
    const points = branch.points;
    const tip = {
      x: points[lastIndex].x,
      y: points[lastIndex].y,
    };
    if (lastIndex < pointCount - 1) {
      const next = points[lastIndex + 1];
      tip.x += (next.x - tip.x) * remainder;
      tip.y += (next.y - tip.y) * remainder;
    }

    let color;
    if (branch.depth === 0) color = P.trunk;
    else if (branch.depth === 1) color = P.branch;
    else color = P.twig;

    if (branch.depth === 1 && clock < branch.end + 1.1) {
      color = P.wood;
    }

    const priority = branch.depth === 0 ? 9 : 5;
    let previousPoint = points[0];
    let previous = project(
      previousPoint.x,
      previousPoint.y,
      branchSway(branch, previousPoint, now)
    );

    for (let i = 1; i <= lastIndex; i += 1) {
      const point = points[i];
      const current = project(point.x, point.y, branchSway(branch, point, now));
      rasterLine(previous, current, color, priority);
      previous = current;
    }

    if (progress < 1) {
      const current = project(tip.x, tip.y, branchSway(branch, tip, now));
      rasterLine(previous, current, color, priority);
    }

    // A mature trunk should not look like a thread. Add a second column
    // below the crown, where the wood is widest.
    if (branch.depth === 0 && clock > 3.4) {
      const limit = Math.min(lastIndex, Math.floor(points.length * 0.44));
      for (let i = 0; i <= limit; i += 1) {
        const point = points[i];
        const projected = project(
          point.x,
          point.y,
          branchSway(branch, point, now)
        );
        const col = Math.floor(
          projected.px / render.charW - render.offsetX / render.charW
        );
        const row = Math.floor(
          projected.py / render.lineH - render.offsetY / render.lineH
        );
        setCell(col + 1, row, "|", P.wood, 9);
      }
    }
  }
}

function branchSway(branch, point, now) {
  if (reduceMotion) return 0;
  const heightRatio = clamp(point.y / tree.fullHeight, 0, 1);
  return (
    Math.sin(now * 0.00052 + branch.phase + point.y * 2.8) *
    (0.18 + 1.5 * heightRatio * heightRatio)
  );
}

function rasterLine(a, b, color, priority) {
  const c0 = Math.floor(a.px / render.charW - render.offsetX / render.charW);
  const r0 = Math.floor(a.py / render.lineH - render.offsetY / render.lineH);
  const c1 = Math.floor(b.px / render.charW - render.offsetX / render.charW);
  const r1 = Math.floor(b.py / render.lineH - render.offsetY / render.lineH);

  const dc = c1 - c0;
  const dr = r1 - r0;
  const adc = Math.abs(dc);
  const adr = Math.abs(dr);
  const pixelX = Math.abs(b.px - a.px);
  const pixelY = Math.abs(b.py - a.py);

  let glyph;
  if (adc === 0 && adr === 0) return;
  if (pixelY > pixelX * 1.65) glyph = "|";
  else if (pixelX > pixelY * 1.65) glyph = "-";
  else glyph = dc * dr < 0 ? "/" : "\\";

  let col = c0;
  let row = r0;
  const stepC = dc > 0 ? 1 : -1;
  const stepR = dr > 0 ? 1 : -1;
  let error = adc - adr;

  while (true) {
    setCell(col, row, glyph, color, priority);
    if (col === c1 && row === r1) break;
    const doubled = error * 2;
    if (doubled > -adr) {
      error -= adr;
      col += stepC;
    }
    if (doubled < adc) {
      error += adc;
      row += stepR;
    }
  }
}

function drawEarlyLeaves(clock, now) {
  if (clock <= 0.2 || clock > 18) return;
  const trunk = tree.branches[0];
  if (!trunk) return;

  const progress = clamp((clock - trunk.start) / trunk.duration, 0, 1);
  if (progress <= 0) return;

  const points = trunk.points;
  const exact = progress * (points.length - 1);
  const index = Math.floor(exact);
  const next = Math.min(points.length - 1, index + 1);
  const amount = exact - index;
  const tip = {
    x: points[index].x + (points[next].x - points[index].x) * amount,
    y: points[index].y + (points[next].y - points[index].y) * amount,
  };
  const projected = project(tip.x, tip.y, branchSway(trunk, tip, now));
  const col = Math.floor(
    projected.px / render.charW - render.offsetX / render.charW
  );
  const row = Math.floor(
    projected.py / render.lineH - render.offsetY / render.lineH
  );

  const life = clamp((clock - 0.2) / 8, 0, 1);
  const reach = life > 0.15 ? 2 : 1;
  const leafA = clock < 5 ? P.leafNew : P.leafA;
  const leafB = clock < 5 ? P.leafA : P.leafB;

  setCell(col, row - 1, "'", P.leafNew, 9);
  setCell(col - reach, row - 2, "*", leafA, 9);
  setCell(col + reach, row - 2, "&", leafB, 9);
  setCell(col - 1, row - 1, "\\", P.branch, 5);
  setCell(col + 1, row - 1, "/", P.branch, 5);

  if (life > 0.12) {
    setCell(col - reach, row, ",", leafB, 6);
    setCell(col + reach, row, "`", leafB, 6);
  }
  if (life > 0.58) {
    setCell(col - 1, row - 3, "'", leafA, 6);
    setCell(col + 1, row - 3, "&", leafB, 6);
  }
}

function drawFireflies(ctx, now) {
  if (!SKIES[skyName].fireflies) return;
  ctx.font = `${render.fontSize}px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const count = skyName === "night" ? 11 : 6;
  for (let i = 0; i < count; i += 1) {
    const h1 = Math.sin(i * 91.7 + tree.seed * 0.013) * 43758.5453;
    const h2 = Math.sin(i * 47.3 + tree.seed * 0.029) * 12543.123;
    const f1 = h1 - Math.floor(h1);
    const f2 = h2 - Math.floor(h2);
    const x =
      render.W * (0.16 + f1 * 0.68) +
      Math.sin(now * 0.00045 + i * 1.7) * 22;
    const y =
      render.H * (0.22 + f2 * 0.44) +
      Math.cos(now * 0.00038 + i * 2.2) * 14;
    const glow = 0.5 + 0.5 * Math.sin(now * 0.0011 + i * 2.4);

    ctx.globalAlpha = 0.12 + glow * 0.32;
    ctx.fillStyle = i % 3 === 0 ? PALETTE[P.bloom] : PALETTE[P.leafNew];
    ctx.fillText(i % 4 === 0 ? "*" : ".", x, y);
  }
  ctx.globalAlpha = 1;
}

function drawAmbientCrown(clock, now) {
  render.ambientLeaves = 0;
  if (clock < 1.1) return;
  const progress = clamp(clock / tree.completion, 0, 1);
  if (progress > 0.82) return;

  const patterns = [
    [
      [0, -1],
      [-1, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [0, -2],
      [-2, -1],
      [2, -1],
    ],
    [
      [0, -1],
      [0, -2],
      [-1, 0],
      [1, 0],
      [-2, -1],
      [2, -1],
      [-1, -2],
      [1, -2],
    ],
    [
      [-1, -1],
      [0, -2],
      [1, -1],
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, -2],
      [2, -2],
    ],
  ];
  const foliage = ["&", "&", "&", "&", "*", "*", "o", "'", ".", ","];
  let placed = 0;

  for (const branch of tree.branches) {
    if (branch.depth < 2 || placed > 360) continue;
    const branchProgress = clamp(
      (clock - branch.start) / branch.duration,
      0,
      1
    );
    if (branchProgress < 0.34) continue;

    let hash = Math.imul(branch.id ^ tree.seed, 2654435761) >>> 0;
    hash = (hash ^ (hash >>> 13)) >>> 0;
    if ((hash & 3) === 0) continue;

    const points = branch.points;
    const exact = branchProgress * (points.length - 1);
    const index = Math.floor(exact);
    const next = Math.min(points.length - 1, index + 1);
    const amount = exact - index;
    const point = {
      x: points[index].x + (points[next].x - points[index].x) * amount,
      y: points[index].y + (points[next].y - points[index].y) * amount,
    };
    if (render.visible && point.y < render.visible.maxY * 0.38) continue;

    const projected = project(point.x, point.y, branchSway(branch, point, now));
    const tipCol = Math.floor(
      projected.px / render.charW - render.offsetX / render.charW
    );
    const tipRow = Math.floor(
      projected.py / render.lineH - render.offsetY / render.lineH
    );

    const pattern = patterns[hash % patterns.length];
    for (let i = 0; i < pattern.length; i += 1) {
      const offset = pattern[i];
      const color =
        i === 0
          ? P.leafNew
          : [P.leafA, P.leafB, P.leafC][(hash >>> (i + 3)) % 3];
      const glyph = foliage[(hash >>> (i + 9)) % foliage.length];
      if (setCell(tipCol + offset[0], tipRow + offset[1], glyph, color, 6)) {
        placed += 1;
        render.ambientLeaves += 1;
      }
    }
  }
}

function drawLeaves(clock, now) {
  for (const leaf of tree.leaves) {
    if (leaf.born > clock) continue;
    if (leaf.y < tree.fullHeight * 0.28) continue;
    const wind = reduceMotion
      ? 0
      : Math.sin(now * 0.00078 + leaf.phase + leaf.y * 4.2) * 0.42 +
        Math.sin(now * 0.0014 + leaf.phase * 0.7) * 0.12;
    const projected = project(leaf.x + wind * 0.0035, leaf.y);
    const col = Math.floor(
      projected.px / render.charW - render.offsetX / render.charW
    );
    const row = Math.floor(
      projected.py / render.lineH - render.offsetY / render.lineH
    );

    if (
      col >= 0 &&
      col < render.cols &&
      row >= 0 &&
      row < render.rows &&
      clock - leaf.born > 0.6
    ) {
      const index = row * render.cols + col;
      render.canopy[index] += 1;
      if (col > 0) render.canopy[index - 1] += 0.4;
      if (col < render.cols - 1) render.canopy[index + 1] += 0.4;
      if (row > 0) render.canopy[index - render.cols] += 0.35;
      if (row < render.rows - 1) render.canopy[index + render.cols] += 0.35;
    }

    let color;
    if (clock - leaf.born < 2.2) color = P.leafNew;
    else if (leaf.tone === 0) color = P.leafA;
    else if (leaf.tone === 1) color = P.leafB;
    else if (leaf.tone === 2) color = P.leafC;
    else color = P.leafNew;

    setCell(col, row, leaf.glyph, color, 6);

    // A crown is not made of single pixels. Soften the edge of each leaf.
    if (clock - leaf.born > 1.4) {
      const hash = Math.sin(leaf.phase * 91.7 + leaf.x * 311.3) * 43758.5453;
      const fraction = hash - Math.floor(hash);
      if (fraction > 0.36) {
        const offsets = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [1, -1],
          [-1, 1],
          [0, -1],
        ];
        const pickOffset = offsets[Math.floor((fraction * 97) % offsets.length)];
        const neighbourGlyph = fraction > 0.7 ? "." : "'";
        setCell(
          col + pickOffset[0],
          row + pickOffset[1],
          neighbourGlyph,
          color,
          6
        );
      }
      if (fraction > 0.81) {
        setCell(col, row - 1, ",", color, 6);
      }
    }
  }
}

function drawCanopyFill(clock) {
  if (clock < 7) return;

  let source = render.canopy;
  let target = render.canopyTmp;
  const { cols, rows } = render;

  // A soft density field turns individual leaves into a continuous crown.
  for (let pass = 0; pass < 4; pass += 1) {
    for (let row = 0; row < rows; row += 1) {
      const rowOffset = row * cols;
      for (let col = 0; col < cols; col += 1) {
        const index = rowOffset + col;
        let sum = source[index] * 2;
        let count = 2;
        if (col > 0) {
          sum += source[index - 1];
          count += 1;
        }
        if (col < cols - 1) {
          sum += source[index + 1];
          count += 1;
        }
        if (row > 0) {
          sum += source[index - cols];
          count += 1;
        }
        if (row < rows - 1) {
          sum += source[index + cols];
          count += 1;
        }
        target[index] = sum / count;
      }
    }
    const swap = source;
    source = target;
    target = swap;
  }

  const baseRow = Math.floor(
    (camera.baseY - render.offsetY) / render.lineH
  );
  const palette = [P.leafC, P.leafB, P.leafA, P.leafC, P.leafB];
  const glyphs = ["&", "&", "*", "o", "'", ".", ","];

  for (let row = 0; row < Math.min(rows, baseRow - 1); row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = row * cols + col;
      if (source[index] < 0.11) continue;
      if (render.priorities[index] >= 7) continue;

      let hash = Math.imul(index + tree.seed, 2654435761) >>> 0;
      hash ^= hash >>> 13;
      const noise = (hash >>> 0) / 4294967296;
      if (noise < 0.18) continue;

      const glyph = glyphs[(hash >>> 8) % glyphs.length];
      const color = palette[(hash >>> 12) % palette.length];
      setCell(col, row, glyph, color, 6);
    }
  }
}

function drawBlossoms(clock, now) {
  for (const blossom of tree.blossoms) {
    if (blossom.born > clock) continue;
    const jitter = reduceMotion
      ? 0
      : Math.sin(now * 0.0009 + blossom.phase) * 0.0018;
    const point = project(blossom.x + jitter, blossom.y);
    const col = Math.floor(
      point.px / render.charW - render.offsetX / render.charW
    );
    const row = Math.floor(
      point.py / render.lineH - render.offsetY / render.lineH
    );
    setCell(
      col,
      row,
      blossom.glyph,
      blossom.kind === "fruit" ? P.fruit : P.bloom,
      8
    );
  }
}

function drawSoil(clock, seeding) {
  const baseRow = Math.floor(
    (camera.baseY - render.offsetY) / render.lineH
  );
  const centerCol = Math.floor(
    (render.W / 2 - render.offsetX) / render.charW
  );
  const spread = Math.min(46, Math.floor(render.cols * 0.42));
  let seed = tree.seed || 1;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let offset = -spread; offset <= spread; offset += 1) {
    const chance = random();
    if (chance < 0.43) continue;
    const col = centerCol + offset;
    const row = baseRow + (chance > 0.88 ? 1 : 0);
    setCell(col, row, chance > 0.91 ? "," : ".", P.ground, 1);
  }

  const tufts = 8;
  for (let i = 0; i < tufts; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const distance = 3 + Math.floor(random() * Math.max(4, spread * 0.6));
    const col = centerCol + side * distance;
    const row = baseRow - 1;
    const char = random() > 0.5 ? "'" : ",";
    setCell(col, row, char, P.ground, 1);
    if (random() > 0.64) {
      setCell(col + 1, row - 1, random() > 0.5 ? "|" : "'", P.ground, 1);
    }
  }

  // Roots, barely visible below the soil line.
  const roots = [
    { dx: 0, dy: 1, char: "|" },
    { dx: -1, dy: 1, char: "\\" },
    { dx: 1, dy: 1, char: "/" },
    { dx: -3, dy: 2, char: "\\" },
    { dx: 3, dy: 2, char: "/" },
    { dx: -2, dy: 2, char: "." },
    { dx: 2, dy: 2, char: "." },
  ];
  if (clock > 1.2) {
    for (const root of roots) {
      setCell(centerCol + root.dx, baseRow + root.dy, root.char, P.root, 1);
    }
  }

  if (seeding) {
    // A seed, drawn as a small lit pod above the soil line.
    setCell(centerCol - 1, baseRow - 3, ".", P.trunk, 7);
    setCell(centerCol, baseRow - 3, "-", P.trunk, 7);
    setCell(centerCol + 1, baseRow - 3, ".", P.trunk, 7);
    setCell(centerCol - 2, baseRow - 2, "(", P.trunk, 7);
    setCell(centerCol, baseRow - 2, "o", P.bloom, 7);
    setCell(centerCol + 2, baseRow - 2, ")", P.trunk, 7);
    setCell(centerCol - 1, baseRow - 1, "`", P.root, 7);
    setCell(centerCol, baseRow - 1, "-", P.root, 7);
    setCell(centerCol + 1, baseRow - 1, "'", P.root, 7);
    setCell(centerCol, baseRow, "|", P.root, 7);
  }
}

function drawGerminationGlow(ctx, now, seeding) {
  if (!seeding) return;
  const ground = project(0, 0);
  const x = ground.px;
  const y = ground.py - render.lineH * 1.7;
  const pulse = reduceMotion ? 1 : 0.86 + 0.14 * Math.sin(now * 0.0018);
  const radius = Math.max(42, render.charW * 8);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `rgba(232, 190, 122, ${0.22 * pulse})`);
  glow.addColorStop(0.38, `rgba(198, 241, 132, ${0.08 * pulse})`);
  glow.addColorStop(1, "rgba(7, 16, 11, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawSpecks(ctx, now) {
  ctx.font = `${render.fontSize}px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const speck of render.specks) {
    const twinkle = 0.45 + 0.55 * Math.sin(now * speck.speed + speck.phase);
    ctx.globalAlpha =
      (0.18 + twinkle * 0.38) * SKIES[skyName].speckAlpha;
    ctx.fillStyle = PALETTE[speck.tone];
    ctx.fillText(speck.char, render.cellX[speck.col], render.cellY[speck.row]);
  }
  ctx.globalAlpha = 1;
}

function paintGrid(ctx) {
  let glyphs = 0;
  for (let color = 1; color < PALETTE.length; color += 1) {
    let started = false;
    for (let index = 0; index < render.chars.length; index += 1) {
      if (!render.chars[index] || render.colors[index] !== color) continue;
      if (!started) {
        ctx.fillStyle = PALETTE[color];
        started = true;
      }
      const col = index % render.cols;
      const row = Math.floor(index / render.cols);
      ctx.fillText(render.chars[index], render.cellX[col], render.cellY[row]);
      glyphs += 1;
    }
  }
  render.glyphs = glyphs;
}

function emitParticles(count) {
  const visible = render.visible;
  if (!visible) return;
  const top = Math.max(visible.maxY, tree.fullHeight * 0.16);
  const center = (visible.minX + visible.maxX) / 2;
  const width = Math.max(visible.maxX - visible.minX, tree.fullWidth * 0.16);
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: center + (Math.random() - 0.5) * width * 0.75,
      y: top * (0.5 + Math.random() * 0.6),
      born: performance.now(),
      life: 900 + Math.random() * 900,
      phase: Math.random() * TAU,
      char: Math.random() > 0.45 ? "+" : Math.random() > 0.5 ? "'" : "*",
    });
  }
  while (particles.length > 45) particles.shift();
}

function drawParticles(ctx, now) {
  ctx.font = `${render.fontSize}px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    const age = now - particle.born;
    if (age > particle.life) {
      particles.splice(i, 1);
      continue;
    }
    const ratio = age / particle.life;
    const drift = Math.sin(now * 0.0013 + particle.phase) * 7;
    const point = project(
      particle.x + ratio * 0.014,
      particle.y + ratio * 0.045
    );
    ctx.globalAlpha = (1 - ratio) * 0.8;
    ctx.fillStyle = ratio < 0.5 ? PALETTE[P.leafNew] : PALETTE[P.leafA];
    ctx.fillText(particle.char, point.px + drift, point.py);
  }
  ctx.globalAlpha = 1;
}

/* ── Interface ──────────────────────────────────────────────── */

function updateUI(force = false) {
  if (!state || !tree) return;
  const now = Date.now();
  const seconds = state.elapsedMs / 1000;
  const stage = currentStage(seconds);
  const progress = stageProgress(seconds);
  const growth = growthClock();
  const visible = render.visible || { branches: 0, leaves: 0, maxY: 0 };
  const totalLeaves = visible.leaves + (render.ambientLeaves || 0);

  const sessionText = formatClock(state.elapsedMs);
  const vscodeStale =
    VSCODE_MODE && (!vscodeConnected || now - lastVscodeSync > 6500);
  const liveLabel = state.paused
    ? "PAUSED"
    : VSCODE_MODE
      ? vscodeStale
        ? "SYNC"
        : vscodeActive
          ? "VS CODE"
          : "IDLE"
      : "LIVE";
  const statusLabel = state.paused
    ? "PAUSED"
    : VSCODE_MODE
      ? vscodeStale
        ? "WAITING"
        : vscodeActive
          ? "CODING"
          : "IDLE"
      : "GROWING";

  setText(els.sessionTime, sessionText);
  setText(els.stageName, stage.name);
  setText(els.stageCaption, stage.caption);
  setText(els.stageIndex, String(STAGES.indexOf(stage) + 1).padStart(2, "0"));
  setText(els.progressStage, stage.label);
  setText(els.progressNext, progress.next ? progress.next.label : "NO END");
  setText(
    els.progressEta,
    progress.next
      ? `IN ${formatRemaining(progress.next.at - seconds)}`
      : "—"
  );
  els.progressFill.style.width = `${(progress.ratio * 100).toFixed(1)}%`;
  setText(
    els.ringMetric,
    String(1 + Math.floor(seconds / 3600)).padStart(2, "0")
  );
  setText(els.tendedMetric, formatTended(seconds));
  setText(els.growthStatus, statusLabel);
  setText(
    els.growthRate,
    state.paused || (VSCODE_MODE && !vscodeActive)
      ? "—"
      : now - lastTypedAt < 1500
        ? "1.8×"
        : "1.0×"
  );
  setText(els.liveChipText, liveLabel);
  els.liveChip.dataset.state = state.paused
    ? "paused"
    : VSCODE_MODE && !vscodeActive
      ? "idle"
      : "live";
  els.statusLight.classList.toggle(
    "is-paused",
    state.paused || (VSCODE_MODE && !vscodeActive)
  );
  els.sessionBlock.classList.toggle("is-paused", state.paused);

  let stateLabel;
  let noteLabel;
  if (state.paused) {
    stateLabel = "PAUSED";
    noteLabel = "growth suspended";
  } else if (VSCODE_MODE) {
    stateLabel = vscodeStale ? "WAITING" : vscodeActive ? "CODING" : "IDLE";
    noteLabel = vscodeStale
      ? "waiting for VS Code"
      : vscodeActive
        ? "synced with VS Code time"
        : "focus VS Code to grow";
  } else {
    stateLabel = now - lastTypedAt < 1500 ? "FEEDING" : "FOCUS";
    noteLabel =
      now - lastTypedAt < 1500
        ? "typing accelerates growth"
        : "growing in real time";
  }
  setText(els.sessionState, null, stateLabel);
  setText(els.sessionNote, noteLabel);

  setText(els.ageMetric, formatAge(seconds));
  setText(els.heightMetric, formatHeight(visible.maxY));
  setText(els.branchMetric, formatCount(visible.branches));
  setText(els.leafMetric, formatCount(totalLeaves));
  setText(els.keyCount, `${formatCount(state.keys)} ${state.keys === 1 ? "key" : "keys"}`);
  setText(els.glyphCount, formatCount(render.glyphs || 0));
  setText(els.frameCount, String(render.frame || 0).padStart(6, "0"));
  setText(els.seedShort, seedHex(state.seed));
  setText(els.fileName, `specimen_${seedHex(state.seed)}.txt`);

  if (lastStageIndex !== STAGES.indexOf(stage)) {
    lastStageIndex = STAGES.indexOf(stage);
    els.stageCaption.animate(
      [
        { opacity: 0, transform: "translateY(4px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 520, easing: "cubic-bezier(.22,.61,.36,1)" }
    );
  }

  updateNotes(seconds);
  updatePauseUI();

  if (force || now - (updateUI.lastAriaAt || 0) > 7000) {
    updateUI.lastAriaAt = now;
    const summary = `${stage.name.toLowerCase()}. Session ${sessionText}. ${
      visible.branches
    } branches, ${totalLeaves} leaves.`;
    els.canvas.setAttribute("aria-label", `Live ASCII tree. ${summary}`);
    els.treeAccessible.textContent = summary;
  }

  if (force || Math.floor(seconds) !== updateUI.lastTitleSecond) {
    updateUI.lastTitleSecond = Math.floor(seconds);
    document.title = `${sessionText} · perennial`;
  }

  // Keeps a reference so future versions don't accidentally drop growth state.
  void growth;
}

function setText(element, value, alternate) {
  if (!element) return;
  const next = value === null ? alternate : value;
  if (uiCache.get(element) === next) return;
  uiCache.set(element, next);
  if (value === null) {
    const dot = element.querySelector(".session__dot");
    if (dot) {
      element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = "";
      });
      const textNode = document.createTextNode(` ${next}`);
      element.appendChild(textNode);
    } else {
      element.textContent = next;
    }
    return;
  }
  element.textContent = next;
}

function updateNotes(seconds) {
  const triggered = FIELD_NOTES.filter((note) => seconds >= note.at);
  const shown = triggered.slice(-3);
  const key = shown.map((note) => note.at).join("|");
  if (key === lastNoteKey) return;
  lastNoteKey = key;

  els.eventLog.replaceChildren();
  for (const note of shown) {
    const item = document.createElement("li");
    item.className = "note is-fresh";
    const time = document.createElement("span");
    time.className = "note__time";
    time.textContent = formatShortTime(note.at);
    const text = document.createElement("span");
    text.className = "note__text";
    text.textContent = note.text;
    item.append(time, text);
    els.eventLog.append(item);
  }

  for (let i = shown.length; i < 3; i += 1) {
    const item = document.createElement("li");
    item.className = "note note--waiting";
    const time = document.createElement("span");
    time.className = "note__time";
    time.textContent = "--:--";
    const text = document.createElement("span");
    text.className = "note__text";
    text.textContent = "waiting for time to pass.";
    item.append(time, text);
    els.eventLog.append(item);
  }
}

function updatePauseUI() {
  els.pauseButton.setAttribute("aria-pressed", String(state.paused));
  setText(els.pauseLabel, state.paused ? "resume growth" : "pause growth");
  els.pauseIcon.innerHTML = state.paused
    ? '<path d="M5 3l8 5-8 5z"/>'
    : '<path d="M5 3v10M11 3v10"/>';
  els.feedInput.disabled = false;
  els.stage.classList.toggle("is-paused", state.paused);
}

function updateStaticLabels() {
  els.sessionDate.textContent = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(state.createdAt))
    .toUpperCase();
  els.localClock.dateTime = new Date().toISOString();
}

function updateLocalClock() {
  if (!els.localClock) return;
  const now = new Date();
  els.localClock.textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  els.localClock.dateTime = now.toISOString();
  updateSky();
}

function skyPhaseFor(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function updateSky(force = false) {
  const next = skyPhaseFor(new Date());
  if (!force && next === skyName) return;
  skyName = next;
  PALETTE = SKIES[skyName].palette;
  document.body.dataset.sky = skyName;
  if (els.skyPhase) {
    els.skyPhase.textContent = SKIES[skyName].label;
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", SKIES[skyName].theme);
  }
  if (render && render.ready) {
    draw(performance.now());
  }
}

function toggleZen() {
  setZen(!isZen);
}

function setZen(next) {
  if (next === isZen) return;
  isZen = next;
  document.body.classList.toggle("is-zen", isZen);
  els.zenButton.setAttribute("aria-pressed", String(isZen));
  els.zenButton.setAttribute(
    "aria-label",
    isZen ? "Exit focus mode" : "Enter focus mode"
  );
  if (isZen) {
    showToast("focus mode — press F or Esc to return.");
  }
  window.setTimeout(() => {
    resizeCanvas();
    camera.ready = false;
  }, 40);
}

/* ── Interactions ───────────────────────────────────────────── */

function handleTyping(event) {
  const value = event.target.value;
  const previous = handleTyping.previous || "";
  handleTyping.previous = value;

  const added = Math.max(0, value.length - previous.length);
  if (!added) return;

  if (state.paused) {
    if (!firstPausedTyping) {
      firstPausedTyping = true;
      showToast("the tree is resting — resume growth to feed it.");
    }
    return;
  }

  const accepted = Math.min(added, 16);
  state.keys += accepted;
  state.growthMs += accepted * 165;
  lastTypedAt = Date.now();

  if (VSCODE_MODE) {
    vscodeApi?.postMessage({ type: "perennial:typing", count: accepted });
  } else {
    saveState();
  }

  els.stageHint.classList.add("is-feeding");
  clearTimeout(feedTimer);
  feedTimer = window.setTimeout(() => {
    els.stageHint.classList.remove("is-feeding");
  }, 1400);

  emitParticles(Math.min(4, 1 + Math.floor(accepted / 4)));
  updateUI(true);
}

function togglePause() {
  if (VSCODE_MODE) {
    vscodeApi?.postMessage({
      type: "perennial:control",
      action: state.paused ? "resume" : "pause",
    });
    return;
  }

  const now = Date.now();
  const delta = Math.min(MAX_STORED_GAP, Math.max(0, now - lastWall));
  lastWall = now;

  if (!state.paused) {
    // Include the final sliver of time before pausing.
    state.elapsedMs += delta;
    state.growthMs += delta;
    state.paused = true;
    showToast("growth paused. the tree will wait.");
  } else {
    state.paused = false;
    firstPausedTyping = false;
    showToast("growth resumed.");
  }

  saveState();
  updateUI(true);
}

function handleReset() {
  if (!resetArmed) {
    resetArmed = true;
    els.resetLabel.textContent = "click again?";
    els.resetButton.classList.add("is-confirming");
    clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      resetArmed = false;
      els.resetLabel.textContent = "new seed";
      els.resetButton.classList.remove("is-confirming");
    }, 3200);
    return;
  }

  resetArmed = false;
  clearTimeout(resetTimer);
  els.resetButton.classList.remove("is-confirming");
  els.resetLabel.textContent = "new seed";

  if (VSCODE_MODE) {
    vscodeApi?.postMessage({ type: "perennial:control", action: "reset" });
    showToast("a new seed is on its way from VS Code.");
    return;
  }

  const now = Date.now();
  state = {
    seed: makeSeed(),
    elapsedMs: 0,
    growthMs: 0,
    keys: 0,
    paused: false,
    createdAt: now,
  };
  firstPausedTyping = false;
  lastTypedAt = 0;
  lastNoteKey = "";
  lastStageIndex = -1;
  uiCache.clear();
  handleTyping.previous = "";
  els.feedInput.value = "";
  particles.length = 0;
  tree = buildTree(state.seed);
  camera = { scale: 0, cx: 0, ready: false };
  render.specks = makeSpecks(render.cols, render.rows, state.seed);
  lastWall = now;
  saveState();
  updateStaticLabels();
  updateUI(true);
  showToast(`a new seed is tucked in. specimen ${seedHex(state.seed)}.`);
  els.feedInput.focus({ preventScroll: true });
}

function showToast(message) {
  els.toastText.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 3300);
}

/* ── Export ─────────────────────────────────────────────────── */

function asciiSnapshot() {
  if (!render.ready) return "";
  const lines = [];
  for (let row = 0; row < render.rows; row += 1) {
    let line = "";
    for (let col = 0; col < render.cols; col += 1) {
      const char = render.chars[row * render.cols + col] || " ";
      line += char;
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join("\n");
}

function exportDocument() {
  const stage = currentStage(state.elapsedMs / 1000);
  const snapshot = asciiSnapshot();
  const width = Math.max(
    54,
    ...snapshot.split("\n").map((line) => line.length)
  );
  const rule = "-".repeat(Math.min(width, 90));
  const header = [
    "PERENNIAL / a tree that grows while you code",
    `specimen ${seedHex(state.seed)}  ·  ${stage.name}  ·  ${formatClock(
      state.elapsedMs
    )}`,
    `${formatAge(state.elapsedMs / 1000)} old  ·  ${formatHeight(
      render.visible ? render.visible.maxY : 0
    )} tall  ·  ${formatCount(render.visible ? render.visible.branches : 0)} branches`,
    "",
    rule,
    "",
  ].join("\n");
  const footer = [
    "",
    rule,
    "grown in a browser, one character at a time.",
    "perennial — local growth only",
    "",
  ].join("\n");
  return `${header}${snapshot}${footer}`;
}

async function copyAscii() {
  const text = exportDocument();
  try {
    await navigator.clipboard.writeText(text);
    showToast(`ascii copied — ${text.split("\n").length} lines.`);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try {
      document.execCommand("copy");
      showToast("ascii copied to the clipboard.");
    } catch {
      showToast("your browser would not let me copy. use save .txt instead.");
    }
    area.remove();
  }
}

function exportAscii() {
  const text = exportDocument();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `perennial-${seedHex(state.seed)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  showToast("a plain-text copy of the tree is yours.");
}

/* ── Formatting ─────────────────────────────────────────────── */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seedHex(seed) {
  return (seed >>> 0).toString(16).toUpperCase().padStart(4, "0").slice(-4);
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatShortTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0"
  )}`;
}

function formatRemaining(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  if (total < 60) return `${total}S`;
  if (total < 3600) {
    const minutes = Math.ceil(total / 60);
    return minutes >= 60 ? "1H" : `${minutes}M`;
  }
  if (total < 86400) {
    let hours = Math.floor(total / 3600);
    let minutes = Math.ceil((total % 3600) / 60);
    if (minutes >= 60) {
      hours += 1;
      minutes = 0;
    }
    return minutes > 0 ? `${hours}H ${minutes}M` : `${hours}H`;
  }
  let days = Math.floor(total / 86400);
  let hours = Math.ceil((total % 86400) / 3600);
  if (hours >= 24) {
    days += 1;
    hours = 0;
  }
  return hours > 0 ? `${days}D ${hours}H` : `${days}D`;
}

function formatTended(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 60) return "0M";
  if (total < 3600) return `${Math.floor(total / 60)}M`;
  if (total < 86400) {
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return minutes ? `${hours}H ${minutes}M` : `${hours}H`;
  }
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  return hours ? `${days}D ${hours}H` : `${days}D`;
}

function formatAge(seconds) {
  const years = seconds / 3600;
  if (years < 0.08) {
    const days = Math.max(0, Math.round(years * 365));
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (years < 2) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  return `${years.toFixed(1)} years`;
}

function formatHeight(maxY) {
  if (!maxY) return "0.0 m";
  const ratio = clamp(maxY / Math.max(tree.fullHeight, 0.001), 0, 1);
  const metres = Math.pow(ratio, 2.15) * 34.7;
  return `${metres < 10 ? metres.toFixed(1) : Math.round(metres)} m`;
}

function formatCount(value) {
  return new Intl.NumberFormat("en-GB").format(Math.max(0, Math.round(value)));
}

init();
