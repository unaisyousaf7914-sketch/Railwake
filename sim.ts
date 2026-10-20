export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND = 448;
export const PLAYER_X = 268;

const GRAVITY = 2550;
const JUMP_V = -780;
const MAX_FALL = 1450;
const SLIDE_TIME = 0.68;
const COYOTE = 0.1;
const BUFFER = 0.13;
const BEAM_GAP = 116;
const BEAM_H = 36;
const BEAM_W = 172;
const INSET = 4;
export const CHAIN_WINDOW = 3.35;
const METER = 46;

const LOW_ART = {
  crate: { aw: 224, ah: 166, h: 64 },
  spikes: { aw: 232, ah: 161, h: 56 },
  barrel: { aw: 167, ah: 216, h: 78 },
  block: { aw: 272, ah: 179, h: 60 },
} as const;

export type LowKind = keyof typeof LOW_ART;
export type SolidKind = LowKind | "beam";

export type Solid = {
  alive: boolean;
  kind: SolidKind;
  x: number;
  y: number;
  w: number;
  h: number;
  cleared: boolean;
  nearGap: number;
};

export type Coin = {
  alive: boolean;
  x: number;
  y: number;
  r: number;
  spin: number;
};

export type Particle = {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  tone: number;
  grav: number;
};

export type Floater = {
  alive: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  max: number;
  tone: number;
};

export type SfxBus = {
  jump: number;
  land: number;
  slide: number;
  coin: number;
  near: number;
  crash: number;
  combo: number;
  drop: number;
};

export type RunStatus = "run" | "dying" | "dead";

export type RunState = {
  seed: number;
  demo: boolean;
  rng: () => number;
  status: RunStatus;
  time: number;
  playerX: number;
  feetY: number;
  vy: number;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  slideBuffer: number;
  jumpAt: number;
  slideAt: number;
  jumpAge: number;
  cut: boolean;
  slideT: number;
  anim: number;
  runCycle: number;
  landT: number;
  riseT: number;
  dieT: number;
  hitstop: number;
  flash: number;
  trauma: number;
  score: number;
  meters: number;
  combo: number;
  peakCombo: number;
  peakMult: number;
  chain: number;
  ramp: number;
  speed: number;
  cruise: number;
  cursor: number;
  intro: number;
  sinceCoin: number;
  best: number;
  record: boolean;
  solids: Solid[];
  coins: Coin[];
  particles: Particle[];
  floaters: Floater[];
  bus: SfxBus;
};

export type FrameInput = {
  jump: boolean;
  slide: boolean;
  jumpHeld: boolean;
};

const INTRO = ["crate", "coins", "beam", "lure"] as const;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blankBus(): SfxBus {
  return { jump: 0, land: 0, slide: 0, coin: 0, near: 0, crash: 0, combo: 0, drop: 0 };
}

export function multiplierFor(combo: number): number {
  return Math.min(8, 1 + Math.floor(combo / 3));
}

export function createRun(seed: number, demo: boolean, best: number): RunState {
  const solids: Solid[] = [];
  for (let i = 0; i < 28; i++) {
    solids.push({
      alive: false,
      kind: "crate",
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      cleared: false,
      nearGap: Infinity,
    });
  }
  const coins: Coin[] = [];
  for (let i = 0; i < 40; i++) coins.push({ alive: false, x: 0, y: 0, r: 15, spin: 0 });
  const particles: Particle[] = [];
  for (let i = 0; i < 110; i++) {
    particles.push({
      alive: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 2,
      tone: 0,
      grav: 0,
    });
  }
  const floaters: Floater[] = [];
  for (let i = 0; i < 18; i++) {
    floaters.push({ alive: false, x: 0, y: 0, vy: 0, text: "", life: 0, max: 1, tone: 0 });
  }
  const speed0 = 450;
  return {
    seed,
    demo,
    rng: mulberry32(seed || 1),
    status: "run",
    time: 0,
    playerX: 0,
    feetY: GROUND,
    vy: 0,
    grounded: true,
    coyote: COYOTE,
    jumpBuffer: 0,
    slideBuffer: 0,
    jumpAt: -1,
    slideAt: -1,
    jumpAge: 0,
    cut: false,
    slideT: 0,
    anim: 0,
    runCycle: 0,
    landT: 0,
    riseT: 0,
    dieT: 0,
    hitstop: 0,
    flash: 0,
    trauma: 0,
    score: 0,
    meters: 0,
    combo: 0,
    peakCombo: 0,
    peakMult: 1,
    chain: 0,
    ramp: 0,
    speed: speed0,
    cruise: 1,
    cursor: VIEW_W - PLAYER_X + 140,
    intro: 0,
    sinceCoin: 0,
    best,
    record: false,
    solids,
    coins,
    particles,
    floaters,
    bus: blankBus(),
  };
}

function acquire<T extends { alive: boolean }>(pool: T[]): T {
  for (let i = 0; i < pool.length; i++) if (!pool[i].alive) return pool[i];
  let oldest = pool[0];
  for (let i = 1; i < pool.length; i++) {
    const item = pool[i] as T & { x?: number };
    const old = oldest as T & { x?: number };
    if ((item.x ?? 0) < (old.x ?? 0)) oldest = pool[i];
  }
  return oldest;
}

function burst(s: RunState, x: number, y: number, n: number, tone: number, spread: number, up: number) {
  for (let i = 0; i < n; i++) {
    const p = acquire(s.particles);
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = (s.rng() - 0.5) * spread - s.speed * 0.15;
    p.vy = -s.rng() * up;
    p.life = 0.28 + s.rng() * 0.28;
    p.max = p.life;
    p.size = 2 + s.rng() * 3.5;
    p.tone = tone;
    p.grav = 900 + s.rng() * 500;
  }
}

function floatText(s: RunState, x: number, y: number, text: string, tone: number) {
  const f = acquire(s.floaters);
  f.alive = true;
  f.x = x;
  f.y = y;
  f.vy = -46;
  f.text = text;
  f.life = 0.7;
  f.max = 0.7;
  f.tone = tone;
}

function refreshChain(s: RunState, extraCombo: number, points: number, x: number, y: number, label: string, tone: number) {
  const before = multiplierFor(s.combo);
  s.combo += extraCombo;
  s.chain = CHAIN_WINDOW;
  if (s.combo > s.peakCombo) s.peakCombo = s.combo;
  const mult = multiplierFor(s.combo);
  if (mult > s.peakMult) s.peakMult = mult;
  const gain = Math.round(points * mult);
  s.score += gain;
  if (mult > before) s.bus.combo++;
  floatText(s, x, y, label || `+${gain}`, tone);
  if (s.score > s.best) s.record = true;
}

function bodyOf(s: RunState): { x: number; y: number; w: number; h: number } {
  const sliding = s.slideT > 0 && s.grounded;
  const h = sliding ? 58 : s.grounded ? 136 : 108;
  const w = sliding ? 88 : 42;
  return { x: s.playerX - w / 2, y: s.feetY - h, w, h };
}

function kill(s: RunState) {
  if (s.status !== "run") return;
  if (s.demo) {
    const best = s.best;
    const demo = true;
    const next = createRun((s.seed + 17) >>> 0, demo, best);
    Object.assign(s, next);
    return;
  }
  s.status = "dying";
  s.hitstop = 0.09;
  s.dieT = 0;
  s.flash = 1;
  s.trauma = Math.min(1, s.trauma + 0.85);
  s.vy = -420;
  s.slideT = 0;
  s.bus.crash++;
  burst(s, s.playerX, s.feetY - 40, 18, 0, 520, 460);
  burst(s, s.playerX, s.feetY - 20, 8, 2, 300, 200);
}

function placeLow(s: RunState, x: number, kind: LowKind): { end: number; cx: number } {
  const art = LOW_ART[kind];
  const h = art.h;
  const w = Math.round(h * (art.aw / art.ah));
  const o = acquire(s.solids);
  o.alive = true;
  o.kind = kind;
  o.x = x;
  o.y = GROUND - h;
  o.w = w;
  o.h = h;
  o.cleared = false;
  o.nearGap = Infinity;
  return { end: x + w, cx: x + w / 2 };
}

function placeBeam(s: RunState, x: number): { end: number } {
  const o = acquire(s.solids);
  o.alive = true;
  o.kind = "beam";
  o.w = BEAM_W;
  o.h = BEAM_H;
  o.x = x;
  o.y = GROUND - BEAM_GAP - BEAM_H;
  o.cleared = false;
  o.nearGap = Infinity;
  return { end: x + BEAM_W };
}

function placeCoin(s: RunState, x: number, y: number) {
  const c = acquire(s.coins);
  c.alive = true;
  c.x = x;
  c.y = y;
  c.r = 15;
  c.spin = s.rng() * 4;
}

function pickLow(s: RunState): LowKind {
  const bag: LowKind[] = ["crate", "spikes", "block", "crate", "barrel", "spikes"];
  if (s.ramp > 0.45) bag.push("barrel", "block");
  return bag[Math.floor(s.rng() * bag.length)];
}

type Pattern = "low" | "beam" | "double" | "lowbeam" | "beamlow" | "coins" | "lure" | "crate";

function pickPattern(s: RunState): Pattern {
  const bag: Pattern[] = [];
  const add = (p: Pattern, n: number) => {
    for (let i = 0; i < n; i++) bag.push(p);
  };
  const r = s.ramp;
  add("low", 7);
  add("beam", 3 + Math.floor(r * 4));
  add("coins", s.sinceCoin > 4 ? 7 : 3);
  if (r > 0.18) add("lure", 3);
  if (r > 0.28) add("double", 2 + Math.floor(r * 4));
  if (r > 0.38) add("lowbeam", 2 + Math.floor(r * 3));
  if (r > 0.4) add("beamlow", 2 + Math.floor(r * 3));
  return bag[Math.floor(s.rng() * bag.length)];
}

function emit(s: RunState) {
  const speed = Math.max(420, s.speed);
  const gap = (1.2 - s.ramp * 0.72) * speed;
  const chain = (0.58 - s.ramp * 0.14) * speed;
  const x = s.cursor;
  let end = x;
  let pattern: Pattern;
  if (s.intro < INTRO.length) {
    pattern = INTRO[s.intro];
    s.intro++;
  } else {
    pattern = pickPattern(s);
  }

  if (pattern === "coins") {
    const n = 5;
    const step = speed * 0.16;
    for (let i = 0; i < n; i++) placeCoin(s, x + i * step, GROUND - 84);
    end = x + (n - 1) * step;
    s.sinceCoin = 0;
  } else if (pattern === "crate" || pattern === "low") {
    const kind = pattern === "crate" ? "crate" : pickLow(s);
    end = placeLow(s, x, kind).end;
    s.sinceCoin++;
  } else if (pattern === "beam") {
    end = placeBeam(s, x).end;
    s.sinceCoin++;
  } else if (pattern === "double") {
    const a = placeLow(s, x, pickLow(s));
    const b = placeLow(s, a.end + chain * 0.72, pickLow(s));
    end = b.end;
    s.sinceCoin++;
  } else if (pattern === "lowbeam") {
    const a = placeLow(s, x, pickLow(s));
    end = placeBeam(s, a.end + chain * 1.2).end;
    s.sinceCoin++;
  } else if (pattern === "beamlow") {
    const a = placeBeam(s, x);
    end = placeLow(s, a.end + chain * 0.85, pickLow(s)).end;
    s.sinceCoin++;
  } else {
    const a = placeLow(s, x, s.ramp > 0.5 ? pickLow(s) : "crate");
    placeCoin(s, a.cx, GROUND - 176);
    placeCoin(s, a.cx - 36, GROUND - 150);
    placeCoin(s, a.cx + 36, GROUND - 150);
    end = a.end;
    s.sinceCoin = 0;
  }
  s.cursor = end + gap;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function doJump(s: RunState) {
  s.vy = JUMP_V;
  s.grounded = false;
  s.feetY -= 1;
  s.coyote = 0;
  s.jumpBuffer = 0;
  s.slideT = 0;
  s.jumpAge = 0;
  s.cut = false;
  s.riseT = 0.12;
  s.bus.jump++;
}

function doSlide(s: RunState) {
  s.slideT = SLIDE_TIME;
  s.slideBuffer = 0;
  s.vy = 0;
  s.feetY = GROUND;
  s.grounded = true;
  s.bus.slide++;
  burst(s, s.playerX - 10, GROUND - 6, 7, 1, 280, 80);
}

function aiInput(s: RunState, input: FrameInput): FrameInput {
  let next: Solid | null = null;
  let best = Infinity;
  for (let i = 0; i < s.solids.length; i++) {
    const o = s.solids[i];
    if (!o.alive) continue;
    const dist = o.x - (s.playerX + 10);
    if (dist < -20) continue;
    if (dist < best) {
      best = dist;
      next = o;
    }
  }
  if (!next) return input;
  const t = Math.max(0, best) / Math.max(280, s.speed);
  if (next.kind === "beam") {
    if (t < 0.22 && t > 0.07 && s.grounded && s.slideT <= 0) return { ...input, slide: true };
    return input;
  }
  if (t < 0.2 && t > 0.1 && (s.grounded || s.coyote > 0)) return { ...input, jump: true, jumpHeld: true };
  return input;
}

export function updateRun(s: RunState, dt: number, rawInput: FrameInput) {
  s.time += dt;
  s.anim += dt;
  s.flash = Math.max(0, s.flash - dt * 2.6);
  s.trauma = Math.max(0, s.trauma - dt * 1.65);
  s.landT = Math.max(0, s.landT - dt);
  s.riseT = Math.max(0, s.riseT - dt);

  if (s.hitstop > 0) {
    s.hitstop -= dt;
    return;
  }
  if (s.status === "dead") return;

  const input = s.demo && s.status === "run" ? aiInput(s, rawInput) : rawInput;

  if (s.status === "dying") {
    s.dieT += dt;
    s.cruise = Math.max(0, s.cruise - dt * 0.85);
    s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);
    s.feetY += s.vy * dt;
    if (s.feetY >= GROUND) {
      s.feetY = GROUND;
      s.vy = -s.vy * 0.3;
      if (Math.abs(s.vy) < 50) s.vy = 0;
    }
    s.playerX += s.speed * s.cruise * dt;
    for (let i = 0; i < s.particles.length; i++) stepParticle(s.particles[i], dt);
    for (let i = 0; i < s.floaters.length; i++) stepFloater(s.floaters[i], dt);
    if (s.dieT > 0.92) s.status = "dead";
    return;
  }

  if (input.jump) {
    s.jumpBuffer = BUFFER;
    s.jumpAt = s.time;
  } else s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
  if (input.slide) {
    s.slideBuffer = BUFFER;
    s.slideAt = s.time;
  } else s.slideBuffer = Math.max(0, s.slideBuffer - dt);

  const prevMeters = s.meters;
  s.playerX += s.speed * dt;
  s.meters = s.playerX / METER;
  s.ramp = clamp((s.meters - 18) / 720, 0, 1);
  const shaped = s.ramp ** 0.82;
  s.speed = 450 + shaped * 540;

  if (!s.grounded) {
    s.jumpAge += dt;
    s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * dt);
    s.feetY += s.vy * dt;
    s.coyote -= dt;
  }

  if (s.feetY >= GROUND && s.vy >= 0) {
    const wasAir = !s.grounded;
    s.feetY = GROUND;
    s.vy = 0;
    s.grounded = true;
    s.coyote = COYOTE;
    if (wasAir) {
      s.landT = 0.16;
      s.bus.land++;
      s.trauma = Math.min(1, s.trauma + 0.16);
      burst(s, s.playerX, GROUND - 4, 8, 1, 240, 120);
    }
  } else if (s.feetY < GROUND) {
    s.grounded = false;
  }

  if (s.slideT > 0) {
    s.slideT -= dt;
    if (s.grounded) {
      s.feetY = GROUND;
      s.vy = 0;
    }
    if (s.slideT <= 0) s.slideT = 0;
  }

  const wantJump = s.jumpBuffer > 0 && (s.grounded || s.coyote > 0);
  const wantSlide = s.slideBuffer > 0 && s.grounded && s.slideT <= 0;
  if (wantJump && (!wantSlide || s.jumpAt >= s.slideAt)) doJump(s);
  else if (wantSlide) doSlide(s);

  if (s.grounded && s.slideT <= 0) s.runCycle += dt * (8.5 + s.ramp * 7);
  else if (s.slideT > 0) s.runCycle += dt * 9;

  const dm = s.meters - prevMeters;
  if (dm > 0) s.score += dm * multiplierFor(s.combo);

  const body = bodyOf(s);
  const bx = body.x + INSET;
  const by = body.y + INSET;
  const bw = body.w - INSET * 2;
  const bh = body.h - INSET * 2;

  for (let i = 0; i < s.solids.length; i++) {
    const o = s.solids[i];
    if (!o.alive || o.cleared) continue;
    const ox = o.x + INSET;
    const oy = o.y + INSET;
    const ow = o.w - INSET * 2;
    const oh = o.h - INSET * 2;
    const xOverlap = bx < ox + ow && bx + bw > ox;
    if (xOverlap) {
      let gap = Infinity;
      if (o.kind === "beam") gap = by - (oy + oh);
      else gap = oy - (by + bh);
      if (gap >= 0 && gap < o.nearGap) o.nearGap = gap;
    }
    if (overlaps(bx, by, bw, bh, ox, oy, ow, oh)) {
      kill(s);
      return;
    }
    if (bx > ox + ow) {
      o.cleared = true;
      const near = o.nearGap < 32;
      if (near) {
        s.bus.near++;
        s.trauma = Math.min(1, s.trauma + 0.1);
        refreshChain(s, 2, 28, o.x + o.w * 0.5, o.kind === "beam" ? o.y + o.h + 28 : o.y - 18, "NEAR", 2);
      } else {
        refreshChain(s, 1, 12, o.x + o.w * 0.5, o.kind === "beam" ? o.y + o.h + 24 : o.y - 14, "", 1);
      }
    }
  }

  if (s.status !== "run") return;

  for (let i = 0; i < s.coins.length; i++) {
    const c = s.coins[i];
    if (!c.alive) continue;
    const cx = c.x - c.r;
    const cy = c.y - c.r;
    if (overlaps(bx, by, bw, bh, cx, cy, c.r * 2, c.r * 2)) {
      c.alive = false;
      s.bus.coin++;
      refreshChain(s, 1, 25, c.x, c.y - 10, "", 2);
      burst(s, c.x, c.y, 6, 2, 180, 160);
    }
  }

  if (s.combo > 0) {
    s.chain -= dt;
    if (s.chain <= 0) {
      if (s.combo >= 4) {
        s.bus.drop++;
        floatText(s, s.playerX + 30, s.feetY - 130, "DROPPED", 0);
      }
      s.combo = 0;
      s.chain = 0;
    }
  }

  if (s.grounded && s.slideT <= 0) {
    const rate = 8.5 + s.ramp * 7;
    const prev = s.runCycle - dt * rate;
    if (Math.floor(s.runCycle) !== Math.floor(prev)) burst(s, s.playerX - 18, GROUND - 2, 1, 1, 50, 36);
  }

  const left = s.playerX - PLAYER_X - 200;
  for (let i = 0; i < s.solids.length; i++) {
    const o = s.solids[i];
    if (o.alive && o.x + o.w < left) o.alive = false;
  }
  for (let i = 0; i < s.coins.length; i++) {
    const c = s.coins[i];
    if (c.alive && c.x < left) c.alive = false;
  }

  const right = s.playerX + (VIEW_W - PLAYER_X) + 60;
  let guard = 0;
  while (s.cursor < right && guard++ < 6) emit(s);

  for (let i = 0; i < s.particles.length; i++) stepParticle(s.particles[i], dt);
  for (let i = 0; i < s.floaters.length; i++) stepFloater(s.floaters[i], dt);

  if (Math.floor(s.meters / 100) > Math.floor(prevMeters / 100) && s.meters > 50) {
    floatText(s, s.playerX + 40, GROUND - 160, `${Math.floor(s.meters / 100) * 100}m`, 1);
  }
}

function stepParticle(p: Particle, dt: number) {
  if (!p.alive) return;
  p.life -= dt;
  if (p.life <= 0) {
    p.alive = false;
    return;
  }
  p.vy += p.grav * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
}

function stepFloater(f: Floater, dt: number) {
  if (!f.alive) return;
  f.life -= dt;
  if (f.life <= 0) {
    f.alive = false;
    return;
  }
  f.y += f.vy * dt;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function sheetFrame(s: RunState): { sheet: "run" | "jump" | "slide" | "hurt"; index: number } {
  if (s.status !== "run") {
    return { sheet: "hurt", index: Math.min(3, Math.floor(s.dieT / 0.14)) };
  }
  if (s.slideT > 0 && s.grounded) {
    if (s.slideT > SLIDE_TIME - 0.08) return { sheet: "slide", index: 0 };
    return { sheet: "slide", index: 1 + (Math.floor(s.anim * 12) % 3) };
  }
  if (!s.grounded) {
    if (s.jumpAge < 0.07) return { sheet: "jump", index: 0 };
    if (s.vy < -200) return { sheet: "jump", index: 1 };
    if (s.vy < 180) return { sheet: "jump", index: 2 };
    return { sheet: "jump", index: 3 };
  }
  return { sheet: "run", index: Math.floor(s.runCycle) % 4 };
}

export function squashOf(s: RunState): { sx: number; sy: number } {
  if (s.slideT > 0 && s.grounded) return { sx: 1.06, sy: 0.66 };
  if (s.riseT > 0) {
    const t = 1 - s.riseT / 0.12;
    const sy = 1 + Math.sin(Math.min(1, t) * Math.PI) * 0.12;
    return { sx: 1 / Math.sqrt(sy), sy };
  }
  if (s.landT > 0) {
    const t = 1 - s.landT / 0.16;
    const k = easeOutBack(clamp(t, 0, 1));
    const sy = 0.76 + (1 - 0.76) * k;
    return { sx: 1 / Math.sqrt(Math.max(0.7, sy)), sy };
  }
  return { sx: 1, sy: 1 };
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
