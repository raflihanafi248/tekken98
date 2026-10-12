'use strict';
// ---------------------------------------------------------------------------
// Efek visual: percikan pukulan, partikel, debu, serta gambar proyektil
// Semua koordinat dunia (y = tinggi dari lantai), dikonversi saat menggambar.
// ---------------------------------------------------------------------------
function pxLine(ctx, x0, y0, x1, y1, color, t = 1) {
  ctx.fillStyle = color;
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const o = Math.floor(t / 2);
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x0 + (dx * i) / n) - o, Math.round(y0 + (dy * i) / n) - o, t, t);
  }
}
function pxCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy);
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    if (w > 0 || Math.abs(dy) < r) ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}
function pxRing(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  const n = Math.max(8, Math.floor(r * 6));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}
// petir bergerigi
function pxBolt(ctx, x0, y0, x1, y1, color, thick, jag, segs) {
  let px = x0, py = y0;
  for (let i = 1; i <= segs; i++) {
    const k = i / segs;
    const nx = lerp(x0, x1, k) + (i < segs ? rand(-jag, jag) : 0);
    const ny = lerp(y0, y1, k) + (i < segs ? rand(-jag * 0.3, jag * 0.3) : 0);
    pxLine(ctx, px, py, nx, ny, color, thick);
    px = nx; py = ny;
  }
}

const FX_COLORS = {
  normal: ['#ffffff', '#fff3a0', '#ffb030', '#ff6a10'],
  electric: ['#ffffff', '#c0f0ff', '#50b0ff', '#2050ff'],
  flame: ['#fff2c0', '#ffb040', '#ff4020', '#a01030'],
  purple: ['#ffffff', '#f0a0ff', '#c040ff', '#6010a0'],
  block: ['#ffffff', '#b8e0ff', '#5090ff', '#2040a0'],
};

class Effects {
  constructor() { this.parts = []; this.sparks = []; }

  update() {
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.vx *= p.drag || 1;
      if (p.sway) p.x += Math.sin((p.life + p.seed) * 0.08) * p.sway;
      p.life--;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const s of this.sparks) s.t++;
    this.sparks = this.sparks.filter((s) => s.t < s.life);
  }

  part(o) { if (this.parts.length < 600) this.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, size: 1, seed: Math.random() * 100 }, o)); }

  hit(x, y, size, kind = 'normal') {
    const cols = FX_COLORS[kind] || FX_COLORS.normal;
    this.sparks.push({ x, y, t: 0, life: 10, size, kind, rot: Math.random() * 45 });
    const n = Math.round(size * 0.8);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(1, 3.5);
      this.part({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -0.12, life: randi(10, 20), color: choice(cols.slice(1)), size: chance(0.3) ? 2 : 1, drag: 0.92 });
    }
  }

  block(x, y) {
    this.sparks.push({ x, y, t: 0, life: 9, size: 10, kind: 'block', ring: true });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.part({ x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 10, color: choice(FX_COLORS.block), drag: 0.9 });
    }
  }

  clash(x, y) {
    this.sparks.push({ x, y, t: 0, life: 14, size: 20, kind: 'normal' });
    this.sparks.push({ x, y, t: 0, life: 14, size: 16, kind: 'block', ring: true });
  }

  dust(x, big) {
    const n = big ? 14 : 6;
    for (let i = 0; i < n; i++) {
      this.part({ x: x + rand(-10, 10), y: 1, vx: rand(-1.2, 1.2) * (big ? 1.6 : 1), vy: rand(0.2, 1.2), g: -0.05, life: randi(12, 24), color: choice(['#8a7a70', '#a89888', '#6a5a52']), size: chance(0.5) ? 2 : 1, drag: 0.93 });
    }
  }

  // jejak efek dari kepalan tangan saat jurus spesial
  trail(f, kind) {
    const p = f.jointWorld('fiF');
    const cols = FX_COLORS[kind] || FX_COLORS.normal;
    for (let i = 0; i < 2; i++) {
      this.part({ x: p.x + rand(-3, 3), y: p.y + rand(-3, 3), vx: rand(-0.5, 0.5), vy: rand(0.3, 1.2), life: randi(8, 16), color: choice(cols), size: chance(0.4) ? 2 : 1 });
    }
  }

  aura(f, color) {
    this.part({ x: f.x + rand(-14, 14), y: f.y + rand(0, 60), vx: rand(-0.2, 0.2), vy: rand(0.6, 1.4), life: randi(14, 26), color: color || choice(['#ff3020', '#ff7040', '#c01010']), size: chance(0.3) ? 2 : 1 });
  }

  draw(ctx, camX) {
    for (const p of this.parts) {
      if (p.feather) continue;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(GROUND - p.y), p.size, p.size);
    }
    for (const s of this.sparks) {
      const cx = s.x - camX, cy = GROUND - s.y;
      const cols = FX_COLORS[s.kind] || FX_COLORS.normal;
      const k = s.t / s.life;
      if (s.ring) {
        pxRing(ctx, cx, cy, 3 + k * s.size, cols[Math.min(3, Math.floor(k * 4))]);
        pxRing(ctx, cx, cy, 2 + k * s.size * 0.6, cols[0]);
        continue;
      }
      // percikan bintang
      const r = s.size * (0.4 + k * 0.8);
      if (s.t < 3) pxCircle(ctx, cx, cy, s.size * 0.35 * (1 - k), cols[0]);
      for (let i = 0; i < 8; i++) {
        const a = (s.rot + i * 45) * DEG;
        const len = i % 2 ? r : r * 0.6;
        const inner = len * k * 0.8;
        const col = cols[Math.min(3, Math.floor(k * 3) + (i % 2))];
        pxLine(ctx, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * len, cy + Math.sin(a) * len, col, s.t < 4 ? 2 : 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gambar proyektil
// ---------------------------------------------------------------------------
function drawProjectile(ctx, p, camX, frame) {
  const sx = p.x - camX, sy = GROUND - p.y;
  const d = p.dir;
  switch (p.type) {
    case 'flame': {
      const fl = (frame >> 1) % 2;
      for (let i = 1; i <= 4; i++) pxCircle(ctx, sx - d * i * 5, sy + Math.sin((frame + i) * 0.7) * 2, 7 - i * 1.4, i % 2 ? '#a01030' : '#e02a3c');
      pxCircle(ctx, sx, sy, 9 + fl, '#8a1030');
      pxCircle(ctx, sx + d, sy, 7 + fl, '#e02a3c');
      pxCircle(ctx, sx + d * 2, sy, 4.5, '#ff9a4a');
      pxCircle(ctx, sx + d * 3, sy, 2, '#fff2c0');
      break;
    }
    case 'thunder': {
      pxCircle(ctx, sx, sy, 10 + ((frame >> 1) % 2), '#1838a0');
      pxCircle(ctx, sx, sy, 7, '#50b0ff');
      pxCircle(ctx, sx, sy, 4, '#c0f0ff');
      pxCircle(ctx, sx, sy, 2, '#ffffff');
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        pxBolt(ctx, sx, sy, sx + Math.cos(a) * 16, sy + Math.sin(a) * 14, chance(0.5) ? '#ffffff' : '#80d0ff', 1, 4, 3);
      }
      break;
    }
    case 'laser': case 'laserP': {
      const c1 = p.type === 'laser' ? '#ff1830' : '#c030ff', c2 = p.type === 'laser' ? '#ffb0b8' : '#f0c0ff';
      const tail = Math.min(p.t * Math.abs(p.vx), 70);
      ctx.fillStyle = c1;
      ctx.fillRect(Math.round(Math.min(sx, sx - d * tail)), Math.round(sy - 2), Math.round(tail), 5);
      ctx.fillStyle = c2;
      ctx.fillRect(Math.round(Math.min(sx, sx - d * tail)), Math.round(sy - 1), Math.round(tail), 2);
      pxCircle(ctx, sx, sy, 4 + ((frame >> 1) % 2), c1);
      pxCircle(ctx, sx, sy, 2, '#ffffff');
      break;
    }
    case 'beam': {
      const purple = p.color === 'purple';
      const cols = purple ? ['#3a0860', '#9020e0', '#e080ff', '#ffffff'] : ['#5a0810', '#e01828', '#ff9060', '#fff4e0'];
      const x0 = sx, x1 = sx + d * p.length;
      const left = Math.min(x0, x1), w = Math.abs(x1 - x0);
      const fade = p.t < 4 ? p.t / 4 : p.life - p.t < 8 ? (p.life - p.t) / 8 : 1;
      const hh = p.h * fade;
      const flick = (frame % 3) - 1;
      const layers = [1, 0.75, 0.45, 0.18];
      for (let i = 0; i < 4; i++) {
        const lh = Math.max(1, Math.round(hh * layers[i] + flick));
        ctx.fillStyle = cols[i];
        ctx.fillRect(Math.round(left), Math.round(sy - lh / 2), Math.round(w), lh);
      }
      // gelombang tepi
      ctx.fillStyle = cols[1];
      for (let x = 0; x < w; x += 3) {
        const o = Math.sin((x + frame * 6) * 0.15) * 3;
        ctx.fillRect(Math.round(left + x), Math.round(sy - hh / 2 - 2 + o), 2, 2);
        ctx.fillRect(Math.round(left + x), Math.round(sy + hh / 2 + o), 2, 2);
      }
      pxCircle(ctx, x0, sy, hh * 0.7 + 2, cols[2]);
      pxCircle(ctx, x0, sy, hh * 0.4, cols[3]);
      break;
    }
    case 'pillar': {
      if (p.t < p.warn) {
        // tanda peringatan di lantai
        const k = p.t / p.warn;
        ctx.fillStyle = (frame >> 1) % 2 ? '#80d0ff' : '#ffffff';
        ctx.fillRect(Math.round(sx - 10 * k), GROUND - 1, Math.round(20 * k), 2);
        break;
      }
      const top = -10, bot = GROUND;
      ctx.fillStyle = 'rgba(80,160,255,0.25)';
      ctx.fillRect(Math.round(sx - 14), top, 28, bot - top);
      pxBolt(ctx, sx, top, sx, bot, '#2050ff', 7, 10, 10);
      pxBolt(ctx, sx, top, sx, bot, '#80d0ff', 4, 8, 10);
      pxBolt(ctx, sx, top, sx, bot, '#ffffff', 2, 6, 10);
      for (let i = 0; i < 2; i++) pxBolt(ctx, sx, bot - rand(20, 120), sx + rand(-24, 24), bot - rand(0, 60), '#c0f0ff', 1, 5, 4);
      pxCircle(ctx, sx, bot, 10 + (frame % 3), '#80d0ff');
      pxCircle(ctx, sx, bot, 5, '#ffffff');
      break;
    }
  }
}
