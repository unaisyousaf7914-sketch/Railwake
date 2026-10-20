import { ready, type SpriteBank } from "@/game/assets";
import {
  GROUND,
  PLAYER_X,
  VIEW_H,
  VIEW_W,
  sheetFrame,
  squashOf,
  type RunState,
  type SolidKind,
} from "@/game/sim";

const SKY_TOP = "#100e0c";
const SKY_MID = "#3a241c";
const HORIZON = "#e07a45";
const SOOT = "#14110e";
const MESA_FAR = "#1a1412";
const MESA = "#2a1d18";
const YARD = "#1c1613";
const PAPER = "#f4ecdf";
const EMBER = "#e4572e";
const BRASS = "#c9a227";
const ASH = "#8d8072";
const RAIL = "#6e655c";

const CELL = 384;
const FOOT_PAD = 28 / CELL;
const HAZARD_CELL = 320;
const HAZARD_PAD = 24 / HAZARD_CELL;

const TONES = [EMBER, ASH, BRASS, PAPER];

export function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  s: RunState,
  bank: SpriteBank | null,
  shake: boolean,
) {
  const bw = ctx.canvas.width;
  const bh = ctx.canvas.height;
  const scale = Math.min(bw / VIEW_W, bh / VIEW_H);
  const ox = (bw - VIEW_W * scale) / 2;
  const oy = (bh - VIEW_H * scale) / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0c0a09";
  ctx.fillRect(0, 0, bw, bh);

  let shx = 0;
  let shy = 0;
  if (shake && s.trauma > 0) {
    const mag = s.trauma * s.trauma;
    const t = s.time * 40;
    shx = Math.sin(t * 1.7) * 14 * mag;
    shy = Math.cos(t * 2.3) * 8 * mag;
  }

  ctx.setTransform(scale, 0, 0, scale, ox + shx * scale, oy + shy * scale);
  ctx.imageSmoothingEnabled = true;

  const cam = s.playerX - PLAYER_X;
  drawSky(ctx);
  drawRidge(ctx, cam, 0.18, MESA_FAR, 168, 46, 0.008, 1.2);
  drawRidge(ctx, cam, 0.32, MESA, 108, 34, 0.012, 2.4);
  drawYard(ctx, cam);
  drawGround(ctx, cam);
  drawCoins(ctx, s, bank, cam);
  drawSolids(ctx, s, bank, cam);
  drawPlayer(ctx, s, bank);
  drawParticles(ctx, s, cam);
  drawSpeedLines(ctx, s, cam);
  drawFloaters(ctx, s, cam);
  if (s.flash > 0) {
    ctx.fillStyle = `rgba(244,236,223,${s.flash * 0.55})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  const vignette = ctx.createRadialGradient(VIEW_W * 0.45, VIEW_H * 0.55, VIEW_W * 0.2, VIEW_W * 0.5, VIEW_H * 0.5, VIEW_W * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawSky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(0.45, SKY_MID);
  g.addColorStop(0.78, "#8a4030");
  g.addColorStop(1, HORIZON);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, GROUND + 2);

  const sun = ctx.createRadialGradient(690, GROUND - 36, 8, 690, GROUND - 28, 120);
  sun.addColorStop(0, "rgba(244,220,170,0.95)");
  sun.addColorStop(0.35, "rgba(226,140,70,0.55)");
  sun.addColorStop(1, "rgba(226,87,46,0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(690, GROUND - 28, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(244,236,223,0.9)";
  ctx.beginPath();
  ctx.arc(690, GROUND - 18, 28, Math.PI, 0);
  ctx.fill();
}

function drawRidge(
  ctx: CanvasRenderingContext2D,
  cam: number,
  factor: number,
  color: string,
  base: number,
  amp: number,
  freq: number,
  phase: number,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= VIEW_W; x += 10) {
    const wx = cam * factor + x;
    const h =
      base +
      Math.sin(wx * freq + phase) * amp +
      Math.sin(wx * freq * 2.3 + phase * 1.7) * amp * 0.38;
    ctx.lineTo(x, GROUND - h);
  }
  ctx.lineTo(VIEW_W, GROUND);
  ctx.closePath();
  ctx.fill();
}

function drawYard(ctx: CanvasRenderingContext2D, cam: number) {
  const spacing = 280;
  const parallax = cam * 0.55;
  const start = Math.floor(parallax / spacing) * spacing - spacing;
  for (let wx = start; wx < parallax + VIEW_W + spacing; wx += spacing) {
    const sx = wx - parallax;
    const n = Math.floor(wx / spacing);
    const kind = Math.abs(n) % 4;
    const h = 70 + (Math.abs(n * 17) % 50);
    ctx.fillStyle = YARD;
    if (kind === 0) {
      ctx.fillRect(sx, GROUND - h, 86, h);
      ctx.fillRect(sx + 30, GROUND - h - 28, 10, 28);
      ctx.fillStyle = n % 2 === 0 ? EMBER : BRASS;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(sx + 14, GROUND - h + 16, 10, 14);
      ctx.fillRect(sx + 36, GROUND - h + 16, 10, 14);
      ctx.globalAlpha = 1;
    } else if (kind === 1) {
      ctx.beginPath();
      ctx.moveTo(sx, GROUND);
      ctx.lineTo(sx + 18, GROUND - 92);
      ctx.lineTo(sx + 36, GROUND);
      ctx.fill();
      ctx.fillRect(sx + 16, GROUND - 108, 4, 20);
    } else if (kind === 2) {
      ctx.fillRect(sx + 10, GROUND - 54, 70, 54);
      ctx.beginPath();
      ctx.moveTo(sx + 6, GROUND - 54);
      ctx.lineTo(sx + 46, GROUND - 84);
      ctx.lineTo(sx + 86, GROUND - 54);
      ctx.fill();
    } else {
      ctx.fillRect(sx + 20, GROUND - 64, 8, 64);
      ctx.fillRect(sx + 18, GROUND - 66, 48, 6);
      ctx.fillRect(sx + 62, GROUND - 40, 8, 40);
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, cam: number) {
  ctx.fillStyle = SOOT;
  ctx.fillRect(0, GROUND, VIEW_W, VIEW_H - GROUND);
  const tie = 42;
  const start = Math.floor(cam / tie) * tie;
  ctx.fillStyle = "#3a3128";
  for (let wx = start; wx < cam + VIEW_W + tie; wx += tie) {
    const sx = wx - cam;
    ctx.fillRect(sx, GROUND + 8, 18, 10);
  }
  ctx.fillStyle = RAIL;
  ctx.fillRect(0, GROUND + 6, VIEW_W, 3);
  ctx.fillRect(0, GROUND + 16, VIEW_W, 3);
  ctx.fillStyle = "rgba(201,162,39,0.35)";
  ctx.fillRect(0, GROUND + 6, VIEW_W, 1);
  ctx.fillStyle = "#2a241e";
  ctx.fillRect(0, GROUND + 28, VIEW_W, VIEW_H);
}

function drawSolids(ctx: CanvasRenderingContext2D, s: RunState, bank: SpriteBank | null, cam: number) {
  for (let i = 0; i < s.solids.length; i++) {
    const o = s.solids[i];
    if (!o.alive) continue;
    const sx = o.x - cam;
    if (sx > VIEW_W + 80 || sx + o.w < -80) continue;
    if (o.kind === "beam") {
      drawBeam(ctx, bank, sx, o.y, o.w, o.h);
    } else {
      drawHazard(ctx, bank, o.kind, sx, o.w, o.h);
    }
  }
}

function drawHazard(
  ctx: CanvasRenderingContext2D,
  bank: SpriteBank | null,
  kind: SolidKind,
  sx: number,
  w: number,
  h: number,
) {
  const index = kind === "crate" ? 0 : kind === "spikes" ? 1 : kind === "barrel" ? 2 : 3;
  const img = bank?.hazards[index];
  if (kind !== "beam" && ready(img)) {
    const art = kind === "crate" ? [224, 166] : kind === "spikes" ? [232, 161] : kind === "barrel" ? [167, 216] : [272, 179];
    const draw = (h * HAZARD_CELL) / art[1];
    const foot = draw * HAZARD_PAD;
    ctx.drawImage(img, sx + w / 2 - draw / 2, GROUND + foot - draw, draw, draw);
    return;
  }
  ctx.fillStyle = kind === "spikes" ? "#4a4038" : "#3a3028";
  ctx.fillRect(sx, GROUND - h, w, h);
}

function drawBeam(ctx: CanvasRenderingContext2D, bank: SpriteBank | null, sx: number, y: number, w: number, h: number) {
  const img = bank?.beam;
  if (ready(img)) {
    const draw = w * (512 / 460);
    ctx.drawImage(img, sx + w / 2 - draw / 2, y + h / 2 - draw / 2, draw, draw);
    return;
  }
  ctx.fillStyle = "#2c261f";
  ctx.fillRect(sx, y, w, h);
  ctx.fillStyle = EMBER;
  ctx.fillRect(sx, y + h - 5, w, 4);
}

function drawCoins(ctx: CanvasRenderingContext2D, s: RunState, bank: SpriteBank | null, cam: number) {
  const frame = Math.floor(s.anim * 10) % 4;
  for (let i = 0; i < s.coins.length; i++) {
    const c = s.coins[i];
    if (!c.alive) continue;
    const sx = c.x - cam;
    if (sx < -40 || sx > VIEW_W + 40) continue;
    const img = bank?.coin[(frame + Math.floor(c.spin)) % 4];
    const size = 40;
    if (ready(img)) ctx.drawImage(img, sx - size / 2, c.y - size / 2, size, size);
    else {
      ctx.fillStyle = BRASS;
      ctx.beginPath();
      ctx.arc(sx, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: RunState, bank: SpriteBank | null) {
  const height = Math.max(0, GROUND - s.feetY);
  const shadow = clamp(1 - height / 180, 0.25, 1);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * shadow})`;
  ctx.beginPath();
  ctx.ellipse(PLAYER_X, GROUND + 4, 22 * shadow, 6 * shadow, 0, 0, Math.PI * 2);
  ctx.fill();

  const pose = sheetFrame(s);
  const squash = squashOf(s);
  const img = bank?.[pose.sheet][pose.index];
  const cell = 198;
  ctx.save();
  ctx.translate(PLAYER_X, s.feetY);
  ctx.scale(squash.sx, squash.sy);
  if (s.status !== "run") ctx.rotate(Math.min(0.35, s.dieT) * 0.8);
  if (ready(img)) {
    const pad = cell * FOOT_PAD;
    ctx.drawImage(img, -cell / 2, -cell + pad, cell, cell);
  } else {
    ctx.fillStyle = "#2a2622";
    ctx.fillRect(-16, -110, 32, 100);
    ctx.fillStyle = EMBER;
    ctx.fillRect(-8, -118, 22, 8);
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, s: RunState, cam: number) {
  for (let i = 0; i < s.particles.length; i++) {
    const p = s.particles[i];
    if (!p.alive) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = TONES[p.tone] ?? ASH;
    const sz = p.size;
    ctx.fillRect(p.x - cam - sz / 2, p.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, s: RunState, cam: number) {
  if (s.ramp < 0.35 || s.status !== "run") return;
  ctx.globalAlpha = (s.ramp - 0.35) * 0.45;
  ctx.fillStyle = PAPER;
  const span = 220;
  for (let i = 0; i < 9; i++) {
    const y = 40 + ((i * 97) % 280);
    const x = ((i * 180 - cam * (1.4 + i * 0.03)) % (VIEW_W + span) + (VIEW_W + span)) % (VIEW_W + span) - span;
    ctx.fillRect(x, y, 36 + (i % 3) * 18, 1.5);
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx: CanvasRenderingContext2D, s: RunState, cam: number) {
  ctx.textAlign = "center";
  ctx.font = "700 16px Manrope, ui-sans-serif, sans-serif";
  for (let i = 0; i < s.floaters.length; i++) {
    const f = s.floaters[i];
    if (!f.alive) continue;
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.fillStyle = TONES[f.tone] ?? PAPER;
    ctx.fillText(f.text, f.x - cam, f.y);
  }
  ctx.globalAlpha = 1;
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
