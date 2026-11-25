/* ─────────────────────────────────────────────────────────────
   Perennial — generative ASCII tree
   Deterministic by seed. A trunk, layered limbs, and a crown
   that keeps leafing out long after the frame is full.
   ───────────────────────────────────────────────────────────── */

const TAU = Math.PI * 2;
const UP = Math.PI / 2;
const MAX_DEPTH = 4;
const MAX_BRANCHES = 900;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashSeed(seed) {
  let h = 2166136261 >>> 0;
  const text = String(seed);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function angleTowardUp(angle, pull) {
  let difference = UP - angle;
  while (difference > Math.PI) difference -= TAU;
  while (difference < -Math.PI) difference += TAU;
  return angle + difference * pull;
}

function pointAt(points, t) {
  const scaled = clamp(t, 0, 1) * (points.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(points.length - 1, index + 1);
  const amount = scaled - index;
  return {
    x: points[index].x + (points[next].x - points[index].x) * amount,
    y: points[index].y + (points[next].y - points[index].y) * amount,
  };
}

export function buildTree(seed) {
  const rand = mulberry32(hashSeed(seed));
  const branches = [];
  const leaves = [];
  const blossoms = [];
  let branchCount = 0;

  const pick = (list) => list[Math.floor(rand() * list.length)];

  function addLeaf(x, y, born, options = {}) {
    const glyph =
      options.glyph ||
      (rand() < 0.5
        ? pick(["&", "&", "&", "*", "*", "o"])
        : pick(["'", "'", ".", ",", "`", "'", "."]));
    leaves.push({
      x,
      y,
      born,
      glyph,
      tone: options.tone ?? pick([0, 1, 1, 2, 2, 3]),
      phase: rand() * TAU,
      late: Boolean(options.late),
    });
  }

  function addLeafCluster(x, y, born, count, spread) {
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * TAU;
      const radius = Math.sqrt(rand()) * spread;
      addLeaf(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 1.08,
        born + rand() * 4.2,
        { tone: pick([0, 1, 1, 2, 2, 3]) }
      );
    }
  }

  function createBranch({
    x,
    y,
    angle,
    length,
    width,
    depth,
    start,
    duration,
    steps,
    curve,
    pull,
  }) {
    if (branchCount >= MAX_BRANCHES) return null;
    branchCount += 1;

    const count = steps || clamp(Math.ceil(length / 0.018), 5, 30);
    const bend = curve ?? (rand() - 0.5) * 0.28;
    const wobble = (rand() - 0.5) * 0.026;
    const phase = rand() * TAU;
    const points = [{ x, y, t: 0 }];
    let px = x;
    let py = y;
    let pa = angle;

    for (let i = 1; i <= count; i += 1) {
      const t = i / count;
      pa += bend / count + Math.sin(t * Math.PI * 1.7 + phase) * wobble * 0.1;
      pa += (UP - pa) * (pull ?? 0.02);
      px += Math.cos(pa) * (length / count);
      py += Math.sin(pa) * (length / count);
      points.push({ x: px, y: py, t });
    }

    const branch = {
      id: branchCount,
      depth,
      points,
      start,
      duration,
      end: start + duration,
      width,
      phase,
      endAngle: pa,
    };
    branches.push(branch);
    return branch;
  }

  function foliageAlong(branch, chance, leafCountMax) {
    if (branch.depth < 2) {
      if (branch.depth === 1 && rand() < 0.85) {
        const count = 3 + Math.floor(rand() * 4);
        for (let i = 0; i < count; i += 1) {
          const at = pointAt(branch.points, 0.42 + rand() * 0.5);
          addLeaf(
            at.x + (rand() * 2 - 1) * (0.04 + rand() * 0.045),
            at.y + (rand() * 2 - 1) * (0.028 + rand() * 0.038),
            branch.start + branch.duration * (0.6 + rand() * 0.32) + 0.5 + rand() * 2.2,
            { tone: pick([0, 1, 2, 3]) }
          );
        }
      }
      return;
    }
    if (rand() > chance) return;
    const count = 1 + Math.floor(rand() * leafCountMax);
    for (let i = 0; i < count; i += 1) {
      const at = pointAt(branch.points, 0.5 + rand() * 0.5);
      addLeaf(
        at.x + (rand() * 2 - 1) * (0.022 + rand() * 0.034),
        at.y + (rand() * 2 - 1) * (0.018 + rand() * 0.028),
        branch.start + branch.duration * (0.7 + rand() * 0.3) + 0.8 + rand() * 3,
        { tone: pick([0, 1, 2, 3]) }
      );
    }
  }

  function crownBranch(branch, depth) {
    if (!branch) return;
    if (depth >= 3) {
      const count = 8 + Math.floor(rand() * 6);
      addLeafCluster(
        branch.points[branch.points.length - 1].x,
        branch.points[branch.points.length - 1].y,
        branch.end + 0.4,
        count,
        0.064 + rand() * 0.032
      );

      if (rand() < 0.45) {
        addLeaf(
          branch.points[branch.points.length - 1].x + (rand() * 2 - 1) * 0.08,
          branch.points[branch.points.length - 1].y + (rand() * 2 - 1) * 0.06,
          branch.end + 50 + rand() * 260,
          { late: true, glyph: pick(["'", ".", "*"]), tone: pick([0, 3, 5]) }
        );
      }

      // A few leaves settle in much later, so a long session keeps changing.
      if (rand() < 0.22) {
        addLeaf(
          branch.points[branch.points.length - 1].x + (rand() * 2 - 1) * 0.085,
          branch.points[branch.points.length - 1].y + (rand() * 2 - 1) * 0.07,
          branch.end + 300 + rand() * 1800,
          { late: true, glyph: pick(["&", "*", "'", "o"]), tone: pick([0, 1, 3, 5]) }
        );
      }

      if (rand() < 0.3) {
        blossoms.push({
          x: branch.points[branch.points.length - 1].x + (rand() * 2 - 1) * 0.012,
          y: branch.points[branch.points.length - 1].y + (rand() * 2 - 1) * 0.012,
          born: branch.end + 38 + rand() * 900,
          glyph: rand() < 0.7 ? "*" : "o",
          phase: rand() * TAU,
          kind: rand() < 0.22 ? "fruit" : "bloom",
        });
      }
    }

    if (depth >= MAX_DEPTH || branchCount >= MAX_BRANCHES) return;

    const childCount = depth === 1 ? 2 : rand() < 0.82 ? 2 : 1;
    const spread = 0.34 + rand() * 0.24;
    const end = branch.points[branch.points.length - 1];

    for (let i = 0; i < childCount; i += 1) {
      const side = childCount === 1 ? (rand() < 0.5 ? -1 : 1) : i === 0 ? -1 : 1;
      const attach = depth === 1
        ? 0.55 + rand() * 0.35
        : 0.45 + rand() * 0.45;
      const origin = pointAt(branch.points, attach);
      let childAngle =
        branch.endAngle + side * (spread + rand() * 0.16) + (rand() - 0.5) * 0.1;
      childAngle = angleTowardUp(childAngle, 0.025 + rand() * 0.035);

      const length =
        (branch.depth === 1 ? 0.28 : 0.22) *
        (0.7 + rand() * 0.6) *
        (1 - (depth - 1) * 0.08);
      const childStart =
        branch.start + branch.duration * attach + 0.4 + rand() * 1.7;
      const childDuration = clamp(
        2.4 + length * 3 + rand() * 1.8,
        2,
        5.5
      );

      const child = createBranch({
        x: origin.x,
        y: origin.y,
        angle: childAngle,
        length: Math.max(0.05, length),
        width: Math.max(0.4, branch.width * 0.55),
        depth: depth + 1,
        start: childStart,
        duration: childDuration,
        pull: 0.02 + rand() * 0.022,
      });

      if (child) {
        foliageAlong(child, 0.6, 2);
        crownBranch(child, depth + 1);
      }
    }
  }

  const trunkStart = 0.35;
  const trunkDuration = 16.5;
  const trunk = createBranch({
    x: 0,
    y: 0,
    angle: UP + (rand() - 0.5) * 0.06,
    length: 0.96,
    width: 5,
    depth: 0,
    start: trunkStart,
    duration: trunkDuration,
    steps: 32,
    curve: (rand() - 0.5) * 0.15,
    pull: 0.005,
  });

  // Branches are placed along the trunk. Lower limbs reach farther out;
  // upper limbs stay steeper and shorter.
  const levels = [0.28, 0.4, 0.52, 0.63, 0.73, 0.82, 0.9];
  let side = rand() < 0.5 ? -1 : 1;

  for (let index = 0; index < levels.length; index += 1) {
    const height = levels[index];
    const origin = pointAt(trunk.points, height);
    const mainSide = side;
    side *= -1;

    const profile = 0.66 + 0.48 * Math.sin(Math.PI * clamp(height, 0, 1));
    const length = 0.46 * profile * (0.82 + rand() * 0.32);
    const angle =
      UP +
      mainSide * (1.02 - height * 0.36 + (rand() - 0.5) * 0.18);
    const start = trunkStart + trunkDuration * height * 0.94 + 0.25 + rand() * 0.9;
    const duration = 3.4 + length * 2.5 + rand() * 1.5;

    const limb = createBranch({
      x: origin.x,
      y: origin.y,
      angle,
      length,
      width: 2.1,
      depth: 1,
      start,
      duration,
      curve: mainSide * -(0.08 + rand() * 0.1),
      pull: 0.016 + rand() * 0.018,
    });

    if (limb) {
      foliageAlong(limb, 0.9, 2);
      crownBranch(limb, 1);
    }

    // Add a shorter counterweight limb on the other side sometimes.
    if (height > 0.27 && height < 0.84 && rand() < 0.45) {
      const secondLength = length * (0.58 + rand() * 0.22);
      const secondStart = start + 0.3 + rand() * 1.3;
      const second = createBranch({
        x: origin.x,
        y: origin.y,
        angle:
          UP -
          mainSide * (0.78 - height * 0.22 + (rand() - 0.5) * 0.2),
        length: secondLength,
        width: 1.5,
        depth: 1,
        start: secondStart,
        duration: 3.2 + secondLength * 2.4 + rand() * 1.4,
        curve: -mainSide * (0.06 + rand() * 0.1),
        pull: 0.018 + rand() * 0.018,
      });
      if (second) {
        foliageAlong(second, 0.75, 2);
        crownBranch(second, 1);
      }
    }
  }

  // The top of the trunk opens into a small crown.
  const trunkTop = trunk.points[trunk.points.length - 1];
  const crownStart = trunkStart + trunkDuration * 0.92;
  for (let i = 0; i < 3; i += 1) {
    const child = createBranch({
      x: trunkTop.x,
      y: trunkTop.y - 0.035,
      angle: UP + (i - 1) * (0.24 + rand() * 0.13) + (rand() - 0.5) * 0.1,
      length: 0.12 + rand() * 0.11,
      width: 1,
      depth: 2,
      start: crownStart + i * 0.4,
      duration: 3.2 + rand() * 1.2,
      pull: 0.02,
      curve: (i - 1) * 0.1,
    });
    if (child) {
      foliageAlong(child, 0.8, 2);
      crownBranch(child, 2);
    }
  }

  addLeafCluster(
    trunkTop.x,
    trunkTop.y,
    trunkStart + trunkDuration + 1,
    8,
    0.075
  );

  // A little grass-level growth around the base of the trunk.
  for (let i = 0; i < 4; i += 1) {
    const angle = UP + (i - 1.5) * 0.32 + (rand() - 0.5) * 0.16;
    const base = createBranch({
      x: 0,
      y: 0.02,
      angle,
      length: 0.035 + rand() * 0.04,
      width: 0.5,
      depth: 4,
      start: trunkStart + 1 + rand() * 2,
      duration: 2,
      pull: 0.01,
      steps: 4,
    });
    if (base) {
      addLeafCluster(
        base.points[base.points.length - 1].x,
        base.points[base.points.length - 1].y,
        2 + rand() * 12,
        1,
        0.012
      );
    }
  }

  let maxX = 0;
  let maxY = 0;
  let minX = 0;
  let minY = 0;
  let completion = 0;

  for (const branch of branches) {
    completion = Math.max(completion, branch.end);
    for (const point of branch.points) {
      maxX = Math.max(maxX, point.x);
      minX = Math.min(minX, point.x);
      maxY = Math.max(maxY, point.y);
      minY = Math.min(minY, point.y);
    }
  }

  for (const leaf of leaves) {
    maxX = Math.max(maxX, leaf.x);
    minX = Math.min(minX, leaf.x);
    maxY = Math.max(maxY, leaf.y);
    minY = Math.min(minY, leaf.y);
  }

  for (const blossom of blossoms) {
    maxX = Math.max(maxX, blossom.x);
    minX = Math.min(minX, blossom.x);
    maxY = Math.max(maxY, blossom.y);
    minY = Math.min(minY, blossom.y);
  }

  const padX = (maxX - minX) * 0.05;
  const padY = maxY * 0.05;

  return {
    seed,
    branches,
    leaves,
    blossoms,
    completion: completion + 2,
    extents: {
      minX: minX - padX,
      maxX: maxX + padX,
      minY: Math.min(0, minY),
      maxY: maxY + padY,
    },
    fullWidth: maxX - minX + padX * 2,
    fullHeight: maxY + padY,
    branchCount,
  };
}
